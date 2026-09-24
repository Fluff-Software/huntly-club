/**
 * Import a validated Explore catalogue into Supabase (service role).
 *
 * Usage:
 *   npm run import:catalogue -- --region stoke-on-trent
 *   npm run import:catalogue -- --region stoke-on-trent --dry-run
 *   npm run import:catalogue -- --region stoke-on-trent --activate
 *
 * Requires EXPLORE_SUPABASE_URL + EXPLORE_SUPABASE_SERVICE_ROLE_KEY (scripts/explore/.env).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import {
  loadRegionConfig,
  type CatalogueFile,
} from "./generate-catalogue.js";
import { validateCatalogue } from "./validate-catalogue.js";

loadDotenv({ path: path.join(EXPLORE_PACKAGE_ROOT, ".env") });

function parseArgs(argv: string[]) {
  let region = "stoke-on-trent";
  let dryRun = false;
  let activate = false;
  let file: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--file" && argv[i + 1]) file = argv[++i];
    else if (argv[i] === "--dry-run") dryRun = true;
    else if (argv[i] === "--activate") activate = true;
  }
  return { region, dryRun, activate, file };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region);
  const cataloguePath =
    args.file ?? path.join(EXPLORE_PACKAGE_ROOT, region.output_dir, "catalogue.json");
  if (!fs.existsSync(cataloguePath)) {
    throw new Error(`Catalogue not found: ${cataloguePath}`);
  }
  const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8")) as CatalogueFile;
  const validation = validateCatalogue(catalogue);
  if (!validation.ok) {
    throw new Error(`Catalogue failed validation: ${validation.errors.join(", ")}`);
  }

  const url = process.env.EXPLORE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.EXPLORE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set EXPLORE_SUPABASE_URL and EXPLORE_SUPABASE_SERVICE_ROLE_KEY");
  }

  console.log(
    `Import ${catalogue.region_id} v${catalogue.generation_version} rev=${catalogue.source_revision} points=${catalogue.point_count} dryRun=${args.dryRun}`
  );

  if (args.dryRun) {
    console.log("Dry run OK — validation passed, no writes.");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Upsert catalogue version row
  const { data: existing } = await supabase
    .from("explore_point_catalogue_versions")
    .select("id, status")
    .eq("region_id", catalogue.region_id)
    .eq("generation_version", catalogue.generation_version)
    .eq("source_revision", catalogue.source_revision)
    .maybeSingle();

  let catalogueVersionId: number;
  if (existing?.id) {
    catalogueVersionId = existing.id;
    await supabase
      .from("explore_point_catalogue_versions")
      .update({
        status: "validating",
        point_count: catalogue.point_count,
        coverage_km2: catalogue.coverage_km2,
        metadata: {
          name: catalogue.name,
          points_by_type: catalogue.points_by_type,
          generated_at: catalogue.generated_at,
        },
      })
      .eq("id", catalogueVersionId);
    // Replace points for this version
    await supabase.from("explore_points").delete().eq("catalogue_version_id", catalogueVersionId);
  } else {
    const { data: inserted, error } = await supabase
      .from("explore_point_catalogue_versions")
      .insert({
        region_id: catalogue.region_id,
        generation_version: catalogue.generation_version,
        source_revision: catalogue.source_revision,
        status: "validating",
        point_count: catalogue.point_count,
        coverage_km2: catalogue.coverage_km2,
        metadata: {
          name: catalogue.name,
          points_by_type: catalogue.points_by_type,
          generated_at: catalogue.generated_at,
        },
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "insert_version_failed");
    catalogueVersionId = inserted.id;
  }

  const batchSize = 200;
  let inserted = 0;
  for (let i = 0; i < catalogue.points.length; i += batchSize) {
    const slice = catalogue.points.slice(i, i + batchSize).map((p) => ({
      id: p.id,
      catalogue_version_id: catalogueVersionId,
      latitude: p.latitude,
      longitude: p.longitude,
      point_type: p.type,
      generation_version: p.generation_version,
      source_revision: p.source_revision,
      active: true,
      source_type: p.source_type,
      source_feature_id: p.source_feature_id,
      confidence: p.confidence,
      environment_profile: p.environment_profile,
    }));
    const { error } = await supabase.from("explore_points").insert(slice);
    if (error) throw new Error(`insert_points_failed@${i}: ${error.message}`);
    inserted += slice.length;
    console.log(`Inserted ${inserted}/${catalogue.point_count}`);
  }

  await supabase
    .from("explore_point_catalogue_versions")
    .update({ status: "ready", point_count: inserted })
    .eq("id", catalogueVersionId);

  console.log(`Catalogue version ${catalogueVersionId} status=ready`);

  if (args.activate) {
    const { data, error } = await supabase.rpc("activate_explore_catalogue_version", {
      p_catalogue_version_id: catalogueVersionId,
    });
    if (error) throw new Error(`activate_failed: ${error.message}`);
    console.log("Activated:", data);
  } else {
    console.log("Not activated. Re-run with --activate when ready.");
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
