-- Drop existing policies for user photos bucket
DROP POLICY IF EXISTS "Users can view their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- Create more permissive policies for user photos
-- Allow public read access to user photos
CREATE POLICY "Public read access for user photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-activity-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-activity-photos' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their photos
CREATE POLICY "Authenticated users can update photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-activity-photos' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their photos
CREATE POLICY "Authenticated users can delete photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-activity-photos' 
    AND auth.role() = 'authenticated'
  );
