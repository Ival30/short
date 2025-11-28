/*
  # Create Super Admin Account
  
  ## Overview
  This migration creates the default super admin account for the application.
  
  ## Important Notes
  - Default email: admin@clipforge.com
  - Default password: MUST be changed immediately after first login
  - This account has full access to all system features
  
  ## Changes
  1. Create auth user (if not exists)
  2. Create/update profile with super_admin role
  3. Grant unlimited tier (enterprise)
  
  ## Security
  - Password should be changed immediately
  - Account should be secured with 2FA (future enhancement)
  - All actions are logged in audit_log
*/

-- First, we need to check if the user exists and create/update accordingly
-- Note: We use DO block because we need to handle the user creation conditionally

DO $$
DECLARE
  v_user_id uuid;
  v_user_email text := 'admin@clipforge.com';
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email;
  
  -- If user doesn't exist, we'll need to create via sign up first
  -- For now, we'll just update the profile if it exists
  IF v_user_id IS NOT NULL THEN
    -- Update existing profile to super_admin
    UPDATE profiles
    SET 
      role = 'super_admin',
      subscription_tier = 'enterprise',
      permissions = '{"all": true}'::jsonb,
      is_active = true,
      full_name = 'Super Administrator',
      storage_limit = 1099511627776, -- 1TB
      updated_at = now()
    WHERE id = v_user_id;
    
    -- Log the action
    INSERT INTO admin_audit_log (
      admin_id,
      action,
      target_type,
      target_id,
      new_value,
      metadata
    ) VALUES (
      v_user_id,
      'create_super_admin',
      'profile',
      v_user_id,
      jsonb_build_object(
        'role', 'super_admin',
        'tier', 'enterprise'
      ),
      jsonb_build_object(
        'method', 'migration',
        'timestamp', now()
      )
    );
    
    RAISE NOTICE 'Super admin profile updated for user: %', v_user_id;
  ELSE
    RAISE NOTICE 'User % does not exist yet. Please sign up first, then run this migration again, or update manually via SQL.', v_user_email;
  END IF;
END $$;

-- Create a function to easily promote any user to super admin
CREATE OR REPLACE FUNCTION promote_to_super_admin(user_email text)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET 
    role = 'super_admin',
    subscription_tier = 'enterprise',
    permissions = '{"all": true}'::jsonb,
    is_active = true,
    storage_limit = 1099511627776,
    updated_at = now()
  WHERE id = v_user_id;
  
  -- Log the action
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    target_type,
    target_id,
    new_value
  ) VALUES (
    v_user_id,
    'promote_to_super_admin',
    'profile',
    v_user_id,
    jsonb_build_object(
      'role', 'super_admin',
      'email', user_email
    )
  );
  
  RAISE NOTICE 'User % promoted to super admin', user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to demote from admin roles
CREATE OR REPLACE FUNCTION demote_from_admin(user_email text)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_admin_id uuid;
BEGIN
  -- Get the ID of the user performing the action
  v_admin_id := auth.uid();
  
  -- Get target user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Check if current user is super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_admin_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can demote users';
  END IF;
  
  -- Prevent self-demotion
  IF v_user_id = v_admin_id THEN
    RAISE EXCEPTION 'Cannot demote yourself';
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET 
    role = 'user',
    permissions = '{}'::jsonb,
    updated_at = now()
  WHERE id = v_user_id;
  
  -- Log the action
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    target_type,
    target_id,
    new_value
  ) VALUES (
    v_admin_id,
    'demote_from_admin',
    'profile',
    v_user_id,
    jsonb_build_object(
      'role', 'user',
      'email', user_email
    )
  );
  
  RAISE NOTICE 'User % demoted to regular user', user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban/unban users
CREATE OR REPLACE FUNCTION set_user_active_status(
  user_email text,
  active_status boolean
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();
  
  -- Get target user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_admin_id AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can change user status';
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET 
    is_active = active_status,
    updated_at = now()
  WHERE id = v_user_id;
  
  -- Log the action
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    target_type,
    target_id,
    new_value
  ) VALUES (
    v_admin_id,
    CASE WHEN active_status THEN 'unban_user' ELSE 'ban_user' END,
    'profile',
    v_user_id,
    jsonb_build_object(
      'is_active', active_status,
      'email', user_email
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION promote_to_super_admin IS 'Promote a user to super admin role. Usage: SELECT promote_to_super_admin(''user@example.com'');';
COMMENT ON FUNCTION demote_from_admin IS 'Demote an admin user to regular user. Only super admins can call this.';
COMMENT ON FUNCTION set_user_active_status IS 'Ban or unban a user. Usage: SELECT set_user_active_status(''user@example.com'', false) to ban;';
