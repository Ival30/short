/*
  # Add Role System and Admin Infrastructure
  
  ## Overview
  This migration adds a complete role-based access control system with super admin capabilities,
  system settings management, usage tracking, and audit logging.
  
  ## Changes
  
  ### 1. Profiles Table Extensions
  - Add `role` column (enum: user, admin, super_admin)
  - Add `permissions` column (jsonb) for granular permissions
  - Add `is_active` column for account status
  - Add `subscription_tier` column (free, pro, business, enterprise)
  - Add indexes for performance
  
  ### 2. System Settings Table
  - Store all feature flags and configurations
  - Categories: features, limits, pricing, ai
  - Only super_admin can modify
  - All users can read active settings
  
  ### 3. Admin Audit Log
  - Track all administrative actions
  - Store old/new values for changes
  - Track IP and user agent
  - Indexed for fast queries
  
  ### 4. Usage Tracking Table
  - Track monthly usage per user
  - Videos uploaded, clips generated
  - AI credits used, storage used
  - Enforce limits based on tier
  
  ## Security
  - RLS enabled on all tables
  - Super admin has full access
  - Regular users have limited access
  - Audit trail for compliance
*/

-- ============================================
-- 1. EXTEND PROFILES TABLE WITH ROLE SYSTEM
-- ============================================

-- Add role column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- Add permissions column for granular control
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;

-- Add account status
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add subscription tier
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free' 
  CHECK (subscription_tier IN ('free', 'pro', 'business', 'enterprise'));

-- Create indexes for fast role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

-- Add comments for documentation
COMMENT ON COLUMN profiles.role IS 'User role: user (default), admin, or super_admin';
COMMENT ON COLUMN profiles.permissions IS 'Granular permissions as JSON object';
COMMENT ON COLUMN profiles.is_active IS 'Account status - false means banned/suspended';
COMMENT ON COLUMN profiles.subscription_tier IS 'Subscription level: free, pro, business, enterprise';

-- ============================================
-- 2. CREATE SYSTEM SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  category text NOT NULL CHECK (category IN ('features', 'limits', 'pricing', 'ai', 'general')),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "Super admin full access on system_settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
      AND profiles.is_active = true
    )
  );

-- All authenticated users can read active settings
CREATE POLICY "Users can read active settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Insert default system settings
INSERT INTO system_settings (key, value, category, description) VALUES
(
  'features',
  '{
    "youtube_import": true,
    "ai_transcription": true,
    "ai_clip_detection": true,
    "ai_captions": false,
    "social_media_export": false,
    "batch_processing": false,
    "team_collaboration": false,
    "advanced_analytics": false,
    "custom_branding": false,
    "api_access": false
  }'::jsonb,
  'features',
  'Global feature flags - toggle features on/off'
),
(
  'limits',
  '{
    "free": {
      "videos_per_month": 2,
      "clips_per_video": 10,
      "max_video_size_gb": 2,
      "max_video_duration_minutes": 30,
      "storage_gb": 5,
      "ai_credits_per_month": 100
    },
    "pro": {
      "videos_per_month": 20,
      "clips_per_video": 50,
      "max_video_size_gb": 10,
      "max_video_duration_minutes": 120,
      "storage_gb": 50,
      "ai_credits_per_month": 1000
    },
    "business": {
      "videos_per_month": 100,
      "clips_per_video": 100,
      "max_video_size_gb": 20,
      "max_video_duration_minutes": 240,
      "storage_gb": 200,
      "ai_credits_per_month": 5000
    },
    "enterprise": {
      "videos_per_month": -1,
      "clips_per_video": -1,
      "max_video_size_gb": -1,
      "max_video_duration_minutes": -1,
      "storage_gb": 1000,
      "ai_credits_per_month": -1
    }
  }'::jsonb,
  'limits',
  'Usage limits per subscription tier (-1 means unlimited)'
),
(
  'pricing',
  '{
    "free": 0,
    "pro": 29,
    "business": 99,
    "enterprise": 299
  }'::jsonb,
  'pricing',
  'Monthly pricing per tier in USD'
),
(
  'ai_config',
  '{
    "provider": "groq",
    "transcription_model": "whisper-large-v3",
    "analysis_model": "mixtral-8x7b-32768",
    "caption_model": "mixtral-8x7b-32768",
    "fallback_provider": null,
    "temperature": 0.7,
    "max_tokens": 2000
  }'::jsonb,
  'ai',
  'AI provider and model configuration'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 3. CREATE ADMIN AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins and super_admins can read audit logs
CREATE POLICY "Admins can read audit logs"
  ON admin_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
      AND profiles.is_active = true
    )
  );

-- System can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs"
  ON admin_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);

-- ============================================
-- 4. CREATE USAGE TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  month date NOT NULL,
  videos_uploaded integer DEFAULT 0,
  clips_generated integer DEFAULT 0,
  ai_credits_used integer DEFAULT 0,
  storage_used bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage
CREATE POLICY "Users can read own usage"
  ON usage_tracking
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all usage
CREATE POLICY "Admins can read all usage"
  ON usage_tracking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
      AND profiles.is_active = true
    )
  );

-- System can insert/update usage (via triggers)
CREATE POLICY "System can manage usage"
  ON usage_tracking
  FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usage_user_month ON usage_tracking(user_id, month DESC);
CREATE INDEX IF NOT EXISTS idx_usage_month ON usage_tracking(month DESC);

-- ============================================
-- 5. CREATE NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================
-- 6. CREATE DATABASE FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update usage tracking when video is uploaded
CREATE OR REPLACE FUNCTION update_usage_on_video_upload()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, month, videos_uploaded)
  VALUES (NEW.user_id, date_trunc('month', CURRENT_DATE)::date, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET 
    videos_uploaded = usage_tracking.videos_uploaded + 1,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for video uploads
DROP TRIGGER IF EXISTS video_uploaded_usage_trigger ON videos;
CREATE TRIGGER video_uploaded_usage_trigger
AFTER INSERT ON videos
FOR EACH ROW
EXECUTE FUNCTION update_usage_on_video_upload();

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_storage_on_video_upload()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET storage_used = storage_used + NEW.file_size
  WHERE id = NEW.user_id;
  
  UPDATE usage_tracking
  SET storage_used = storage_used + NEW.file_size,
      updated_at = now()
  WHERE user_id = NEW.user_id 
    AND month = date_trunc('month', CURRENT_DATE)::date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for storage updates
DROP TRIGGER IF EXISTS video_storage_usage_trigger ON videos;
CREATE TRIGGER video_storage_usage_trigger
AFTER INSERT ON videos
FOR EACH ROW
EXECUTE FUNCTION update_storage_on_video_upload();

-- Function to update usage when clip is created
CREATE OR REPLACE FUNCTION update_usage_on_clip_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, month, clips_generated)
  VALUES (NEW.user_id, date_trunc('month', CURRENT_DATE)::date, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET 
    clips_generated = usage_tracking.clips_generated + 1,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for clip creation
DROP TRIGGER IF EXISTS clip_created_usage_trigger ON clips;
CREATE TRIGGER clip_created_usage_trigger
AFTER INSERT ON clips
FOR EACH ROW
EXECUTE FUNCTION update_usage_on_clip_creation();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables that need it
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
BEFORE UPDATE ON usage_tracking
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. HELPER FUNCTIONS FOR ADMIN OPERATIONS
-- ============================================

-- Function to check if user can perform action based on limits
CREATE OR REPLACE FUNCTION check_user_limit(
  p_user_id uuid,
  p_limit_type text,
  p_current_value integer DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_tier text;
  v_limit integer;
  v_current integer;
  v_limits jsonb;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get limits for this tier
  SELECT value INTO v_limits
  FROM system_settings
  WHERE key = 'limits' AND is_active = true;
  
  -- Extract specific limit
  v_limit := (v_limits -> v_tier ->> p_limit_type)::integer;
  
  -- If limit is -1, it's unlimited
  IF v_limit = -1 THEN
    RETURN true;
  END IF;
  
  -- Get current usage
  IF p_current_value IS NULL THEN
    SELECT 
      CASE p_limit_type
        WHEN 'videos_per_month' THEN videos_uploaded
        WHEN 'clips_per_video' THEN clips_generated
        WHEN 'ai_credits_per_month' THEN ai_credits_used
        ELSE 0
      END INTO v_current
    FROM usage_tracking
    WHERE user_id = p_user_id 
      AND month = date_trunc('month', CURRENT_DATE)::date;
  ELSE
    v_current := p_current_value;
  END IF;
  
  -- Check if under limit
  RETURN COALESCE(v_current, 0) < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. UPDATE RLS POLICIES ON EXISTING TABLES
-- ============================================

-- Update videos table policies to respect is_active flag
DROP POLICY IF EXISTS "Users can read own videos" ON videos;
CREATE POLICY "Users can read own videos"
  ON videos
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Admins can read all videos
DROP POLICY IF EXISTS "Admins can read all videos" ON videos;
CREATE POLICY "Admins can read all videos"
  ON videos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
      AND profiles.is_active = true
    )
  );

-- Similar updates for clips table
DROP POLICY IF EXISTS "Users can read own clips" ON clips;
CREATE POLICY "Users can read own clips"
  ON clips
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Admins can read all clips
DROP POLICY IF EXISTS "Admins can read all clips" ON clips;
CREATE POLICY "Admins can read all clips"
  ON clips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
      AND profiles.is_active = true
    )
  );
