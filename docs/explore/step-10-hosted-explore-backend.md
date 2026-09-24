# Huntly World Explore — Step 10: Hosted Explore Backend

**Date:** 2026-07-23  
**Depends on:** Steps 1–9  
**Status:** **SUPERSEDED by Step 10.2** (`docs/explore/step-10-2-supabase-edge-on-demand-osm.md`)

---

## Superseded notice

Cloud Run was prepared in this step (Dockerfile, deploy script, EAS URL wiring) but **was not deployed** and is **not** the active hosting approach.

**Active MVP architecture:** Supabase Edge Functions + Supabase Storage with on-demand OSM tile caching (Step 10.2).

Retain Docker / Cloud Run files as reference fallback only:

- No GCP setup required for Explore
- No Cloud Run URL in EAS
- No production dependency on Docker
- No Google secrets required for Explore

Primary documentation: **Step 10.2**.

---

## Original Step 10 summary (historical)

**Selected at the time: Google Cloud Run** (containerised Node service).

Useful concepts retained in Step 10.2:

- structured logging
- health checks
- authentication rules
- secret handling
- rate limiting
- smoke tests
- OSM revision metadata
- no Overpass during normal generation once tiles are cached
- no permanent generated-stop table

Do **not** deploy to Google Cloud for Huntly Explore MVP.

See Step 10.2 for the active architecture, deployment, and mobile integration.
