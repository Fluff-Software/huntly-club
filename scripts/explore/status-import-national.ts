/**
 * Read-only national import status (Step 10.5).
 *
 *   npm run status:import:national -- --region uk-and-ireland
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { NATIONAL_REGION_ID } from "./national/import/constants.js";
import { getNationalImportStatus } from "./national/import/import-runner.js";

loadDotenv({ path: path.join(EXPLORE_PACKAGE_ROOT, ".env") });

function parseArgs(argv: string[]) {
  let region = NATIONAL_REGION_ID;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
  }
  return { region };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const status = await getNationalImportStatus({ regionId: args.region });
  console.log(JSON.stringify(status, null, 2));
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
