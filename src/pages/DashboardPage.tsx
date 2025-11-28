import { useState, useEffect } from 'react';
import { Plus, Video as VideoIcon, Clock, FileVideo, Scissors } from 'lucide-react';
import { VideoUpload } from '../components/VideoUpload';
import { VideoList } from '../components/VideoList';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Video = Database['public']['Tables']['videos']['Row'];
type Clip = Database['public']['Tables']['clips']['Row'];

export function DashboardPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [videosResult, clipsResult] = await Promise.all([
        supabase
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('clips')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (videosResult.data) setVideos(videosResult.data);
      if (clipsResult.data) setClips(clipsResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    loadData();
    setShowUpload(false);
  };

  const totalDuration = videos.reduce((sum, video) => sum + (video.duration || 0), 0);
  const totalClips = clips.length;
  const processingVideos = videos.filter((v) => v.status === 'processing').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Manage your videos and clips</p>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Upload Video
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <VideoIcon className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Total Videos</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{videos.length}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Scissors className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Total Clips</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalClips}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Processing</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{processingVideos}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileVideo className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Total Duration</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {Math.floor(totalDuration / 60)}m
            </p>
          </div>
        </div>

        {showUpload && (
          <div className="mb-8">
            <VideoUpload onUploadComplete={handleUploadComplete} />
          </div>
        )}
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Recent Videos</h2>
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <VideoIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No videos yet
              </h3>
              <p className="text-slate-600 mb-4">
                Upload your first video to start creating clips
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Upload Video
              </button>
            </div>
          ) : (
            <VideoList videos={videos} onVideoSelect={() => {}} />
          )}
        </div>
      </div>
    </div>
  );
}
