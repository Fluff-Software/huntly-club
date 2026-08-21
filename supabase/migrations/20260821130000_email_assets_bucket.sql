-- Public bucket for transactional-email branding assets (logo, etc.).
-- Lets emails reference a stable, directly-controlled URL instead of the
-- marketing website's domain/CDN.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-assets',
  'email-assets',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Anyone can view email assets" ON storage.objects;
CREATE POLICY "Anyone can view email assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'email-assets');

DROP POLICY IF EXISTS "Service role can manage email assets" ON storage.objects;
CREATE POLICY "Service role can manage email assets" ON storage.objects
  FOR ALL USING (bucket_id = 'email-assets')
  WITH CHECK (bucket_id = 'email-assets');
