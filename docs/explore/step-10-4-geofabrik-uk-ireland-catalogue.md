# Huntly World Explore — Step 10.4: UK and Republic of Ireland Catalogue from Geofabrik PBF

**Date:** 2026-07-24  
**Depends on:** Step 10.3  
**Status:** Phases A–C + **10.4A/B** complete. **National generate + validate completed.** Next: [Step 10.5 bulk import](./step-10-5-national-bulk-import-and-hosted-benchmark.md). **National catalogue NOT activated. Stoke remains active.**

---

## Decision

Expand coverage to England, Scotland, Wales, Northern Ireland, and the Republic of Ireland using a **Geofabrik** `britain-and-ireland` `.osm.pbf` extract.

- No Overpass for national preparation  
- No runtime architecture change (Mobile → Edge → PostGIS)  
- Offline generation only  
- Stoke catalogue stays available; national activation is explicit and later  

---

## Pinned Geofabrik source (Phase B)

| Field | Value |
| --- | --- |
| Dataset | `britain-and-ireland` |
| URL | `https://download.geofabrik.de/europe/britain-and-ireland-latest.osm.pbf` |
| Local path | `scripts/explore/data/osm/geofabrik/britain-and-ireland/2026-07-24_7093f494b688/source.osm.pbf` |
| Revision dir | `2026-07-24_7093f494b688` |
| Size | **2,579,117,383** bytes (**2.40 GiB**) |
| SHA-256 | `7093f494b6884243ca37cb5eb4fcc5c572b15001c184c2ce9a54d583acae47db` |
| Download duration | **62.7 s** |
| Disk after pin | ~**74–77 GiB** free (later ~**73 GiB** after partitions) |
| Metadata | `…/source-metadata.json` |

Tooling: `osmium-tool` **1.19.1** via Homebrew; `npm run check:pbf-tools` OK.

---

## Coverage polygon (Phase B)

- Path: `catalogues/coverage/uk-and-ireland.geojson` (~5.1 MB)  
- Features: **United Kingdom** + **Éire / Ireland** (admin_level=2 / wikidata Q145 + Q27)  
- Inclusion: **point-in-polygon** (not Geofabrik bbox alone)  
- Verified excludes: Isle of Man, Jersey, Guernsey  
- Verified includes: London, Dublin, Belfast, Shetland  

Extract: `npm run extract:coverage -- --region uk-and-ireland`

---

## PBF partitions (Phase B)

Stage A: one `osmium tags-filter` → `partitions/filtered-tags.osm.pbf` (**2.27 GiB**) + `filtered-tags.done`  
Stage B: **42** × **2°** regional extracts — **42 complete / 0 failed**  
Manifest: `…/partitions/partition-manifest.json`  
Resume: `npm run extract:partitions -- --region uk-and-ireland --resume`  
Force rebuild: `--force`

Never converts the whole PBF to one GeoJSON; Node never loads the national PBF.

---

## Stoke PBF parity (Phase C)

Report: `output/catalogues/parity/stoke-pbf-parity.json`

| Metric | Result |
| --- | --- |
| Hard gate | **PASS** (`ok: true`) |
| Expected / actual count | **1402 / 1402** (ratio 1.0) |
| Matched IDs | **1387** (Jaccard **0.979**) |
| Only-expected / only-actual | 15 / 15 (OSM revision drift) |
| Coord / type / source mismatches | **0 / 0 / 0** |
| Min spacing | **150 m** |
| Env profile mismatches | **923** (soft) |

**Env soft-warning explanation:** Geofabrik PBF export retains denser landuse/natural/building context than the Overpass Stoke query (~151k mapped features in bbox vs ~79k Overpass). Safety decisions and stop IDs remain aligned; environment *weights* shift. Not treated as unexplained safety-rule failure.

Command: `npm run parity:stoke -- --region uk-and-ireland`

---

## Representative benchmarks (Phase C)

Report: `output/catalogues/benchmarks/uk-and-ireland-benchmark.json`  
Method: per-tile PBF extract (0.02° + 400 m) from filtered PBF → `generateStops` → spacing.

| Area | km² | Features (sum) | Accepted | Density /km² | Gen ms | Peak heap MB |
| --- | --- | --- | --- | --- | --- | --- |
| Central London | 18.5 | 314,719 | 409 | 22.1 | 3,188,813 | 172.9 |
| Suburban Stoke | 2.7 | 11,783 | 36 | 13.3 | 20,098 | 72.2 |
| Rural England | 59.3 | 45,744 | 286 | 4.8 | 61,103 | 31.8 |
| Wales | 74.4 | 19,297 | 337 | 4.5 | 84,041 | 33.2 |
| Scottish Highlands | 100.8 | 1,497 | 81 | 0.8 | 4,414 | 24.0 |
| Belfast | 23.0 | 295,491 | 287 | 12.5 | 696,558 | 90.9 |
| Dublin | 23.7 | 413,958 | 382 | 16.1 | 1,623,731 | 118.2 |
| Coastal / Wight | 117.7 | 200,078 | 664 | 5.6 | 334,419 | 67.3 |

### Chosen national parameters

| Parameter | Choice |
| --- | --- |
| Chunk span | **0.02°** (London ~45k features/tile; larger spans too costly) |
| Safety pad | **400 m** |
| Workers | **4** (try 8 only with RAM headroom) |
| Partition strategy | **2°** Stage B partitions; chunk extract prefers containing partition PBF |
| Output | **NDJSON** + `catalogue-summary.json` |
| Global spacing | **grid-neighbour** (`national/spacing.ts`) — not O(n²) |
| Coverage | Skip sea chunks via simplified PIP/bbox index before extract |

### Calibrated full-run projections

Naive sample×Geofabrik-bbox projections were discarded (inflated land area + export-dominated empty tiles).

| Projection | Estimate |
| --- | --- |
| Land area (UK+ROI) | ~**315,000 km²** |
| Blended density | ~**7.1 / km²** |
| Final point count | ~**2.25 M** |
| Duration @ 1 worker | ~**38 h** (post-10.4A) |
| Duration @ 4 workers | ~**12.7 h** (post-10.4A; was ~480 h) |
| Duration @ 8 workers | ~**6.3 h** (post-10.4A) |
| Peak RAM / worker | ~**200 MB** heap (osmium separate) |
| Temp disk | ~**25 GiB** (source + filtered + partitions + work) |
| Final catalogue NDJSON | ~**0.7 GiB** |

Assumes partition-local extracts (~5× rural export speedup vs rescanning 2.3 GiB each tile). Urban fraction ±50% swings duration.

Envelope chunk count at 0.02° ≈ **386k**; approx land-centre hits ≈ **177k** (sea skipped).

---

## Full-run command (implemented, not executed)

```bash
cd scripts/explore
npm run generate:catalogue:national -- \
  --region uk-and-ireland \
  --workers 4 \
  --chunk-span 0.02 \
  --pad-metres 400 \
  --resume \
  --confirm-full-run
```

Without `--confirm-full-run`, the entrypoint prints this command and **starts no chunk work**.  
Gates require: coverage polygon, Stoke parity `ok`, Phase C + **optimised** benchmark reports present (optimised gate must not be `fail`).

### National validation (post-generate)

```bash
cd scripts/explore
npm run validate:catalogue:national -- \
  --region uk-and-ireland \
  --build-dir output/catalogues/uk-and-ireland/build_2026-07-24T23-11-06-550Z_aa8033
```

Streams `catalogue.ndjson` (does not load the full catalogue as row objects). Updates `validation_status` on the build manifest. Does **not** import or activate. City-scale `validate:catalogue` still expects `catalogue.json` and is not used for national builds.

**Count semantics:** `chunk accepted` sum is pre-merge; authoritative final count is unique rows in `catalogue.ndjson` after coverage filter + 150 m spacing.

---

## Runtime confirmation

Unchanged from 10.3:

- No Overpass / PBF / generateStops on user requests  
- Nearby = PostGIS GiST  
- Verify/claim = stored coordinates + env/type  
- Mobile has no national catalogue embedded  
- **Stoke not retired; national not imported/activated**

---

## Go / no-go

| Gate | Status |
| --- | --- |
| Tooling + pinned PBF | Pass |
| Coverage polygon + excludes | Pass |
| Partitions + checkpoints | Pass |
| Stoke parity hard gate | **Pass** |
| Unexplained safety/relation failure | **None** (env soft-diff explained) |
| Benchmarks + params chosen | Pass |
| Full-run CLI gated | Pass |
| Disk (~73 GiB free) | Adequate for generate |
| Hosted import/activate | **Not in scope — blocked** |

### Recommendation: **YES — ready to start the full run** (post-10.4A + 10.4B)

Correctness gates remain satisfied. After **Step 10.4A**, expected wall-clock @ 4 workers is **~13 hours** (optimistic ~11 h, pessimistic ~17 h) — **under 24 hours**. **Step 10.4B** measured worker scaling on this M1 16 GB Mac and selected **`--workers 4`** (6 workers only +7%; 8 not tested). Details: [`step-10-4a-national-generator-optimisation.md`](./step-10-4a-national-generator-optimisation.md), [`step-10-4b-worker-scaling-and-run-readiness.md`](./step-10-4b-worker-scaling-and-run-readiness.md).

Use `--resume` after interruptions. **Do not activate** the national catalogue or retire Stoke until a later explicit step.

---

## Step 10.4A optimisation (summary)

- **RBush** spatial index; exact Turf safety checks unchanged  
- Regional block reuse (one extract/classify/index → many cells)  
- London **57×** faster; Stoke suburban live A/B **11×**, Jaccard 1.0  
- Global spacing: 2.5M points in ~2.3 s  
- Projected **~12.7 h @ 4 workers** (`ideal_pass`)  
- Env soft-diffs: richer PBF context + id dedupe; PBF env is national source of truth  

---

## Attribution

- Data: © OpenStreetMap contributors — [ODbL](https://www.openstreetmap.org/copyright)  
- Extract distributor: Geofabrik GmbH (not the data owner)  
