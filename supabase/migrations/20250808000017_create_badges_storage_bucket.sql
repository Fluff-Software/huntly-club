-- Create storage bucket for badge images
-- This allows storing custom badge images instead of just emojis

-- Create the badges storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'badges',
  'badges',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Create RLS policies for the badges bucket
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

-- Grant permissions
GRANT ALL ON storage.objects TO authenticated;
