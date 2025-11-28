/*
  # Initial Schema for Video Clipping Application

  ## Overview
  This migration creates the foundational database schema for an AI-powered video clipping application similar to Opus Clips.

  ## New Tables

  ### 1. `profiles`
  - Extends Supabase auth.users with additional user information
  - `id` (uuid, primary key) - References auth.users.id
  - `email` (text) - User's email address
  - `full_name` (text) - User's full name
  - `avatar_url` (text) - URL to user's avatar image
  - `storage_used` (bigint) - Total storage used in bytes
  - `storage_limit` (bigint) - Storage limit in bytes (default 5GB)
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. `videos`
  - Stores uploaded video information
  - `id` (uuid, primary key) - Unique video identifier
  - `user_id` (uuid) - References profiles.id (owner of the video)
  - `title` (text) - Video title
  - `description` (text) - Video description
  - `file_path` (text) - Path to video file in Supabase Storage
  - `thumbnail_path` (text) - Path to thumbnail image
  - `duration` (integer) - Video duration in seconds
  - `file_size` (bigint) - File size in bytes
  - `mime_type` (text) - Video MIME type
  - `status` (text) - Processing status: 'uploading', 'processing', 'ready', 'failed'
  - `transcription` (jsonb) - Video transcription data with timestamps
  - `metadata` (jsonb) - Additional video metadata (resolution, fps, etc.)
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. `clips`
  - Stores generated video clips
  - `id` (uuid, primary key) - Unique clip identifier
  - `video_id` (uuid) - References videos.id (source video)
  - `user_id` (uuid) - References profiles.id (clip owner)
  - `title` (text) - Clip title
  - `start_time` (integer) - Start time in seconds
  - `end_time` (integer) - End time in seconds
  - `duration` (integer) - Clip duration in seconds
  - `file_path` (text) - Path to rendered clip file
  - `thumbnail_path` (text) - Path to clip thumbnail
  - `ai_score` (real) - AI-generated engagement score (0-100)
  - `aspect_ratio` (text) - Aspect ratio: '16:9', '9:16', '1:1'
  - `captions` (jsonb) - Caption data with styling and timestamps
  - `status` (text) - Clip status: 'draft', 'processing', 'ready', 'failed'
  - `settings` (jsonb) - Export settings and configurations
  - `created_at` (timestamptz) - Clip creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. `processing_jobs`
  - Tracks video processing jobs
  - `id` (uuid, primary key) - Unique job identifier
  - `user_id` (uuid) - References profiles.id
  - `video_id` (uuid) - References videos.id (nullable)
  - `clip_id` (uuid) - References clips.id (nullable)
  - `job_type` (text) - Type: 'transcription', 'clip_generation', 'export'
  - `status` (text) - Status: 'queued', 'processing', 'completed', 'failed'
  - `progress` (integer) - Progress percentage (0-100)
  - `error_message` (text) - Error details if failed
  - `metadata` (jsonb) - Additional job metadata
  - `started_at` (timestamptz) - Job start timestamp
  - `completed_at` (timestamptz) - Job completion timestamp
  - `created_at` (timestamptz) - Job creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Authenticated users required for all operations
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  storage_used bigint DEFAULT 0,
  storage_limit bigint DEFAULT 5368709120, -- 5GB default
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  thumbnail_path text,
  duration integer,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  status text DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  transcription jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create clips table
CREATE TABLE IF NOT EXISTS clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_time integer NOT NULL,
  end_time integer NOT NULL,
  duration integer NOT NULL,
  file_path text,
  thumbnail_path text,
  ai_score real DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 100),
  aspect_ratio text DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '9:16', '1:1', '4:5')),
  captions jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'ready', 'failed')),
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create processing_jobs table
CREATE TABLE IF NOT EXISTS processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  clip_id uuid REFERENCES clips(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('transcription', 'clip_generation', 'export')),
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_clips_video_id ON clips(video_id);
CREATE INDEX IF NOT EXISTS idx_clips_user_id ON clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_status ON clips(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_video_id ON processing_jobs(video_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for videos table
CREATE POLICY "Users can view own videos"
  ON videos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
  ON videos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos"
  ON videos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for clips table
CREATE POLICY "Users can view own clips"
  ON clips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clips"
  ON clips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clips"
  ON clips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clips"
  ON clips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for processing_jobs table
CREATE POLICY "Users can view own processing jobs"
  ON processing_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own processing jobs"
  ON processing_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processing jobs"
  ON processing_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clips_updated_at
  BEFORE UPDATE ON clips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();