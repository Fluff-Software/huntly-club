/**
 * Inactive national catalogue query benchmark (service-role DB only).
 * Does not activate. Requires EXPLORE_DATABASE_URL + imported ready catalogue.
 *
 *   npm run benchmark:catalogue:national -- --catalogue-version-id <id>
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import pg from "pg";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { NATIONAL_REGION_ID } from "./national/import/constants.js";
import { redactDatabaseUrl } from "./national/import/import-runner.js";

loadDotenv({ path: path.join(EXPLORE_PACKAGE_ROOT, ".env") });

const LOCATIONS = [
  { id: "london", lat: 51.5074, lon: -0.1278 },
  { id: "dublin", lat: 53.3498, lon: -6.2603 },
  { id: "belfast", lat: 54.5973, lon: -5.9301 },
  { id: "birmingham", lat: 52.4862, lon: -1.8904 },
  { id: "manchester", lat: 53.4808, lon: -2.2426 },
  { id: "glasgow", lat: 55.8642, lon: -4.2518 },
  { id: "cardiff", lat: 51.4816, lon: -3.1791 },
  { id: "stoke", lat: 53.044, lon: -2.165 },
  { id: "rural-england", lat: 53.24, lon: -1.8 },
  { id: "wales", lat: 53.1, lon: -4.0 },
  { id: "highlands", lat: 57.15, lon: -5.08 },
  { id: "coastal-wight", lat: 50.7, lon: -1.3 },
];

const RADII = [100, 250, 500, 1000, 2000];

function parseArgs(argv: string[]) {
  let catalogueVersionId: number | undefined;
  let explain = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--catalogue-version-id" && argv[i + 1]) {
      catalogueVersionId = Number(argv[++i]);
    } else if (argv[i] === "--explain") explain = true;
  }
  return { catalogueVersionId, explain };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const databaseUrl =
    process.env.EXPLORE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL;
  if (!databaseUrl) throw new Error("Set EXPLORE_DATABASE_URL");

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
        ? undefined
        : { rejectUnauthorized: false },
  });
  await client.connect();
  console.log(`Benchmark DB=${redactDatabaseUrl(databaseUrl)}`);

  try {
    let versionId = args.catalogueVersionId;
    if (versionId == null) {
      const r = await client.query(
        `SELECT id, status, point_count FROM explore_point_catalogue_versions
         WHERE region_id = $1 AND status = 'ready'
         ORDER BY created_at DESC LIMIT 1`,
        [NATIONAL_REGION_ID]
      );
      if (!r.rows[0]) {
        throw new Error("No ready national catalogue — import first (do not activate)");
      }
      versionId = Number(r.rows[0].id);
      console.log(`Using catalogue_version_id=${versionId} status=${r.rows[0].status}`);
    }

    const results: Array<Record<string, unknown>> = [];
    for (const loc of LOCATIONS) {
      for (const radius of RADII) {
        const samples: number[] = [];
        let rows = 0;
        for (let i = 0; i < 5; i++) {
          const t0 = Date.now();
          const q = await client.query(
            `SELECT * FROM get_explore_points_nearby_for_catalogue($1,$2,$3,$4,40)`,
            [versionId, loc.lat, loc.lon, radius]
          );
          samples.push(Date.now() - t0);
          rows = q.rowCount ?? 0;
        }
        samples.sort((a, b) => a - b);
        const median = samples[Math.floor(samples.length / 2)]!;
        const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!;
        let indexUsed: boolean | null = null;
        if (args.explain) {
          const plan = await client.query(
            `EXPLAIN (FORMAT JSON)
             SELECT * FROM get_explore_points_nearby_for_catalogue($1,$2,$3,$4,40)`,
            [versionId, loc.lat, loc.lon, radius]
          );
          const text = JSON.stringify(plan.rows);
          indexUsed = /explore_points_location_gix|Index Scan|Bitmap Index/i.test(text);
        }
        results.push({
          location: loc.id,
          radius_m: radius,
          rows,
          median_ms: median,
          p95_ms: p95,
          index_used: indexUsed,
        });
        console.log(
          `  ${loc.id} r=${radius} rows=${rows} median=${median}ms p95=${p95}ms`
        );
      }
    }

    const medians = results.map((r) => Number(r.median_ms)).sort((a, b) => a - b);
    const p95s = results.map((r) => Number(r.p95_ms)).sort((a, b) => a - b);
    const slowest = [...results].sort(
      (a, b) => Number(b.p95_ms) - Number(a.p95_ms)
    )[0];

    const storage = await client.query(
      `SELECT explore_catalogue_storage_stats($1) AS stats`,
      [versionId]
    );

    const summary = {
      catalogue_version_id: versionId,
      samples: results,
      overall_median_ms: medians[Math.floor(medians.length / 2)],
      overall_p95_ms: p95s[Math.ceil(p95s.length * 0.95) - 1],
      slowest,
      storage: storage.rows[0]?.stats,
      note: "Queried inactive/ready catalogue via service-role RPC only. Not activated.",
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end().catch(() => undefined);
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
