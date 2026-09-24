# Huntly World Explore — Step 3: Real OSM Data and Remote Safety Review

> **Follow-ups:** Step 4 tightened safety rules — see [`step-4-safety-rule-tightening.md`](./step-4-safety-rule-tightening.md). Step 5 adds a local nearby-stops API and `__DEV__` debug map — see [`step-5-backend-nearby-stops-and-debug-map.md`](./step-5-backend-nearby-stops-and-debug-map.md). The findings below remain the Step 3 baseline and are not overwritten.

**Date:** 2026-07-23  
**Depends on:** Step 1 + Step 2 docs  
**Code:** `scripts/explore/`  
**Physical walking:** not required (and not performed)

---

## Test area

| Field | Value |
| --- | --- |
| Label | Sneyd Green / Mornington Road, Stoke-on-Trent |
| Anchor | 21 Mornington Road, ST1 6EN (~53.044236, -2.165567) |
| `minLatitude` | `53.0367` |
| `minLongitude` | `-2.1776` |
| `maxLatitude` | `53.0518` |
| `maxLongitude` | `-2.1535` |
| Approx size | ~1.7 km north–south × ~1.6 km east–west |

Mixed residential streets, footpaths, parks / recreation grounds, water, trunk roads (e.g. Leek New Road), and urban fabric. Configurable in `scripts/explore/config.ts`.

---

## OSM preparation approach

```bash
cd scripts/explore
npm run prepare:osm   # network — Overpass download → fixtures/local/
npm run generate      # offline — local GeoJSON only
```

| Topic | Detail |
| --- | --- |
| Download | Overpass API (`overpass-api.de`, fallback `overpass.kumi.systems`) |
| External tools | **None** (no osmium / ogr2ogr). Fails clearly if network/Overpass unavailable |
| Output | `fixtures/local/stoke-sneyd-green.geojson` (gitignored) |
| IDs | Preserved as `way/…`, `node/…`, `relation/…` |
| Tags kept | highway, footway, sidewalk, foot, access, leisure, landuse, natural, waterway, railway, building, amenity, shop, barrier, entrance, tourism, name, … |
| Licence | **ODbL** — © OpenStreetMap contributors — https://www.openstreetmap.org/copyright |

Generation never calls Overpass.

---

## How to review remotely (desktop)

1. Open `scripts/explore/output/review-map.html` in a browser (Leaflet + OSM tiles).  
2. Optionally load GeoJSON layers in **QGIS** over an OSM / satellite basemap.  
3. For each sample stop, open the OSM feature: `https://www.openstreetmap.org/{source_feature_id}`.  
4. Cross-check with satellite imagery (OSM editor background / Bing / ESRI in iD) and street-level imagery where available (Mapillary / Google Street View).  

### Checklist per stop

- Clearly public standing position?
- Road carriageway / building interior / private land?
- Dangerous water edge?
- Motorway / trunk / railway proximity?
- Likely behind wall / fence / gate?
- Appropriate source feature?
- Density reasonable vs neighbours?
- Environment profile plausible?

Do **not** hand-edit coordinates. Issues → rule change, future blocked-stop ID, or mark unclear.

---

## Latest real-data run (this machine)

| Metric | Value |
| --- | --- |
| OSM features in extract | 2609 |
| Source features processed | 249 |
| Source candidates generated | 193 |
| Alternative positions tested | 452 |
| Accepted stops | 34 |
| Source candidates ultimately rejected | 159 |
| Rejected position attempts | 386 |
| Review sample size | 23 |

### Rejections by reason

| Reason | Count |
| --- | --- |
| `outside_test_area` | 229 |
| `too_close_to_existing_stop` | 97 |
| `too_close_to_water` | 43 |
| `too_close_to_trunk_road` | 16 |
| `too_close_to_barrier` | 1 |

### Accepted by confidence

| Confidence | Count |
| --- | --- |
| 0.9 (primary position) | 29 |
| 0.75 (used alternative) | 5 |

### Accepted by source type

| Type | Count |
| --- | --- |
| path | 12 |
| footpath | 9 |
| cycleway_walk | 7 |
| park | 4 |
| recreation_ground | 2 |

### Flags

| Flag | Count |
| --- | --- |
| Near water (review) | 4 |
| Near major road (review) | 0 |

Deterministic re-run: `accepted-stops.geojson` and `summary.json` were **byte-identical** on a second `npm run generate`.

---

## Review sample table (23 stops)

Classifications are from **remote** OSM + imagery context only (no site visit).

| stop_id | source | conf | remote result | suspected issue | proposed rule change | needs later physical check | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stop_00ce8c62 | footpath | 0.9 | Looks safe remotely | — | — | No | Mapped footway; urban profile |
| stop_0363e883 | path | 0.9 | Looks safe remotely | — | — | No | Path with park/garden environment signal |
| stop_0659a5ab | path | 0.75 | Unclear | Water + trunk adjacency; gate on path (Sneyd Hill Park / Leek New Road) | Increase trunk buffer for paths that share nodes with trunk; lower confidence when `barrier=gate` nearby | Yes | Low confidence + near_water |
| stop_0a2690ad | recreation_ground | 0.9 | Looks safe remotely | — | Prefer path seeds inside recreation grounds | Optional | Interior grid candidate |
| stop_1d5515db | park | 0.9 | Unclear | Park polygon adjacent to school grounds / fencing | Exclude park cells within N m of `amenity=school` unless public path exists | Yes | “Bridges” park near academies |
| stop_1edf0b62 | cycleway_walk | 0.75 | Unclear | Near north bbox edge; alternative used | Soft-reject candidates within ~20 m of bbox edge | Optional | Edge + low confidence |
| stop_20c1807d | cycleway_walk | 0.9 | Looks safe remotely | — | — | No | Woodland/urban mix plausible |
| stop_26a65ec7 | footpath | 0.9 | Looks safe remotely | — | — | No | Southern residential footway |
| stop_2bb68226 | path | 0.9 | Looks safe remotely | — | — | No | Near Mornington / Sneyd Green fabric |
| stop_33589bad | path | 0.9 | Unclear | Near water | Stronger water buffer on paths; require ≥20 m from water edge for accept | Yes | near_water |
| stop_35c9af72 | cycleway_walk | 0.9 | Looks safe remotely | — | — | No | Shared-use cycleway with foot=yes |
| stop_46c4dd6c | path | 0.9 | Looks safe remotely | — | — | Optional | Western edge path |
| stop_53670823 | footpath | 0.9 | Looks safe remotely | — | — | No | Woodland-adjacent footway |
| stop_5e790748 | path | 0.75 | Unclear | Same path family as water/trunk cluster | Same as stop_0659a5ab | Yes | Low confidence + near_water |
| stop_77e49d12 | path | 0.75 | Unclear | South bbox edge + alternative | Bbox-edge soft reject | Optional | Low confidence |
| stop_878bb32f | path | 0.9 | Looks safe remotely | — | — | No | Urban path |
| stop_9f5c88ec | path | 0.9 | Looks safe remotely | — | — | No | Woodland/urban mix |
| stop_ba143b37 | cycleway_walk | 0.9 | Looks safe remotely | — | — | No | Shared path |
| stop_bf783f89 | cycleway_walk | 0.75 | Unclear | Alternative position used | Prefer reject over alt when alt leaves obvious desire line | Optional | Low confidence |
| stop_c919c486 | footpath | 0.9 | Looks safe remotely | — | — | No | Near home street fabric |
| stop_f2126e7b | footpath | 0.9 | Looks safe remotely | — | — | No | Urban footway |
| stop_f422fbaf | cycleway_walk | 0.9 | Unclear | Near water (canal / watercourse context) | Water buffer + canal towpath allow-list later | Yes | near_water; env freshwater+woodland |
| stop_f7540388 | footpath | 0.9 | Looks safe remotely | — | — | No | Northern footway |

### Remote issues summary

| Classification | Count (of 23) |
| --- | --- |
| Looks safe remotely | 14 |
| Unclear from available imagery | 9 |
| Looks unsafe | 0 (none conclusive without visit) |

Main remote themes:

1. **Water-adjacent paths** — several accepts remain near water after buffers; need stronger path-specific water rules or canal towpath policy.  
2. **School-adjacent parks** — park polygons can abut fenced school land; need school proximity exclusion.  
3. **Trunk-connected paths** — paths that meet Leek New Road / gates need stricter trunk proximity + barrier awareness.  
4. **Bbox-edge candidates** — many `outside_test_area` rejects are healthy; accepted near-edge points still feel brittle.

No coordinates were manually moved.

---

## Tests

```bash
cd scripts/explore && npm test
```

**Result:** 4 files, **22 passed** (offline fixtures).

Covered: conversion ID/tag survival; residential roads do not generate; buildings are not sources; review sample determinism + low-confidence inclusion; summary separates candidates vs alternatives; prior Step 2 determinism/safety cases.

---

## Confirmations

- Generated stops are **not** stored in Supabase  
- User location is **not** an input to placement  
- Same prepared extract + config → **identical** output  
- Physical walking was **not** required  

---

## Known limitations

- Overpass snapshot can change over time; pin/archive extracts for regressions if needed  
- `outside_test_area` dominates rejection counts when long ways leave the bbox  
- Park interior grid still preferred over mapped park paths  
- Venues (library/museum) still deferred as automatic sources  
- Barrier logic is distance-based, not “which side of the fence”  
- Street-level imagery coverage varies; many “unclear” need a later spot-check  

---

## Recommended next step (Step 4)

Implement the highest-value **rule tightening** from this review, then re-run the same extract:

1. Soft-reject candidates within ~20 m of the bbox edge  
2. Exclude park/recreation interior candidates within N metres of `amenity=school` (unless on a public footway source)  
3. Stronger water buffer for linear path candidates (or explicit canal-towpath allow-list)  
4. Treat nearby `barrier=gate` / fence as confidence penalty or reject  

Only after a cleaner remote pass should physical spot-checks be planned for remaining “unclear” IDs — still without claims/cards UI.
