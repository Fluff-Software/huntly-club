import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

function jsonResponse(body: object, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}

type Payload = { chapterId?: number };

type ChapterRow = { id: number; title: string | null; season_id: number };
type SeasonRow = { id: number; name: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as Payload;
    const chapterId = typeof body.chapterId === "number" && Number.isFinite(body.chapterId) ? body.chapterId : null;

    if (chapterId == null) {
      return jsonResponse({ error: "chapterId is required and must be a number." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: chapter, error: chapterError } = await admin
      .from("chapters")
      .select("id, title, season_id")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapter) {
      return jsonResponse({ error: "Chapter not found." }, 404);
    }

    const { data: season } = await admin
      .from("seasons")
      .select("name")
      .eq("id", (chapter as ChapterRow).season_id)
      .single();

    const seasonName = (season as SeasonRow | null)?.name ?? null;
    const chapterTitle = (chapter as ChapterRow).title ?? "New chapter";
    const title = "New chapter available";
    const bodyText = seasonName
      ? `${chapterTitle} is now available in ${seasonName}.`
      : `${chapterTitle} is now available.`;

    const { data: tokens, error: tokensError } = await admin
      .from("push_tokens")
      .select("expo_push_token")
      .eq("enabled", true);

    if (tokensError) {
      console.error("send-chapter-push: error loading tokens", tokensError.message);
      return jsonResponse({ error: "Could not load push tokens." }, 500);
    }

    const tokenList = (tokens ?? []).map((r: { expo_push_token: string }) => r.expo_push_token).filter(Boolean);
    if (tokenList.length === 0) {
      return jsonResponse({ success: true, count: 0 }, 200);
    }

    const messages = tokenList.map((to: string) => ({
      to,
      sound: "default" as const,
      title,
      body: bodyText,
      data: { chapterId, screen: "story" },
    }));

    let sent = 0;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("send-chapter-push: Expo API error", res.status, text);
        return jsonResponse(
          { error: "Failed to send some or all notifications.", sent },
          res.status >= 500 ? 502 : 500
        );
      }

      const result = (await res.json()) as { data?: { status?: string }[] };
      const receipts = Array.isArray(result?.data) ? result.data : [];
      sent += receipts.filter((r) => r?.status === "ok").length;
    }

    return jsonResponse({ success: true, count: sent }, 200);
  } catch (e) {
    console.error("send-chapter-push error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});
