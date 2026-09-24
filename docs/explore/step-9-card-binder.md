# Huntly World Explore — Step 9: Card Binder (Grid MVP)

**Date:** 2026-07-23  
**Depends on:** Steps 1–8  
**Scope:** Profile card collection UI (read-only) — no trading, sharing, shiny, or stop catalogue changes

---

## Decision: grid layout for now

Step 9 originally aimed at a **physical trading-card binder** (sleeve pockets, swipeable pages, binder chrome).

**Shipped MVP instead uses a simple vertical grid:**

| Planned (binder) | Shipped (grid MVP) |
| --- | --- |
| Sleeve-style page with 6/9 pockets | Vertical `FlatList` with `numColumns` |
| Horizontal swipe + Previous/Next | Natural vertical scroll |
| Binder rings / plastic overlays | Plain card cells |
| Page `X of Y` | Scroll through full filtered catalogue |

**Why:** early binder paging layouts were unreliable and hard to use on phone (empty pages, oversized cells, wasted space). A plain grid ships the collection feature clearly; a sleeve binder can return in a later visual pass.

Product naming stays **Card Binder** (Backpack tile + screen title). Implementation is a **collection grid**.

---

## Goal (what shipped)

Give each player profile a readable card collection:

- Open from Backpack
- All active cards in fixed catalogue order (collected + missing)
- Vertical scroll grid (2-col phone / 3-col tablet)
- Category filters
- Card detail modal
- Link from Explore claim reveal

---

## Backpack tile

**Screen:** `apps/mobile/app/(tabs)/journal.tsx`

Fourth tile:

| Field | Value |
| --- | --- |
| Title | Card Binder |
| Subtitle | View the cards you've discovered |
| CTA | Open binder |
| Colour | `#4A7C59` |
| Art | Placeholder `explore-bg.png` (right-aligned) |
| Route | `/(tabs)/activity/explore-collection` |

Existing Journal / Badges / Resources tiles unchanged.

---

## Route

`apps/mobile/app/(tabs)/activity/explore-collection.tsx`  
Registered in `activity/_layout.tsx`.

Accessible from:

1. Backpack → Open binder  
2. Explore debug claim reveal → **View in Card Binder** (passes `highlightCardId`, optional `profileId`)

This is a real profile feature route, not a debug-only screen.

---

## Collection data

**Service:** `getExploreCardCollection(profileId)` in `apps/mobile/services/exploreStopsService.ts`

Loads via authenticated Supabase RPC `get_explore_profile_card_collection` (JWT session). The screen does **not** require the local Node Explore server.

**Migration:** `supabase/migrations/20260723170000_explore_binder_full_catalogue.sql`

- `LEFT JOIN` all **active** cards with ownership
- `count = 0` / `collected = false` for missing cards
- Includes `sort_order`, `habitat_weights`

Ownership is always the signed-in user’s own profile (RPC raises if `profile_id` is not owned). Collection is **read-only** from this screen — no writes.

Optional HTTP mirror remains: `GET /explore/cards/collection?profile_id=` on the Explore server.

---

## Summary strip

- Unique collected / total active / completion %
- Optional: total copies including duplicates

Duplicates do **not** increase unique completion.

---

## Category filters

Local filter after load (no refetch):

| UI label | DB value |
| --- | --- |
| All | — |
| Animals | `animal` |
| Habitats | `habitat` |
| Flora & Wildlife | `flora_wildlife` |

Profile chips (when multiple profiles) and filters sit in the list header and scroll with the grid.

---

## Layout (grid MVP)

| Device | Columns | Navigation |
| --- | --- | --- |
| Phone | **2** | Vertical scroll |
| Tablet | **3** | Vertical scroll |

Detected via `useLayoutScale().isTablet`.

- Header + chips are `ListHeaderComponent`
- Tap cell → detail modal
- Duplicate badge `×N` when count > 1
- No binder page chrome, sleeve overlays, rings, or horizontal page swipe in this step

Helpers for sorting/filtering/completion (and optional future paging) remain in `apps/mobile/utils/exploreBinder.ts`.

---

## Stable ordering

Catalogue order: `sort_order` ASC, then `name`.

Missing cards keep the same grid position as when collected — collecting never reorders the list.

---

## Cell states

**Collected:** full-colour art (or branded fallback), name, rarity, `×N` badge when `count > 1`, pressable.

**Missing:** dimmed / lock presentation, name shown, “Not discovered”, pressable.

---

## Card detail

Tap a grid cell → **large centred trading card** (fade overlay), not a bottom sheet.

- Dark blur + opacity behind the card
- Card layout: title/rarity strip → main image → status body on the same card
- Collected: description, copies, first/last found, habitats
- Missing: lock + “Not discovered yet” (description hidden until collected)
- Tap backdrop or close control to dismiss

Component: `apps/mobile/components/explore/ExploreCardDetail.tsx`

---

## Image handling

`ExploreCardArt`:

1. Load `http(s)` image URL when present  
2. Branded gradient fallback on missing/failed load (no broken-image icon)  
3. Portrait-ish cell ratio  
4. Collected vs missing clearly different (not colour alone)

**Future storage:** Supabase bucket `explore-card-images` (or public CDN URL stored in `explore_cards.image_path`). Seeded paths are placeholders today.

---

## Awarded-card navigation

From claim reveal:

```
/(tabs)/activity/explore-collection?highlightCardId=<uuid>&profileId=<id>
```

Scrolls to the awarded card in the grid and briefly highlights it (~2.5s).

Collection refreshes on focus (`useFocusEffect`) so new awards appear without restart.

---

## Accessibility

- Cell labels include name, collected/missing, copy count, rarity  
- Filters / refresh / back are buttons with labels  
- Missing state is not colour-only (copy + lock)

---

## Reuse from old `feature/explore`

| Ported / inspired | Discarded |
| --- | --- |
| Backpack tile pattern | Permanent `explore_locations` |
| Rarity colour accents | Admin stop seeding |
| Reveal → binder CTA idea | Shiny/foil / epic-legendary |
| Collection grid idea | Old claim / visit tables / full sleeve binder UI |

---

## Tests

**Unit (mobile Jest file):** `apps/mobile/utils/__tests__/exploreBinder.test.ts`  
**Vitest (runs):** `scripts/explore/__tests__/binder-helpers.test.ts` — covers sort, filter, completion counts, a11y labels, habitat labels, and retained paging helpers for a future binder pass.

**UI tests:** mobile `jest-expo` fails to start (`Cannot find module 'expo-modules-core'`). Do not treat the missing RN UI suite as silent green.

**Explore package:** `cd scripts/explore && npm test`

---

## Validation

```bash
cd scripts/explore && npm test
cd apps/mobile && npm run lint
cd apps/mobile && npx tsc --noEmit
```

---

## Known limitations

- **No physical binder / sleeve pages yet** — grid MVP only
- Placeholder card artwork (no production pack art)
- No cover-open animation
- Full React Native component tests may be blocked by existing Jest/RN setup
- Explore claim still needs local Explore server; collection catalogue uses Supabase only

---

## Recommended Step 10

1. Hosted Explore API (HTTPS) + EAS env URLs  
2. OSM source hosting / refresh  
3. Production auth rate limits + monitoring  
4. Real card artwork pipeline into `explore-card-images`  
5. Non-DEV Explore entry in activity flow (map + claim + binder) without debug chrome  
6. Optional return to swipeable sleeve binder pages once grid UX is proven  

---

## Explicit confirmations

- Card Binder accessible from Backpack  
- **Grid layout shipped instead of binder pages for now**  
- Phone: 2 columns; tablet: 3 columns  
- All active cards remain in fixed catalogue order  
- Collected and missing cards are clearly different  
- Duplicate counts are shown (`×N`)  
- Category filters work locally  
- Collection data is read-only in this screen  
- Generated stops remain unstored  
