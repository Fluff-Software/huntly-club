/**
 * Read-only smoke tests against a running Explore API.
 *
 * Usage:
 *   EXPLORE_SMOKE_BASE_URL=http://localhost:4310 npm run smoke
 *   EXPLORE_SMOKE_BASE_URL=https://… npm run smoke
 *
 * Optional write tests (creates claim data — opt-in only):
 *   EXPLORE_SMOKE_WRITE=1 EXPLORE_SMOKE_TOKEN=… EXPLORE_SMOKE_PROFILE_ID=… npm run smoke
 */
const base = (process.env.EXPLORE_SMOKE_BASE_URL ?? "http://127.0.0.1:4310").replace(/\/$/, "");
const write = process.env.EXPLORE_SMOKE_WRITE === "1";
const token = process.env.EXPLORE_SMOKE_TOKEN?.trim();
const profileId = process.env.EXPLORE_SMOKE_PROFILE_ID?.trim();

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

async function req(
  path: string,
  init?: RequestInit
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${base}${path}`, init);
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return { status: res.status, json };
}

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`Explore smoke → ${base} (write=${write ? "on" : "off"})`);

  const health = await req("/health");
  record(
    "GET /health",
    health.status === 200 && health.json.status === "ok",
    `status=${health.status} osm=${String(health.json.osm_data_revision)}`
  );
  record(
    "health auth flags present",
    typeof health.json.auth_configured === "boolean" &&
      typeof health.json.claims_configured === "boolean"
  );
  record("health does not expose filesystem paths", !JSON.stringify(health.json).includes("/app/"));

  const nearbyOk = await req(
    "/explore/stops/nearby?latitude=53.0442&longitude=-2.1656&radius_metres=500"
  );
  record(
    "nearby valid request",
    nearbyOk.status === 200 && Array.isArray(nearbyOk.json.stops),
    `status=${nearbyOk.status} stops=${Array.isArray(nearbyOk.json.stops) ? nearbyOk.json.stops.length : "?"}`
  );

  const outside = await req(
    "/explore/stops/nearby?latitude=51.5&longitude=-0.1&radius_metres=500"
  );
  record(
    "nearby outside region",
    outside.status === 422 && outside.json.error === "outside_supported_test_area"
  );

  const badRadius = await req(
    "/explore/stops/nearby?latitude=53.0442&longitude=-2.1656&radius_metres=99999"
  );
  record("nearby invalid radius", badRadius.status >= 400);

  const unauthClaim = await req("/explore/stops/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stop_id: "stop_x",
      generation_version: 2,
      profile_id: 1,
      reported_location: {
        latitude: 53.0442,
        longitude: -2.1656,
        accuracy_metres: 10,
      },
    }),
  });
  record(
    "claim rejects unauthenticated",
    unauthClaim.status === 401 && unauthClaim.json.error === "unauthenticated"
  );

  if (token && profileId) {
    const collection = await req(`/explore/cards/collection?profile_id=${profileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    record(
      "collection read (authenticated)",
      collection.status === 200 && collection.json.success === true,
      `status=${collection.status}`
    );

    if (write && nearbyOk.status === 200 && Array.isArray(nearbyOk.json.stops)) {
      const stops = nearbyOk.json.stops as Array<Record<string, unknown>>;
      const stop = stops[0];
      if (stop) {
        const verify = await req("/explore/stops/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stop_id: stop.stop_id,
            generation_version: stop.generation_version ?? 2,
            reported_location: {
              latitude: stop.latitude,
              longitude: stop.longitude,
              accuracy_metres: 8,
            },
          }),
        });
        record(
          "verify near stop (write mode)",
          verify.status === 200 && verify.json.valid === true,
          `status=${verify.status}`
        );
      } else {
        record("verify near stop (write mode)", false, "no stops to verify");
      }
    }
  } else {
    record("collection read (authenticated)", true, "skipped (no token/profile)");
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
