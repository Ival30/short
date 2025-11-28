/*
  # Storage Bucket RLS Policies

  ## Overview
  This migration sets up Row Level Security policies for Supabase Storage buckets.

  ## Storage Buckets
  1. `videos` - Original uploaded videos (private)
  2. `clips` - Generated video clips (private)
  3. `thumbnails` - Video and clip thumbnails (public read)

  ## Security Policies
  - Users can only upload, update, and delete their own files
  - Users can only read their own videos and clips
  - Thumbnails are publicly readable but only owners can modify
*/

-- RLS Policies for videos bucket
CREATE POLICY "Users can upload own videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS Policies for clips bucket
CREATE POLICY "Users can upload own clips"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clips' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own clips"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'clips' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own clips"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'clips' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'clips' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own clips"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'clips' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS Policies for thumbnails bucket (public read)
CREATE POLICY "Anyone can read thumbnails"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Users can upload own thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own thumbnails"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );