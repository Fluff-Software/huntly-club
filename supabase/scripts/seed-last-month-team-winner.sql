-- Run in Supabase SQL Editor (service role) for one-off backfills.
-- Ongoing automation: Edge Function finalize-monthly-team-winner (cron on 1st of month).
-- See supabase/EDGE_FUNCTION_SECRETS.md for CRON_SECRET, schedule, and curl test.
-- Team ids: 1 = Foxes, 2 = Bears, 3 = Otters

-- =============================================================================
-- 1) Preview: winner from user_achievements (if any rows still exist)
-- =============================================================================
WITH month_bounds AS (
  SELECT
    date_trunc('month', now() AT TIME ZONE 'UTC' - interval '1 month') AS month_start,
    date_trunc('month', now() AT TIME ZONE 'UTC') AS month_end
),
team_totals AS (
  SELECT
    ua.team_id,
    t.name AS team_name,
    sum(ua.xp) AS total_xp
  FROM public.user_achievements ua
  JOIN public.teams t ON t.id = ua.team_id
  CROSS JOIN month_bounds mb
  WHERE ua.created_at >= mb.month_start
    AND ua.created_at < mb.month_end
  GROUP BY ua.team_id, t.name
)
SELECT *
FROM team_totals
ORDER BY total_xp DESC, team_id;

-- =============================================================================
-- 2) Preview: approximate totals from completed missions only
-- =============================================================================
WITH month_bounds AS (
  SELECT
    date_trunc('month', now() AT TIME ZONE 'UTC' - interval '1 month') AS month_start,
    date_trunc('month', now() AT TIME ZONE 'UTC') AS month_end
),
mission_totals AS (
  SELECT
    ud.team AS team_id,
    t.name AS team_name,
    sum(coalesce(a.xp, 0)) AS total_xp
  FROM public.user_activity_progress uap
  JOIN public.profiles p ON p.id = uap.profile_id
  JOIN public.user_data ud ON ud.user_id = p.user_id
  JOIN public.activities a ON a.id = uap.activity_id
  JOIN public.teams t ON t.id = ud.team
  CROSS JOIN month_bounds mb
  WHERE uap.completed_at IS NOT NULL
    AND uap.completed_at >= mb.month_start
    AND uap.completed_at < mb.month_end
    AND ud.team IS NOT NULL
  GROUP BY ud.team, t.name
)
SELECT *
FROM mission_totals
ORDER BY total_xp DESC, team_id;

-- =============================================================================
-- 3) Record last month's winner (edit team_id and total_xp after reviewing above)
-- =============================================================================
INSERT INTO public.team_monthly_winners (year, month, team_id, total_xp)
VALUES (
  extract(year FROM (now() AT TIME ZONE 'UTC' - interval '1 month'))::int,
  extract(month FROM (now() AT TIME ZONE 'UTC' - interval '1 month'))::int,
  1,   -- winning team_id
  0    -- optional display total (0 hides in app if you prefer)
)
ON CONFLICT (year, month) DO UPDATE
SET team_id = EXCLUDED.team_id,
    total_xp = EXCLUDED.total_xp;
