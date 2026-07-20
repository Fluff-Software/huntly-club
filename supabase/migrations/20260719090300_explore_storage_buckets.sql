-- Storage buckets for World Exploration admin-authored images.
-- All uploads are performed by the admin app using the service role key, which bypasses RLS.
-- Only a public SELECT policy is needed per bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'explore-location-images',
    'explore-location-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'explore-collectible-images',
    'explore-collectible-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  );

CREATE POLICY "Public read explore-location-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'explore-location-images');

CREATE POLICY "Public read explore-collectible-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'explore-collectible-images');
