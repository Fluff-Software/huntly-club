# Huntly World Explore — Step 7: Secure Stop Claims

**Date:** 2026-07-23  
**Depends on:** Steps 1–6  
**Scope:** Authenticated claim persistence after backend re-verification — **no cards, no binder, no generated-stop catalogue**

---

## Ownership model

Explore claims are **profile-scoped** (`profiles.id`), matching missions, scavenger hunts, badges, and other child/player progress.

| Field | Role |
| --- | --- |
| `profile_id` | Claim owner (player progress) |
| `user_id` | Authenticated account that owns the profile (denormalised for audit / RLS helpers) |

The mobile client sends `profile_id` for the selected player. The backend validates JWT → `auth.users`, then the RPC checks `profiles.user_id = p_user_id`. Client-supplied `user_id` is ignored.

---

## Claim table

Migration: `supabase/migrations/20260723120000_explore_stop_claims.sql`

Table: `public.explore_stop_claims`

Stores **claim history only**. It does **not** store the generated worldwide stop catalogue.

Notable columns: `stop_id`, `generation_version`, `claimed_at`, `awarded_card_id` (always NULL in Step 7), reported GPS fields, `verified_distance_metres`, `source_type`, `environment_profile`, optional `idempotency_key`.

### Unique constraint

`(profile_id, stop_id)` — a generation-version bump does **not** allow reclaiming the same logical stop. Version is recorded for audit but is not part of uniqueness.

Partial unique index on `idempotency_key` where not null.

Indexes: `user_id`; `(profile_id, claimed_at DESC)`; `stop_id`.

---

## RLS

- **SELECT** for `authenticated` when `profile_id` belongs to `auth.uid()`.
- **No INSERT / UPDATE / DELETE** policies for clients.
- Writes only via `claim_explore_stop` **SECURITY DEFINER** RPC, **EXECUTE granted to `service_role` only**.

`get_explore_claimed_stop_ids(p_profile_id)` is callable by `authenticated` (and service_role) and enforces profile ownership via `auth.uid()`.

---

## Authentication (local Explore Node server)

Mobile sends:

```http
Authorization: Bearer <supabase access token>
```

Server:

1. Parses Bearer token (never logs it).
2. Validates with Supabase anon client `auth.getUser(token)`.
3. Never trusts client `user_id`.
4. Calls service-role RPC only after proximity re-verification.

### Local env (`scripts/explore/.env`)

Copy from `scripts/explore/.env.example` (gitignored; do not commit):

| Variable | Purpose |
| --- | --- |
| `EXPLORE_SUPABASE_URL` | Supabase API URL |
| `EXPLORE_SUPABASE_ANON_KEY` | JWT validation |
| `EXPLORE_SUPABASE_SERVICE_ROLE_KEY` | Claim RPC only |

Aliases `SUPABASE_*` are also accepted. **Never** put the service-role key in `EXPO_PUBLIC_*` or mobile code.

Practical local setup against the hosted develop project:

- URL + anon from `apps/mobile/.env` (`EXPO_PUBLIC_SUPABASE_*`)
- Service-role from `apps/admin/.env` (`SUPABASE_SERVICE_ROLE_KEY`) — same project, server-only

Restart `npm run serve` after writing `.env`. `/health` should report `auth_configured: true` and `claims_configured: true`.

---

## Endpoints

### `POST /explore/stops/claim`

Request:

```json
{
  "stop_id": "stop_example",
  "generation_version": 2,
  "profile_id": 123,
  "reported_location": {
    "latitude": 53.0442,
    "longitude": -2.1656,
    "accuracy_metres": 18
  },
  "idempotency_key": "uuid-per-button-attempt"
}
```

Flow:

1. Authenticate user.
2. Validate body (ignore client user id / stop coordinates).
3. Rate-limit.
4. **Re-verify** stop (same rules as Step 6 — regenerate/resolve stop, distance, accuracy).
5. Service-role `claim_explore_stop` insert.
6. Return claim DTO (`awarded_card_id` always null).

Do **not** trust a prior `/verify` response. Overpass is **not** called.

### `GET /explore/stops/claimed?profile_id=`

Bearer-authenticated list of claimed `stop_id`s for an owned profile.

### Thresholds (unchanged from Step 6)

| Setting | Value |
| --- | --- |
| Claim radius | **50 m** |
| Max GPS accuracy | **75 m** |

---

## Idempotency & concurrency

- Optional `idempotency_key` (uuid): retry returns the same claim (`idempotent_replay: true`).
- Unique `(profile_id, stop_id)` + `unique_violation` handler → exactly one row under concurrent inserts.
- Repeated claim → `{ success: false, error: "already_claimed" }`.

---

## Rate limiting

In-memory, process-local (dev-safe):

- Default minimum **3 s** between claim attempts per authenticated user.
- Default max **20** failed attempts per **60 s** window.

Configurable via `EXPLORE_CLAIM_MIN_INTERVAL_MS`, `EXPLORE_CLAIM_MAX_FAILED_PER_WINDOW`, `EXPLORE_CLAIM_FAILED_WINDOW_MS`.

**Failed attempts are not written to the database.** Only successful claims persist reported location / verified distance. In-memory counters hold user id + timestamps only for the window.

---

## Mobile

- `claimExploreStop({ stopId, generationVersion, profileId, latitude, longitude, accuracyMetres, idempotencyKey })`
- `getClaimedExploreStopIds(profileId)`
- Attaches session access token; never sends trusted user id or stop coordinates.
- Debug UI: **Claim stop (DEV)** with “saves the stop claim but does not award a card”; claimed markers muted; profile picker.

---

## Explicit confirmations

- A **claim record is stored**.
- **Generated stops are not stored** in Supabase.
- **No card is awarded** (`awarded_card_id` null).
- The claim endpoint **re-verifies** every time.
- Mobile clients **cannot** directly insert claims.
- Service-role credentials are **not** exposed to the app.
- **Overpass is not called** during claims.

---

## Applying the migration (hosted develop — prefer over reset)

**Do not use `supabase db reset` on a database with precious data.** Prefer push:

```bash
cd ~/dev/huntly-club
supabase db push
# if CLI asks for out-of-order history:
supabase db push --include-all
```

### Migration history note (2026-07-23)

Remote history had an orphan version `20260716130000` while local scavenger lived under a **duplicate** timestamp `20260716120000` (shared with `add_attraction_website_label`). Push attempted to recreate `scavenger_quest_states` and failed with “already exists”.

Fix applied in-repo:

1. Renamed `20260716120000_scavenger_hunts_world.sql` → `20260716130000_scavenger_hunts_world.sql`
2. `supabase migration repair --status applied 20260716130000` (schema already present; history only)
3. `supabase db push` applied **`20260723120000_explore_stop_claims.sql`** only

Types (optional; does not wipe data):

```bash
# Local Docker stack
supabase gen types typescript --local > apps/mobile/models/supabase.ts

# Or linked hosted project
supabase gen types typescript --linked > apps/mobile/models/supabase.ts
```

---

## Validation

```bash
cd scripts/explore
npm test
npm run generate
npm run serve
```

Claim integration tests (optional; needs service role + `EXPLORE_RUN_CLAIM_INTEGRATION=1`):

```bash
EXPLORE_RUN_CLAIM_INTEGRATION=1 npm test
```

Mobile:

```bash
cd apps/mobile
npm run lint
npx tsc --noEmit
```

### Results (2026-07-23)

| Check | Result |
| --- | --- |
| `scripts/explore` `npm test` | **78 passed**, 8 integration skipped (flag off) |
| `npm run generate` | OK (~36 accepted stops) |
| `npm run serve` | OK — claim + claimed routes |
| Unauthenticated `POST /claim` | `401` `{ error: "unauthenticated" }` |
| Hosted migration | **`explore_stop_claims` applied** via `db push` (no reset) |
| Explore `.env` | URL/anon from mobile; service-role from admin; `/health` → `claims_configured: true` |
| Docker / local `db reset` | Not used (preserves develop data) |
| `supabase gen types` | Still outstanding; `apps/mobile/models/supabase.ts` remains **0 bytes** until `--linked` or local Docker gen |
| Mobile `npm run lint` | 0 errors / 85 pre-existing warnings |
| Mobile `npx tsc --noEmit` | Pre-existing failures (empty `Tables` exports, Jest globals). **No new Step 7 screen/service errors** |
| iOS Simulator claim flows | Ready to try: signed-in app + Explore debug + Sim 10 m / Claim stop (DEV) |

Integration coverage for concurrent claims / RLS: `__tests__/claim-integration.test.ts`.

---

## Known limitations

- Local Explore server must load `scripts/explore/.env` for claims.
- Rate limits are per-process memory only.
- Generated Supabase types file is still empty until regenerated (`--linked` or local).
- No production Explore hosting / HTTPS / EAS claim URL yet.
- Cards, binder, and weighted rewards are out of scope.

---

## Recommended Step 8

Card award on successful claim (weighted pool), binder read UI, and/or hosted Explore backend with production auth, monitoring, and rate limits — without introducing a permanent generated-stop catalogue.
