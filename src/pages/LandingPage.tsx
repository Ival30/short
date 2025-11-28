import { useNavigate } from 'react-router-dom';
import { Video, Zap, Upload, Scissors, Sparkles, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleGetStarted = () => navigate('/auth');
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Video className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-slate-900">ClipForge</span>
            </div>
            <button
              onClick={handleGetStarted}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-6 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            AI-Powered Video Editing
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Transform Long Videos Into
            <span className="text-blue-600"> Viral Clips</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            Upload your long-form content and let AI automatically identify the most engaging moments.
            Create professional short-form clips optimized for social media in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Creating Clips
            </button>
            <button className="px-8 py-4 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-lg border-2 border-slate-200">
              Watch Demo
            </button>
          </div>
        </div>

        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10"></div>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <div className="text-center">
                <Video className="w-24 h-24 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Demo Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
          <p className="text-lg text-slate-600">Three simple steps to create viral content</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <Upload className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">1. Upload Video</h3>
            <p className="text-slate-600 leading-relaxed">
              Drag and drop your long-form video. Supports all major formats and files up to 5GB.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <Zap className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">2. AI Analysis</h3>
            <p className="text-slate-600 leading-relaxed">
              Our AI identifies the most engaging moments, hooks, and key points automatically.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <Scissors className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">3. Export Clips</h3>
            <p className="text-slate-600 leading-relaxed">
              Review AI-generated clips, add captions, and export in perfect formats for any platform.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Powerful Features</h2>
            <p className="text-lg text-slate-600">Everything you need to create viral content</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: 'AI Clip Detection',
                description: 'Automatically identify the most engaging segments from your videos',
              },
              {
                icon: Video,
                title: 'Multiple Formats',
                description: 'Export in 16:9, 9:16, 1:1, and 4:5 for all social platforms',
              },
              {
                icon: Zap,
                title: 'Auto Captions',
                description: 'Generate and customize captions with perfect timing',
              },
              {
                icon: Scissors,
                title: 'Precision Editing',
                description: 'Fine-tune clips with frame-accurate timeline controls',
              },
              {
                icon: Upload,
                title: 'Batch Processing',
                description: 'Process multiple videos simultaneously to save time',
              },
              {
                icon: Play,
                title: 'Instant Preview',
                description: 'Preview clips before exporting with real-time rendering',
              },
            ].map((feature, index) => (
              <div key={index} className="p-6">
                <feature.icon className="w-10 h-10 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Create Viral Clips?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of creators using ClipForge to grow their audience
          </p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg"
          >
            Get Started Free
          </button>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Video className="w-6 h-6 text-blue-400" />
              <span className="text-lg font-bold text-white">ClipForge</span>
            </div>
            <p className="text-sm">2025 ClipForge. Create viral content effortlessly.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
