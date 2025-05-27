-- Create public bucket for expert session videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expert-session-videos-public',
  'expert-session-videos-public', 
  true,
  524288000, -- 500MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi']
);

-- Create RLS policies for the public bucket (even though it's public, we still need policies for uploads)
CREATE POLICY "Allow admin uploads to expert session videos public bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'expert-session-videos-public' 
  AND auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "Allow public read access to expert session videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'expert-session-videos-public');

CREATE POLICY "Allow admin updates to expert session videos public bucket"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'expert-session-videos-public' 
  AND auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "Allow admin deletes from expert session videos public bucket"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'expert-session-videos-public' 
  AND auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
); 