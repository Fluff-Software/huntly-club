-- Christmas 2026 Explore event (10 Nov 2026 -> end of 31 Dec 2026, UK time).
--
-- Reuses the event-pack machinery from 20261007100100_explore_events_halloween.sql
-- unchanged: an event window, event cards (base_weight 0, drawn by
-- event_weight inside the event pack only) and no duplicates in event packs.
-- Only one event is live at a time (explore_active_event picks the latest
-- start). The window starts after Halloween ends (6 Nov), so they don't overlap.
--
-- Starts with a single card (Santa Claus); more are added later with their
-- own migration, keyed to this event by slug.

INSERT INTO public.explore_events (slug, name, starts_at, ends_at, pack_chance, is_active)
VALUES (
  'christmas',
  'Christmas Pack',
  '2026-11-10 00:00:00+00',
  '2027-01-01 00:00:00+00',
  0.5,
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.explore_cards (
  slug, name, description, category, rarity, image_path,
  base_weight, event_id, event_weight, habitat_weights, is_active, sort_order
)
SELECT
  v.slug, v.name, v.description,
  'christmas'::public.explore_card_category,
  'christmas'::public.explore_card_rarity,
  'https://qvegtfkpjfyvdxgecglo.supabase.co/storage/v1/object/public/explore-card-images/' || v.slug || '.webp',
  0, e.id, v.event_weight, '{}'::jsonb, true, v.sort_order
FROM public.explore_events e
CROSS JOIN (VALUES
  ('christmas-santa', 'Santa Claus',
   'A jolly gift-bringer in a red suit who appears on cold winter nights. Listen for bells, follow the sparkle, and you may spot him delivering holiday cheer!',
   1, 2001),
  ('christmas-tree', 'Christmas Tree',
   'A sparkling fir covered in baubles, ribbons and fairy lights, with a golden star on top. Presents are piled underneath, just waiting to be opened.',
   10, 2002),
  ('christmas-robin', 'Robin on Holly',
   'A plump little robin with a bright orange chest, perched on a snowy holly branch. Its red berries are the perfect winter snack, and its song brightens the frostiest morning.',
   10, 2003),
  ('christmas-snowman', 'Snowman',
   'A cheerful snowman with a carrot nose, coal smile and a cosy tartan scarf. He wears a top hat trimmed with holly and waves his twiggy arms at everyone who passes by.',
   10, 2004),
  ('christmas-gingerbread-house', 'Gingerbread House',
   'A sweet little cottage made of gingerbread, with icing icicles, gumdrop paths and candy-cane pillars. Every window glows warm, and it smells delicious.',
   10, 2005),
  ('christmas-presents', 'Pile of Presents',
   'A mountain of gifts wrapped in red, green and gold, with big shiny bows. Who are they all for? Give one a gentle shake and find out!',
   10, 2006),
  ('christmas-candy-cane-path', 'Candy Cane Path',
   'A snowy trail lined with giant candy canes and glowing lanterns. Follow it all the way to the cosy village, where every window is lit.',
   10, 2007),
  ('christmas-mince-pies', 'Mince Pies & Milk',
   'Star-topped mince pies dusted with sugar, and a bottle of cold milk, left by the fireplace for a very special visitor. Don''t eat them all before he arrives!',
   10, 2008),
  ('christmas-stockings', 'Christmas Stockings',
   'Four knitted stockings hang by the crackling fire, each stuffed with toys, candy canes and tiny presents. One has a reindeer, one a snowman, and all of them are waiting for morning.',
   10, 2009),
  ('christmas-snowy-village', 'Snowy Village',
   'A cosy village tucked into the snowy hills, with glowing windows, wreaths on every door and smoke curling from the chimneys. A stone bridge crosses the river, sparkling with lantern light.',
   10, 2010),
  ('christmas-wreath', 'Door Wreath',
   'A fresh pine wreath on a bright red door, decked with holly, pine cones, shiny berries and a big velvet bow. It twinkles a warm welcome to everyone who knocks.',
   10, 2011),
  ('christmas-fairy-lights', 'Fairy Lights',
   'A string of tiny golden lights wrapped around a snowy fir branch. They glow softly as the snowflakes drift down, lighting up the winter night.',
   10, 2012),
  ('christmas-hot-chocolate', 'Hot Chocolate',
   'A big steaming mug piled high with marshmallows, chocolate flakes and a cinnamon stick. It''s the best way to warm up after a snowy adventure.',
   10, 2013),
  ('christmas-snowy-owl', 'Snowy Owl',
   'A beautiful white owl with bright golden eyes, perched on a frosty branch at sunset. Its feathers keep it warm, and it watches the winter evening glow with quiet wonder.',
   10, 2014),
  ('christmas-red-squirrel', 'Red Squirrel',
   'A fluffy red squirrel nibbling a nut on a snowy tree stump. Its bushy tail is dusted with snowflakes, and it has plenty of berries and pine cones nearby for winter.',
   10, 2015),
  ('christmas-rudolph', 'Rudolph',
   'The most famous reindeer of all, with a shiny red nose that glows in the dark. His antlers twinkle with fairy lights, and his jingle bells ring as he waits to guide Santa''s sleigh.',
   6, 2016),
  ('christmas-penguin', 'Penguin in a Scarf',
   'A fluffy baby penguin in a snowflake scarf and a bobble hat with a big red pompom. It waddles across the ice at sunset, snug and warm.',
   6, 2017),
  ('christmas-elf-workshop', 'Elf Workshop',
   'A cheerful elf in a jingly green hat, painting a toy train in Santa''s busy workshop. Rocking horses, teddy bears and nutcrackers fill every shelf.',
   6, 2018),
  ('christmas-sleigh-bells', 'Sleigh Bells',
   'Shiny golden bells tied with a velvet ribbon, resting in fresh snow. Listen closely at sunset and you might hear them jingle from far away.',
   6, 2019),
  ('christmas-sleigh', 'Santa''s Sleigh',
   'A magnificent red velvet sleigh with swirling golden runners and glowing lanterns. A warm tartan blanket and a few little presents are tucked inside, ready for the longest night of the year.',
   3, 2020),
  ('christmas-mrs-claus', 'Mrs Claus',
   'A kind, twinkly-eyed baker in a holly-trimmed bonnet, sprinkling colourful sprinkles on a tray of gingerbread cookies. Her cosy kitchen smells of sugar, spice and everything nice.',
   3, 2021),
  ('christmas-polar-bear', 'Polar Bear Cub',
   'A fluffy polar bear cub splashing through sparkling snow with a big happy grin. Green and purple northern lights dance across the sky above.',
   3, 2022),
  ('christmas-nutcracker', 'Nutcracker',
   'A smart wooden soldier in a tall black hat, with a fluffy white beard and a golden staff. He stands guard by the fireplace and keeps a watchful eye on the presents.',
   6, 2023),
  ('christmas-north-pole', 'The North Pole',
   'Santa''s snowy workshop village, with candy-striped towers, a giant clock and twinkling lights everywhere. Toys, elves and a few thousand presents are all made right here.',
   2, 2024)
) AS v(slug, name, description, event_weight, sort_order)
WHERE e.slug = 'christmas'
ON CONFLICT (slug) DO NOTHING;
