/*
  # Add Backend URL Configuration

  1. Changes
    - Add backend_url setting to system_settings table
    - Allows admin to configure Python backend URL from UI
    - Defaults to localhost for development

  2. Purpose
    - Centralize backend URL configuration
    - Allow dynamic updates without code changes
    - Support multiple environments (dev, staging, prod)

  3. Security
    - Only super_admin can update
    - All authenticated users can read
    - Validates URL format in application layer
*/

-- Add backend_url setting (using 'general' category)
INSERT INTO system_settings (key, value, category, description)
VALUES (
  'backend_url',
  '"http://localhost:8000"'::jsonb,
  'general',
  'Python backend URL for video processing (yt-dlp, ffmpeg, transcription)'
)
ON CONFLICT (key) DO NOTHING;

-- Add API timeout settings
INSERT INTO system_settings (key, value, category, description)
VALUES (
  'api_timeout',
  '30000'::jsonb,
  'general',
  'API request timeout in milliseconds'
)
ON CONFLICT (key) DO NOTHING;