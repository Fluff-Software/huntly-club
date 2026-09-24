# Huntly Explore — Step 10.4B: Worker Scaling and National Run Readiness

**Date:** 2026-07-24  
**Depends on:** Step 10.4, Step 10.4A  
**Status:** Worker scaling complete. **Full national generate NOT started.** Stoke remains active.

---

## Machine

| Spec | Value |
| --- | --- |
| CPU | Apple M1 — 8 cores (4 performance + 4 efficiency) |
| RAM | 16 GB |
| Free disk (at test) | ~73 GB |
| Node | v22.12.0 |

---

## Part 1 — Production path confirmation

National `generate-catalogue-national.ts` now uses **only** the optimised path for confirmed full runs:

- `assertOptimisedProductionPath()` before work
- `groupChunksIntoProcessingBlocks` (~0.1° blocks)
- `processRegionalBlock` (one extract / classify / RBush index per block)
- Shared indexed context across cells in a block
- Per-cell NDJSON streaming + resumable chunk checkpoints
- Global grid spacing at merge (`applyGlobalSpacingGrid`, 150 m)
- Legacy per-cell osmium **forbidden** with `--confirm-full-run` / `allowLegacyPerCellOsmium`

Safeguard tests: `__tests__/worker-scaling.test.ts`.

---

## Worker scaling method

```bash
cd scripts/explore
npm run benchmark:workers -- --region uk-and-ireland --workers 4,6 --resume-test
```

Representative areas (same source revision, 0.02° cells, 400 m pad, regional-block path):

- Central London, Dublin, Belfast, Suburban Stoke, Rural England, Scottish Highlands, Coastal Wight

8 workers **not tested** — 6 failed the ≥15% speedup + comfort rules.

---

## Measured results

| Metric | 4 workers | 6 workers |
| --- | --- | --- |
| Wall clock | **241.9 s** | **224.9 s** |
| Speed-up vs 4 | — | **+7.0%** (below 15% bar) |
| Throughput (bench km²/h) | 5145 | 5534 |
| Accepted points | 2334 | 2334 |
| Failed blocks | 0 | 0 |
| Peak RSS | 914 MB | 1177 MB |
| Peak Node heap | 1682 MB | 1226 MB |
| Swap growth | **+896 MB** | **+360 MB** |
| Memory pressure | normal/healthy | normal/healthy |
| Disk | mild (~15 MB net) | higher temp churn (~1 GB observed) |
| ID Jaccard vs 4 | — | **1.0** |
| Coord / type / source / env mismatches | — | **0 / 0 / 0 / 0** |

**Determinism:** worker count does not change output (exact point ID set + fields).

**8 workers:** skipped (6 not meaningfully faster; swap already growing on 16 GB Mac).

---

## Resume test (small build)

Interrupted simulation (Stoke + rural + Highlands):

- Completed subset then remaining jobs
- Point count 436 = 436
- ID Jaccard **1.0**
- No duplicates
- Config/algorithm path unchanged

---

## Selected worker count

### `--workers 4`

Reasons:

1. 6 workers only **7%** faster (need ≥15%)
2. Swap grew hundreds of MB at both counts; machine already under memory pressure before the bench
3. Peak RSS higher at 6 (~1.2 GB process-side sampling)
4. Reliability over marginal wall-clock on an overnight national run

---

## Revised national projection (this Mac)

Basis: Step 10.4A blended **~38 h @ 1 worker**, scaled by measured parallel efficiency.  
Bench wall times are London-straggler limited and must **not** be extrapolated as raw km²/h.

| | 4 workers (recommended) | 6 workers (not recommended) |
| --- | --- | --- |
| Parallel efficiency | 0.75 | ~0.54 (from measured 4→6) |
| Expected generate | **~12.7 h** | ~11.8 h |
| Optimistic generate | ~10.8 h | ~10.0 h |
| Pessimistic generate | ~17.1 h | ~15.9 h |
| Merge / filter / spacing | ~1–3 h (exp. 2 h) | same |
| Validation | ~0.25–1 h (exp. 0.5 h) | same |
| **Total E2E expected** | **~15.2 h** | ~14.3 h |
| **Total E2E pessimistic** | **~21.1 h** | ~19.9 h |

**Confidence:** medium-high for choosing 4 vs 6; medium for absolute hours (urban mix + osmium/disk contention).

---

## Monitoring

```bash
npm run status:catalogue -- --region uk-and-ireland
```

Read-only: completed / remaining / failed chunks, throughput, ETA, output size, free disk, matching processes, swap/pressure summary.

---

## Keep-awake + approved start command

**Do not execute until explicitly approved.**

`caffeinate -dimsu` correctly forwards npm args after `--`:

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

### Ops checklist

| Item | Guidance |
| --- | --- |
| Expected runtime | ~12–15 h generate; ~15–21 h E2E pessimistic |
| Min free disk before start | **≥ 40 GB** (prefer 50+ GB) |
| RAM headroom | Prefer ≥4 GB free before start; close heavy apps |
| Keep awake | `caffeinate -dimsu` as above (no permanent power-setting changes) |
| Progress | `output/catalogues/uk-and-ireland/build_*/build-manifest.json` + `npm run status:catalogue` |
| Confirm progressing | completed chunk count rising; `status:catalogue` ETA moving |
| Safe stop | Ctrl+C once; wait for in-flight block; re-run same command with `--resume` |
| Restart | Same caffeinate command with `--resume` (config hash must match) |

---

## Explicit confirmations

- Full national run: **not started**
- `--confirm-full-run`: **not used** in this step
- National catalogue: **not imported / not activated**
- Stoke: **not retired**
- Safety rules / 150 m spacing: **unchanged**
- Worker count does not alter output: **confirmed** (4 vs 6)
- Recommendation is for **this M1 16 GB Mac**

### Go / no-go

**GO** to start the national offline generate with `--workers 4` when ready — gates (parity + optimised benchmark) remain satisfied. Do not raise workers without a fresh scaling bench.
