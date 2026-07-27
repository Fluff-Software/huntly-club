# Huntly World Explore — Step 1: Project Review

**Branch reviewed:** `develop` (local)  
**Existing Explore work inspected (read-only, not merged):** `origin/feature/explore`, `origin/claude/feature-explore-checkin-2scp9e`  
**Date:** 2026-07-23  
**Scope:** Documentation only. No Explore feature implementation, migrations, or dependency installs.

---

## 1. Project summary

Huntly World is a family outdoor adventure app. The primary product surface is an **Expo / React Native** mobile app (`apps/mobile`) backed by **Supabase** (Postgres, Auth, Storage, Edge Functions, SQL RPCs). Companion apps:

- `apps/admin` — Next.js admin for content, badges, seasons, photos, users
- `apps/website` — public marketing / auth-related web pages

Product pillars today: seasonal story + missions, walk/cycle tracking, scavenger hunts, badges/XP, campfire live sessions, teams, and a Backpack (Journal tab) for journal / badges / resources.

Architecture pattern on mobile:

- **Expo Router** file-based routes under `apps/mobile/app/`
- **Services** for Supabase and device APIs (`apps/mobile/services/`)
- **React Context** for auth, player profiles, user data, purchases, network
- Styling via **NativeWind** (Tailwind) plus many screens using `StyleSheet` and brand colour constants
- Game-critical writes prefer **Postgres `SECURITY DEFINER` RPCs**; Edge Functions are used mainly for email, push, and admin-side orchestration

There is **no Explore feature on `develop`**. Explore exists only on remote feature branches and assumes a permanently stored location catalogue — which conflicts with the intended generated-stop architecture described in the feature brief.

---

## 2. Relevant repository structure

| Path | Role |
| --- | --- |
| `README.md` | Local Supabase + Expo + EAS / hosted workflow |
| `Makefile` | `dev`, `seed`, `test`, `lint`, EAS build helpers |
| `tsconfig.json` | Root TS stub (`noEmit`) |
| `package-lock.json` | Empty root lockfile (apps own their installs) |
| `apps/mobile/` | Main Expo app (`@huntly-club/mobile`) |
| `apps/mobile/app/` | Expo Router screens |
| `apps/mobile/app/(tabs)/` | Tab shell: Clubhouse, Story, Missions, Social, Backpack (`journal`), Profile |
| `apps/mobile/app/(tabs)/activity/` | Walk / cycle / mission / scavenger flows |
| `apps/mobile/components/` | Shared UI (incl. `activity-map/`, scavenger maps) |
| `apps/mobile/services/` | Supabase + device services |
| `apps/mobile/contexts/` | Auth, Player, User, Purchases, etc. |
| `apps/mobile/models/supabase.ts` | Generated types (**currently empty on `develop`**) |
| `apps/mobile/app.config.ts` | Expo config, plugins, MapTiler, location |
| `apps/mobile/eas.json` | development / preview / production profiles |
| `apps/mobile/.env.example` | Supabase + MapTiler + EAS env template |
| `apps/admin/` | Admin Next.js app |
| `apps/website/` | Public site |
| `supabase/config.toml` | Local Supabase config |
| `supabase/migrations/` | Schema history (~130+ migrations) |
| `supabase/functions/` | Edge Functions (auth email, push, account removal, …) |
| `supabase/seed/` | Seed SQL |
| `.github/workflows/` | EAS builds/updates, Supabase main→develop sync |
| `ai-dev/` | Agent rules / prompts (not product docs) |
| `docs/` | Root docs (was empty; Explore docs go here) |
| `docs/explore/` | Explore feature documentation (this review) |

**Package manager:** npm (`apps/mobile/packageManager`: `npm@10.9.2`). Each app under `apps/` has its own `package.json` / `node_modules`. Root `Makefile` targets use `npm run … -w @huntly-club/mobile` style workspace commands; treat `apps/mobile` as the authoritative mobile workspace.

**No Turbo / pnpm-workspace.yaml.** Not a formal monorepo tooling setup beyond shared `supabase/` and Makefile orchestration.

---

## 3. Mobile application findings

### Versions (from `apps/mobile/package.json`)

| Item | Version |
| --- | --- |
| Expo | `^55.0.0` (installed ~55.0.24) |
| React Native | `0.83.6` |
| React | `19.2.0` |
| Expo Router | `~55.0.14` |
| TypeScript | `~5.9.2` |
| NativeWind | `~4.2.2` |
| `@supabase/supabase-js` | `^2.49.4` |
| `expo-dev-client` | `~55.0.33` |

### Entry / navigation

- Entry: `expo-router/entry` (`package.json` `main`)
- Root layout: `apps/mobile/app/_layout.tsx`
- Tabs: `apps/mobile/app/(tabs)/_layout.tsx` — Clubhouse (`index`), Story, Missions, Social, Journal/Backpack, Profile
- Adventures: `/(tabs)/activity/pick-activity` driven by `constants/activityTypes.ts` (`walk`, `cycle`, `mission`, `hunt`)
- Auth / onboarding / subscription screens live beside tabs under `app/`

### Conventions

- Feature code is organised by **route folders** + **flat services/components**, not deep feature modules
- Data access: service functions calling Supabase client / RPCs
- Loading / errors: local `useState` + try/catch; permission UX via `TrackingLocationAccessPrompt` + `trackingLocationPermission` utils
- Theming: brand greens (`#4F6F52`, `#2D4A35`), cream (`#F4F0EB`), team colours in Tailwind config; Comic Neue / Jua fonts
- Analytics: no dedicated analytics SDK found in mobile dependencies; logging is mostly `console.error` in services
- Multi-child profiles: `PlayerContext` + `profiles` table; activities pass `profileId`

### State and data fetching

- Auth session: `AuthContext` + `authService` + AsyncStorage-backed Supabase client
- No Redux / TanStack Query; fetch-on-mount in screens/hooks is the norm
- Offline: `NetworkContext` + `OfflineBanner`

---

## 4. Supabase findings

### Client / auth

- Mobile client: `apps/mobile/services/supabase.ts` (URL/anon from Expo `extra`)
- Auth: email signup via Edge Functions (`signup-with-email`, `resend-auth-email`) + Mailjet; deep link scheme `huntlyclub`
- Profiles: child explorers under parent `auth.users`; XP on profiles; RLS typically via `profiles.user_id = auth.uid()`

### Migrations / types / local workflow

- Migrations under `supabase/migrations/`
- README flow: UI or SQL → `supabase db diff` → `supabase db reset` → `supabase gen types typescript --local > models/supabase.ts` → `make seed`
- **`apps/mobile/models/supabase.ts` is empty on `develop`**, so typed table helpers (`Tables<>`) fail typecheck today. Explore work on `feature/explore` regenerates a large types file — that practice should be restored for any new schema.

### RPCs vs Edge Functions

| Pattern | Used for | Examples |
| --- | --- | --- |
| **SQL RPCs** (`SECURITY DEFINER` / invoker) | Secure game writes, distance checks, awards | Badges (`evaluate_and_award_badges`), scavenger unlock/claim (`scavenger_unlock_with_location`, …), team XP, club photos |
| **Edge Functions** | Email, push, admin ops, cron-adjacent jobs | `signup-with-email`, chapter reminders, account deletion |

**Recommendation:** Explore claim + weighted card award should follow the **SQL RPC** pattern (same as scavenger location unlock and the Explore branch’s `check_in_to_explore_location`). Edge Functions may later wrap OSM import jobs or heavy generation if needed, but interactive claims should stay in Postgres.

### RLS / storage / seed

- RLS enabled widely; authenticated SELECT + service_role for writes is common for catalogues
- Storage buckets for mission/media images; Explore branch adds `explore-location-images` / `explore-collectible-images`
- Seed: `supabase/seed/initial_data.sql`; Explore branch adds `explore_categories.sql`

### PostGIS

- **Not enabled or used on `develop`.**
- Only appears on Explore-related remote work (`get_explore_locations_near` + `geography` column on stored `explore_locations`). That path still assumes a permanent stops table and should **not** be carried forward as the worldwide catalogue.

### Hosted deployment

- GitHub Actions for EAS builds/updates and main→develop Supabase sync
- README references a `supabase-deploy.yml` for migrations/functions; verify in CI which workflow currently pushes schema (sync workflow applies migrations to develop)

---

## 5. Existing location and map support

### Installed packages (already present)

| Package | Present | Usage on `develop` |
| --- | --- | --- |
| `expo-location` | Yes | Walk/cycle tracking, scavenger active hunts, permissions |
| `expo-sensors` | Yes | Pedometer for walks (not compass/heading UI) |
| `expo-task-manager` | Yes | Background location task for active adventures |
| `react-native-maps` | Yes | iOS `ActivityMap`; scavenger `QuestItemsMap` |
| `@maplibre/maplibre-react-native` | Yes | Android `ActivityMap` + MapTiler style |
| Mapbox (`@rnmapbox/maps` etc.) | **No** | — |

Config notes:

- MapTiler key: `EXPO_PUBLIC_MAPTILER_API_KEY` (required for EAS Android builds)
- Android autolinking **excludes** `react-native-maps` (MapLibre path)
- Background location enabled on iOS for walk/cycle; Android background location disabled in plugin config
- `expo-dev-client` + native `ios/` / `android/` trees → **native development builds are already required** (Expo Go is not sufficient)

### Shared map UI

- `apps/mobile/components/activity-map/` — platform-split map for routes + user location
- Explore branch extends this with `pois` / `onPoiPress` (markers + radius circles) — useful to port later
- Haversine: `metersBetween` in `trackingSessionService.ts` (Explore branch also extracts `utils/geo.ts`)

### Compass / heading

- No magnetometer / device-heading Explore UX found. `expo-sensors` is used for step counting.
- Compass is an optional later enhancement, not a current dependency gap for MVP map display.

---

## 6. Existing backpack and collection support

### Backpack (Journal tab)

- Screen: `apps/mobile/app/(tabs)/journal.tsx` (`BackpackScreen`)
- Tiles today: **Journal**, **Badges & Rewards**, **Resources**
- Explore branch adds a **Card Binder** tile → `/(tabs)/activity/explore-collection`

### Badges / rewards (existing collection system)

| Layer | Location |
| --- | --- |
| Tables | `badges`, `user_badges`, later badge progress RPCs; also `user_achievements`; scavenger has separate `huntly_*` tables |
| Screens | `apps/mobile/app/(tabs)/badges.tsx` |
| Services | `badgeService.ts`, `badgeImageService.ts` |
| UI | `BadgeDetailModal`, `BadgePopupModal`, `BadgeImage` |
| Terminology | “Badges”, “Rewards”, “XP”, “explorers” (child profiles) — **not** trading cards |

### Trading cards on `develop`

- **None.** No card catalogue, inventory, binder, or rarity enums on `develop`.

### Binder recommendation

| Option | Verdict |
| --- | --- |
| Extend badges system | **No** — different model (one-time earn vs owned/missing/duplicates + environment draw) |
| Reuse backpack entry + grid/detail UX patterns | **Yes** — binder as a new collection feature, entered from Backpack (+ Explore) |
| Separate Explore card feature | **Yes** — new tables/services/screens; share layout primitives (`ThemedText`, scale hooks, reveal animations) |

Scavenger “items found” is quest-session progress, not a durable card binder. Reuse only geofence/RPC patterns, not the scavenger inventory model.

---

## 7. Existing Explore work

Branches inspected without merge: **`origin/feature/explore`** (primary), **`origin/claude/feature-explore-checkin-2scp9e`** (earlier + PostGIS nearby read).

### What exists (summary)

| Area | Artefacts | Classification |
| --- | --- | --- |
| Permanent stop catalogue | `explore_locations` table; admin CRUD to seed lat/lng POIs | **Discard** for architecture (conflicts with generated stops). Admin CRUD may inform **blocked-stop** tools later, not the world catalogue. |
| PostGIS nearby query | `geog` column + `get_explore_locations_near` (claude branch) | **Discard as catalogue approach**; PostGIS may still be useful later for blocked-stop regions / cache, not as source of truth for all stops |
| Cards catalogue | `explore_collectibles`, categories, rarity enum, weights, storage buckets | **Reuse after refactoring** (terminology, environment tags, claim-once semantics) |
| Inventory | `explore_profile_collectibles` with `count` / shiny fields | **Reuse after refactoring** |
| Visits / claims | `explore_visits`; RPC allows **revisit same location** (10s rate limit only) | **Reuse as reference**; redesign for **claim each stop once** + stable string stop IDs |
| Secure check-in RPC | `check_in_to_explore_location` — auth, accuracy, haversine, weighted draw, atomic inventory | **Reuse after refactoring** (validate generated stop ID, environment weights, ownership multiplier, blocked list) |
| Mobile map flow | `explore-prep`, `explore-map`, `explore-reveal`, `explore-collection` | **Reuse after refactoring** — keep UX flow; replace `getActiveLocations()` with nearby generated stops |
| Foreground location | `exploreForegroundLocationService` (no background route sync) | **Reuse directly** (matches privacy stance) |
| Card UI | `ExploreCard`, `exploreColors`, binder grid, reveal screen | **Reuse after refactoring** |
| Activity entry | Explore in `activityTypes` + stack screens | **Reuse directly** (navigation shape) |
| Backpack binder tile | Journal tile + asset | **Reuse directly** |
| ActivityMap POIs | `pois` / radius markers | **Reuse directly** |
| Admin Explore pages | Seed locations + collectibles | **Reuse after refactoring** for **cards only**; drop permanent location seeding as the stop source of truth |
| Badge stat types migration | Explore-related badge stats | **Use as reference** once claim metrics exist |

### Critical architecture conflict

Existing Explore work treats stops as **admin-seeded rows in `explore_locations`**, optionally indexed with PostGIS for “near me”. That:

1. Permanently stores stops in the DB  
2. Does not generate deterministic worldwide IDs from map data  
3. Allows revisiting the same location for more cards (brief requires claim-once per stop)  
4. Draws cards globally by weight only (no environment profile / new-card bias yet)

**Verdict:** Continue **UI, location permission, map POI, card catalogue, and secure RPC patterns**, but **restart stop generation and claim identity** on the generated-stop model. Do not merge `feature/explore` as-is.

---

## 8. Explore architecture recommendation

| Responsibility | Recommended home | Notes |
| --- | --- | --- |
| Mobile map and location | `apps/mobile` — ActivityMap + `exploreForegroundLocationService` | Foreground-only for Explore; reuse walk map patterns without background tracking |
| Nearby stop requests | Mobile service → backend endpoint/RPC | Client sends user lat/lng + viewport/radius + generation version; receives generated stop DTOs |
| Deterministic stop generation | **Offline/scripts first**, then **server-side generator** (Edge Function or worker) sharing the same rules module | Must not run only on the client as source of truth for claims |
| Safety checks | Same generator rules + optional PostGIS overlays later | Prefer reject over unsafe accept |
| Environment profiling | Generator output fields on each stop DTO | Computed when generating; not a permanent stop row |
| Secure stop claims | Postgres **RPC** (pattern of scavenger + Explore check-in) | Auth, regenerate/validate stop, distance, blocked, claim-once, draw, write claim+inventory atomically |
| Weighted card selection | Inside claim RPC | Base weight × environment match × new/owned multiplier; never on client |
| Binder data access | Mobile service reading card catalogue + inventory tables | Mirror badges screen patterns |
| Blocked-stop checks | Small exception tables + claim/nearby filters | By stable `stop_id`, not a world catalogue |

### Answers to the Step 1 questions

1. **Where should Explore live?** Mobile under `app/(tabs)/activity/explore-*`, services `explore*`, components `Explore*`; docs under `docs/explore/`; backend in `supabase/migrations` (+ optional `supabase/functions` for generation jobs); admin for **cards/exceptions**, not worldwide stops.
2. **Conventions?** Expo Router screens, services layer, StyleSheet/brand colours, profile-scoped actions, SQL RPCs for secure writes, regenerate `models/supabase.ts` after migrations.
3. **Navigation changes?** Add Explore to `activityTypes` / pick-activity; stack screens in `activity/_layout`; Card Binder tile on Backpack; optional deep link from Explore to binder.
4. **Map/location packages?** Yes — `expo-location`, `expo-sensors`, `react-native-maps`, MapLibre/MapTiler. No Mapbox.
5. **Native development build?** Already required.
6. **Backpack/collection reuse?** Backpack entry + badges UX patterns; not the badge data model.
7. **Card/reward model?** Badges/XP exist; trading cards only on Explore branches.
8. **Explore work worth keeping?** Yes for UI/RPC/card patterns; no for permanent `explore_locations` as source of truth.
9. **Permanent stops assumed?** Yes on Explore branches (`explore_locations` ± PostGIS).
10. **Where should generation run?** Shared deterministic generator; prototype as scripts; production nearby-query on server; claim path must re-validate independently of client.
11. **PostGIS?** Not on `develop`. Optional later for exceptions/cache — not for storing all stops.
12. **SQL vs Edge?** Claims/draws → SQL RPCs. Heavy OSM processing / scheduled generation → Edge Function or external worker.
13. **New packages?** See §11.
14. **DB changes?** See §12 (no worldwide stops table).
15. **Risks?** See §13.
16. **Missing info?** See §13 open questions.
17. **Continue or restart?** **Hybrid restart:** keep UX/card/RPC learnings; restart stop architecture.

---

## 9. No-permanent-stop-storage confirmation

The proposed architecture **must not** introduce a permanent worldwide `explore_locations` (or equivalent) catalogue.

| Topic | Approach |
| --- | --- |
| **What generates stops** | Deterministic rules applied to public map data (e.g. OSM extracts) for a requested area / generation version |
| **How they stay stable** | Stable `stop_id` derived from generation version + source feature + candidate index + rounded position (exact hash formula TBD later) |
| **What will be stored** | Card definitions; user card ownership/counts; claimed stop IDs per profile; blocked/reported stop exceptions; claim audit rows |
| **What will not be stored** | The full set of generated stops worldwide as the source of truth |
| **Temporary caching** | Optional later (e.g. short-TTL region cache) for performance only — must remain disposable and regenerable from map data + rules + version |

This explicitly rejects merging the current `feature/explore` `explore_locations` table as the long-term stop model.

---

## 10. Proposed folder structure

Aligned with existing conventions (route + services + components; docs at repo `docs/`).

```text
docs/explore/
  step-1-project-review.md          # this document
  (future step briefs / ADRs)

apps/mobile/app/(tabs)/activity/
  explore-prep.tsx
  explore-map.tsx
  explore-reveal.tsx
  explore-collection.tsx            # binder (also linked from backpack)

apps/mobile/components/
  ExploreCard.tsx
  explore/                          # optional if component count grows

apps/mobile/services/
  exploreForegroundLocationService.ts
  exploreStopsService.ts            # nearby fetch client
  exploreClaimService.ts            # RPC wrapper
  exploreCollectionService.ts       # catalogue + inventory

apps/mobile/constants/
  exploreColors.ts
  exploreGeneration.ts              # client-visible version constant only

supabase/migrations/
  …_explore_cards_and_claims.sql    # cards, ownership, claims, blocks — NO world stops table
  …_claim_explore_stop_rpc.sql

supabase/functions/                 # optional later
  explore-generate-region/          # or keep generation in scripts until needed

scripts/explore/                    # geospatial prototype (Step 2+)
  import-region/
  generate-stops/
  visualize/                        # or feed a temporary mobile/dev map

apps/admin/app/(main)/explore/      # cards + blocked stops; not worldwide POI seeding
```

Do **not** invent a separate `packages/explore` workspace unless generation code must be shared across Node scripts and Edge Functions later.

---

## 11. Likely dependency gaps

Do **not** install these in Step 1. Candidates for later:

| Need | Candidate | Notes |
| --- | --- | --- |
| OSM processing (scripts) | `osmium` / GDAL / Tippecanoe / Python geospatial stack | Prefer scripts outside the Expo app |
| Geometry ops in Node | `@turf/turf` | Useful for prototype spacing / buffers |
| PostGIS | Postgres extension | Only if exceptions/cache queries need it |
| Server generation runtime | Deno Edge Function **or** Node worker | Depends on compute/time limits |
| Compass UX (optional) | Already have `expo-sensors` | No new package if heading is enough |

**Already covered for MVP map/GPS:** `expo-location`, MapLibre / `react-native-maps`, ActivityMap, MapTiler.

---

## 12. Likely database changes

Future migrations only (not created in Step 1). **Do not** add a worldwide generated-stops table.

### Likely extensions

- **PostGIS** — optional, for blocked polygons / cache queries; not required to store all stops

### Likely tables

| Table | Purpose |
| --- | --- |
| `explore_collectible_categories` | Binder filters |
| `explore_collectibles` | Card definitions (image, rarity, base weight, environment affinities) |
| `explore_profile_collectibles` | Ownership + duplicate counts |
| `explore_stop_claims` | `(profile_id, stop_id)` unique — claim-once |
| `explore_stop_blocks` | Blocked stable stop IDs + reason |
| `explore_stop_reports` | Optional user reports |
| Claim audit columns or `explore_claim_events` | Submitted lat/lng/accuracy, distance, card awarded, generation version |

### Likely functions

- `get_explore_stops_near(...)` **or** Edge Function equivalent — returns **generated** stops for a bbox/radius (implementation may call generator + filter blocks), not `SELECT * FROM explore_locations`
- `claim_explore_stop(...)` — auth, validate/regenerate stop, proximity, block check, claim-once, environment-weighted draw with new-card bias, atomic inventory + claim insert

### Explicitly excluded

- Permanent `explore_locations` worldwide catalogue  
- Per-stop spawn tables that imply the stop must exist as a DB row before it can appear on the map

---

## 13. Risks and open questions

### Risks

| Risk | Detail |
| --- | --- |
| Safety / data quality | OSM incompleteness → unsafe or missing candidates; “missing is better than unsafe” needs strong buffers and field testing |
| Architecture drift | Merging `feature/explore` as-is reintroduces permanent stops |
| Claim security | Client GPS spoofing; must re-validate stop geometry server-side from generation rules, not trust client stop coordinates alone |
| Generation cost / latency | On-demand OSM processing may be slow; caching must not become source of truth |
| Rule versioning | Changing generation rules changes stop IDs / positions — need version strategy and claim compatibility policy |
| Empty generated types | `models/supabase.ts` empty on `develop` already breaks typed services |
| Scaling | Viewport queries + spacing across overlapping features need careful ordering |
| Product conflict | Explore branch allows location revisits; brief requires claim-once — UX and economy change |

### Open questions

1. Exact MVP test region (bounding box / city)?
2. OSM data licence/source and update cadence?
3. Minimum stop spacing and claim radius defaults?
4. Generation runtime: Edge Function time limits vs external worker?
5. How to validate stop position on claim without storing the stop (full regenerate vs signed server DTO with short TTL)?
6. Environment taxonomy vs card metadata authoring in admin?
7. Shiny/foil — keep from Explore branch or defer?
8. Should blocked stops support polygons (unsafe areas) or only stop IDs at first?

---

## 14. Step 2 recommendation

**Smallest safe next task:** build a **geospatial prototype for one test region** that proves deterministic, non-stored stop generation — without shipping user-facing Explore or card claims.

Suggested Step 2 scope:

1. Choose one small test bounding box  
2. Import public map data for that region into a **local/script workspace** (not a permanent stops table)  
3. Implement a first deterministic generator (e.g. points along suitable paths **or** points in parks) with a draft stable ID  
4. Output JSON/GeoJSON of generated candidates  
5. Optionally display them on a **developer-only** map (reuse ActivityMap POIs or a simple script viewer)  
6. Document generation version + rejection reasons for unsafe candidates  

**Out of scope for Step 2:** card tables, claim RPC, binder UI, merging `feature/explore`, enabling PostGIS in production, worldwide processing.

---

## Validation

Commands run from `apps/mobile` unless noted. No unrelated failures were fixed.

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` (`expo lint`) | **Passed** (warnings only) | 0 errors, 83 warnings (unused imports, hook deps, etc.) |
| `npx tsc --noEmit` | **Failed** | ~103 `error TS` diagnostics; notable: empty `@/models/supabase` (`Tables` missing), AuthContext typing, paywall/push types, implicit `any`, Jest globals in tests |
| `npx jest --watchAll=false` | **Failed** | All 5 suites fail: `Cannot find module 'expo-modules-core'` from `jest-expo` setup |
| `npx expo-doctor` | **Failed** (2 checks) | Missing peer `expo-asset` (required by `expo-audio`); many Expo package patch-version mismatches vs SDK 55 expected versions |
| `make test` / `make lint` | Equivalent to above workspace scripts | Not re-run separately after direct npm commands |

These are **pre-existing** on `develop` and do not block documentation-only Step 1.

---

## Completion report

1. **Files created or changed:** `docs/explore/step-1-project-review.md` (created). No production code, migrations, or dependency changes.
2. **Validation commands run:** `npm run lint`, `npx tsc --noEmit`, `npx jest --watchAll=false`, `npx expo-doctor` (in `apps/mobile`).
3. **Validation results:** Lint clean of errors (warnings only). Typecheck, Jest, and expo-doctor report existing failures.
4. **Existing failures:** Empty generated Supabase types; assorted TS errors; Jest/`expo-modules-core` resolution; expo-doctor peer + version drift.
5. **Useful code to reuse:** ActivityMap (+ Explore POI extension), foreground Explore location service pattern, haversine/`geo` util, secure claim RPC pattern, card/binder/reveal UI, Backpack tile entry, scavenger location RPC as security reference.
6. **Missing packages/systems:** No OSM/geospatial generator toolchain yet; no PostGIS on `develop`; no trading-card schema on `develop`; Mapbox not present (and not required given MapLibre/Apple Maps).
7. **Continue existing Explore work?** **Hybrid restart** — reuse UI/RPC/card patterns; do **not** continue permanent `explore_locations` as the stop source of truth; do not merge `feature/explore` unchanged.
8. **No permanent worldwide stops storage:** Confirmed in §9 — generate from map data + rules + version; store cards, ownership, claims, exceptions only; optional disposable cache later.
9. **Recommended Step 2:** One-region geospatial prototype with deterministic stop generation and developer visualisation — no claims/cards UI yet.
