/**
 * National import preflight (Step 10.5).
 *
 *   npm run preflight:import:national -- --region philippines
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import pg from "pg";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { resolveBuildDir } from "./national/resolve-build.js";
import { loadRegionConfig } from "./generate-catalogue.js";
import { NATIONAL_REGION_ID, STOKE_REGION_ID } from "./national/import/constants.js";
import { runNationalImportPreflight } from "./national/import/preflight.js";
import { redactDatabaseUrl } from "./national/import/import-runner.js";
import { resolveNationalImportTarget } from "./national/import/resolve-target.js";

loadDotenv({ path: path.join(EXPLORE_PACKAGE_ROOT, ".env") });

function parseArgs(argv: string[]) {
  let region = NATIONAL_REGION_ID;
  let buildDir: string | undefined;
  let skipStreamScan = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--build-dir" && argv[i + 1]) buildDir = argv[++i];
    else if (argv[i] === "--skip-stream-scan") skipStreamScan = true;
  }
  return { region, buildDir, skipStreamScan };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region);
  const outputRoot = path.join(EXPLORE_PACKAGE_ROOT, region.output_dir);
  const buildDir = resolveBuildDir({
    outputRoot,
    buildDir: args.buildDir,
    cwd: process.cwd(),
  });
  const target = resolveNationalImportTarget({ buildDir, regionId: args.region });

  const databaseUrl =
    process.env.EXPLORE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL ??
    null;
  const supabaseUrl =
    process.env.EXPLORE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? null;
  const serviceRole =
    process.env.EXPLORE_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("National import preflight");
  console.log(`  region=${target.regionId}`);
  console.log(`  buildDir=${buildDir}`);
  if (databaseUrl) console.log(`  database=${redactDatabaseUrl(databaseUrl)}`);
  if (supabaseUrl) console.log(`  supabase=${supabaseUrl.replace(/\/\/.*@/, "//***@")}`);

  const result = await runNationalImportPreflight({
    buildDir,
    target,
    skipStreamScan: args.skipStreamScan,
    databaseUrl,
    supabaseUrl,
    hasServiceRole: Boolean(serviceRole),
    dbProbe: databaseUrl
      ? async () => {
          const client = new pg.Client({
            connectionString: databaseUrl,
            ssl:
              databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
                ? undefined
                : { rejectUnauthorized: false },
          });
          await client.connect();
          try {
            const postgis = await client.query(
              `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS ok`
            );
            const jobs = await client.query(
              `SELECT to_regclass('public.explore_catalogue_import_jobs') IS NOT NULL AS ok`
            );
            const stoke = await client.query(
              `SELECT 1 FROM explore_point_catalogue_versions
               WHERE region_id = $1 AND status = 'active' LIMIT 1`,
              [STOKE_REGION_ID]
            );
            const conflict = await client.query(
              `SELECT 1 FROM explore_point_catalogue_versions
               WHERE region_id = $1 AND status IN ('ready','active') LIMIT 1`,
              [target.regionId]
            );
            let encrypted: boolean | null = null;
            try {
              const ssl = await client.query("SHOW ssl");
              encrypted = String(ssl.rows[0]?.ssl ?? "").toLowerCase() === "on";
            } catch {
              encrypted = null;
            }
            return {
              postgis: Boolean(postgis.rows[0]?.ok),
              migrationHint: Boolean(jobs.rows[0]?.ok),
              stokeActive: (stoke.rowCount ?? 0) > 0,
              conflictingNational: (conflict.rowCount ?? 0) > 0,
              encrypted,
            };
          } finally {
            await client.end().catch(() => undefined);
          }
        }
      : undefined,
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    console.error("PREFLIGHT FAIL");
    process.exit(1);
  }
  console.log("PREFLIGHT OK");
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
