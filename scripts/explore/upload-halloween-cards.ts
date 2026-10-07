/**
 * Upload the Halloween card artwork (assets/halloween/*.webp) to the public
 * `explore-card-images` bucket, using the filename as the object key so it
 * matches the image_path URLs seeded by
 * supabase/migrations/20261007100100_explore_events_halloween.sql.
 *
 * Writes to the hosted project the env vars point at -- run it deliberately:
 *   npx tsx upload-halloween-cards.ts            # dry run (lists files)
 *   npx tsx upload-halloween-cards.ts --upload   # actually upload (upsert)
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "explore-card-images";
const DIR = join(dirname(fileURLToPath(import.meta.url)), "assets", "halloween");

async function main() {
  const upload = process.argv.includes("--upload");
  const files = readdirSync(DIR).filter((f) => f.endsWith(".webp")).sort();

  if (!upload) {
    console.log(`Dry run — would upload ${files.length} files to ${BUCKET}:`);
    for (const f of files) console.log(`  ${f}`);
    console.log("Re-run with --upload to upload.");
    return;
  }

  const url = process.env.EXPLORE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.EXPLORE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set EXPLORE_SUPABASE_URL and EXPLORE_SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  for (const f of files) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(f, readFileSync(join(DIR, f)), { contentType: "image/webp", upsert: true });
    if (error) throw new Error(`${f}: ${error.message}`);
    console.log(`uploaded ${f}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
