import { ReactNode } from 'react';
import { useSettings, SystemSettings } from '../hooks/useSettings';
import { Lock, Crown, Zap } from 'lucide-react';

interface FeatureGateProps {
  feature: keyof SystemSettings['features'];
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const { canUserAccess, isFeatureEnabled } = useSettings();

  if (!isFeatureEnabled(feature)) {
    if (fallback) return <>{fallback}</>;
    return showUpgradePrompt ? <FeatureDisabled feature={feature} /> : null;
  }

  if (!canUserAccess(feature)) {
    if (fallback) return <>{fallback}</>;
    return showUpgradePrompt ? <UpgradePrompt feature={feature} /> : null;
  }

  return <>{children}</>;
}

function FeatureDisabled({ feature }: { feature: string }) {
  return (
    <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-8 text-center">
      <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        Feature Temporarily Unavailable
      </h3>
      <p className="text-slate-600 mb-4">
        The <strong>{formatFeatureName(feature)}</strong> feature is currently
        disabled by the system administrator.
      </p>
      <p className="text-sm text-slate-500">
        Please check back later or contact support for more information.
      </p>
    </div>
  );
}

function UpgradePrompt({ feature }: { feature: string }) {
  const tierInfo = getFeatureTier(feature);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
        {tierInfo.tier === 'enterprise' ? (
          <Crown className="w-8 h-8 text-white" />
        ) : (
          <Zap className="w-8 h-8 text-white" />
        )}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {tierInfo.tier === 'enterprise' ? 'Premium' : 'Pro'} Feature
      </h3>
      <p className="text-slate-700 mb-1">
        <strong>{formatFeatureName(feature)}</strong> is available on the{' '}
        <span className="font-semibold text-blue-600 capitalize">
          {tierInfo.tier}
        </span>{' '}
        plan and above.
      </p>
      <p className="text-slate-600 mb-6 text-sm">{tierInfo.description}</p>
      <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg">
        Upgrade to {tierInfo.tier === 'enterprise' ? 'Enterprise' : 'Pro'}
      </button>
      <p className="text-xs text-slate-500 mt-4">
        Starting at ${tierInfo.price}/month
      </p>
    </div>
  );
}

function formatFeatureName(feature: string): string {
  return feature
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getFeatureTier(feature: string): {
  tier: string;
  description: string;
  price: number;
} {
  const tierMap: Record<
    string,
    { tier: string; description: string; price: number }
  > = {
    ai_transcription: {
      tier: 'pro',
      description:
        'Automatically transcribe your videos with AI-powered speech recognition.',
      price: 29,
    },
    ai_clip_detection: {
      tier: 'pro',
      description:
        'Let AI analyze your videos and suggest the best viral clips automatically.',
      price: 29,
    },
    ai_captions: {
      tier: 'business',
      description:
        'Generate engaging captions and hashtags for your clips automatically.',
      price: 99,
    },
    social_media_export: {
      tier: 'pro',
      description:
        'Export clips directly to TikTok, Instagram, YouTube Shorts, and more.',
      price: 29,
    },
    batch_processing: {
      tier: 'business',
      description:
        'Process multiple videos simultaneously to save time and boost productivity.',
      price: 99,
    },
    team_collaboration: {
      tier: 'business',
      description:
        'Collaborate with team members, share projects, and manage permissions.',
      price: 99,
    },
    advanced_analytics: {
      tier: 'business',
      description:
        'Get detailed insights on clip performance, engagement, and virality scores.',
      price: 99,
    },
    custom_branding: {
      tier: 'enterprise',
      description: 'Add your own branding, watermarks, and custom templates.',
      price: 299,
    },
    api_access: {
      tier: 'enterprise',
      description:
        'Integrate ClipForge into your workflow with our powerful API.',
      price: 299,
    },
  };

  return (
    tierMap[feature] || {
      tier: 'pro',
      description: 'Unlock this feature with a premium plan.',
      price: 29,
    }
  );
}

interface LimitGateProps {
  limitType: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function LimitGate({ limitType, children, fallback }: LimitGateProps) {
  const { hasReachedLimit } = useSettings();

  if (hasReachedLimit(limitType)) {
    if (fallback) return <>{fallback}</>;
    return <LimitReached limitType={limitType} />;
  }

  return <>{children}</>;
}

function LimitReached({ limitType }: { limitType: string }) {
  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
        <Zap className="w-6 h-6 text-orange-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        Limit Reached
      </h3>
      <p className="text-slate-700 mb-4">
        You've reached your monthly limit for{' '}
        <strong>{formatFeatureName(limitType)}</strong>.
      </p>
      <button className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium">
        Upgrade Plan
      </button>
    </div>
  );
}
