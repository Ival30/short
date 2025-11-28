import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Play,
  Pause,
  Scissors,
  Download,
  RotateCcw,
  Sparkles,
  Type,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Video = Database['public']['Tables']['videos']['Row'];
type Clip = Database['public']['Tables']['clips']['Row'];

interface ClipSegment {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  aiScore: number;
}

export function ClipEditorPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [suggestedClips, setSuggestedClips] = useState<ClipSegment[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();

  if (!videoId) {
    return <div className="p-8 text-center">Video not found</div>;
  }

  useEffect(() => {
    loadVideo();
    loadClips();
    generateSuggestedClips();
  }, [videoId]);

  const loadVideo = async () => {
    if (!videoId) return;

    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .maybeSingle();

    if (data) {
      setVideo(data);
    }
  };

  const loadClips = async () => {
    if (!videoId) return;

    const { data } = await supabase
      .from('clips')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (data) {
      setClips(data);
    }
  };

  const generateSuggestedClips = () => {
    const suggested: ClipSegment[] = [
      {
        id: '1',
        startTime: 10,
        endTime: 40,
        title: 'Opening Hook',
        aiScore: 92,
      },
      {
        id: '2',
        startTime: 120,
        endTime: 180,
        title: 'Key Point',
        aiScore: 88,
      },
      {
        id: '3',
        startTime: 240,
        endTime: 300,
        title: 'Engaging Story',
        aiScore: 85,
      },
    ];
    setSuggestedClips(suggested);
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateClip = async (segment: ClipSegment) => {
    if (!user || !video) return;

    try {
      const { error } = await supabase.from('clips').insert({
        video_id: videoId,
        user_id: user.id,
        title: segment.title,
        start_time: segment.startTime,
        end_time: segment.endTime,
        duration: segment.endTime - segment.startTime,
        ai_score: segment.aiScore,
        aspect_ratio: aspectRatio,
        status: 'draft',
      });

      if (!error) {
        loadClips();
      }
    } catch (error) {
      console.error('Error creating clip:', error);
    }
  };

  const getVideoUrl = (filePath: string) => {
    const { data } = supabase.storage.from('videos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {video?.title || 'Loading...'}
          </h1>
          <p className="text-slate-600">Create and edit clips from your video</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="aspect-video bg-black relative">
                {video && (
                  <video
                    ref={videoRef}
                    src={getVideoUrl(video.file_path)}
                    className="w-full h-full"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                  />
                )}
              </div>

              <div className="p-4">
                <div className="mb-4">
                  <div className="relative w-full h-2 bg-slate-200 rounded-full cursor-pointer">
                    <div
                      className="absolute h-full bg-blue-600 rounded-full"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    {suggestedClips.map((clip) => (
                      <div
                        key={clip.id}
                        className="absolute h-full bg-green-400/50"
                        style={{
                          left: `${(clip.startTime / duration) * 100}%`,
                          width: `${((clip.endTime - clip.startTime) / duration) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayPause}
                      className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSeek(0)}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <RotateCcw className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Aspect Ratio:
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) =>
                        setAspectRatio(e.target.value as '16:9' | '9:16' | '1:1')
                      }
                      className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                      <option value="1:1">1:1 (Square)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Your Clips</h2>
              {clips.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Scissors className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No clips created yet. Select a suggested clip to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clips.map((clip) => (
                    <div
                      key={clip.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{clip.title}</h3>
                        <p className="text-sm text-slate-600">
                          {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
                          {clip.status}
                        </span>
                        <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                          <Download className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">AI Suggested Clips</h2>
              </div>
              <div className="space-y-3">
                {suggestedClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">{clip.title}</h3>
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">
                          {clip.aiScore}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      {formatTime(clip.startTime)} - {formatTime(clip.endTime)} (
                      {clip.endTime - clip.startTime}s)
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSeek(clip.startTime)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleCreateClip(clip)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Type className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-bold text-slate-900">Caption Style</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Font Size
                  </label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Small</option>
                    <option>Medium</option>
                    <option>Large</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Position
                  </label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Top</option>
                    <option>Center</option>
                    <option>Bottom</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
