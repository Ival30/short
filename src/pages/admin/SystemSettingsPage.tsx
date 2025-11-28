import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';

export function SystemSettingsPage() {
  const { settings: currentSettings, refreshSettings } = useSettings();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [aiConfig, setAiConfig] = useState<any>({});
  const [backendUrl, setBackendUrl] = useState('');
  const [apiTimeout, setApiTimeout] = useState(30000);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (currentSettings) {
      setFeatures(currentSettings.features || {});
      setAiConfig(currentSettings.ai_config || {});
      setBackendUrl(currentSettings.backend_url || 'http://localhost:8000');
      setApiTimeout(currentSettings.api_timeout || 30000);
    }
  }, [currentSettings]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const { error: featuresError } = await supabase
        .from('system_settings')
        .update({ value: features, updated_at: new Date().toISOString() })
        .eq('key', 'features');

      if (featuresError) throw featuresError;

      const { error: aiError } = await supabase
        .from('system_settings')
        .update({ value: aiConfig, updated_at: new Date().toISOString() })
        .eq('key', 'ai_config');

      if (aiError) throw aiError;

      const { error: backendError } = await supabase
        .from('system_settings')
        .update({ value: backendUrl, updated_at: new Date().toISOString() })
        .eq('key', 'backend_url');

      if (backendError) throw backendError;

      const { error: timeoutError } = await supabase
        .from('system_settings')
        .update({ value: apiTimeout, updated_at: new Date().toISOString() })
        .eq('key', 'api_timeout');

      if (timeoutError) throw timeoutError;

      await refreshSettings();

      setMessage({
        type: 'success',
        text: 'Settings saved successfully!',
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({
        type: 'error',
        text:
          error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (currentSettings) {
      setFeatures(currentSettings.features || {});
      setAiConfig(currentSettings.ai_config || {});
      setBackendUrl(currentSettings.backend_url || 'http://localhost:8000');
      setApiTimeout(currentSettings.api_timeout || 30000);
      setMessage({ type: 'success', text: 'Settings reset to current values' });
      setTimeout(() => setMessage(null), 2000);
    }
  }

  function toggleFeature(feature: string) {
    setFeatures((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  }

  const featureList = [
    {
      key: 'youtube_import',
      name: 'YouTube Import',
      description: 'Allow users to import videos directly from YouTube URLs',
    },
    {
      key: 'ai_transcription',
      name: 'AI Transcription',
      description: 'Enable automatic video transcription using Groq Whisper',
    },
    {
      key: 'ai_clip_detection',
      name: 'AI Clip Detection',
      description: 'Automatically detect and suggest viral clip segments',
    },
    {
      key: 'ai_captions',
      name: 'AI Captions',
      description: 'Generate captions and hashtags for clips',
    },
    {
      key: 'social_media_export',
      name: 'Social Media Export',
      description: 'Export clips directly to social media platforms',
    },
    {
      key: 'batch_processing',
      name: 'Batch Processing',
      description: 'Process multiple videos simultaneously',
    },
    {
      key: 'team_collaboration',
      name: 'Team Collaboration',
      description: 'Enable team features and project sharing',
    },
    {
      key: 'advanced_analytics',
      name: 'Advanced Analytics',
      description: 'Detailed performance metrics and insights',
    },
    {
      key: 'custom_branding',
      name: 'Custom Branding',
      description: 'Allow users to add custom watermarks and branding',
    },
    {
      key: 'api_access',
      name: 'API Access',
      description: 'Enable REST API access for integrations',
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Settings className="w-8 h-8 text-blue-600" />
                  <h1 className="text-3xl font-bold text-slate-900">
                    System Settings
                  </h1>
                </div>
                <p className="text-slate-600">
                  Manage feature flags and AI configuration
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Feature Flags
              </h2>
              <p className="text-slate-600 mb-6 text-sm">
                Enable or disable features globally. When disabled, features
                will be hidden from all users regardless of their subscription
                tier.
              </p>

              <div className="space-y-4">
                {featureList.map((feature) => (
                  <div
                    key={feature.key}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900 mb-1">
                        {feature.name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {feature.description}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleFeature(feature.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        features[feature.key]
                          ? 'bg-blue-600'
                          : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          features[feature.key]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                AI Configuration
              </h2>
              <p className="text-slate-600 mb-6 text-sm">
                Configure AI providers and models for different tasks. Using
                Groq Cloud provides fast, cost-effective AI processing.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    AI Provider
                  </label>
                  <select
                    value={aiConfig.provider || 'groq'}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, provider: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="groq">Groq Cloud (Recommended)</option>
                    <option value="openai">OpenAI (Expensive)</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Groq provides 15x faster inference than GPT-4 at lower cost
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Transcription Model
                  </label>
                  <select
                    value={aiConfig.transcription_model || 'whisper-large-v3'}
                    onChange={(e) =>
                      setAiConfig({
                        ...aiConfig,
                        transcription_model: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="whisper-large-v3">
                      Whisper Large v3 (Best)
                    </option>
                    <option value="whisper-medium">Whisper Medium</option>
                    <option value="whisper-small">Whisper Small (Fast)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Analysis Model
                  </label>
                  <select
                    value={aiConfig.analysis_model || 'mixtral-8x7b-32768'}
                    onChange={(e) =>
                      setAiConfig({
                        ...aiConfig,
                        analysis_model: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mixtral-8x7b-32768">
                      Mixtral 8x7B (32k context)
                    </option>
                    <option value="llama2-70b-4096">Llama 2 70B</option>
                    <option value="gemma-7b-it">Gemma 7B</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Temperature
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={aiConfig.temperature || 0.7}
                      onChange={(e) =>
                        setAiConfig({
                          ...aiConfig,
                          temperature: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      0.0 = Deterministic, 1.0 = Creative
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="4000"
                      step="100"
                      value={aiConfig.max_tokens || 2000}
                      onChange={(e) =>
                        setAiConfig({
                          ...aiConfig,
                          max_tokens: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Maximum response length
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">
                      API Keys Configuration
                    </p>
                    <p className="text-blue-800">
                      API keys are managed via environment variables (GROQ_API_KEY).
                      Configure them in your Supabase Edge Functions settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Backend Configuration
              </h2>
              <p className="text-slate-600 mb-6 text-sm">
                Configure Python backend URL for video processing. This URL is used for YouTube imports, transcription, and clip generation.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Backend URL
                  </label>
                  <input
                    type="url"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    placeholder="http://localhost:8000 or https://your-backend.com"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Development: http://localhost:8000 | Production: https://your-backend-url.com
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    API Timeout (ms)
                  </label>
                  <input
                    type="number"
                    min="5000"
                    max="120000"
                    step="1000"
                    value={apiTimeout}
                    onChange={(e) => setApiTimeout(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Maximum time to wait for backend responses (5-120 seconds)
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-medium mb-1">
                      Important: Protocol Match
                    </p>
                    <p className="text-amber-800">
                      If your frontend uses HTTPS, the backend MUST also use HTTPS to avoid mixed content errors.
                      Local development can use HTTP for both.
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-900">
                    <p className="font-medium mb-2">Backend Services:</p>
                    <ul className="list-disc list-inside space-y-1 text-green-800">
                      <li>YouTube video downloads (yt-dlp)</li>
                      <li>Video processing (ffmpeg)</li>
                      <li>Audio transcription (Whisper)</li>
                      <li>Clip generation (AI analysis)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
