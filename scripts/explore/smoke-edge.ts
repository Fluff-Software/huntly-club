/**
 * Hosted Edge smoke tests for Step 10.2.
 *
 * Read-only by default. Write claim requires:
 *   EXPLORE_SMOKE_WRITE=1
 *   EXPLORE_SMOKE_ACCESS_TOKEN=...
 *   EXPLORE_SMOKE_PROFILE_ID=...
 *
 * Usage:
 *   EXPLORE_SMOKE_SUPABASE_URL=https://xxx.supabase.co \
 *   EXPLORE_SMOKE_ANON_KEY=... \
 *   EXPLORE_SMOKE_ACCESS_TOKEN=... \
 *   npm run smoke:edge
 */
const base =
  process.env.EXPLORE_SMOKE_SUPABASE_URL?.replace(/\/$/, "") ??
  process.env.SUPABASE_URL?.replace(/\/$/, "");
const anon = process.env.EXPLORE_SMOKE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const token = process.env.EXPLORE_SMOKE_ACCESS_TOKEN;

if (!base || !anon) {
  console.error("Set EXPLORE_SMOKE_SUPABASE_URL and EXPLORE_SMOKE_ANON_KEY");
  process.exit(1);
}

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

async function invoke(
  name: string,
  opts: { method?: string; body?: unknown; auth?: boolean }
): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = {
    apikey: anon!,
    "Content-Type": "application/json",
  };
  if (opts.auth) {
    if (!token) throw new Error("EXPLORE_SMOKE_ACCESS_TOKEN required for auth checks");
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${base}/functions/v1/${name}`, {
    method: opts.method ?? "POST",
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function main() {
  // 1. health
  {
    const { status, json } = await invoke("explore-health", { method: "GET" });
    const body = json as Record<string, unknown>;
    checks.push({
      name: "health",
      ok: status === 200 || status === 503,
      detail: `HTTP ${status} status=${body?.status}`,
    });
  }

  // 2. unauthenticated nearby rejection
  {
    const res = await fetch(`${base}/functions/v1/explore-nearby`, {
      method: "POST",
      headers: { apikey: anon!, "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: 51.45, longitude: -2.59, radius_metres: 500 }),
    });
    checks.push({
      name: "unauthenticated_nearby_rejected",
      ok: res.status === 401,
      detail: `HTTP ${res.status}`,
    });
  }

  if (!token) {
    console.log("Skipping authenticated checks (no EXPLORE_SMOKE_ACCESS_TOKEN)");
  } else {
    // 3–6 nearby
    const { status, json } = await invoke("explore-nearby", {
      auth: true,
      body: { latitude: 53.044236, longitude: -2.165567, radius_metres: 500 },
    });
    const body = json as Record<string, unknown>;
    const preparing = body?.code === "map_data_preparing" || body?.error === "map_data_preparing";
    checks.push({
      name: "authenticated_nearby",
      ok: status === 200 || status === 202 || preparing,
      detail: `HTTP ${status} preparing=${preparing} stops=${(body as { stop_count?: number })?.stop_count}`,
    });

    // invalid coords
    const bad = await invoke("explore-nearby", {
      auth: true,
      body: { latitude: 999, longitude: -2.16, radius_metres: 500 },
    });
    const badBody = bad.json as Record<string, unknown>;
    checks.push({
      name: "invalid_coordinates",
      ok: bad.status === 400 && badBody?.error === "invalid_latitude",
      detail: `HTTP ${bad.status} error=${badBody?.error}`,
    });

    // excessive radius
    const big = await invoke("explore-nearby", {
      auth: true,
      body: { latitude: 51.45, longitude: -2.59, radius_metres: 50_000 },
    });
    const bigBody = big.json as Record<string, unknown>;
    checks.push({
      name: "excessive_radius",
      ok: big.status === 400 && bigBody?.error === "radius_too_large",
      detail: `HTTP ${big.status} error=${bigBody?.error}`,
    });
  }

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    if (!c.ok) failed += 1;
    console.log(`${mark}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
