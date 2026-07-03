-- Per-mission release dates and display order within campfire sessions.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS release_date date,
  ADD COLUMN IF NOT EXISTS session_order integer;

COMMENT ON COLUMN public.activities.release_date IS
  'Calendar date when the mission unlocks (6:00 UK, same gate as chapters.unlock_date).';
COMMENT ON COLUMN public.activities.session_order IS
  'Display order within a campfire session; synced from campfire_sessions.missions array index.';

-- Backfill release_date from chapter unlock dates.
UPDATE public.activities a
SET release_date = ch.unlock_date
FROM public.chapter_activities ca
JOIN public.chapters ch ON ch.id = ca.chapter_id
WHERE ca.activity_id = a.id
  AND a.release_date IS NULL;

-- Backfill session_order from campfire_sessions.missions array positions.
UPDATE public.activities a
SET session_order = sub.ord
FROM (
  SELECT
    (m.mission_id)::bigint AS activity_id,
    (m.ord - 1)::integer AS ord
  FROM public.campfire_sessions s
  CROSS JOIN LATERAL unnest(s.missions) WITH ORDINALITY AS m(mission_id, ord)
) sub
WHERE a.id = sub.activity_id
  AND (a.session_order IS NULL OR a.session_order <> sub.ord);

CREATE INDEX IF NOT EXISTS activities_release_date_published_idx
  ON public.activities (release_date)
  WHERE content_status = 'published';
