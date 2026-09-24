# Huntly World Explore — Step 10.2: Supabase Edge + On-Demand OSM Tiles

**Date:** 2026-07-23  
**Updated:** 2026-07-23 (post-deploy learnings + Edge CPU mitigations)  
**Depends on:** Steps 1–9; supersedes Step 10 Cloud Run hosting  
**Scope:** Worldwide coordinate-based Explore backend on Supabase Edge Functions  
**Status:** Implemented on Edge; **product latency / CPU limits unresolved** — **superseded for runtime by Step 10.3** (`docs/explore/step-10-3-persisted-point-catalogue.md`). Offline OSM prepare + generator retained for catalogue builds.

---

## Architecture decision

**Active hosting (this step):** Supabase Edge Functions + private Supabase Storage (`explore-osm-source`) + Supabase Auth + existing claim/card RPCs.

**Why Cloud Run was dropped (original 10.2 rationale)**

- Hard-coded regional extracts (e.g. Sneyd Green) do not scale to “works anywhere”
- Baking a single GeoJSON into a container ties the product to one test city
- Explore already lives on Supabase for auth, claims, and binder — Edge keeps one platform

**Reassessment after hosted testing:** Edge is a poor fit for live Overpass + multi-tile stop generation under “few seconds” UX. Auth/claims/binder should stay on Supabase; heavy nearby/verify compute may move in Step 10.3 (Cloud Run / AWS). See [Runtime issues](#runtime-issues-post-102-authoring).

### Core flow (as implemented after mitigations)

```
Mobile (coords + radius)
  → explore-nearby Edge Function (direct HTTP fetch; not only functions.invoke)
      → JWT auth + rate limit
      → padded source radius from generator constants
      → global slippy tile IDs (z15)
      → Storage: load OSM tiles (prepare at most 1 missing tile per request)
      → Storage: load per-tile stop caches (generate at most 1 tile’s stops per request)
      → merge stop lists + light cross-tile spacing
      → return stops inside requested radius only
```

If OSM tiles or stop caches are incomplete → HTTP **202** `map_data_preparing` (never an empty success list). Client retries patiently.

Claims regenerate authoritative stops from the same revisioned tiles / stop caches, then call `claim_explore_stop`.

**OSM tiles** are shared by geographic tile ID + revision — never per user.  
**Per-tile accepted stops** are also cached in Storage (required for Edge CPU limits; see below). They are shared by tile, not per user, and are regenerated when `generation_version` / revision changes.

---

## Global tile scheme

**Chosen: Web Mercator slippy tiles at zoom 15** (`web_mercator_slippy`).

| Property | Value |
| --- | --- |
| Zoom | 15 |
| OSM path | `revisions/<revision>/z15/<x>/<y>.json` |
| Stops path | `revisions/<revision>/stops/z15/<x>/<y>.json` |
| Approx width @ 53°N | ~730–740 m |
| Approx width @ equator | ~1.2 km |

**Benchmark (Sneyd Green, padded ~835 m):** z15 typically fewer tiles than z16 (~4× more tiles at z16).

**Boundary behaviour:** `tilesForRadius` includes every tile intersecting the padded circle. Neighbouring users share tiles. No city/region names in IDs.

---

## Safety padding

```
source_radius =
  requested_radius
  + max safety buffer (50 m school)
  + stop spacing (150 m)
  + environment context (100 m)
  + alternative displacement (35 m)
```

Example: 500 m request → **835 m** source radius.

Requested radius filters returned stops only. Safety rules are not weakened to reduce tile count.

---

## Canonical tile format

Minified deterministic GeoJSON FeatureCollection plus metadata:

- `format_version`, `revision`, `tile {z,x,y,id}`, `scheme`, `bounds`
- OSM attribution / licence
- `source_provider`, `source_timestamp`, `created_at`, `feature_count`
- Allowlisted properties only (see `property-allowlist.ts`)

**Property allowlist** (derived from generator usage):  
`id`, `highway`, `footway`, `sidewalk`, `foot`, `bicycle`, `access`, `access:foot`, `foot:signed`, `leisure`, `landuse`, `natural`, `waterway`, `railway`, `building`, `place`, `amenity`, `shop`, `barrier`, `entrance`, `name`, `tourism`, `towpath`, `surface`, `explore_source`, `explore_role`

### Per-tile stop cache format

Companion object (not the OSM FeatureCollection):

- `format_version`, `generation_version`, `revision`, `tile_id`, `stop_count`
- `stops`: array of accepted stop objects (same deterministic IDs as the generator)

Nearby merges stop arrays across tiles, applies light deterministic spacing, then filters by requested radius.  
**Do not** run `generateStops` over a multi-tile merged FeatureCollection inside one Edge invocation — that hits `WORKER_RESOURCE_LIMIT` / CPU Time exceeded.

---

## Storage

Private bucket: **`explore-osm-source`**

```
explore-osm-source/
  revisions/
    <revision>/
      manifest.json                 # optional revision metadata
      z15/<x>/<y>.json              # canonical OSM tiles
      stops/z15/<x>/<y>.json        # per-tile accepted stops (generation_version scoped)
```

Mobile never reads/writes this bucket. Only Edge Functions (service role) and trusted tooling.

**Active revision:** `2026-07` (Edge config). Old revisions remain readable for claim regeneration. Do not overwrite OSM tiles in place — bump revision. Stop caches use `upsert` when regenerating for the same tile. Retain old revisions for at least **30 days** (operational guideline).

---

## Cache hit / miss

**OSM tile hit:** download + validate.  
**OSM tile miss:** acquire job lock → Overpass-compatible fetch for tile bbox → allowlist → validate → upload. At most **1** OSM tile prepared per Edge request.

**Stop cache hit:** download stops JSON matching `generation_version`.  
**Stop cache miss:** run `generateStops` for **that one tile’s** features → upload stops object. At most **1** stop generation per Edge request.

**Fully warm:** all OSM tiles + all stop caches present → merge stops → filter → HTTP 200.

**Incomplete:** HTTP 202 `map_data_preparing` with optional `cached_tile_count` / `missing_tile_count` / `tile_count` / `retry_after_seconds`.

Concurrency: `explore_osm_tile_jobs` + `explore_acquire_osm_tile_job` RPC. Soft rate-limit on acquisition returns preparing (not a hard fail) so first-area warm-up can continue.

**Same-request wall budget:** ~20 s for Overpass wait; CPU work is capped by the 1-tile / 1-generation limits (Supabase CPU time is the binding constraint, not wall clock alone).

---

## Provider abstraction

`fetchOsmFeaturesForBounds(bounds)` — first implementation: Overpass-compatible endpoint(s).  
Replaceable later with paid OSM APIs, self-hosted extracts, scheduled imports, or PostGIS.

Provider URLs/credentials never exposed to mobile.

**Observed:** public Overpass often times out (~20 s) under load → `provider_timeout` → client retry. Dedicated provider or pre-seed required for product UX.

---

## Edge Functions

| Function | Role |
| --- | --- |
| `explore-nearby` | Auth + tiles + per-tile stops + filter |
| `explore-verify` | Auth + regenerate via tile/stop caches + proximity |
| `explore-claim` | Auth + regenerate + `claim_explore_stop` |
| `explore-health` | Safe status / config probes |

Shared modules: `supabase/functions/_shared/explore/*`  
Key additions: `tile-stops.ts` (per-tile stop cache), capped prepare in `tile-preparation.ts` / `config.ts` (`DEFAULT_MAX_MISSING_TILES = 1`, `DEFAULT_MAX_STOP_GENERATIONS = 1`).

---

## Auth, claims, rate limits

- Valid Supabase JWT required for nearby / verify / claim
- Profile ownership enforced in existing SQL RPC
- Client cannot choose card, rarity, environment, or authoritative stop coordinates
- DB-backed rate limits: `explore_rate_limits` + `explore_check_rate_limit` (no coordinate history)
- Tile acquisition limits stricter than cached nearby; soft-fail → preparing

---

## Mobile

- Default transport: **Edge**
- Nearby / verify / claim use **direct `fetch`** to `/functions/v1/...` with user JWT + anon key (avoids `functions.invoke` mishandling HTTP 202 bodies as `invalid_response`)
- `EXPO_PUBLIC_EXPLORE_API_URL` not required for Edge
- DEV transport selector: Edge vs local Node
- DEV GPS: device / Sneyd Green / Bristol / custom coords (names never sent to API; custom fields unused until Custom is selected)
- Explore debug default radius: **500 m**
- Handles `map_data_preparing`, provider timeouts, rate limits, and `WORKER_RESOURCE_LIMIT` as retryable warm-up
- Optional session warm-up (`exploreWarmup`) if location already granted — no new permission prompt

---

## Preparing response

```json
{
  "code": "map_data_preparing",
  "error": "map_data_preparing",
  "message": "Explore is preparing this area.",
  "retry_after_seconds": 8,
  "tile_count": 9,
  "cached_tile_count": 4,
  "missing_tile_count": 5
}
```

HTTP status **202**. Do not return an empty stop list when map data is unavailable.

---

## Deployment

```bash
# Migration (bucket + jobs + rate limits)
supabase db push   # or your project migration process

# Deploy functions (redeploy after any _shared/explore change)
supabase functions deploy explore-nearby --project-ref <ref>
supabase functions deploy explore-verify --project-ref <ref>
supabase functions deploy explore-claim --project-ref <ref>
supabase functions deploy explore-health --project-ref <ref>
```

Secrets: use project `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (injected for Edge). Optional: `EXPLORE_OVERPASS_URL`.

Never expose the service-role key to mobile.

---

## Parity & performance

Node vitest covers:

- Tile ID determinism (Sneyd vs Bristol)
- Padding / radius tile intersection
- Canonical allowlist + merge
- Generator stop-ID stability on synthetic fixture + canonical round-trip

**Hosted performance (measured on Supabase Edge, Sneyd Green DEV):**

| Scenario | Observed |
| --- | --- |
| Cold OSM tiles | Overpass timeouts common; many `map_data_preparing` passes |
| Multi-tile merge + `generateStops` in one request | **`WORKER_RESOURCE_LIMIT` / CPU Time exceeded** — killed before stops returned |
| 1 OSM tile + 1 stop-gen per request | Survives CPU limit but warm-up needs many serial client retries (minutes, not seconds) |
| Fully cached OSM + stop caches | Should be Storage download + merge only (target few seconds) — needs redeploy + warm cache to confirm |

Product UX target (“points in a few seconds”) is **not met** on cold Edge + live Overpass.

---

## Runtime issues (post-10.2 authoring)

Issues hit while validating hosted Edge against the mobile Explore debug screen:

1. **`too_many_missing_tiles` / `map_data_preparing`** — cold areas need many tiles; early hard-fail and short budgets left the map at 0 points.
2. **`provider_timeout`** — Overpass often exceeds Edge-friendly timeouts for individual tiles.
3. **`rate_limited`** — aggressive client polling during warm-up.
4. **`invalid_response` / “Explore Edge response shape was unexpected”** — `supabase.functions.invoke` did not reliably surface HTTP 202 preparing JSON; fixed by direct `fetch`.
5. **DEV GPS UI confusion** — Device selected (real/map location) while Custom lat/lon fields still showed Bristol presets (unused until Custom).
6. **`WORKER_RESOURCE_LIMIT` / CPU Time exceeded** — after OSM tiles were partly cached, merging features and running `generateStops` across all tiles exceeded Supabase Edge CPU. Mitigation: per-tile stop caches + max 1 generation per request.
7. **User-visible latency** — even with mitigations, first-time warm-up is many serial Edge calls; points may not appear for a long time without seeding or a heavier compute host.

### Changes made after the original 10.2 write-up

| Area | Change |
| --- | --- |
| Client | Direct Edge HTTP; preparing progress; 500 m default; retryable resource limits |
| Warm-up | Optional background warm if location already granted |
| Tile prepare | Soft rate-limit → preparing; max **1** OSM tile per request |
| Stops | Per-tile stop objects in Storage; max **1** generate per request; light cross-tile spacing |
| Docs / Step 10 | Cloud Run marked superseded; Docker retained as reference only |

---

## Rollback

1. Keep previous Edge Function versions / disable new functions  
2. Mobile can temporarily use local Node in DEV only  
3. Cloud Run Docker remains reference fallback for a possible Step 10.3 compute move  

---

## Known limitations

- First visitor to an uncached area waits through many retries (`map_data_preparing`) — not a few seconds
- Overpass public endpoints have fair-use limits and frequent timeouts — plan a dedicated provider or pre-seed before scale
- Supabase Edge CPU time cannot run full multi-tile generation in one request
- Cross-tile spacing is a light post-merge pass (per-tile generation is not identical to a single global generator pass)
- Worldwide readiness not claimed until provider + load testing (or compute offload) complete
- Local Sneyd Green GeoJSON is **not** a runtime dependency (fixture/parity/seed tooling only)

---

## Recommended next step

**Immediate (still on 10.2):**

1. Redeploy Edge functions with per-tile stops + 1-tile caps  
2. Optionally **seed** Sneyd OSM tiles + stop caches into Storage so DEV shows points in seconds  
3. Hosted smoke: health, auth, preparing → ok, verify, claim  

**Step 10.3 (replan — recommended for product UX):**

1. Keep Supabase for auth, claims RPCs, binder, optional Storage  
2. Move heavy nearby/verify generation off Edge to **Cloud Run or AWS** (App Runner / ECS) with real CPU/timeouts  
3. Define warm path (cached tiles + stops → &lt;2 s) vs cold path (async prepare queue or pre-seed)  
4. Do not rely on live Overpass inside the user-facing request path for “few seconds” UX  

---

## Explicit confirmations

- Supabase Edge Functions are the active hosting approach **for this step** (revisit in 10.3)  
- No location is hard-coded in the API  
- Tile IDs derive only from coordinates  
- Missing OSM tiles are fetched and cached  
- Later users reuse shared cached tiles (and shared per-tile stop caches)  
- No per-user OSM dataset  
- Clients cannot select coordinates, environment, or card  
- Service-role credentials are not exposed to mobile  
- Card Binder RPC path still works  
- Claims still regenerate authoritative stops before write  
- Empty success stop lists are not used to mean “still preparing”
