/**
 * National catalogue validation entrypoint (Step 10.4).
 *
 * Usage:
 *   npm run validate:catalogue:national -- --region uk-and-ireland
 *   npm run validate:catalogue:national -- --region uk-and-ireland \
 *     --build-dir output/catalogues/uk-and-ireland/build_2026-07-24T23-11-06-550Z_aa8033
 *
 * Does NOT import to Supabase, activate the catalogue, or retire Stoke.
 * Does NOT regenerate chunk outputs. Merge runs only if catalogue.ndjson is missing
 * (or --force-merge is passed).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { loadRegionConfig } from "./generate-catalogue.js";
import { resolveBuildDir } from "./national/resolve-build.js";
import { validateNationalBuild } from "./national/validate-national.js";

const DEFAULT_SOURCE_REVISION = "2026-07-24_7093f494b688";
const DEFAULT_CONFIG_HASH = "ac05054c54dad3c0";

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  let buildDir: string | undefined;
  let forceMerge = false;
  let expectedSourceRevision = DEFAULT_SOURCE_REVISION;
  let expectedConfigHash = DEFAULT_CONFIG_HASH;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--build-dir" && argv[i + 1]) buildDir = argv[++i];
    else if (argv[i] === "--force-merge") forceMerge = true;
    else if (argv[i] === "--expected-source-revision" && argv[i + 1]) {
      expectedSourceRevision = argv[++i]!;
    } else if (argv[i] === "--expected-config-hash" && argv[i + 1]) {
      expectedConfigHash = argv[++i]!;
    }
  }
  return {
    region,
    buildDir,
    forceMerge,
    expectedSourceRevision,
    expectedConfigHash,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region) as ReturnType<typeof loadRegionConfig> & {
    pipeline?: string;
    coverage_policy?: { polygons_path?: string };
    source_revision?: string;
  };

  if (region.pipeline !== "pbf") {
    throw new Error("validate:catalogue:national is only for pipeline=pbf regions");
  }

  const outputRoot = path.join(EXPLORE_PACKAGE_ROOT, region.output_dir);
  const buildDir = resolveBuildDir({
    outputRoot,
    buildDir: args.buildDir,
    cwd: process.cwd(),
  });

  const coveragePath = path.join(
    EXPLORE_PACKAGE_ROOT,
    region.coverage_policy?.polygons_path ?? "catalogues/coverage/uk-and-ireland.geojson"
  );

  console.log(`National validate`);
  console.log(`  region=${args.region}`);
  console.log(`  buildDir=${buildDir}`);
  console.log(`  expectedRevision=${args.expectedSourceRevision}`);
  console.log(`  expectedConfigHash=${args.expectedConfigHash}`);
  console.log(`  forceMerge=${args.forceMerge}`);

  const report = await validateNationalBuild({
    buildDir,
    regionId: region.region_id,
    coveragePath,
    generationVersion: region.generation_version,
    expectedSourceRevision: args.expectedSourceRevision,
    expectedConfigHash: args.expectedConfigHash,
    forceMerge: args.forceMerge,
    allowMerge: true,
  });

  console.log(report.ok ? "\nPASS\n" : "\nFAIL\n");
  console.log(`Final NDJSON rows: ${report.ndjson.rows}`);
  console.log(`Min spacing m: ${report.ndjson.min_spacing_m}`);
  console.log(`Wrote ${report.outputs.validation_json}`);
  console.log(`Wrote ${report.outputs.validation_summary_txt}`);
  if (report.errors.length) {
    console.error("Errors:");
    for (const e of report.errors) console.error(` - ${e}`);
  }
  process.exit(report.ok ? 0 : 1);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
