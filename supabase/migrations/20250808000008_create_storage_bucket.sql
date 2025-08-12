-- Create storage bucket for activity images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'activity-images',
  'activity-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage policies for the bucket
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'activity-images');

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'activity-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own uploads" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'activity-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own uploads" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'activity-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
