/*
  # Add Helper Functions for Usage Tracking
  
  ## Overview
  This migration adds helper RPC functions for tracking AI credits and usage.
  
  ## New Functions
  1. increment_ai_credits - Track AI credit usage
  2. check_feature_access - Check if user can access a feature
  3. get_user_usage_stats - Get current month usage for a user
  
  ## Usage
  These functions are called from Edge Functions to track usage and enforce limits.
*/

-- Function to increment AI credits usage
CREATE OR REPLACE FUNCTION increment_ai_credits(
  p_user_id uuid,
  p_credits integer
)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, month, ai_credits_used)
  VALUES (
    p_user_id,
    date_trunc('month', CURRENT_DATE)::date,
    p_credits
  )
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    ai_credits_used = usage_tracking.ai_credits_used + p_credits,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current usage stats
CREATE OR REPLACE FUNCTION get_user_usage_stats(p_user_id uuid)
RETURNS TABLE (
  videos_uploaded integer,
  clips_generated integer,
  ai_credits_used integer,
  storage_used bigint,
  videos_limit integer,
  clips_limit integer,
  credits_limit integer
) AS $$
DECLARE
  v_tier text;
  v_limits jsonb;
  v_usage record;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get limits for this tier
  SELECT value INTO v_limits
  FROM system_settings
  WHERE key = 'limits' AND is_active = true;
  
  -- Get current month usage
  SELECT * INTO v_usage
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND month = date_trunc('month', CURRENT_DATE)::date;
  
  -- Return stats
  RETURN QUERY SELECT
    COALESCE(v_usage.videos_uploaded, 0)::integer,
    COALESCE(v_usage.clips_generated, 0)::integer,
    COALESCE(v_usage.ai_credits_used, 0)::integer,
    COALESCE(v_usage.storage_used, 0)::bigint,
    COALESCE((v_limits -> v_tier ->> 'videos_per_month')::integer, 0),
    COALESCE((v_limits -> v_tier ->> 'clips_per_video')::integer, 0),
    COALESCE((v_limits -> v_tier ->> 'ai_credits_per_month')::integer, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access a feature
CREATE OR REPLACE FUNCTION check_feature_access(
  p_user_id uuid,
  p_feature text
)
RETURNS boolean AS $$
DECLARE
  v_tier text;
  v_is_active boolean;
  v_feature_enabled boolean;
  v_tier_access jsonb;
BEGIN
  -- Get user's subscription tier and status
  SELECT subscription_tier, is_active INTO v_tier, v_is_active
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check if user is active
  IF NOT v_is_active THEN
    RETURN false;
  END IF;
  
  -- Check if feature is globally enabled
  SELECT (value ->> p_feature)::boolean INTO v_feature_enabled
  FROM system_settings
  WHERE key = 'features' AND is_active = true;
  
  IF NOT v_feature_enabled THEN
    RETURN false;
  END IF;
  
  -- Define feature-tier mapping
  v_tier_access := '{
    "youtube_import": ["free", "pro", "business", "enterprise"],
    "ai_transcription": ["pro", "business", "enterprise"],
    "ai_clip_detection": ["pro", "business", "enterprise"],
    "ai_captions": ["business", "enterprise"],
    "social_media_export": ["pro", "business", "enterprise"],
    "batch_processing": ["business", "enterprise"],
    "team_collaboration": ["business", "enterprise"],
    "advanced_analytics": ["business", "enterprise"],
    "custom_branding": ["enterprise"],
    "api_access": ["enterprise"]
  }'::jsonb;
  
  -- Check if user's tier has access
  RETURN v_tier = ANY(
    SELECT jsonb_array_elements_text(v_tier_access -> p_feature)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_metadata
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id uuid,
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    target_type,
    target_id,
    old_value,
    new_value,
    metadata
  )
  VALUES (
    p_admin_id,
    p_action,
    p_target_type,
    p_target_id,
    p_old_value,
    p_new_value,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION increment_ai_credits IS 'Increment AI credits usage for a user. Called from Edge Functions after AI operations.';
COMMENT ON FUNCTION get_user_usage_stats IS 'Get current month usage statistics and limits for a user.';
COMMENT ON FUNCTION check_feature_access IS 'Check if user has access to a specific feature based on their tier and feature flags.';
COMMENT ON FUNCTION create_notification IS 'Create a notification for a user.';
COMMENT ON FUNCTION log_admin_action IS 'Log an administrative action for audit trail.';
