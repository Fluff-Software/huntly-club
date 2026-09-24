# Huntly World Explore — Step 10.3: Persisted Explore Point Catalogue

**Date:** 2026-07-24  
**Depends on:** Steps 1–9, 10.2  
**Status:** Active runtime design — full Stoke catalogue **generated + validated offline**; hosted import/activate pending  
**Supersedes:** Step 10.2 on-demand OSM tile acquisition / Edge `generateStops` for user-facing nearby

---

## Goal

Ship Explore nearby as a **PostGIS point catalogue**:

1. Prepare OSM offline  
2. Run the deterministic generator offline  
3. Validate + import into Postgres  
4. Activate a catalogue version  
5. Nearby / verify / claim read **stored** points only  

No Overpass, no Edge stop generation, no `map_data_preparing` on the user path.

**First region:** full Stoke-on-Trent (not Sneyd Green alone).

---

## Architecture decision

**Runtime:**

```
Mobile (coords + radius)
  → explore-nearby Edge Function
      → JWT + rate limit
      → get_explore_points_nearby (PostGIS)
      → compact points
```

**Offline (never on user request):**

```
prepare:osm --region …
  → fixtures/local/<region>.geojson
generate:catalogue --region …
  → output/catalogues/<region>/catalogue.json
validate:catalogue
import:catalogue [--activate]
  → explore_point_catalogue_versions + explore_points
```

**Why:** Step 10.2 measured Bristol cold warm-up at **~12 minutes without points**, ending in `WORKER_RESOURCE_LIMIT`. Cached PostGIS delivery can meet a few-second UX; live Overpass + Edge CPU cannot.

**Claims / cards / binder:** unchanged RPCs. Verify/claim load authoritative lat/lon + `source_type` + `environment_profile` from `explore_points`.

---

## Migration table (10.2 → 10.3)

| Current component | Keep | Replace | Offline only | Remove later |
| --- | --- | --- | --- | --- |
| Generator + safety rules | Yes | — | Catalogue build | — |
| Overpass / `prepare:osm` | — | — | Yes (tiled for city scale) | Live user path |
| Edge OSM tiles / stop caches | — | PostGIS catalogue | Seed comparison | After rollback window |
| `map_data_preparing` client polling | — | Single query | — | — |
| `claim_explore_stop` / cards / binder | Yes | Point authority from DB | — | — |
| DEV GPS presets | Yes | — | — | — |
| Local Node `scripts/explore/serve` | Dev parity | — | Yes | Prod dependency |

---

## Point schema

Tables (migration `20260724120000_explore_persisted_point_catalogue.sql`):

### `explore_point_catalogue_versions`

- `region_id`, `generation_version`, `source_revision`
- `status`: building | validating | ready | active | retired | failed
- `point_count`, `coverage_km2`, timestamps, `metadata`

### `explore_points`

| Column | Role |
| --- | --- |
| `id` | Stable `stop_*` id (PK with catalogue version) |
| `latitude` / `longitude` | Authoritative coordinates |
| `location` | Generated `geography(Point,4326)` |
| `point_type` | smallint 1–11 |
| `source_type` | string for claims audit |
| `environment_profile` | jsonb for weighted awards (Option A) |
| `generation_version`, `source_revision`, `active` | versioning |

**GiST index** on `location`. Nearby uses `ST_DWithin` + `ST_Distance` via RPC `get_explore_points_nearby`.

Compact API point shape (plus distance):

```json
{ "id": "stop_…", "latitude": 53.04, "longitude": -2.16, "type": 1 }
```

Runtime also returns `source_type` / `environment_profile` for claim continuity (server-side; not for client weighting UI).

---

## Point type integers

Shared modules:

- `scripts/explore/point-types.ts`
- `supabase/functions/_shared/explore/point-types.ts`
- `apps/mobile/constants/explorePointTypes.ts`

| Code | `source_type` |
| ---: | --- |
| 1 | footpath |
| 2 | path |
| 3 | sidewalk |
| 4 | cycleway_walk |
| 5 | plaza |
| 6 | park |
| 7 | garden |
| 8 | recreation_ground |
| 9 | common |
| 10 | venue |
| 11 | pedestrian (reserved) |

Never silently reassign codes.

---

## Stoke coverage (full city)

Config: `scripts/explore/catalogues/stoke-on-trent.json`

| Field | Value |
| --- | --- |
| Region id | `stoke-on-trent` |
| Bbox | `52.96–53.08` N, `−2.25–−2.08` E |
| Notes | Axis-aligned city extent; includes some fringe outside the unitary-authority polygon |
| Source GeoJSON | `fixtures/local/stoke-on-trent.geojson` (gitignored; ODbL) |
| Source revision | `2026-07-24` |
| Generation version | `2` |
| Output | `output/catalogues/stoke-on-trent/` (gitignored) |

Mobile does **not** check “am I in Stoke?” — coverage = whether active catalogue points exist nearby (`404 no_coverage` vs empty nearby list).

**Legacy:** `fixtures/local/stoke-sneyd-green.geojson` remains for small local generator / HTTP parity experiments (`npm run prepare:osm` without `--region`). It is **not** the catalogue source.

---

## Offline pipeline (city scale)

### 1. Prepare OSM

```bash
npm run prepare:osm -- --region stoke-on-trent
```

- Splits the region bbox into Overpass tiles (~0.04°), merges + dedupes by OSM id  
- Full Stoke: **15** Overpass tiles → **78,953** features (~23 MB GeoJSON)  
- Network only at prepare time; catalogue generate never calls Overpass  

### 2. Generate catalogue

```bash
npm run generate:catalogue -- --region stoke-on-trent
```

- Runs the same deterministic generator as Steps 2–4  
- **Tiled** (~0.02° / ~2 km cores + **400 m** OSM pad) so safety checks stay tractable  
- Single-pass over the full city extract is too slow (linear hazard scans × tens of thousands of features)  
- After all tiles: dedupe `stop_id`, then **global 150 m** spacing by `priorityKey`  
- Stoke: **54** generate tiles  

### 3. Validate

```bash
npm run validate:catalogue -- --region stoke-on-trent
```

Checks ids, types, coverage, and nearest-neighbour spacing (≥ 150 m).

### 4. Import / activate

```bash
npm run import:catalogue -- --region stoke-on-trent
npm run import:catalogue -- --region stoke-on-trent --activate
```

Requires Supabase service role. `--dry-run` available. Activate retires any previous active version for the region.

---

## Measured Stoke results

| Metric | Value |
| --- | --- |
| Accepted points | **1,402** |
| Coverage area (bbox) | **151.727 km²** |
| Density | **9.24 / km²** |
| Min nearest neighbour | **150.0 m** |
| Mean / median NN | **203.3 m / 185.7 m** |
| Below 150 m spacing | **0** |
| By type | footpath 635, path 346, park 182, cycleway_walk 123, recreation_ground 79, sidewalk 23, plaza 8, garden 6 |
| Generator rejected (tiled sum) | 43,334 candidates |
| OSM features (prepare) | 78,953 |
| Validation | **ok** |

**Earlier Sneyd-only pilot (superseded for catalogue coverage):** 36 points over 2.705 km² at 13.31/km².

Artefacts: `output/catalogues/stoke-on-trent/{catalogue,stats,validation}.json`.

---

## UK / world estimates (planning model)

Anchor: **measured full-Stoke density 9.24/km²** over a mixed urban/fringe bbox (not pure dense suburb).

| Scenario | Assumed density | Area | Points (order of magnitude) |
| --- | --- | --- | --- |
| Full Stoke bbox (measured) | 9.24/km² | 152 | **1,402** |
| UK low (mostly rural/thin) | ~1/km² over 80k km² inhabited | — | ~0.1M |
| UK expected (mixed) | ~5/km² over 100k km² | — | ~0.5M |
| UK high (urban-heavy) | ~9–12/km² over 120k km² | — | ~1–1.5M |
| World lower | sparse inhabited | — | ~5–20M |
| World expected | selective launch markets | — | ~20–80M |
| World upper | aggressive global | — | ~100M+ |

Storage rule of thumb: ~200–500 bytes/row + GiST → **UK expected ~0.5M rows ≈ hundreds of MB**, not multi-TB. Confirm after `pg_total_relation_size` on import.

**DynamoDB:** not adopted. PostGIS radius queries + existing auth/claims win until measured latency/storage fails (synthetic 100k–5M tests still recommended).

---

## Runtime behaviour

### Nearby
- Auth + rate limit  
- `get_explore_points_nearby`  
- `404 no_coverage` vs empty list “no points nearby”  
- No Overpass, no Storage OSM tiles, no `map_data_preparing` for acquisition  

### Verify / claim
- `get_explore_point_by_id`  
- Distance to **stored** coordinates  
- Pass `source_type` + `environment_profile` into `claim_explore_stop`  

### Mobile
- Single fetch (no tile warm polling)  
- DEV GPS retained  
- Diagnostics: latency ms, count, nearest, generation version  
- Default explore-debug radius **1000 m**  

---

## Deploy / activate

1. `supabase db push` (PostGIS + tables + RPCs)  
2. Offline: prepare (if needed) → generate → validate (already done for Stoke locally)  
3. `import:catalogue` → status `ready`  
4. `import:catalogue --activate` (retires previous active for region)  
5. Deploy Edge: `explore-nearby`, `explore-verify`, `explore-claim` (catalogue-backed)  
6. Mobile: Stoke DEV GPS (any suburb) → points &lt;10s (target &lt;2–3s once warm DB)  

---

## Rollback

1. Re-activate prior catalogue version via `activate_explore_catalogue_version`  
2. Or redeploy previous Edge nearby that used tiles (reference only)  
3. Historical claims remain by `stop_id`  

---

## Tests

- `scripts/explore` vitest: **120 passed** (8 skipped), including catalogue tile/spacing + point-type tests  
- `npm run build` OK  

Hosted PostGIS latency / `EXPLAIN ANALYZE` / `pg_relation_size` pending after import on the project.

---

## Known limitations

- Coverage bbox (~152 km²) is larger than the admin polygon (~93 km²) — fringe outside Stoke is included  
- Tiled generate + global spacing is deterministic but not bit-identical to a hypothetical single-pass city run (which is impractical)  
- UK/world figures remain **planning estimates** (Stoke measured density is the urban anchor)  
- Per-tile Edge / Storage OSM code remains in repo for offline/rollback; not on the active nearby path  
- Cross-version claim uniqueness remains `(profile_id, stop_id)`  

---

## Explicit confirmations

- Explore points are persisted in Postgres  
- Authoritative record includes lat, lon, integer type  
- Points are not embedded in the mobile app  
- Nearby uses PostGIS spatial indexing  
- API does not scan every point in JS  
- API does not call OSM/Overpass during normal use  
- Points are generated offline  
- Full Stoke catalogue is generated offline (1,402 points, validated)  
- Catalogue versions can be activated/retired with rollback  
- Claims use stored coordinates + env for awards  
- DynamoDB not adopted without benchmark evidence  

---

## Recommended next step

1. Push migration + **import/activate** full Stoke catalogue on the hosted project  
2. Measure E2E mobile latency across several Stoke locations  
3. Run synthetic scale benches (100k / 1M) in a non-prod schema  
4. Revisit DynamoDB only if PostGIS fails measured SLOs  
5. Add further UK cities with the same offline prepare → generate → import pipeline  
