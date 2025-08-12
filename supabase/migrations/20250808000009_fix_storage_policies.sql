-- Drop existing policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;

-- Create new policies for activity images
CREATE POLICY "Public read access for activity images" ON storage.objects
  FOR SELECT USING (bucket_id = 'activity-images');

CREATE POLICY "Public upload access for activity images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'activity-images');

CREATE POLICY "Public update access for activity images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'activity-images');

CREATE POLICY "Public delete access for activity images" ON storage.objects
  FOR DELETE USING (bucket_id = 'activity-images');
