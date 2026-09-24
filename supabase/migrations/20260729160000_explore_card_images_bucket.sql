-- Public bucket for Explore trading-card artwork.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'explore-card-images',
  'explore-card-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Anyone can view explore card images" ON storage.objects;
CREATE POLICY "Anyone can view explore card images" ON storage.objects
  FOR SELECT USING (bucket_id = 'explore-card-images');

DROP POLICY IF EXISTS "Service role can manage explore card images" ON storage.objects;
CREATE POLICY "Service role can manage explore card images" ON storage.objects
  FOR ALL USING (bucket_id = 'explore-card-images')
  WITH CHECK (bucket_id = 'explore-card-images');
