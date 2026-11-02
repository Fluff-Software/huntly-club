-- Christmas Explore cards: kid-friendly copy, plus a few card changes.
--
--  * Red Squirrel is retired (deactivated, not deleted, so any copy already in a
--    binder keeps resolving) and replaced by Mistletoe at the same weight.
--  * "Penguin in a Scarf" -> "Penguin", "Robin on Holly" -> "Robin".
--  * Mrs Claus gets new artwork (same image_path, re-uploaded to storage).
--
-- Descriptions are rewritten from "what's in the picture" to something fun.

UPDATE public.explore_cards c
SET name = v.name, description = v.description
FROM (VALUES
  ('christmas-santa', 'Santa Claus',
   'The big man himself! He''s making his list, checking it twice, and zooming around the world in one magical night. Have you been good this year?'),
  ('christmas-tree', 'Christmas Tree',
   'The sparkliest spot in the whole house! Every bauble tells a story, and the golden star on top watches over all the presents underneath.'),
  ('christmas-robin', 'Robin',
   'The bravest little bird in the snow! Robins sing all winter long, and spotting one means Christmas is just around the corner.'),
  ('christmas-snowman', 'Snowman',
   'He''s built from snow, sticks and a whole lot of giggles. Shhh... some say he comes alive when nobody''s looking!'),
  ('christmas-gingerbread-house', 'Gingerbread House',
   'Don''t nibble the walls! This sweet little cottage is made of biscuit, icing and gumdrops, and it smells like the best day ever.'),
  ('christmas-presents', 'Pile of Presents',
   'Squish, rattle, shake! Who are all these gifts for? You''ll have to wait until Christmas morning to find out.'),
  ('christmas-candy-cane-path', 'Candy Cane Path',
   'Follow the stripy trail! Every twist and turn smells of peppermint, and it leads to somewhere very special.'),
  ('christmas-mince-pies', 'Mince Pies & Milk',
   'A midnight snack for a very important visitor. Be sure to leave a crumb or two, he''s got a long night ahead!'),
  ('christmas-stockings', 'Christmas Stockings',
   'Hung by the chimney with care! What will you find inside when you wake up? Wriggle, giggle, and peek...'),
  ('christmas-snowy-village', 'Snowy Village',
   'A tiny town where it''s always Christmas Eve. Lights twinkle, chimneys puff, and everyone''s got a smile on.'),
  ('christmas-wreath', 'Door Wreath',
   'A big, bright Christmas hello! Knock knock... who''s there? Merry Christmas, come on in!'),
  ('christmas-fairy-lights', 'Fairy Lights',
   'Tiny stars you can hold in your hands. Flick the switch and watch the whole room fill with sparkle and magic!'),
  ('christmas-hot-chocolate', 'Hot Chocolate',
   'Marshmallows on top, warm hands all around. The best way to defrost after a snowball fight!'),
  ('christmas-snowy-owl', 'Snowy Owl',
   'Whoooo''s out in the frosty night? This wise white owl sees everything, and never tells a soul.'),
  ('christmas-rudolph', 'Rudolph',
   'His nose glows bright, and that''s why Santa picks him to lead the way! Even on the foggiest night, he''ll guide the sleigh home.'),
  ('christmas-penguin', 'Penguin',
   'Waddle, waddle, slide! This little fellow has dreamt of a snowy Christmas all year long, and now it''s finally here.'),
  ('christmas-elf-workshop', 'Elf Workshop',
   'Hammers tapping, paint drying, toys by the thousand! The elves work all year long so every child wakes up smiling.'),
  ('christmas-sleigh-bells', 'Sleigh Bells',
   'The sound of Christmas! On Christmas night, children everywhere listen closely, hoping to hear these bells jingling through the sky. That''s Christmas cheer on its way!'),
  ('christmas-sleigh', 'Santa''s Sleigh',
   'Hold on tight! This magical sleigh zooms across the whole world in a single night, powered by reindeer and Christmas magic.'),
  ('christmas-mrs-claus', 'Mrs Claus',
   'The queen of the kitchen! She bakes the very best gingerbread at the North Pole, and she''s always got a cuddle and a cookie ready.'),
  ('christmas-polar-bear', 'Polar Bear Cub',
   'Splash! Whee! This playful cub loves the snow more than anything, and the northern lights put on a show just for him.'),
  ('christmas-nutcracker', 'Nutcracker',
   'Stand up straight, soldier! He guards the Christmas tree and cracks nuts all night long. Some say he comes alive after midnight.'),
  ('christmas-north-pole', 'The North Pole',
   'The most magical place on Earth! Santa lives here with the elves, the reindeer, and every present ever wrapped.')
) AS v(slug, name, description)
WHERE c.slug = v.slug;

-- Retire the squirrel.
UPDATE public.explore_cards
SET is_active = false, event_weight = 0
WHERE slug = 'christmas-red-squirrel';

-- Mistletoe takes its place (same weight and sort slot).
INSERT INTO public.explore_cards (
  slug, name, description, category, rarity, image_path,
  base_weight, event_id, event_weight, habitat_weights, is_active, sort_order
)
SELECT
  'christmas-mistletoe', 'Mistletoe',
  'Look up! Hang it above a doorway, and everyone underneath gets a Christmas kiss. Giggles guaranteed!',
  'christmas'::public.explore_card_category,
  'christmas'::public.explore_card_rarity,
  'https://qvegtfkpjfyvdxgecglo.supabase.co/storage/v1/object/public/explore-card-images/christmas-mistletoe.webp',
  0, e.id, 10, '{}'::jsonb, true, 2015
FROM public.explore_events e
WHERE e.slug = 'christmas'
ON CONFLICT (slug) DO NOTHING;
