-- One-time reconciliation for the Explore migration squash (see PR that replaces
-- 20260718*_*.sql with 20260719090000-090300_*.sql).
--
-- Why this is needed: the squashed migrations CREATE TABLE the explore_* schema from scratch.
-- Any environment where the old 20260718* migrations already ran (this was already applied to
-- dev) has those tables/type/function in place, so a plain `supabase db push` of the new
-- migrations will fail immediately on "relation already exists". This script drops the old
-- explore_* schema objects so the new migrations can (re)create them cleanly.
--
-- Deliberately NOT touched: storage.buckets / storage.objects for explore-location-images and
-- explore-collectible-images. That migration's content is byte-identical old vs new -- dropping
-- and recreating the buckets would delete any images already uploaded via the admin app. Repair
-- its migration-history entry instead (see below), don't run this file's DROPs against it.
--
-- Run this ONCE against the target environment (dev), then push the new migrations. Order:
--   1. supabase migration repair --status reverted 20260718120000 20260718120100 \
--        20260718120200 20260718120300 20260718130000 --project-ref <dev-project-ref>
--      (reverts all 5 old timestamps -- their files no longer exist locally)
--   2. supabase migration repair --status applied 20260719090300 --project-ref <dev-project-ref>
--      (marks the unchanged storage-buckets migration as already satisfied without re-running
--      its INSERT, which would otherwise hit a duplicate-bucket-id conflict)
--   3. Run this script against the dev database (e.g. via the Supabase SQL editor, or
--      `psql "$DEV_DB_URL" -f supabase/scripts/reconcile_explore_migration_squash.sql`)
--   4. supabase db push --project-ref <dev-project-ref>  (or let CI do this on merge --
--      steps 1-3 must happen before that CI run, since CI just runs `db push` as-is)
--
-- This wipes all existing Explore data on dev (locations, card catalog, any test inventory/visit
-- history) -- confirmed acceptable since nothing has shipped past dev for this feature yet.
-- Uploaded images in storage are untouched; re-attach them to newly recreated cards by URL if
-- reused, or re-upload.

BEGIN;

DROP FUNCTION IF EXISTS public.check_in_to_explore_location(
  bigint, bigint, double precision, double precision, double precision
);

DROP TABLE IF EXISTS public.explore_visits;
DROP TABLE IF EXISTS public.explore_profile_collectibles;
DROP TABLE IF EXISTS public.explore_location_collectibles;
DROP TABLE IF EXISTS public.explore_collectibles;
DROP TABLE IF EXISTS public.explore_locations;
DROP TYPE IF EXISTS public.explore_collectible_rarity;

COMMIT;
