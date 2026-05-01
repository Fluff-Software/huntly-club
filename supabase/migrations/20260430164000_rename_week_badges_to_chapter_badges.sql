-- Rename week-based badge copy to chapter-based copy for chapter progression badges.
-- This is a data migration only (no schema changes).

-- 1) Rename group labels used in the badges screen/admin list.
UPDATE public.badges
SET sort_group = CASE
  WHEN sort_group = 'Weeks' THEN 'Chapters'
  WHEN sort_group = 'Week' THEN 'Chapter'
  ELSE REPLACE(REPLACE(sort_group, 'Week', 'Chapter'), 'week', 'chapter')
END
WHERE requirement_type = 'packs_completed'
  AND (
    sort_group ILIKE '%week%'
    OR sort_group IN ('Weeks', 'Week')
  );

-- 2) Rename badge titles (e.g. "Week Explorer 1" -> "Chapter Explorer 1").
UPDATE public.badges
SET name = REPLACE(REPLACE(name, 'Week', 'Chapter'), 'week', 'chapter')
WHERE requirement_type = 'packs_completed'
  AND name ILIKE '%week%';

-- 3) Rename descriptions and common week-set phrasing.
UPDATE public.badges
SET description = CASE
  WHEN description ILIKE '%week sets%' THEN
    REPLACE(
      REPLACE(description, 'week sets', 'chapters'),
      'Week sets',
      'Chapters'
    )
  ELSE
    REPLACE(REPLACE(description, 'Week', 'Chapter'), 'week', 'chapter')
END
WHERE requirement_type = 'packs_completed'
  AND description ILIKE '%week%';

