-- Create storage bucket for category icons (admin uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-icons',
  'category-icons',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage policies for category-icons (public read; service_role used by admin for write)
CREATE POLICY "Public read access for category icons" ON storage.objects
  FOR SELECT USING (bucket_id = 'category-icons');

CREATE POLICY "Insert access for category icons" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'category-icons');

CREATE POLICY "Update access for category icons" ON storage.objects
  FOR UPDATE USING (bucket_id = 'category-icons');

CREATE POLICY "Delete access for category icons" ON storage.objects
  FOR DELETE USING (bucket_id = 'category-icons');
