/*
  # Add YouTube Import Support

  ## Changes
  1. Add source_url column to videos table for storing original YouTube URLs
  2. Add index for faster queries by source

  ## Purpose
  Allow users to import videos directly from YouTube URLs and track the original source.
*/

-- Add source_url column to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS source_url text;

-- Add index for source_url queries
CREATE INDEX IF NOT EXISTS idx_videos_source_url ON videos(source_url) WHERE source_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN videos.source_url IS 'Original source URL for imported videos (e.g., YouTube URL)';
