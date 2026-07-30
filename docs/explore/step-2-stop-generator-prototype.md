# Huntly World Explore — Step 2: Deterministic Stop Generator Prototype

**Date:** 2026-07-23  
**Depends on:** [`docs/explore/step-1-project-review.md`](./step-1-project-review.md)  
**Code:** `scripts/explore/`

---

## Prototype architecture

```text
scripts/explore/
  config.ts              # bbox, version, spacing, buffers
  types.ts
  stable-hash.ts         # FNV-1a hash, stop IDs, priorities
  safety-rules.ts        # classify features + reject unsafe points
  environment.ts         # deterministic environment scores
  generate-stops.ts      # pure generator (no I/O, no database)
  run.ts                 # CLI → GeoJSON + summary
  fixtures/test-area.geojson
  output/                # generated artefacts (gitignored)
  __tests__/
```

Flow:

1. Load a GeoJSON FeatureCollection of OSM-like features  
2. Classify sources vs hazards vs environment layers  
3. Generate line / area candidates deterministically  
4. Try fixed alternative offsets when unsafe  
5. Rank survivors by stable priority hash and enforce minimum spacing  
6. Assign public `stop_id` + environment profile  
7. Write GeoJSON (files only — never Supabase)

The generator is a **pure function** of `(features, config)`. Re-running with the same inputs always yields the same accepted stop IDs and coordinates.

---

## Test-area configuration

Defaults in `scripts/explore/config.ts`:

| Setting | Value |
| --- | --- |
| Label | Placeholder park-scale bbox (west London-ish) — **replace for MVP field tests** |
| `minLatitude` | `51.452` |
| `minLongitude` | `-0.298` |
| `maxLatitude` | `51.462` |
| `maxLongitude` | `-0.282` |
| `generationVersion` | `1` |
| `minimumStopSpacingMeters` | `150` |
| `lineCandidateSpacingMeters` | `150` |
| `coordinateDecimals` | `6` |

No production region was documented in Step 1, so this bbox is an explicit placeholder. Change the four bounds (and supply matching map data) when a real test town is chosen.

---

## Source map data

| Item | Detail |
| --- | --- |
| Default source | `scripts/explore/fixtures/test-area.geojson` |
| Nature | Small **synthetic** OSM-tagged FeatureCollection sized for the placeholder bbox |
| Safe to commit | Yes — this fixture only |
| Not for git | Large `.osm` / `.osm.pbf` / regional GeoJSON under `fixtures/local/` (ignored) |
| Licence | Fixture uses OSM-style tags for testing. Real extracts are **ODbL** — © OpenStreetMap contributors ([copyright](https://www.openstreetmap.org/copyright)) |
| Refresh | Convert a bbox extract to GeoJSON with stable `properties.id` (`way/123`, …); see `scripts/explore/fixtures/README.md` |

The generator does **not** call Overpass or any live API at runtime.

---

## Supported feature types

### Supported in this prototype

**Lines**

- `footpath` (`highway=footway`)
- `path` (`highway=path`)
- `pedestrian` / plaza polygons tagged as pedestrian
- `sidewalk` (`footway=sidewalk`) — classification supported
- `cycleway_walk` (`highway=cycleway` + `foot=yes|designated`) — classification supported

**Areas**

- `park`
- `garden` (non-private)
- `recreation_ground`
- `plaza`
- `common`

### Deferred

- Libraries / museums / community centres / attractions as primary sources  
- Shops with entrance / pavement offset placement  
- Preferring mapped paths *inside* parks as the preferred area seed (grid interior is used for now)  
- Trunk-road centreline generation (trunks are hazards only)  
- Real OSM PBF parsing (ingest GeoJSON instead)

---

## Candidate-generation rules

### Lines

1. Measure line length  
2. `offset = stableHash(version + featureId) % spacing`  
3. Place candidates at `offset`, `offset + spacing`, … while `0 < d < length`  
4. Default spacing: **150 m**

### Areas

1. Build a deterministic grid over the polygon bbox  
2. Keep points inside the polygon and ≥ ~8 m from the ring  
3. Cap at `maxAreaCandidatesPerFeature` (default 12)  
4. Order by stable candidate index

### Alternatives (fixed order)

- **Lines:** along-track offsets `0, -25, +25, -50, +50` metres  
- **Areas:** fixed lat/lon nudges (~25 m N/S/E/W) that must remain inside the source polygon  

No uncontrolled randomness.

---

## Safety rules

Reject (with reason) when a candidate is:

| Reason | Meaning |
| --- | --- |
| `outside_test_area` | Outside configured bbox |
| `inside_water` / `too_close_to_water` | Water / wetland / waterway (+ buffer) |
| `inside_building` | Building footprint |
| `on_motorway` / `too_close_to_motorway` | Motorway (+ buffer) |
| `on_trunk_road` / `too_close_to_trunk_road` | Trunk (+ buffer) |
| `on_railway` / `too_close_to_railway` | Railway (+ buffer) |
| `private_access` / `inside_private_garden` | Private / no access |
| `outside_source_area` | Area alternative left the park polygon |
| `unsupported_feature` | Unclassified source |
| `too_close_to_existing_stop` | Lost spacing competition |
| `no_safe_alternative` | All alternatives failed |

Conservative defaults favour rejection over uncertain acceptance.

---

## Stable stop-ID method

Once a candidate passes safety + spacing:

```text
material = version | sourceType | sourceFeatureId | candidateIndex | lat | lon
stop_id  = "stop_" + fnv1a32_hex(material)
```

- Coordinates rounded to **6 decimal places** (~0.11 m) before hashing  
- Internal candidate ids use the same hash family without final coordinates  
- Spacing priority uses `priority|version|type|featureId|index`  

IDs are **not** stored in any database in this step.

---

## Spacing rules

1. Assign each safety-survivor a `priorityKey` (stable hash)  
2. Sort ascending by `priorityKey` (tie-break on feature id + index)  
3. Greedily accept if ≥ `minimumStopSpacingMeters` from all already accepted  
4. Else reject with `too_close_to_existing_stop`  

Result does not depend on GeoJSON feature read order (sources are sorted by id; spacing uses priority hash).

---

## Environment scoring

For each accepted stop, score nearby features within `environmentRadiusMeters` (default 100 m):

`freshwater`, `wetland`, `woodland`, `grassland`, `farmland`, `urban`, `park_garden`

Park/garden source types boost `park_garden`. If nothing meaningful is found, return `{ "general": 1 }`.

Scores are deterministic heuristics for later card weighting — not ecological models.

---

## How to run

```bash
cd scripts/explore
npm install
npm test
npm run generate
```

---

## How to inspect GeoJSON

1. Open `output/accepted-stops.geojson` and `output/rejected-candidates.geojson` in geojson.io or QGIS  
2. Filter rejected features by `rejection_reason`  
3. Read `output/summary.json` for counts  

Accepted properties include: `stop_id`, `generation_version`, `source_type`, `source_feature_id`, `candidate_index`, `confidence`, `environment_profile`, `accepted_reason`.

---

## Test results

Command: `cd scripts/explore && npm test`

| Result | Detail |
| --- | --- |
| **Pass** | 3 files, **17 tests** |
| Coverage | Identical output; order independence; stable IDs; water / private / motorway rejection; park + path acceptance; spacing dedup; environment repeatability; no DB writes |

Generator re-run check: writing `accepted-stops.geojson` twice produced a **byte-identical** file.

### Latest fixture run (placeholder bbox)

| Metric | Value |
| --- | --- |
| Source features processed | 5 |
| Candidates generated | 38 |
| Accepted | 11 |
| Rejected | 42 |
| `too_close_to_existing_stop` | 23 |
| `too_close_to_motorway` | 19 |
| By source | park 6, path 3, footpath 1, plaza 1 |
| Min NN spacing | 157 m |
| Avg NN spacing | 209.8 m |

---

## Known limitations

- Synthetic fixture, not a real OSM extract  
- Area candidates use a grid, not path/entrance preference inside parks  
- Buildings / shops / libraries not primary sources yet  
- Safety buffers are flat metre thresholds (no grade-separated nuance)  
- Environment scores are coarse  
- No production caching, claiming, or mobile UI  
- `@turf/turf` dependency is for the prototype only (isolated package)

---

## Recommended Step 3

**Field-safety review on a real small OSM extract:**

1. Pick a real MVP bbox (town park / neighbourhood)  
2. Import a small ODbL GeoJSON extract into `fixtures/local/`  
3. Re-run the generator and inspect accepted/rejected layers in QGIS  
4. Tune buffers / supported tags from observed false positives/negatives  
5. Optionally add a developer-only map screen later — still without claims or cards  

Do **not** add `explore_locations` or claim RPCs until generation quality is trusted for that region.

---

## Confirmations

- Generated stops are **not** stored in Supabase  
- User position does **not** influence stop placement (not an input)  
- Re-running the generator with the same fixture + config produces **identical** results  
