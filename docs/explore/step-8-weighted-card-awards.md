# Huntly World Explore — Step 8: Weighted Card Awards

**Date:** 2026-07-23  
**Depends on:** Steps 1–7  
**Scope:** Card catalogue + atomic weighted award on claim — **no binder UI**

---

## Reused from `feature/explore` (without merge)

| Element | Classification |
| --- | --- |
| Profile-scoped ownership + count/duplicates | **Reuse after refactoring** → `explore_profile_cards` |
| Authenticated SELECT RLS / service-role writes | **Reuse directly** (pattern) |
| Rarity tiers | **Reuse after refactoring** → `common/uncommon/rare/very_rare` (dropped epic/legendary/shiny) |
| Reveal UX ideas (name, rarity, new vs duplicate) | **Reuse after refactoring** → simple DEV panel (not full pack animation) |
| `ExploreCard` tilt/sheen / binder grid / admin stop seeding | **Reference only / discard** for this step |
| Permanent `explore_locations` + per-location pools | **Discard** |

---

## Ownership

Cards belong to **`profile_id`** (player), same as claims.

---

## Schema

### `explore_cards`

Catalogue: `slug`, `name`, `description`, `category` (`animal` | `habitat` | `flora_wildlife`), `rarity`, `image_path`, `base_weight`, `habitat_weights` (jsonb), `is_active`, `sort_order`.

### `explore_profile_cards`

Unique `(profile_id, card_id)`; `count` increments on duplicates.

### Claims

`explore_stop_claims.awarded_card_id` FK → `explore_cards.id`, set atomically on award.

Migration: `supabase/migrations/20260723150000_explore_cards_and_weighted_awards.sql`

---

## Weighting

```
final_weight = base_weight × environment_multiplier × collection_multiplier
```

- **base_weight** encodes rarity/availability only (common≈10 … very_rare≈1). **No second rarity factor.**
- **environment_multiplier** = `max(0.1, Σ stop_score[k] × card_habitat[k])` from authoritative stop environment (generator), never client.
- **collection_multiplier** = `4` unowned / `1` owned (configurable constants in RPC).

Pure TS mirror: `scripts/explore/card-weights.ts`.

---

## Random selection

Inside `claim_explore_stop` SECURITY DEFINER RPC:

1. Build positive-weight pool for active cards.
2. `random() * total` (Postgres `random()`, server-side).
3. Cumulative walk → one card.

Mobile cannot choose the card. Client environment/ownership ignored.

---

## Atomicity & idempotency

One transaction: claim insert + ownership upsert + `awarded_card_id`.

- Concurrent claims → one claim row / one award (unique `(profile_id, stop_id)`).
- Same `idempotency_key` → replay original claim + same card; **no second draw / no double increment**.
- Different key on already-claimed stop → `already_claimed` (may include prior award for display).

---

## Endpoints

- `POST /explore/stops/claim` — re-verify then RPC; response includes `award`.
- `GET /explore/cards/collection?profile_id=` — own profile only (binder prep).

---

## Content management (MVP)

- Seed via migration INSERT (21 cards).
- Images: placeholder `explore-cards/<slug>.png` paths (not required to exist for DEV text reveal).
- Edit weights/activate: SQL / future admin; **no** admin stop locations restored.
- Service-role manages writes; authenticated users SELECT active cards / own collection only.

---

## Explicit confirmations

- Successful claims **award one card**.
- New cards weighted higher; duplicates remain possible.
- Environment influences the draw.
- Claim + award are **atomic**.
- Idempotent retries do not award again.
- Generated stops are **not** stored.
- Client cannot choose its card.
- Overpass is not called during claims.

---

## Validation notes

Prefer `supabase db push` (no reset). Regenerate types:

```bash
supabase gen types typescript --linked > apps/mobile/models/supabase.ts
```

---

## Known limitations

- Placeholder art only; no full binder; no admin card CMS ported.
- Weight constants live in RPC (not a config table yet).
- Distribution tests use calculated weights / injectable RNG in unit tests, not flaky live probability loops.

## Recommended Step 9

Binder UI (grid/detail) using `GET /explore/cards/collection`, real card art upload, optional admin card editor (catalogue only).
