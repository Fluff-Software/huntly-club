ALTER TYPE campfire_component_type ADD VALUE IF NOT EXISTS 'video';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campfire-video',
  'campfire-video',
  true,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read for campfire-video"
  ON storage.objects FOR SELECT USING (bucket_id = 'campfire-video');

CREATE POLICY "Service role can manage campfire-video"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'campfire-video') WITH CHECK (bucket_id = 'campfire-video');

CREATE POLICY "Authenticated upload for campfire-video"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'campfire-video' AND auth.role() = 'authenticated'
  );
