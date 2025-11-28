import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SystemSettings {
  features: {
    youtube_import: boolean;
    ai_transcription: boolean;
    ai_clip_detection: boolean;
    ai_captions: boolean;
    social_media_export: boolean;
    batch_processing: boolean;
    team_collaboration: boolean;
    advanced_analytics: boolean;
    custom_branding: boolean;
    api_access: boolean;
  };
  limits: {
    [tier: string]: {
      videos_per_month: number;
      clips_per_video: number;
      max_video_size_gb: number;
      max_video_duration_minutes: number;
      storage_gb: number;
      ai_credits_per_month: number;
    };
  };
  pricing: {
    [tier: string]: number;
  };
  ai_config: {
    provider: string;
    transcription_model: string;
    analysis_model: string;
    caption_model: string;
    fallback_provider: string | null;
    temperature: number;
    max_tokens: number;
  };
}

export interface UserUsage {
  videos_uploaded: number;
  clips_generated: number;
  ai_credits_used: number;
  storage_used: number;
}

export function useSettings() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    if (user) {
      loadUsage();
    }
  }, [user]);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const settingsMap: any = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value;
      });

      setSettings(settingsMap as SystemSettings);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function loadUsage() {
    if (!user) return;

    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth.toISOString().split('T')[0])
        .maybeSingle();

      if (error) throw error;

      setUsage(
        data || {
          videos_uploaded: 0,
          clips_generated: 0,
          ai_credits_used: 0,
          storage_used: 0,
        }
      );
    } catch (err) {
      console.error('Failed to load usage:', err);
    }
  }

  function isFeatureEnabled(feature: keyof SystemSettings['features']): boolean {
    return settings?.features?.[feature] ?? false;
  }

  function getUserLimit(limitKey: string): number {
    if (!profile || !settings) return 0;

    const tier = profile.subscription_tier || 'free';
    const tierLimits = settings.limits?.[tier];

    if (!tierLimits) return 0;

    return (tierLimits as any)[limitKey] ?? 0;
  }

  function canUserAccess(feature: keyof SystemSettings['features']): boolean {
    if (!isFeatureEnabled(feature)) {
      return false;
    }

    if (!profile) return false;

    const featureTierMap: Record<string, string[]> = {
      youtube_import: ['free', 'pro', 'business', 'enterprise'],
      ai_transcription: ['pro', 'business', 'enterprise'],
      ai_clip_detection: ['pro', 'business', 'enterprise'],
      ai_captions: ['business', 'enterprise'],
      social_media_export: ['pro', 'business', 'enterprise'],
      batch_processing: ['business', 'enterprise'],
      team_collaboration: ['business', 'enterprise'],
      advanced_analytics: ['business', 'enterprise'],
      custom_branding: ['enterprise'],
      api_access: ['enterprise'],
    };

    const allowedTiers = featureTierMap[feature] || [];
    return allowedTiers.includes(profile.subscription_tier || 'free');
  }

  function hasReachedLimit(limitType: string): boolean {
    if (!usage || !profile || !settings) return false;

    const tier = profile.subscription_tier || 'free';
    const limit = getUserLimit(limitType);

    if (limit === -1) return false;

    const currentValue = (usage as any)[limitType] || 0;
    return currentValue >= limit;
  }

  function isAdmin(): boolean {
    return profile?.role === 'admin' || profile?.role === 'super_admin';
  }

  function isSuperAdmin(): boolean {
    return profile?.role === 'super_admin';
  }

  return {
    settings,
    usage,
    loading,
    error,
    isFeatureEnabled,
    getUserLimit,
    canUserAccess,
    hasReachedLimit,
    isAdmin,
    isSuperAdmin,
    refreshSettings: loadSettings,
    refreshUsage: loadUsage,
  };
}
