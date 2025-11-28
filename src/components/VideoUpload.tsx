import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, Youtube } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  videoId?: string;
}

interface VideoUploadProps {
  onUploadComplete?: (videoId: string) => void;
}

export function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isImportingYoutube, setIsImportingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');
  const { user } = useAuth();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user) return;

      for (const file of acceptedFiles) {
        const uploadingFile: UploadingFile = {
          file,
          progress: 0,
          status: 'uploading',
        };

        setUploadingFiles((prev) => [...prev, uploadingFile]);

        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const video = document.createElement('video');
          video.preload = 'metadata';

          video.onloadedmetadata = async () => {
            window.URL.revokeObjectURL(video.src);
            const duration = Math.floor(video.duration);

            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.file === file ? { ...f, progress: 50, status: 'processing' } : f
              )
            );

            const { data, error: insertError } = await supabase
              .from('videos')
              .insert({
                user_id: user.id,
                title: file.name.replace(/\.[^/.]+$/, ''),
                file_path: fileName,
                file_size: file.size,
                mime_type: file.type,
                duration,
                status: 'ready',
              })
              .select()
              .single();

            if (insertError) throw insertError;

            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.file === file
                  ? { ...f, progress: 100, status: 'complete', videoId: data.id }
                  : f
              )
            );

            if (onUploadComplete && data.id) {
              onUploadComplete(data.id);
            }
          };

          video.src = URL.createObjectURL(file);
        } catch (error) {
          console.error('Upload error:', error);
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? {
                    ...f,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : f
            )
          );
        }
      }
    },
    [user, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'],
    },
    maxSize: 5368709120,
    multiple: true,
  });

  const removeFile = (file: File) => {
    setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
  };

  const handleYoutubeImport = async () => {
    if (!user || !youtubeUrl.trim()) return;

    setIsImportingYoutube(true);
    setYoutubeError('');

    try {
      const { data, error } = await supabase.functions.invoke('import-youtube', {
        body: {
          youtubeUrl: youtubeUrl.trim(),
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success && data.videoId) {
        setYoutubeUrl('');
        if (onUploadComplete) {
          onUploadComplete(data.videoId);
        }
      } else {
        throw new Error(data.error || 'Failed to import video');
      }
    } catch (error) {
      console.error('YouTube import error:', error);
      setYoutubeError(
        error instanceof Error ? error.message : 'Failed to import YouTube video'
      );
    } finally {
      setIsImportingYoutube(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-slate-300 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Youtube className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-slate-900">
            Import from YouTube
          </h3>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Paste YouTube URL here..."
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isImportingYoutube}
          />
          <button
            onClick={handleYoutubeImport}
            disabled={!youtubeUrl.trim() || isImportingYoutube}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isImportingYoutube ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Importing...
              </>
            ) : (
              <>
                <Youtube className="w-5 h-5" />
                Import
              </>
            )}
          </button>
        </div>
        {youtubeError && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{youtubeError}</span>
          </div>
        )}
        <p className="text-sm text-slate-500 mt-3">
          Supports public YouTube videos. Paste the full URL or share link.
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-slate-50 text-slate-500">OR</span>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          {isDragActive ? 'Drop videos here' : 'Upload your videos'}
        </h3>
        <p className="text-slate-600 mb-4">
          Drag and drop video files here, or click to browse
        </p>
        <p className="text-sm text-slate-500">
          Supports MP4, MOV, AVI, WebM, MKV up to 5GB
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          {uploadingFiles.map((uploadingFile, index) => (
            <div
              key={index}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {uploadingFile.status === 'complete' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : uploadingFile.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <File className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {uploadingFile.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1">
                      {uploadingFile.error}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {uploadingFile.status === 'uploading' ||
                  uploadingFile.status === 'processing' ? (
                    <div className="w-32">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadingFile.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {uploadingFile.status === 'uploading'
                          ? 'Uploading...'
                          : 'Processing...'}
                      </p>
                    </div>
                  ) : uploadingFile.status === 'complete' ? (
                    <span className="text-sm text-green-600 font-medium">
                      Complete
                    </span>
                  ) : null}
                  {(uploadingFile.status === 'complete' ||
                    uploadingFile.status === 'error') && (
                    <button
                      onClick={() => removeFile(uploadingFile.file)}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
