-- Point new catalogue cards at uploaded public artwork (WebP).

UPDATE public.explore_cards AS c
SET image_path = v.image_path
FROM (VALUES
  ('grey-squirrel', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/grey-squirrel.webp'),
  ('robin', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/robin.webp'),
  ('magpie', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/magpie.webp'),
  ('ladybird', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/ladybird.webp'),
  ('peacock-butterfly', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/peacock-butterfly.webp'),
  ('grey-heron', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/grey-heron.webp'),
  ('hedgehog', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/hedgehog.webp'),
  ('swallow', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/swallow.webp'),
  ('smooth-newt', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/smooth-newt.webp'),
  ('slow-worm', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/slow-worm.webp'),
  ('badger', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/badger.webp'),
  ('barn-owl', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/barn-owl.webp'),
  ('stoat', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/stoat.webp'),
  ('red-squirrel', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/red-squirrel.webp'),
  ('pine-marten', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/pine-marten.webp'),
  ('peregrine-falcon', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/peregrine-falcon.webp'),
  ('dandelion', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/dandelion.webp'),
  ('bramble', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/bramble.webp'),
  ('birch-tree', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/birch-tree.webp'),
  ('holly', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/holly.webp'),
  ('bluebell', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/bluebell.webp'),
  ('primrose', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/primrose.webp'),
  ('wild-garlic', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/wild-garlic.webp'),
  ('rowan-tree', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/rowan-tree.webp'),
  ('ancient-yew', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/ancient-yew.webp'),
  ('bee-orchid', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/bee-orchid.webp'),
  ('river-habitat', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/river-habitat.webp'),
  ('farmland-habitat', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/farmland-habitat.webp'),
  ('hedgerow-habitat', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/hedgerow-habitat.webp'),
  ('wetland-habitat', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/wetland-habitat.webp'),
  ('forest-floor-habitat', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/forest-floor-habitat.webp'),
  ('orchard-habitat', 'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/orchard-habitat.webp')
) AS v(slug, image_path)
WHERE c.slug = v.slug;
