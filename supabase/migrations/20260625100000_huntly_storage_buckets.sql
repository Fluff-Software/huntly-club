-- Storage buckets for Huntly app images.
-- All uploads are performed by the Huntly API using the service role key,
-- which bypasses RLS. Only a public SELECT policy is needed per bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'huntly-quest-images',
    'huntly-quest-images',
    true,
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'huntly-quest-item-images',
    'huntly-quest-item-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'huntly-badge-images',
    'huntly-badge-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'huntly-attraction-images',
    'huntly-attraction-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  );

CREATE POLICY "Public read huntly-quest-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'huntly-quest-images');

CREATE POLICY "Public read huntly-quest-item-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'huntly-quest-item-images');

CREATE POLICY "Public read huntly-badge-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'huntly-badge-images');

CREATE POLICY "Public read huntly-attraction-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'huntly-attraction-images');
