/**
 * CLI entry for the Explore stop-generator prototype.
 * Writes GeoJSON + HTML review map under scripts/explore/output/ — never touches Supabase.
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_TEST_AREA_LABEL,
  LOCAL_OSM_GEOJSON_PATH,
  SYNTHETIC_FIXTURE_PATH,
  mergeConfig,
} from "./config.js";
import {
  formatSummary,
  generateStops,
  toAcceptedGeoJson,
  toRejectedGeoJson,
} from "./generate-stops.js";
import { buildReviewMapHtml } from "./review-map.js";
import { buildReviewSample, toReviewSampleGeoJson } from "./review-sample.js";
import type { FeatureCollection } from "geojson";

function parseArgs(argv: string[]): { source?: string; out?: string; fixture?: boolean } {
  const out: { source?: string; out?: string; fixture?: boolean } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--source" && argv[i + 1]) out.source = argv[++i];
    else if (a === "--out" && argv[i + 1]) out.out = argv[++i];
    else if (a === "--fixture") out.fixture = true;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const defaultSource = args.fixture
    ? SYNTHETIC_FIXTURE_PATH
    : LOCAL_OSM_GEOJSON_PATH;

  const config = mergeConfig({
    sourceGeoJsonPath: args.source ? path.resolve(args.source) : defaultSource,
    ...(args.out ? { outputDir: path.resolve(args.out) } : {}),
    ...(args.fixture
      ? {
          // Synthetic fixture uses the Step 2 bbox embedded in that file.
          minLatitude: 51.452,
          minLongitude: -0.298,
          maxLatitude: 51.462,
          maxLongitude: -0.282,
        }
      : {}),
  });

  if (!fs.existsSync(config.sourceGeoJsonPath)) {
    console.error(`Source GeoJSON not found: ${config.sourceGeoJsonPath}`);
    if (config.sourceGeoJsonPath === LOCAL_OSM_GEOJSON_PATH) {
      console.error("Run `npm run prepare:osm` first (requires network), or `npm run generate -- --fixture`.");
    }
    process.exit(1);
  }

  const raw = fs.readFileSync(config.sourceGeoJsonPath, "utf8");
  const collection = JSON.parse(raw) as FeatureCollection;

  const result = generateStops(collection, config);
  const sample = buildReviewSample(result.accepted, config);
  result.summary.reviewSampleSize = sample.length;
  if (result.summary.comparisonWithStep3) {
    result.summary.comparisonWithStep3.reviewSampleAfter = sample.length;
  }

  fs.mkdirSync(config.outputDir, { recursive: true });
  const acceptedPath = path.join(config.outputDir, "accepted-stops.geojson");
  const rejectedPath = path.join(config.outputDir, "rejected-candidates.geojson");
  const samplePath = path.join(config.outputDir, "review-sample.geojson");
  const summaryPath = path.join(config.outputDir, "summary.json");
  const mapPath = path.join(config.outputDir, "review-map.html");

  const acceptedGj = toAcceptedGeoJson(result.accepted);
  const rejectedGj = toRejectedGeoJson(result.rejected);
  const sampleGj = toReviewSampleGeoJson(sample);

  fs.writeFileSync(acceptedPath, JSON.stringify(acceptedGj, null, 2));
  fs.writeFileSync(rejectedPath, JSON.stringify(rejectedGj, null, 2));
  fs.writeFileSync(samplePath, JSON.stringify(sampleGj, null, 2));
  fs.writeFileSync(summaryPath, JSON.stringify(result.summary, null, 2));
  fs.writeFileSync(
    mapPath,
    buildReviewMapHtml({
      accepted: acceptedGj,
      rejected: rejectedGj,
      reviewSample: sampleGj,
      summary: result.summary,
      areaLabel: DEFAULT_TEST_AREA_LABEL,
    })
  );

  console.log(DEFAULT_TEST_AREA_LABEL);
  console.log(`Source: ${config.sourceGeoJsonPath}`);
  console.log(formatSummary(result.summary));
  console.log(`Wrote ${acceptedPath}`);
  console.log(`Wrote ${rejectedPath}`);
  console.log(`Wrote ${samplePath}`);
  console.log(`Wrote ${summaryPath}`);
  console.log(`Wrote ${mapPath}`);
  console.log("Open review-map.html in a desktop browser for remote review.");
  console.log("Note: generated stops are not stored in any database.");
}

main();
