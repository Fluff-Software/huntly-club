-- Fix RLS policies for badges storage bucket
-- Drop existing policies and recreate them properly

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view badge images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload badge images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update badge images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete badge images" ON storage.objects;

-- Create new policies with proper conditions
CREATE POLICY "Anyone can view badge images" ON storage.objects
  FOR SELECT USING (bucket_id = 'badges');

CREATE POLICY "Authenticated users can upload badge images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'badges' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update badge images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'badges' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete badge images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'badges' 
    AND auth.role() = 'authenticated'
  );

-- Ensure the bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'badges',
  'badges',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
