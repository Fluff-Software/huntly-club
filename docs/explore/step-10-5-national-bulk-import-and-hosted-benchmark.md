# Huntly Explore — Step 10.5: National Bulk Import, Storage Benchmark, Inactive Hosted Validation

**Date:** 2026-07-26  
**Depends on:** Steps 10.3, 10.4 / 10.4A / 10.4B  
**Status:** Import path implemented. **Real hosted import not auto-executed.** **National not activated.** **Stoke remains active.**

---

## Authoritative local build

| Field | Value |
| --- | --- |
| Build dir | `scripts/explore/output/catalogues/uk-and-ireland/build_2026-07-24T23-11-06-550Z_aa8033` |
| Point count | **776,751** |
| NDJSON | `catalogue.ndjson` (~203 MB / 213,095,829 bytes) |
| SHA-256 | `082f9d00e44ce32eac2555d1ba3581e40a8fe3d63fc2c3da39b18fb3279738b3` |
| Source revision | `2026-07-24_7093f494b688` |
| Config hash | `ac05054c54dad3c0` |
| Validation | `ok` |
| Min spacing | 150 m |

Do not regenerate this build for import.

---

## Part 1 — Schema audit (existing)

Migration `20260724120000_explore_persisted_point_catalogue.sql`:

| Object | Detail |
| --- | --- |
| `explore_point_catalogue_versions` | PK `id`; unique `(region_id, generation_version, source_revision)`; status building→…→active/retired/failed |
| `explore_points` | PK `(catalogue_version_id, id)`; FK cascade to version; generated `location geography(Point,4326)` |
| GiST | `explore_points_location_gix` on `location` |
| Nearby | `get_explore_points_nearby` — **`cv.status = 'active'` only** |
| Verify/claim load | `get_explore_point_by_id` — active preferred, then retired (historical claims) |
| Activation | `activate_explore_catalogue_version` — retires **same region_id** only |
| RLS | Tables enabled; no authenticated write policies; nearby via SECURITY DEFINER |
| Stoke import | `import-catalogue.ts` — Supabase JS **200-row batches** (city-scale only) |
| Claims | `explore_stop_claims.stop_id` text — **no FK** to points; survives catalogue swap |

**Overlap:** Activating national with the old RPC would **not** retire Stoke (different `region_id`). Step 10.5 adds `activate_explore_national_catalogue` for a later controlled cutover.

---

## Import architecture

```
catalogue.ndjson (stream)
  → COPY CSV → explore_points_import_staging
  → validate counts / unique IDs
  → finalise_explore_catalogue_import()
       DELETE old points for version
       INSERT INTO explore_points
       mark version status=ready (active=false)
       DELETE staging
```

- Library: `pg` + `pg-copy-streams` (`COPY FROM STDIN`)
- No per-row HTTP inserts
- No 200-row JS batches for national
- Does not hold all 776k row objects in memory (stream + optional ID set)

Migration: `supabase/migrations/20260726120000_explore_national_bulk_import.sql`

| Addition | Purpose |
| --- | --- |
| `explore_catalogue_import_jobs` | Job status, expected/staged/final counts, hashes |
| `explore_points_import_staging` | COPY target; service_role only; cascade delete |
| `finalise_explore_catalogue_import` | Atomic promote + ready (inactive) |
| `cleanup_explore_catalogue_import` | Drop abandoned staging |
| `get_explore_points_nearby_for_catalogue` | **service_role only** inactive/ready benchmark |
| `activate_explore_national_catalogue` | Gated national activate + Stoke retire |
| `explore_catalogue_storage_stats` | Size / env profile stats |

---

## Commands

### Apply migration

```bash
cd /Users/albanhampton/dev/huntly-club
supabase db push
```

### Preflight (local + optional DB)

```bash
cd scripts/explore
npm run preflight:import:national -- \
  --region uk-and-ireland \
  --build-dir output/catalogues/uk-and-ireland/build_2026-07-24T23-11-06-550Z_aa8033
```

### Dry-run (no inserts)

```bash
npm run import:catalogue:national -- \
  --region uk-and-ireland \
  --build-dir output/catalogues/uk-and-ireland/build_2026-07-24T23-11-06-550Z_aa8033 \
  --dry-run
```

### Real import (manual only — needs `EXPLORE_DATABASE_URL`)

```bash
# In scripts/explore/.env:
# EXPLORE_DATABASE_URL=postgresql://…?sslmode=require

npm run import:catalogue:national -- \
  --region uk-and-ireland \
  --build-dir output/catalogues/uk-and-ireland/build_2026-07-24T23-11-06-550Z_aa8033
```

### Status / benchmark / activation (later)

```bash
npm run status:import:national -- --region uk-and-ireland
npm run benchmark:catalogue:national -- --explain
# DO NOT RUN in 10.5:
npm run activate:catalogue:national -- --region uk-and-ireland --confirm-activate
```

---

## Failure handling

- Staging count ≠ 776,751 → job `failed`, version `failed`, staging cleaned, Stoke untouched  
- Final count mismatch → points for version deleted, not marked ready  
- Rerun: `ON CONFLICT` version upsert + delete points for version + new job; use `--restart-failed` to mark old failed jobs cleaned  
- No fragile mid-COPY resume — restart staging load  

---

## Security

- Service role / DB URL never logged (redacted)  
- Staging + import jobs: no authenticated policies  
- Benchmark RPC: **not** granted to `authenticated`  
- Normal nearby ignores inactive national  
- Mobile never downloads full catalogue  

---

## Rollback

1. Keep national `ready` or set `failed` / delete version (cascade points)  
2. Stoke stays / re-activate with `activate_explore_catalogue_version` on Stoke id  
3. Historical claims remain by `stop_id` text  
4. Re-import from local NDJSON anytime  
5. `SELECT cleanup_explore_catalogue_import(job_id)`  

---

## Runtime compatibility (post-activation, not done now)

- Mobile still sends coords/radius; panning requests visible area only  
- Nearby PostGIS GiST; verify/claim use stored coords + env/type  
- Binder unchanged; no Overpass/PBF/generator at runtime  
- After planned activation: only national active; Stoke retired; no dual-active pins  

---

## Known limitations

- Real import + storage/query numbers require hosted DB credentials and `supabase db push`  
- GiST index size is **shared** across versions; per-version share is estimated by row ratio  
- Activation CLI is prepared but must not run until product approval  

---

## Exact next manual actions

1. `supabase db push`  
2. Set `EXPLORE_DATABASE_URL` (SSL) in `scripts/explore/.env`  
3. Re-run preflight (with DB probe)  
4. Explicitly run real `import:catalogue:national` (no `--dry-run`)  
5. `benchmark:catalogue:national -- --explain`  
6. Later: `activate:catalogue:national -- --confirm-activate`  

---

## Explicit confirmations

- Local validated build not regenerated  
- 776,751 authoritative  
- Streaming COPY importer  
- National not activated in this step  
- Stoke not retired  
- Activation requires later `--confirm-activate`  
