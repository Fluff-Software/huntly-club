# Huntly Explore — Step 10.4A: National Generator Performance Optimisation

**Date:** 2026-07-24  
**Depends on:** Step 10.4  
**Status:** Optimisation complete. **Full national generate NOT started.** Stoke remains active.

---

## Objective

Cut projected UK+ROI offline generation from ~20 days @ 4 workers to **under 24 hours** without weakening safety, spacing, determinism, or catalogue correctness.

---

## Phase 1 — Profiling (measured)

Instrumentation: `national/profile.ts` (`EXPLORE_PROFILE=1` / `enableExploreProfile()`).

**Top bottlenecks (pre-optimisation, London tile ~45k features):**

1. **Full-scan safety** — each candidate ran ~6 linear passes over all classified features (`evaluateSafety` + proximity helpers) with Turf distance per feature  
2. **Repeated osmium extract** — one process per 0.02° tile  
3. **Repeated parse/classify** — neighbouring tiles re-classified the same padded context  
4. **Environment scoring** — full feature scan for every accepted survivor  
5. **GeoJSONSeq parse** — secondary vs safety, still material on dense extracts  

Wall-clock was dominated by (1): London Phase C generate **~3,189 s** for 18.5 km².

---

## Design changes

| Change | Detail |
| --- | --- |
| Spatial index | **RBush** (`national/spatial-index.ts`, algorithm `rbush-v1`) over classified feature bboxes |
| Exact checks preserved | Turf distance / PIP only on index query hits within `maxSafetyQueryMetres(config)` |
| Regional block | One extract → classify once → index once → many 0.02° cells (`national/regional-block.ts`) |
| Source allowlist | Cells only emit candidates from sources intersecting the padded cell; hazards use full block index |
| Env after safety | Unchanged order; env now **dedupes by feature id** (fixes double-count risk) |
| Profile counters | Index hits, safety ms, env ms, classify ms |
| Resume hash | Includes `OPTIMISED_ALGORITHM_VERSION` — incompatible resume refused |

---

## Environment-profile investigation (923 → explained)

Stoke Overpass vs PBF:

| Finding | Result |
| --- | --- |
| Duplicate counting bug? | **Mitigated** — `scoreEnvironment` now skips duplicate feature ids |
| Relation/member double-count? | Same id dedupe; no evidence of systematic relation inflation after fix |
| Richer PBF context? | **Yes — expected.** Geofabrik retains denser landuse/natural/building than Overpass query |
| National source of truth | **PBF-derived env profiles** (not Overpass snapshot) |
| After index + dedupe parity | env_mismatch **301** (was 923); hard parity still **ok** |

---

## Before / after benchmarks

Baseline = Phase C `uk-and-ireland-benchmark.json`.  
Optimised = regional block + RBush.  
Stoke suburban live A/B (`--rerun-legacy`): **11.3×**, ID Jaccard **1.0**, 36=36 points.

| Area | Legacy ms | Optimised ms | Speedup | Pts (leg→opt) |
| --- | --- | --- | --- | --- |
| Central London | 3,315,228 | 57,591 | **57.6×** | 409→415 |
| Dublin | 1,811,715 | 47,897 | **37.8×** | 382→388 |
| Belfast | 864,914 | 15,035 | **57.5×** | 287→294 |
| Suburban Stoke | 51,046 | 5,099 | **10.0×** | 36→36 |
| Rural England | 400,296 | 6,642 | **60.3×** | 286→294 |
| Wales | 505,508 | 8,757 | **57.7×** | 337→342 |
| Highlands | 669,600 | 1,555 | **431×** | 81→84 |
| Coastal Wight | 1,035,502 | 14,310 | **72.4×** | 664→673 |

Small positive count deltas vs Phase C tiled baseline are from **single-block extract continuity** (fewer artificial tile-edge losses), not safety weakening. Live Stoke suburban A/B was exact.

London profile (optimised): classify 61 ms, index build 225 ms, safety_evaluate ~29 s, environment ~1.5 s, avg indexed scan ≪ full 200k features.

---

## Global spacing scale

| Candidates | Kept | Time |
| --- | --- | --- |
| 500k | 46k | 401 ms |
| 1M | 93k | 885 ms |
| 2.5M | 231k | **2.3 s** |

Not O(n²); safe for national merge.

---

## Recalculated national projection (measured rates)

| Estimate | Hours |
| --- | --- |
| 1 worker | ~38 h |
| **4 workers expected** | **~12.7 h** |
| 6 workers expected | ~8.5 h |
| 8 workers expected | ~6.3 h |
| Optimistic @ 4 | ~10.6 h |
| Pessimistic @ 4 | ~17.3 h |

Includes extraction, classify, index, generate, per-block spacing.  
Add ~1–3 h for final national merge / coverage filter / global spacing / validation.  
Peak heap observed ~400 MB (coastal block); plan **~0.5–1 GiB/worker**.  
Temp disk still ~**25 GiB**. Point count still ~**2.25 M**.

### Acceptance gate: **ideal_pass** (expected under 24 h @ 4 workers)

---

## Parallelism recommendation

- Default **4 workers** (safe, meets <24 h with margin)  
- **6–8** if RAM ≥8 GiB free and SSD not saturated  
- Prefer **one regional block per worker** (avoid rebuilding identical indexes)  
- Output order-independent: stable IDs + global priority spacing  

---

## Step 10.4B — Worker scaling on Apple M1 16 GB (2026-07-24)

**Machine:** Apple M1 (4P+4E), 16 GB RAM, ~73 GB free disk.

| Workers | Wall (7 areas) | vs 4 | Peak RSS | Swap growth | Determinism |
| --- | --- | --- | --- | --- | --- |
| 4 | 241.9 s | — | 914 MB | +896 MB | baseline |
| 6 | 224.9 s | **+7%** | 1177 MB | +360 MB | Jaccard 1.0, 0 field mismatches |
| 8 | not tested | — | — | — | 6 failed ≥15% / comfort rules |

**Selected: `--workers 4`** — 6 workers below the 15% speedup bar; swap already elevated.

National E2E @ 4 workers (revised): expected **~15.2 h**, pessimistic **~21.1 h** (generate ~12.7 / ~17.1 + merge/validate).

Resume test (small build): **pass** (Jaccard 1.0, no duplicates).

Monitoring: `npm run status:catalogue -- --region uk-and-ireland` (read-only).

Approved start (do not run until explicitly approved):

```bash
cd scripts/explore
caffeinate -dimsu npm run generate:catalogue:national -- \
  --region uk-and-ireland \
  --workers 4 \
  --chunk-span 0.02 \
  --pad-metres 400 \
  --resume \
  --confirm-full-run
```

Full write-up: [`step-10-4b-worker-scaling-and-run-readiness.md`](./step-10-4b-worker-scaling-and-run-readiness.md).

---

## Commands

```bash
cd scripts/explore
npm test
npm run parity:stoke -- --region uk-and-ireland
npm run benchmark:catalogue:optimised -- --region uk-and-ireland
# optional live legacy A/B (slow on London):
npm run benchmark:catalogue:optimised -- --region uk-and-ireland --rerun-legacy --only stoke-suburban
```

Full run still gated (do not execute without approval):

```bash
npm run generate:catalogue:national -- \
  --region uk-and-ireland \
  --workers 4 \
  --chunk-span 0.02 \
  --pad-metres 400 \
  --resume \
  --confirm-full-run
```

---

## Remaining risks

- Small count deltas between Phase C tiled baseline and regional-block path — accept for national; Stoke live A/B matched  
- Dense London still ~50 s generate / 18 km² — urban fraction drives the tail of the projection  
- Worker scaling on M1 16 GB: prefer **4 workers** (Step 10.4B); 6 only ~7% faster with swap growth  
- `tsc -p tsconfig.build.json` still has a pre-existing Geometry typing issue in `generate-catalogue.ts`  

---

## Explicit confirmations

- Full national run: **not started**  
- National catalogue: **not imported / not activated**  
- Stoke: **not retired**  
- Safety rules / 150 m spacing: **unchanged**  
- Output deterministic with spatial index (tests + Stoke A/B)  
- Runtime/mobile architecture: **unchanged**  
- Full run still requires `--confirm-full-run`  
