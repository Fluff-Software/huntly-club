# Huntly World Explore — Step 5: Backend Nearby Stops + Developer Map

**Date:** 2026-07-23  
**Depends on:** Steps 1–4  
**Physical walking:** not required for this step  
**Scope:** Development architecture validation only — no claims, cards, binder, or permanent stop storage

---

## Backend architecture

**Choice:** small **Node HTTP** service under `scripts/explore/` (`node:http` + `tsx`).

**Why not Edge Functions / mobile-side generation**

| Option | Decision |
| --- | --- |
| Existing local server | None existed |
| Node service in `scripts/explore` | **Chosen** — same package as the generator; offline OSM extract; fast iteration |
| Supabase Edge Function | Deferred — Turf + full extract + generation may exceed edge limits; not needed for local validation |
| Generator in the mobile app | **Rejected** — violates architecture (app must not place stops) |

The mobile app only requests nearby stops. The backend loads the prepared OSM GeoJSON, runs the deterministic generator, filters by radius, and returns DTOs.

### Why Overpass is not called per user request

`npm run prepare:osm` downloads OSM once into `fixtures/local/stoke-sneyd-green.geojson`.  
`GET /explore/stops/nearby` reads that file only. Overpass is never hit during nearby queries.

### Local OSM source

- Path: `scripts/explore/fixtures/local/stoke-sneyd-green.geojson` (gitignored)  
- Licence: © OpenStreetMap contributors — ODbL  
- OpenStreetMap data is stored locally as **source geometry**  
- **Generated stops are not stored** in Supabase or any database  

### In-memory cache

The server caches:

1. Parsed OSM → full-area accepted stops for a `generation_version`  
2. Invalidated when the extract file mtime changes  

The cache is disposable. It is **not** the source of truth. Restarting the process clears it.

---

## Endpoint contract

Base URL (default): `http://localhost:4310`

### `GET /health`

```json
{ "status": "ok", "generation_version": 2 }
```

### `GET /explore/stops/nearby`

Query parameters:

| Param | Required | Notes |
| --- | --- | --- |
| `latitude` | yes | −90…90 |
| `longitude` | yes | −180…180 |
| `radius_metres` | yes | &gt; 0, max **2000** |
| `generation_version` | no | default `2`; must be supported |

Success response includes `generation_version`, `test_area`, `request`, and `stops[]` (sorted by `distance_metres`).

Outside the configured bbox:

```json
{ "error": "outside_supported_test_area", "test_area": { … } }
```

HTTP **422**. The server does **not** silently return Sneyd Green stops for an unrelated city.

User lat/lng are used **only** for distance filtering. They never enter the generator and do not change stop IDs or coordinates.

---

## How to run the backend

```bash
cd scripts/explore
npm install          # once
npm run prepare:osm  # once if extract missing (network)
npm run serve        # http://localhost:4310
```

Environment:

| Variable | Default | Purpose |
| --- | --- | --- |
| `EXPLORE_SERVER_PORT` | `4310` | Listen port |
| `EXPLORE_ALLOWED_ORIGIN` | `*` | CORS allowlist (comma-separated or `*`) |

Smoke test:

```bash
curl -s 'http://localhost:4310/health'
curl -s 'http://localhost:4310/explore/stops/nearby?latitude=53.0442&longitude=-2.1656&radius_metres=1000&generation_version=2' | head
curl -s 'http://localhost:4310/explore/stops/nearby?latitude=51.5&longitude=-0.1&radius_metres=1000'
curl -s 'http://localhost:4310/explore/stops/nearby?latitude=53.0442&longitude=-2.1656&radius_metres=9999'
```

---

## Mobile service

`apps/mobile/services/exploreStopsService.ts`

- `getExploreStopsNear({ latitude, longitude, radiusMetres })`  
- Reads `EXPO_PUBLIC_EXPLORE_API_URL`  
- Maps snake_case JSON → typed `ExploreStop`  
- Throws `ExploreStopsRequestError` for structured backend errors  
- Does **not** import GeoJSON, run the generator, or use `explore_locations`

Types: `apps/mobile/types/exploreStops.ts`

### Environment configuration

In `apps/mobile/.env` (see `.env.example`):

```bash
# iOS Simulator
EXPO_PUBLIC_EXPLORE_API_URL=http://localhost:4310

# Android Emulator
# EXPO_PUBLIC_EXPLORE_API_URL=http://10.0.2.2:4310

# Physical device (same LAN as the machine running `npm run serve`)
# EXPO_PUBLIC_EXPLORE_API_URL=http://192.168.x.x:4310
```

Restart Expo after changing env vars.

---

## Developer route

`apps/mobile/app/(tabs)/activity/explore-debug.tsx`

- Registered in `activity/_layout.tsx`  
- **`__DEV__` gate:** production builds `Redirect` away; Adventure picker shows a **DEV** entry only when `__DEV__`  
- Foreground location only  
- Fetch on first fix; re-fetch after **&gt;100 m** move or manual Refresh  
- Radius: 500 / 1000 / 1500 m  
- Toggle hide low-confidence / review-flagged markers  
- Centre on user / test area  
- Marker colours match the HTML review map; select a stop for detail panel  
- **No Claim button**

### How to open

1. Start backend: `cd scripts/explore && npm run serve`  
2. Set `EXPO_PUBLIC_EXPLORE_API_URL`  
3. Run the mobile app in a **development** build / Expo Dev Client  
4. **Go on an Adventure** → **Explore debug map (DEV)**  
   or navigate to `/(tabs)/activity/explore-debug`

---

## Manual test steps

1. Backend health returns `ok`  
2. Nearby at Mornington Road returns stops within radius, sorted  
3. Request from London returns `outside_supported_test_area`  
4. Radius `9999` returns `radius_too_large`  
5. Debug map shows markers when inside the test area (or “outside” message when not)  
6. Select a marker → detail panel shows ID, distance, confidence, flags  
7. Confirm no Claim UI  

---

## Validation results

See completion report in the Step 5 implementation notes / chat. Backend tests live in `scripts/explore/__tests__/nearby-stops.test.ts`. Mobile service tests: `apps/mobile/services/__tests__/exploreStopsService.test.ts`.

---

## Confirmations

- Generated stops are **not** stored in Supabase  
- OpenStreetMap extract is local **source geometry** only  
- Backend generates + filters; app only displays  
- User coordinates filter results and **do not** place stops  
- Overpass is **not** called during nearby requests  
- Claiming and cards remain **unimplemented**  
- Debug route is **not** exposed in production (`__DEV__`)

---

## Known limitations

- Single prepared test area (Sneyd Green)  
- Full-area generation on cold cache takes several seconds  
- Android MapLibre marker press may be less precise than iOS custom pins  
- Not a claim-validation backend  
- No auth on the local server (dev only)  
- Physical device needs LAN IP + cleartext HTTP allowance if applicable  

---

## Migration path to production (future)

1. Host generator as a controlled service (or precompute tiles / shards — still no permanent worldwide table as source of truth unless product changes)  
2. Add auth + rate limits  
3. Claim validation must recompute stop ID from rules + version, never trust client coordinates  
4. Replace debug map with product Explore UI  
5. Cards / binder after claim integrity is proven  

## Recommended Step 6

Claim handshake prototype: app sends `stop_id` + user position; backend verifies distance + regenerates ID for `generation_version`; still no permanent stop table or card inventory.
