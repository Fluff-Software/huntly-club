/**
 * Activate a national (or regional PBF) catalogue that is already ready.
 *
 * UK: activate_explore_national_catalogue (also retires Stoke).
 * Other regions (e.g. philippines): activate_explore_catalogue_version
 *   (retires same region_id only; leaves Stoke alone).
 *
 *   npm run activate:catalogue:national -- --region philippines --confirm-activate
 *   npm run activate:catalogue:national -- --region uk-and-ireland --confirm-activate
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import pg from "pg";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { NATIONAL_REGION_ID } from "./national/import/constants.js";
import { redactDatabaseUrl } from "./national/import/import-runner.js";

loadDotenv({ path: path.join(EXPLORE_PACKAGE_ROOT, ".env") });

export function parseActivateArgs(argv: string[]) {
  let region = NATIONAL_REGION_ID;
  let confirmActivate = false;
  let catalogueVersionId: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--confirm-activate") confirmActivate = true;
    else if (argv[i] === "--catalogue-version-id" && argv[i + 1]) {
      catalogueVersionId = Number(argv[++i]);
    }
  }
  return { region, confirmActivate, catalogueVersionId };
}

export function assertActivationConfirmed(confirmActivate: boolean): void {
  if (!confirmActivate) {
    throw new Error(
      "Activation refused: pass --confirm-activate after validation and product approval."
    );
  }
}

async function main() {
  const args = parseActivateArgs(process.argv.slice(2));
  assertActivationConfirmed(args.confirmActivate);

  const databaseUrl =
    process.env.EXPLORE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL;
  if (!databaseUrl) throw new Error("Set EXPLORE_DATABASE_URL");

  console.log(`Activation database=${redactDatabaseUrl(databaseUrl)}`);
  console.log(`  region=${args.region}`);

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
        ? undefined
        : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    let versionId = args.catalogueVersionId;
    if (versionId == null) {
      const r = await client.query(
        `SELECT id FROM explore_point_catalogue_versions
         WHERE region_id = $1 AND status = 'ready'
         ORDER BY created_at DESC LIMIT 1`,
        [args.region]
      );
      if (!r.rows[0]) throw new Error(`No ready catalogue version found for ${args.region}`);
      versionId = Number(r.rows[0].id);
    }
    console.log(`  catalogue_version_id=${versionId}`);

    if (args.region === NATIONAL_REGION_ID) {
      const res = await client.query(
        `SELECT activate_explore_national_catalogue($1::bigint, true) AS result`,
        [versionId]
      );
      console.log(JSON.stringify(res.rows[0]?.result, null, 2));
    } else {
      const res = await client.query(
        `SELECT activate_explore_catalogue_version($1::bigint) AS result`,
        [versionId]
      );
      console.log(JSON.stringify(res.rows[0]?.result, null, 2));
    }

    const statuses = await client.query(
      `SELECT region_id, id, status, point_count
       FROM explore_point_catalogue_versions
       WHERE region_id IN ($1, 'stoke-on-trent')
         AND status IN ('active', 'ready', 'retired')
       ORDER BY region_id, created_at DESC`,
      [args.region]
    );
    console.log("Current catalogue statuses:");
    console.log(JSON.stringify(statuses.rows, null, 2));
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
