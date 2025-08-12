-- Drop existing policies for user photos bucket
DROP POLICY IF EXISTS "Public read access for user photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

-- Create public policies for testing
CREATE POLICY "Public read access for user photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-activity-photos');

CREATE POLICY "Public upload access for user photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-activity-photos');

CREATE POLICY "Public update access for user photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'user-activity-photos');

CREATE POLICY "Public delete access for user photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'user-activity-photos');
