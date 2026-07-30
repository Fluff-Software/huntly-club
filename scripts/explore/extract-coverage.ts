/**
 * Extract admin coverage MultiPolygon from a pinned Geofabrik PBF via osmium.
 *
 * Usage:
 *   npm run extract:coverage -- --region uk-and-ireland
 *   npm run extract:coverage -- --region philippines
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { loadRegionConfig } from "./generate-catalogue.js";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";

type CoverageRules = {
  /** osmium tags-filter expression(s) for admin relations */
  osmiumFilters: string[];
  includeNameMatchers: RegExp[];
  includeWikidata: Set<string>;
  excludeNameMatchers: RegExp[];
  excludeWikidata: Set<string>;
  /**
   * When country-level multipolygons do not assemble via osmium export
   * (Philippines), accept administrative pieces that represent the country.
   */
  fallbackAdminLevels?: Set<string>;
  requireIso3166PhPrefix?: boolean;
  minPolygons: number;
  coverageName: string;
  excludeLabels: string[];
  expectedLabel: string;
};

const COVERAGE_BY_REGION: Record<string, CoverageRules> = {
  "uk-and-ireland": {
    osmiumFilters: ["r/admin_level=2"],
    includeNameMatchers: [
      /^united kingdom$/i,
      /^ireland$/i,
      /^éire$/i,
      /^republic of ireland$/i,
    ],
    includeWikidata: new Set([
      "Q145", // United Kingdom
      "Q27", // Ireland (Republic)
    ]),
    excludeNameMatchers: [/isle of man/i, /^jersey$/i, /^guernsey$/i],
    excludeWikidata: new Set([
      "Q9676", // Isle of Man
      "Q785", // Jersey
      "Q25230", // Guernsey
    ]),
    minPolygons: 2,
    coverageName: "uk-and-ireland-coverage",
    excludeLabels: ["Isle of Man", "Jersey", "Guernsey"],
    expectedLabel: "UK + Ireland",
  },
  philippines: {
    // Country relation r443174 / Q928 exists but does not assemble as a polygon
    // via osmium export (member graph is region/province subareas). Coverage is
    // therefore built from admin_level=3 PH regions from the same PBF revision.
    osmiumFilters: ["r/admin_level=3", "r/wikidata=Q928", "r/admin_level=2"],
    includeNameMatchers: [/^philippines$/i, /^republika ng pilipinas$/i],
    includeWikidata: new Set([
      "Q928", // Philippines
    ]),
    excludeNameMatchers: [],
    excludeWikidata: new Set(),
    fallbackAdminLevels: new Set(["3"]),
    requireIso3166PhPrefix: true,
    minPolygons: 10,
    coverageName: "philippines-coverage",
    excludeLabels: [],
    expectedLabel: "Philippines (Q928 via admin_level=3 regions)",
  },
};

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

function shouldIncludeCountry(props: Record<string, unknown>, rules: CoverageRules): boolean {
  const name = String(props.name ?? props["name:en"] ?? "");
  const wd = String(props.wikidata ?? "");
  if (rules.excludeWikidata.has(wd)) return false;
  if (rules.excludeNameMatchers.some((re) => re.test(name))) return false;
  if (rules.includeWikidata.has(wd)) return true;
  if (rules.includeNameMatchers.some((re) => re.test(name))) return true;
  return false;
}

function isPhIso(props: Record<string, unknown>): boolean {
  const iso = String(props["ISO3166-2"] ?? props.int_ref ?? "");
  return /^PH-/i.test(iso);
}

function shouldIncludeFallback(props: Record<string, unknown>, rules: CoverageRules): boolean {
  if (!rules.fallbackAdminLevels) return false;
  const admin = String(props.admin_level ?? "");
  if (!rules.fallbackAdminLevels.has(admin)) return false;
  if (String(props.boundary ?? "") !== "administrative") return false;
  const name = String(props.name ?? props["name:en"] ?? "");
  const wd = String(props.wikidata ?? "");
  if (!name || !wd) return false;
  if (rules.requireIso3166PhPrefix) {
    // Prefer PH ISO codes; allow named PH regions without ISO (e.g. Negros Island Region).
    if (isPhIso(props)) return true;
    const iso = String(props["ISO3166-2"] ?? props.int_ref ?? "");
    if (iso && !/^PH-/i.test(iso)) return false;
    return true;
  }
  return true;
}

function dedupeLargest(candidates: Feature[]): Feature[] {
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
  return [...byKey.values()];
}

function exportAdminPolygons(sourcePbf: string, workDir: string, filterExpr: string, stem: string) {
  const adminPbf = path.join(workDir, `${stem}.osm.pbf`);
  const exportGeojson = path.join(workDir, `${stem}.geojson`);
  runOsmium(
    ["tags-filter", "-o", adminPbf, "--overwrite", sourcePbf, filterExpr],
    `tags-filter ${filterExpr}`
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
    `export ${stem}`
  );
  return JSON.parse(fs.readFileSync(exportGeojson, "utf8")) as FeatureCollection;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rules = COVERAGE_BY_REGION[args.region];
  if (!rules) {
    throw new Error(
      `No coverage extract rules for region "${args.region}". Add an entry in COVERAGE_BY_REGION or place catalogues/coverage/${args.region}.geojson manually.`
    );
  }

  const region = loadRegionConfig(args.region) as ReturnType<typeof loadRegionConfig> & {
    source_pbf_dir?: string;
    coverage_policy?: { polygons_path?: string };
  };

  const pbfBase = path.join(
    EXPLORE_PACKAGE_ROOT,
    region.source_pbf_dir ?? `data/osm/geofabrik/${args.region}`
  );
  const sourcePbf = args.pbf ? path.resolve(args.pbf) : findPinnedPbf(pbfBase);
  console.log(`Source PBF: ${sourcePbf}`);

  const workDir = path.join(EXPLORE_PACKAGE_ROOT, "data/osm/work/coverage", args.region);
  fs.mkdirSync(workDir, { recursive: true });

  const countryCandidates: Feature[] = [];
  const fallbackCandidates: Feature[] = [];

  for (const [i, filterExpr] of rules.osmiumFilters.entries()) {
    const raw = exportAdminPolygons(sourcePbf, workDir, filterExpr, `filter-${i}`);
    for (const f of raw.features) {
      if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) {
        continue;
      }
      const props = (f.properties ?? {}) as Record<string, unknown>;
      if (shouldIncludeCountry(props, rules)) {
        countryCandidates.push({
          type: "Feature",
          properties: {
            name: props.name ?? props["name:en"] ?? null,
            wikidata: props.wikidata ?? null,
            admin_level: props.admin_level ?? "2",
            include: true,
            coverage_role: "country",
          },
          geometry: f.geometry,
        });
      } else if (shouldIncludeFallback(props, rules)) {
        fallbackCandidates.push({
          type: "Feature",
          properties: {
            name: props.name ?? props["name:en"] ?? null,
            wikidata: props.wikidata ?? null,
            admin_level: props.admin_level ?? null,
            iso3166_2: props["ISO3166-2"] ?? props.int_ref ?? null,
            include: true,
            coverage_role: "region_proxy_for_Q928",
          },
          geometry: f.geometry,
        });
      }
    }
  }

  let features = dedupeLargest(countryCandidates);
  let assembly = "country_admin_level_2";
  if (features.length < rules.minPolygons && fallbackCandidates.length > 0) {
    features = dedupeLargest(fallbackCandidates);
    assembly = "admin_level_3_regions_proxy_for_Q928";
    console.log(
      `Country polygon did not assemble via osmium (${countryCandidates.length} matches). ` +
        `Using ${features.length} admin_level=3 region polygons as Philippines (Q928) coverage.`
    );
  }

  if (features.length < rules.minPolygons) {
    throw new Error(
      `Expected ${rules.expectedLabel} polygons (≥${rules.minPolygons}), got ${features.length}. Check osmium admin extract.`
    );
  }

  const outRel =
    region.coverage_policy?.polygons_path ?? `catalogues/coverage/${args.region}.geojson`;
  const outPath = path.join(EXPLORE_PACKAGE_ROOT, outRel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        type: "FeatureCollection",
        name: rules.coverageName,
        features,
        properties: {
          region_id: region.region_id,
          ...(args.region === "philippines" ? { wikidata: "Q928" } : {}),
          assembly,
          exclude: rules.excludeLabels,
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
  console.log(`Polygons: ${features.length} (assembly=${assembly})`);
  for (const f of features) {
    const p = f.properties as { name?: string; wikidata?: string; iso3166_2?: string };
    console.log(`  - ${p.name ?? "?"} (${p.wikidata ?? "no wd"}${p.iso3166_2 ? ` ${p.iso3166_2}` : ""})`);
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
