import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const UK_TIME_ZONE = "Europe/London";

type DenoLike = {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};
const deno = (globalThis as typeof globalThis & { Deno: DenoLike }).Deno;

type UkParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type Payload = { year?: number; month?: number };

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseUkParts(date: Date): UkParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
    second: parseInt(get("second"), 10),
  };
}

function offsetMinutesAt(utcMs: number): number {
  const p = parseUkParts(new Date(utcMs));
  const localAsUtcMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((localAsUtcMs - utcMs) / 60_000);
}

/** UK local midnight on the 1st of year/month as UTC ISO string. */
function ukMonthStartIso(year: number, month: number): string {
  const desiredLocalAsUtcMs = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const offsetMin = offsetMinutesAt(desiredLocalAsUtcMs);
  return new Date(desiredLocalAsUtcMs - offsetMin * 60_000).toISOString();
}

function previousCalendarMonth(year: number, month: number): { year: number; month: number } {
  if (month <= 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function nextCalendarMonth(year: number, month: number): { year: number; month: number } {
  if (month >= 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function getTargetMonth(now: Date, body?: Payload): { year: number; month: number } {
  if (
    typeof body?.year === "number" &&
    Number.isFinite(body.year) &&
    typeof body?.month === "number" &&
    Number.isFinite(body.month) &&
    body.month >= 1 &&
    body.month <= 12
  ) {
    return { year: Math.trunc(body.year), month: Math.trunc(body.month) };
  }
  const uk = parseUkParts(now);
  return previousCalendarMonth(uk.year, uk.month);
}

function monthBoundsIso(year: number, month: number): { from: string; to: string } {
  const next = nextCalendarMonth(year, month);
  return {
    from: ukMonthStartIso(year, month),
    to: ukMonthStartIso(next.year, next.month),
  };
}

deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const cronSecret = deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || providedSecret !== cronSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    let body: Payload = {};
    try {
      const text = await req.text();
      if (text.trim()) body = JSON.parse(text) as Payload;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const now = new Date();
    const { year, month } = getTargetMonth(now, body);
    const { from, to } = monthBoundsIso(year, month);

    const supabaseUrl = deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: rows, error: achievementsError } = await admin
      .from("user_achievements")
      .select("team_id, xp")
      .gte("created_at", from)
      .lt("created_at", to);

    if (achievementsError) {
      console.error("finalize-monthly-team-winner: achievements", achievementsError.message);
      return jsonResponse({ error: "Could not load achievements." }, 500);
    }

    const byTeam: Record<number, number> = {};
    for (const row of rows ?? []) {
      const teamId = row.team_id as number;
      byTeam[teamId] = (byTeam[teamId] ?? 0) + (row.xp ?? 0);
    }

    const entries = Object.entries(byTeam)
      .map(([teamId, total]) => ({ team_id: Number(teamId), total_xp: total }))
      .filter((e) => e.total_xp > 0);

    if (entries.length === 0) {
      return jsonResponse({ skipped: true, year, month, reason: "no_team_xp" }, 200);
    }

    entries.sort((a, b) => b.total_xp - a.total_xp || a.team_id - b.team_id);
    const winner = entries[0];

    const { data: team, error: teamError } = await admin
      .from("teams")
      .select("name")
      .eq("id", winner.team_id)
      .maybeSingle();

    if (teamError) {
      console.error("finalize-monthly-team-winner: team", teamError.message);
      return jsonResponse({ error: "Could not load winning team." }, 500);
    }

    const { error: upsertError } = await admin.from("team_monthly_winners").upsert(
      {
        year,
        month,
        team_id: winner.team_id,
        total_xp: winner.total_xp,
      },
      { onConflict: "year,month" }
    );

    if (upsertError) {
      console.error("finalize-monthly-team-winner: upsert", upsertError.message);
      return jsonResponse({ error: "Could not save monthly winner." }, 500);
    }

    return jsonResponse(
      {
        success: true,
        year,
        month,
        team_id: winner.team_id,
        team_name: team?.name ?? "",
        total_xp: winner.total_xp,
      },
      200
    );
  } catch (e) {
    console.error("finalize-monthly-team-winner error:", e);
    return jsonResponse({ error: "Something went wrong." }, 500);
  }
});
