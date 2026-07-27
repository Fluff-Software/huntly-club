/**
 * Extract UK + ROI coverage MultiPolygon from a pinned Geofabrik PBF via osmium.
 * Excludes Isle of Man, Jersey, Guernsey.
 *
 * Usage:
 *   npm run extract:coverage -- --region uk-and-ireland
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { loadRegionConfig } from "./generate-catalogue.js";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";

/** Accept these admin_level=2 names / ISO codes from OSM. */
const INCLUDE_NAME_MATCHERS = [
  /^united kingdom$/i,
  /^ireland$/i,
  /^éire$/i,
  /^republic of ireland$/i,
];

const INCLUDE_WIKIDATA = new Set([
  "Q145", // United Kingdom
  "Q27", // Ireland (Republic)
]);

const EXCLUDE_NAME_MATCHERS = [
  /isle of man/i,
  /^jersey$/i,
  /^guernsey$/i,
];

const EXCLUDE_WIKIDATA = new Set([
  "Q9676", // Isle of Man
  "Q785", // Jersey
  "Q25230", // Guernsey
]);

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  let pbf: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--pbf" && argv[i + 1]) pbf = argv[++i];
  }
  return { region, pbf };
}

function findPinnedPbf(baseDir: string): string {
  if (!fs.existsSync(baseDir)) throw new Error(`Missing PBF dir: ${baseDir}`);
  const dirs = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_download")
    .map((d) => d.name)
    .sort()
    .reverse();
  for (const name of dirs) {
    const p = path.join(baseDir, name, "source.osm.pbf");
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`No pinned source.osm.pbf under ${baseDir}`);
}

function runOsmium(args: string[], label: string) {
  console.log(`osmium ${args.slice(0, 6).join(" ")} …`);
  const r = spawnSync("osmium", args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${label} failed (exit ${r.status})`);
}

function geometryAreaApprox(geom: Polygon | MultiPolygon): number {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let area = 0;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring || ring.length < 3) continue;
    let s = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      s += ring[i]![0]! * ring[i + 1]![1]! - ring[i + 1]![0]! * ring[i]![1]!;
    }
    area += Math.abs(s / 2);
  }
  return area;
}

function shouldInclude(props: Record<string, unknown>): boolean {
  const name = String(props.name ?? props["name:en"] ?? "");
  const wd = String(props.wikidata ?? "");
  if (EXCLUDE_WIKIDATA.has(wd)) return false;
  if (EXCLUDE_NAME_MATCHERS.some((re) => re.test(name))) return false;
  if (INCLUDE_WIKIDATA.has(wd)) return true;
  if (INCLUDE_NAME_MATCHERS.some((re) => re.test(name))) return true;
  return false;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region) as ReturnType<typeof loadRegionConfig> & {
    source_pbf_dir?: string;
    coverage_policy?: { polygons_path?: string };
  };

  const pbfBase = path.join(
    EXPLORE_PACKAGE_ROOT,
    region.source_pbf_dir ?? "data/osm/geofabrik/britain-and-ireland"
  );
  const sourcePbf = args.pbf ? path.resolve(args.pbf) : findPinnedPbf(pbfBase);
  console.log(`Source PBF: ${sourcePbf}`);

  const workDir = path.join(EXPLORE_PACKAGE_ROOT, "data/osm/work/coverage");
  fs.mkdirSync(workDir, { recursive: true });
  const adminPbf = path.join(workDir, "admin-level-2.osm.pbf");
  const exportGeojson = path.join(workDir, "admin-level-2.geojson");

  // Relations with admin_level=2 + referenced members for polygon assembly.
  runOsmium(
    [
      "tags-filter",
      "-o",
      adminPbf,
      "--overwrite",
      sourcePbf,
      "r/admin_level=2",
    ],
    "tags-filter admin_level=2"
  );

  runOsmium(
    [
      "export",
      "-f",
      "geojson",
      "--geometry-types=polygon",
      "-o",
      exportGeojson,
      "--overwrite",
      adminPbf,
    ],
    "export polygons"
  );

  const raw = JSON.parse(fs.readFileSync(exportGeojson, "utf8")) as FeatureCollection;
  const candidates: Feature[] = [];
  for (const f of raw.features) {
    if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) {
      continue;
    }
    const props = (f.properties ?? {}) as Record<string, unknown>;
    if (String(props.admin_level ?? "") !== "2" && !props.wikidata) {
      // still allow wikidata matches
    }
    if (!shouldInclude(props)) continue;
    candidates.push({
      type: "Feature",
      properties: {
        name: props.name ?? props["name:en"] ?? null,
        wikidata: props.wikidata ?? null,
        admin_level: props.admin_level ?? "2",
        include: true,
      },
      geometry: f.geometry,
    });
  }

  // Deduplicate by wikidata/name keeping largest polygon
  const byKey = new Map<string, Feature>();
  for (const f of candidates) {
    const p = f.properties as { wikidata?: string; name?: string };
    const key = String(p.wikidata ?? p.name ?? Math.random());
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, f);
      continue;
    }
    const a = geometryAreaApprox(f.geometry as Polygon | MultiPolygon);
    const b = geometryAreaApprox(prev.geometry as Polygon | MultiPolygon);
    if (a > b) byKey.set(key, f);
  }

  const features = [...byKey.values()];
  if (features.length < 2) {
    throw new Error(
      `Expected UK + Ireland polygons, got ${features.length}. Check osmium admin extract.`
    );
  }

  const outRel =
    region.coverage_policy?.polygons_path ?? "catalogues/coverage/uk-and-ireland.geojson";
  const outPath = path.join(EXPLORE_PACKAGE_ROOT, outRel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        type: "FeatureCollection",
        name: "uk-and-ireland-coverage",
        features,
        properties: {
          region_id: region.region_id,
          exclude: ["Isle of Man", "Jersey", "Guernsey"],
          attribution: "© OpenStreetMap contributors",
          licence: "ODbL 1.0",
          generated_at: new Date().toISOString(),
          source_pbf: sourcePbf,
        },
      },
      null,
      2
    )
  );

  console.log(`Wrote ${outPath}`);
  console.log(`Polygons: ${features.length}`);
  for (const f of features) {
    const p = f.properties as { name?: string; wikidata?: string };
    console.log(`  - ${p.name ?? "?"} (${p.wikidata ?? "no wd"})`);
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
