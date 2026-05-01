-- Keep only 3 badges per badge group (sort_group), deleting all others.
-- Retention priority within each group:
-- 1) lower sort_order first
-- 2) lower requirement_value first
-- 3) lower id first

WITH ranked_badges AS (
  SELECT
    b.id,
    b.sort_group,
    ROW_NUMBER() OVER (
      PARTITION BY b.sort_group
      ORDER BY
        COALESCE(b.sort_order, 0) ASC,
        COALESCE(b.requirement_value, 0) ASC,
        b.id ASC
    ) AS rn
  FROM public.badges b
),
to_delete AS (
  SELECT id
  FROM ranked_badges
  WHERE rn > 3
)
DELETE FROM public.badges b
USING to_delete d
WHERE b.id = d.id;

