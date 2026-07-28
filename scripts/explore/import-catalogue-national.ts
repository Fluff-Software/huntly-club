/**
 * National catalogue bulk import (Step 10.5).
 *
 * Dry-run (no DB writes):
 *   npm run import:catalogue:national -- --region philippines --dry-run
 *
 * Real import (requires EXPLORE_DATABASE_URL + migration applied):
 *   npm run import:catalogue:national -- --region philippines
 *
 * Does NOT activate.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { loadRegionConfig } from "./generate-catalogue.js";
import { resolveBuildDir } from "./national/resolve-build.js";
import { NATIONAL_REGION_ID } from "./national/import/constants.js";
import { runNationalImportDryRun } from "./national/import/dry-run.js";
import {
  redactDatabaseUrl,
  runNationalCatalogueImport,
} from "./national/import/import-runner.js";
import { resolveNationalImportTarget } from "./national/import/resolve-target.js";

loadDotenv({ path: path.join(EXPLORE_PACKAGE_ROOT, ".env") });

function parseArgs(argv: string[]) {
  let region = NATIONAL_REGION_ID;
  let buildDir: string | undefined;
  let dryRun = false;
  let restartFailed = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--build-dir" && argv[i + 1]) buildDir = argv[++i];
    else if (argv[i] === "--dry-run") dryRun = true;
    else if (argv[i] === "--restart-failed") restartFailed = true;
  }
  return { region, buildDir, dryRun, restartFailed };
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
  const ndjsonPath = path.join(buildDir, "catalogue.ndjson");
  const target = resolveNationalImportTarget({ buildDir, regionId: args.region });

  console.log("National catalogue import");
  console.log(`  region=${target.regionId}`);
  console.log(`  buildDir=${buildDir}`);
  console.log(`  expectedPoints=${target.expectedPointCount}`);
  console.log(`  dryRun=${args.dryRun}`);

  if (args.dryRun) {
    const result = await runNationalImportDryRun({ ndjsonPath, target });
    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          errors: result.errors,
          rows: result.stats.rows,
          expected: result.expectedPointCount,
          sha256: result.stats.sha256,
          points_by_type: result.stats.pointsByType,
          estimated_copy_bytes: result.stats.estimatedCopyBytes,
          estimated_db_bytes: result.estimatedDbBytes,
          env_profile_avg_bytes: result.envProfileAvgBytes,
          env_profile_max_bytes: result.envProfileMaxBytes,
          inserts: false,
          activation: false,
          staging_rows_left: 0,
        },
        null,
        2
      )
    );
    if (!result.ok) process.exit(1);
    console.log("DRY-RUN OK — no database writes.");
    return;
  }

  const dbUrl =
    process.env.EXPLORE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      "Real import requires EXPLORE_DATABASE_URL.\n" +
        "Run --dry-run first. Apply migration: supabase db push\n" +
        "Then set EXPLORE_DATABASE_URL (SSL Postgres URI) in scripts/explore/.env"
    );
    process.exit(1);
  }
  console.log(`  database=${redactDatabaseUrl(dbUrl)}`);

  // Scan once for SHA when not pinned (non-UK builds).
  let ndjsonSha256 = target.ndjsonSha256;
  if (!ndjsonSha256) {
    const scan = await runNationalImportDryRun({ ndjsonPath, target });
    if (!scan.ok) {
      console.error(JSON.stringify(scan.errors, null, 2));
      process.exit(1);
    }
    ndjsonSha256 = scan.stats.sha256;
    // Prefer scanned type histogram if summary was empty
    if (!target.enforcePointsByType) {
      target.pointsByType = scan.stats.pointsByType;
    }
    // Authoritative count from scan if validation said otherwise inconsistently
    if (scan.stats.rows !== target.expectedPointCount) {
      console.error(
        `Refusing import: scan rows ${scan.stats.rows} != expected ${target.expectedPointCount}`
      );
      process.exit(1);
    }
  }

  const result = await runNationalCatalogueImport({
    ndjsonPath,
    target,
    ndjsonSha256,
    restartFailed: args.restartFailed,
    onProgress: (p) => {
      console.log(
        `  COPY ${p.rowsCopied} rows (${Math.round(p.rowsPerSec)}/s, ${Math.round(p.elapsedMs / 1000)}s)`
      );
    },
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
  console.log(
    `IMPORT OK — region=${result.regionId} status=${result.status} active=false. Activate separately if intended.`
  );
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
