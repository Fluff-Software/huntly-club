# Explore stop generator

Isolated tooling for Huntly World Explore: prepare OpenStreetMap data, generate stop catalogues, and (optionally) run a local DEV nearby API.

> **Production runtime:** Mobile map markers come from a **persisted PostGIS catalogue** via Supabase Edge (`explore-nearby`). Nearby never downloads OSM or generates stops on the fly.
>
> See [`docs/explore/step-10-3-persisted-point-catalogue.md`](../../docs/explore/step-10-3-persisted-point-catalogue.md).

---

## How maps work (current)

The in-app Explore map is **not** shipping OSM tiles or GeoJSON to the phone. It is:

1. The device basemap (Apple/Google Maps) for roads/terrain
2. **Stop markers** loaded from our API around the player’s GPS

```text
Player moves on Explore map
  → mobile POST explore-nearby (lat, lng, radius)
  → Supabase Edge Function
  → Postgres get_explore_points_nearby (active catalogue only)
  → markers on ActivityMap
```

Verify / claim then load the **authoritative** stored point (coords, `source_type`, environment profile) from `explore_points` — the client is not trusted as the source of truth.

If there is no active catalogue covering that area, nearby returns **no coverage** (empty / `no_coverage`). Today the intended active region is **Stoke-on-Trent**.

### Where stops come from

Stops are built **offline**, then imported and activated:

```text
OpenStreetMap (Overpass or Geofabrik)
  → prepare OSM extract (GeoJSON / partitions)
  → deterministic generator (safety rules + 150 m spacing)
  → catalogue JSON / NDJSON
  → validate → import → activate in PostGIS
  → Edge nearby reads active points only
```

The generator (`generate-stops.ts` + `safety-rules.ts`) places candidates on footways/parks/etc., rejects unsafe spots, and assigns stable `stop_*` ids. Same rules for local review, city catalogues, and national builds.

**Important:** Overpass / PBF prepare runs only in this offline pipeline. The live user path does **not** call Overpass.

### Local DEV vs production

| Mode | What the map hits | OSM at request time? |
| --- | --- | --- |
| **Production / default** | Edge `explore-nearby` → PostGIS catalogue | No |
| **DEV local Node** | `npm run serve` (`localhost:4310`) | No — loads a prepared GeoJSON once and generates in memory |

Mobile DEV can point at local with `EXPO_PUBLIC_EXPLORE_API_URL` / `EXPO_PUBLIC_EXPLORE_TRANSPORT=local` (see `apps/mobile/utils/exploreApiConfig.ts`).

---

## Getting new maps / covering a new area

There is no “draw a region and it appears live” switch. Coverage grows by **offline catalogue** work, then activate.

### City-scale region (Overpass → catalogue) — current Stoke path

1. Add or edit `catalogues/<region_id>.json` (bbox, `source_geojson`, `source_revision`, `generation_version`). Pattern: `catalogues/stoke-on-trent.json`.
2. Download OSM for that bbox:

   ```bash
   npm run prepare:osm -- --region <region_id>
   ```

   Writes gitignored GeoJSON under `fixtures/local/` (tiled Overpass queries).
3. Bump `source_revision` (and `generation_version` if safety rules changed).
4. Build, check, import, activate:

   ```bash
   npm run generate:catalogue -- --region <region_id>
   npm run validate:catalogue -- --region <region_id>
   npm run import:catalogue -- --region <region_id> --activate
   ```

5. Players inside that coverage start seeing markers on the next nearby fetch. Outside any active catalogue → no coverage.

**Stoke (full city) example:**

```bash
npm run prepare:osm -- --region stoke-on-trent
npm run generate:catalogue -- --region stoke-on-trent
npm run validate:catalogue -- --region stoke-on-trent
npm run import:catalogue -- --region stoke-on-trent --activate
```

### National UK + Ireland (Geofabrik PBF)

Larger coverage uses a pinned Geofabrik extract, not Overpass city tiles. See [`docs/explore/step-10-4-geofabrik-uk-ireland-catalogue.md`](../../docs/explore/step-10-4-geofabrik-uk-ireland-catalogue.md) and Step 10.5.

```bash
npm run prepare:pbf -- --region uk-and-ireland
npm run extract:coverage -- --region uk-and-ireland
npm run extract:partitions -- --region uk-and-ireland --resume
npm run generate:catalogue:national -- --region uk-and-ireland --workers 4 --confirm-full-run
# validate → import → activate:catalogue:national (gated; retires Stoke when activated)
```

National builds may exist locally without being **activated**. Do not run national activate unless you intend to switch live coverage.

### Refreshing an existing map after OSM or rule changes

1. Re-run `prepare:osm` / `prepare:pbf` if the source map should update.
2. Bump `source_revision` / `generation_version` in the region config.
3. Regenerate → validate → import → activate (activation retires the previous version for that `region_id`).

Historical claims stay valid (claims key by stop id text); verify prefers active points, then retired.

### Local-only “new map” for `npm run serve`

Point `EXPLORE_OSM_DATA_PATH` at another prepared GeoJSON (and/or adjust bbox in `config.ts`). That only affects the local Node API, not Edge/PostGIS.

---

## Setup

```bash
cd scripts/explore
npm install
```

Copy `.env.example` → `.env` for import/serve tooling (`EXPLORE_SUPABASE_*`, optional `EXPLORE_DATABASE_URL` for national import).

Attribution: © OpenStreetMap contributors — [ODbL](https://www.openstreetmap.org/copyright)

---

## Prepare real OSM (offline)

Downloads OpenStreetMap into gitignored fixtures. **Not** required at Edge request time.

```bash
# Small Sneyd Green test bbox (legacy generator / local serve)
npm run prepare:osm

# Full Stoke-on-Trent catalogue source (tiled Overpass)
npm run prepare:osm -- --region stoke-on-trent
```

Requires network. No osmium/ogr2ogr for Overpass prepare.

---

## Catalogue (city)

```bash
npm run generate:catalogue -- --region stoke-on-trent
npm run validate:catalogue -- --region stoke-on-trent
npm run import:catalogue -- --region stoke-on-trent --activate
```

Details: [`docs/explore/step-10-3-persisted-point-catalogue.md`](../../docs/explore/step-10-3-persisted-point-catalogue.md).

---

## Generate (legacy local HTTP / review map)

```bash
npm run generate
```

Uses `fixtures/local/stoke-sneyd-green.geojson` when present.

Synthetic fixture only:

```bash
npm run generate:fixture
```

### Outputs

| File | Purpose |
| --- | --- |
| `output/accepted-stops.geojson` | Accepted stops |
| `output/rejected-candidates.geojson` | Rejected attempts |
| `output/review-sample.geojson` | Deterministic remote-review sample |
| `output/summary.json` | Counts and breakdowns |
| `output/review-map.html` | Self-contained Leaflet map (open in a browser) |

---

## Local nearby API (DEV)

```bash
npm run serve   # http://localhost:4310  (tsx + .env)
npm run build && npm run start   # compiled entry
```

Loads prepared GeoJSON → generates stops once in memory → serves nearby/verify/claim for mobile DEV. Production uses Edge + catalogue.

---

## Tests

```bash
npm test
npm run build
```

---

## Docs

| Doc | Topic |
| --- | --- |
| [`step-10-3-persisted-point-catalogue.md`](../../docs/explore/step-10-3-persisted-point-catalogue.md) | **Active** runtime + Stoke catalogue |
| [`step-10-2-supabase-edge-on-demand-osm.md`](../../docs/explore/step-10-2-supabase-edge-on-demand-osm.md) | Superseded on-demand OSM tiles |
| [`step-10-4-geofabrik-uk-ireland-catalogue.md`](../../docs/explore/step-10-4-geofabrik-uk-ireland-catalogue.md) | National PBF pipeline |
| [`step-10-5-national-bulk-import-and-hosted-benchmark.md`](../../docs/explore/step-10-5-national-bulk-import-and-hosted-benchmark.md) | National import / activate |
| [`step-5-backend-nearby-stops-and-debug-map.md`](../../docs/explore/step-5-backend-nearby-stops-and-debug-map.md) | Early local nearby + debug map |
| Steps 2–9 under `docs/explore/` | Generator, safety, verify, claim, cards, binder |
| [`step-10-hosted-explore-backend.md`](../../docs/explore/step-10-hosted-explore-backend.md) | Superseded Cloud Run notes — do not deploy for MVP |

---

## Hosted container (superseded)

Docker / `deploy/cloud-run.sh` retained as reference only. Do not deploy to Google Cloud for Explore MVP.
