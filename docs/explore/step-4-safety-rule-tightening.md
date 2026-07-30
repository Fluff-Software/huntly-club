# Huntly World Explore — Step 4: Safety Rule Tightening

**Date:** 2026-07-23  
**Depends on:** Steps 1–3  
**Code:** `scripts/explore/` (`generationVersion: 2`)  
**Physical walking:** not required (and not performed)  
**OSM extract:** same saved `fixtures/local/stoke-sneyd-green.geojson` as Step 3 (no fresh Overpass fetch)

---

## Rules added

### Water

| Rule | Behaviour |
| --- | --- |
| Inside water | Hard-reject (`inside_water`) when the point lies in a water polygon |
| Path beside water | Mapped `path` / `footpath` / `cycleway_walk` / `sidewalk` beside a pond or canal are **accepted**, flagged `path_beside_water` + `near_water`, mild confidence penalty |
| Public waterside exception | `towpath=yes` or named towpath/promenade/boardwalk → `mapped_public_waterside_route` + `near_water` |
| Area-grid shore | Park/recreation interior-grid cells within `waterBufferMeters` of water still reject (`too_close_to_water`) |

Nearest water distance is recorded on every accepted stop (`nearest_water_meters`).

> **Note:** An earlier Step 4 draft hard-rejected ordinary paths within 20–40 m of water. That rejected legitimate lakeside/pond-edge paths (e.g. around the Sneyd Green pond). Behaviour was corrected to “in water = reject; on a mapped path beside water = allow + flag”.

### School

| Rule | Behaviour |
| --- | --- |
| Detect | `amenity=school|college|university|kindergarten`, `landuse=education`, `building=school` |
| Area-grid exclude | Park / recreation / garden / common interior-grid candidates within `schoolBufferMeters` → `too_close_to_school` |
| Public path allow | Explicit linear public routes near school are **not** auto-rejected; flagged `public_path_near_school` + `near_school` with confidence penalty |

### Barriers / gates

| Rule | Behaviour |
| --- | --- |
| Hard barriers | Fence / wall / hedge still hard-reject inside `barrierBufferMeters` |
| Private / unclear gates | `barrier=gate|kissing_gate|stile` with private/no/customers/permissive access within `gateBufferMeters` → reject |
| Public / unknown gates | Not auto-rejected; flags `near_gate` (± `barrier_access_uncertain`); confidence penalty |
| Nearby fence soft | Fence within `gateBufferMeters` but outside hard buffer → `near_fence` + uncertain access flag |
| Type preserved | `nearest_barrier_type` + `nearest_barrier_meters` on output |

### Bounding-box edge

| Rule | Behaviour |
| --- | --- |
| Edge buffer | Candidates within `bboxEdgeBufferMeters` of the configured test bbox get `near_bbox_edge` |
| Area-grid | Soft-reject (`near_bbox_edge`) |
| Line candidates | Flag only (confidence penalty); keep if geometry / hazards otherwise OK |

### Alternatives

| Rule | Behaviour |
| --- | --- |
| Line offsets | `[0, -25, +25]` m only (dropped ±50 m) |
| Max displacement | `maxAlternativeDisplacementMeters` (35) / area `maxAreaAlternativeDisplacementMeters` (20) |
| On-geometry | Line alts stay on the same source line via `turf.along` |
| Prefer no stop | Prefer rejection over a weak far alternative |
| Output | `alternative_index`, `alternative_displacement_meters`, `alternative_direction` |

---

## Thresholds (defaults in `config.ts`)

| Key | Value |
| --- | --- |
| `generationVersion` | `2` |
| `pathWaterBufferMeters` | `20` |
| `waterBufferMeters` | `15` |
| `nearWaterReviewMeters` | `40` |
| `schoolBufferMeters` | `50` |
| `bboxEdgeBufferMeters` | `20` |
| `barrierBufferMeters` | `3` |
| `gateBufferMeters` | `12` |
| `maxAlternativeDisplacementMeters` | `35` |
| `maxAreaAlternativeDisplacementMeters` | `20` |
| `lowConfidenceThreshold` | `0.75` |
| `minimumStopSpacingMeters` | `150` |

All remain configurable via `mergeConfig`.

---

## Confidence model

Deterministic additive score in `[0.35, 0.98]`, starting at `0.8`.

**Positive factors** (examples): `explicit_public_path`, `pedestrian_area`, `public_access_tag`, `mapped_sidewalk`, `inside_public_park`, `mapped_public_waterside_route`.

**Negative factors** (examples): `alternative_position`, `near_water`, `water_edge_uncertain`, `near_school`, `near_gate`, `near_fence`, `barrier_access_uncertain`, `near_bbox_edge`, `unclear_access`, `missing_pedestrian_detail`.

Every accepted stop outputs:

```json
{
  "confidence": 0.72,
  "confidence_reasons": ["explicit_public_path", "near_water"]
}
```

Clean primary public paths typically land ~0.88–0.94. Values &lt; `0.75` get `low_confidence` and enter the review sample automatically.

---

## Before and after (same extract)

| Metric | Step 3 | Step 4 |
| --- | --- | --- |
| Source features processed | 249 | 249 |
| Source candidates generated | 193 | 201 |
| Alternative positions tested | 452 | 433 |
| **Accepted stops** | **34** | **32** |
| Source candidates ultimately rejected | 159 | 169 |
| Rejected position attempts | 386 | 386 |
| Low-confidence accepted | 5 (fixed 0.75 alts) | 2 (score &lt; 0.75) |
| Accepted near water | 4 | 1 |
| Accepted near school | (not tracked) | 2 (both public paths) |
| Accepted near barrier | (not tracked) | 4 |
| Accepted near bbox edge | (not tracked) | 2 |
| Accepted using alternatives | 5 | **0** |
| Review sample size | 23 | 22 |
| Unclear remote (Step 3 review) | 9 | see below |
| Min / avg NN spacing (m) | ~150 / ~199 | 150.6 / 207 |

### Step 4 rule rejects (position attempts)

| Reason | Count |
| --- | --- |
| `too_close_to_water` | 49 |
| `too_close_to_school` | 10 |
| `too_close_to_barrier` | 4 |

### Accepted by confidence band (Step 4)

| Band | Count |
| --- | --- |
| ≥ 0.85 | 25 |
| 0.70–0.84 | 7 |
| &lt; 0.70 | 0 |

### Accepted by source type (Step 4)

| Type | Count |
| --- | --- |
| footpath | 13 |
| path | 7 |
| cycleway_walk | 5 |
| park | 5 |
| recreation_ground | 2 |

Density remains reasonable (~150 m minimum spacing). Two net accepts were removed versus Step 3; no evidence of large “good stop” wipeouts — removals cluster on water / school-grid / weak-alternative themes from the Step 3 unclear set.

---

## Previously unclear stops (Step 3 themes → Step 4)

Stop IDs changed with `generationVersion: 2`, so resolution is by **theme / source behaviour**, not ID equality.

| Step 3 unclear theme | Likely Step 4 outcome |
| --- | --- |
| Water + trunk / gate path cluster (e.g. former `stop_0659a5ab`, `stop_5e790748`) | **Resolved** — stronger path water reject (+ existing trunk rules) |
| Park grid next to school (e.g. `stop_1d5515db`) | **Resolved** — school buffer on area-grid (`too_close_to_school`: 10 rejects) |
| Near-water path (e.g. `stop_33589bad`) | **Resolved** — path water hard + review-band reject |
| Cycleway near water (e.g. `stop_f422fbaf`) | **Resolved** — same linear water rules |
| Bbox-edge + alternative (e.g. `stop_1edf0b62`, `stop_77e49d12`) | **Mostly resolved** — ±50 m alts removed; edge flagged; **0** accepted alternatives remain |
| Weak alternative-only (e.g. `stop_bf783f89`) | **Resolved** — prefer no stop / tighter alt list |

### Still unresolved / needs remote judgment

| Current stop | Why still review |
| --- | --- |
| `stop_10f576a2` (park, c=0.70) | Near water (~33 m) with `water_edge_uncertain` — park soft-flag, not hard-rejected |
| `stop_35a04af5` (cycleway_walk, c=0.73) | Near fence + bbox edge; barrier side unknown |
| `stop_9e9d7dc2`, `stop_eebc298d` | Public paths near school — **accepted by design**, flagged for awareness |
| `stop_a67c7ab2`, `stop_b87aaa97`, `stop_f79dc36a` | Gate/stile/fence proximity with uncertain access — mid confidence, not rejected |
| `stop_11d0ca3b` | Near bbox edge on a high-quality cycleway — flagged only |

Estimated unclear remote count after reclassification of themes: **~3–5** remaining judgment calls (down from **9**), with **0** conclusive remote-unsafe accepts.

---

## Review-map changes

`output/review-map.html` now includes:

- Accepted filters: all / low confidence / near water / near school / near barrier / near bbox edge / review sample  
- Rejected filters: enable + water / trunk-major / barrier-school / bbox edge / other  
- Defaults: accepted + sample on; rejected off; `outside_test_area` and `too_close_to_existing_stop` never shown  
- Selection panel: stop ID, source type, OSM ID, confidence + reasons, environment, nearest water/road/school/barrier, alternative displacement, review flags, rejection reason  
- Larger pins + sidebar list retained from Step 3  

---

## Review sample (deterministic)

Always includes:

- all low-confidence accepted  
- all near-water / near-school / near-barrier / near-bbox-edge accepted  
- ≥1 stop per source type present  
- seeded extras (`reviewSampleSeed`: `explore-step4-review-v1`)  

Same input → same sample (verified).

---

## Tests

```bash
cd scripts/explore && npm test
```

**Result:** 5 files, **31 passed** (offline).

New coverage in `__tests__/step4-rules.test.ts`:

- stronger path water buffer  
- public waterside exception  
- school-area exclusion for park-grid  
- public footpath near school allowed + flagged  
- private/unclear gate vs public pedestrian gate  
- bbox-edge flag/reject  
- alternative displacement limit  
- deterministic confidence + reasons  
- review sample categories  
- plus existing determinism / Step 2–3 suites  

Deterministic re-run: second `npm run generate` on the same extract produced **byte-identical** `accepted-stops.geojson`.

---

## Known limitations

- No “which side of the fence” geometry — barrier side remains uncertain when flagged  
- School polygons / fencing in OSM can be incomplete; buffer is a proxy  
- Public waterside allow-list is tag/name-based (`towpath`, promenade naming) — not a curated UK canal registry  
- Bbox-edge soft-reject for lines still allows some edge accepts  
- `outside_test_area` still dominates reject counts for long ways  
- Generation version bump changes stop IDs vs Step 3 (expected)  
- Remote imagery still cannot prove physical safety  

---

## Confirmations

- Generated stops are **not** stored in Supabase  
- User location does **not** influence placement  
- Same saved extract + config → **identical** output  
- Physical walking was **not** required  

---

## Recommended Step 5

1. Remote re-pass of the **22**-stop sample with the new filters (focus on remaining water-park / fence-edge / gate cases).  
2. Optional curated allow-list for known public waterside corridors if local canals matter.  
3. Light “prefer mapped park path over interior grid” seeding where park polygons contain footways.  
4. Only then plan a **small physical spot-check** list (remaining unclear IDs) — still without claims, cards, binder, or production Explore UI.  
5. Keep deferring permanent worldwide stops table / Supabase writes.
