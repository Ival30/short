import { Clock, Play, Trash2, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Database } from '../lib/database.types';

type Video = Database['public']['Tables']['videos']['Row'];

interface VideoListProps {
  videos: Video[];
  onVideoSelect: (videoId: string) => void;
}

export function VideoList({ videos, onVideoSelect }: VideoListProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'uploading':
        return 'bg-orange-100 text-orange-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <div
          key={video.id}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group"
        >
          <div
            className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative cursor-pointer"
            onClick={() => onVideoSelect(video.id)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-slate-700 ml-1" fill="currentColor" />
              </div>
            </div>
            {video.duration && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/75 text-white text-xs rounded">
                {formatDuration(video.duration)}
              </div>
            )}
            <div className="absolute top-2 left-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                  video.status
                )}`}
              >
                {video.status}
              </span>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-slate-900 truncate flex-1">
                {video.title}
              </h3>
              <button className="p-1 hover:bg-slate-100 rounded">
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {video.description && (
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                {video.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(new Date(video.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <span>{(video.file_size / 1024 / 1024).toFixed(1)} MB</span>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onVideoSelect(video.id)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Clips
              </button>
              <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <Trash2 className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
