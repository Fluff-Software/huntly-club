-- Starter card categories for World Exploration. Content authors add the 100 launch cards
-- themselves via the admin app; these six categories just need to exist first so cards can be
-- assigned to one. Safe to re-run: upserts on the unique `key`.

INSERT INTO public.explore_collectible_categories (key, label, icon, color, sort_order) VALUES
  ('animals', 'Animals', 'pets', '#C97B20', 1),
  ('habitats', 'Habitats', 'forest', '#2D8A4E', 2),
  ('food', 'Food', 'restaurant', '#D9622B', 3),
  ('plants', 'Plants', 'local-florist', '#4F6F52', 4),
  ('weather', 'Weather', 'cloud', '#3E63C9', 5),
  ('landmarks', 'Landmarks', 'landscape', '#9B4FD1', 6)
ON CONFLICT (key) DO UPDATE
SET label = excluded.label,
    icon = excluded.icon,
    color = excluded.color,
    sort_order = excluded.sort_order;
