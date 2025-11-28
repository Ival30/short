/**
 * Backend API Service
 *
 * Communicates with Python backend for video processing
 * Uses yt-dlp and ffmpeg via FastAPI
 */

import { supabase } from '../lib/supabase';

let cachedBackendUrl: string | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Get backend URL from database or environment
 * Priority: Database > Environment > Default
 */
async function getBackendUrl(): Promise<string> {
  if (cachedBackendUrl && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedBackendUrl;
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'backend_url')
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data?.value) {
      cachedBackendUrl = data.value as string;
      lastFetchTime = Date.now();
      return cachedBackendUrl;
    }
  } catch (error) {
    console.warn('Failed to fetch backend URL from database:', error);
  }

  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    cachedBackendUrl = envUrl;
    lastFetchTime = Date.now();
    return envUrl;
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  console.error('Backend URL not configured in database or .env file.');
  return '';
}

/**
 * Clear backend URL cache
 */
export function clearBackendUrlCache(): void {
  cachedBackendUrl = null;
  lastFetchTime = 0;
}

export interface VideoInfo {
  title: string;
  description?: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  upload_date?: string;
  view_count?: number;
  like_count?: number;
  channel?: string;
  channel_url?: string;
  formats?: Array<{
    format_id: string;
    ext: string;
    resolution: string;
    filesize?: number;
  }>;
}

export interface BackendResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Check if backend URL is configured
 */
async function ensureBackendConfigured(): Promise<string> {
  const url = await getBackendUrl();
  if (!url) {
    throw new Error(
      'Backend URL is not configured. Please set it in System Settings or .env file.'
    );
  }
  return url;
}

/**
 * Handle fetch errors with better messages
 */
function handleFetchError(error: unknown): never {
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    throw new Error(
      'Cannot connect to backend server. Please ensure:\n' +
      '1. Backend is running\n' +
      '2. VITE_BACKEND_URL is correctly set\n' +
      '3. CORS is properly configured\n' +
      '4. No mixed content issues (HTTP/HTTPS)'
    );
  }
  throw error;
}

/**
 * Check backend health status
 */
export async function checkBackendHealth(): Promise<{
  status: string;
  services: {
    'yt-dlp': boolean;
    ffmpeg: boolean;
    whisper: boolean;
  };
}> {
  const backendUrl = await ensureBackendConfigured();

  try {
    const response = await fetch(`${backendUrl}/health`, {
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`Backend health check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Backend health check failed:', error);
    handleFetchError(error);
  }
}

/**
 * Get YouTube video information without downloading
 */
export async function getYouTubeInfo(url: string): Promise<VideoInfo> {
  const backendUrl = await ensureBackendConfigured();

  try {
    const response = await fetch(`${backendUrl}/api/youtube/info`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const result: BackendResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get video info');
    }

    return result.data;
  } catch (error) {
    console.error('Get YouTube info error:', error);
    handleFetchError(error);
  }
}

/**
 * Import video from YouTube
 */
export async function importFromYouTube(
  url: string,
  userId: string
): Promise<BackendResponse> {
  const backendUrl = await ensureBackendConfigured();

  try {
    const response = await fetch(`${backendUrl}/api/youtube/import`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, user_id: userId }),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('YouTube import error:', error);
    handleFetchError(error);
  }
}

/**
 * Upload video file
 */
export async function uploadVideo(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<BackendResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${BACKEND_URL}/api/video/upload`);
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Video upload error:', error);
    throw error;
  }
}

/**
 * Start video transcription
 */
export async function startTranscription(
  videoId: string,
  userId: string,
  language: string = 'en'
): Promise<BackendResponse> {
  const backendUrl = await ensureBackendConfigured();

  try {
    const response = await fetch(`${backendUrl}/api/transcription/start`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id: videoId,
        user_id: userId,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Transcription error:', error);
    handleFetchError(error);
  }
}

/**
 * Generate clips using AI
 */
export async function generateClips(
  videoId: string,
  userId: string,
  options?: {
    clipCount?: number;
    minDuration?: number;
    maxDuration?: number;
  }
): Promise<BackendResponse> {
  const backendUrl = await ensureBackendConfigured();

  try {
    const response = await fetch(`${backendUrl}/api/clips/generate`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id: videoId,
        user_id: userId,
        clip_count: options?.clipCount || 10,
        min_duration: options?.minDuration || 15,
        max_duration: options?.maxDuration || 60,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Clip generation error:', error);
    handleFetchError(error);
  }
}

/**
 * Export a clip
 */
export async function exportClip(
  clipId: string,
  userId: string,
  options?: {
    outputFormat?: string;
    resolution?: string;
  }
): Promise<BackendResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/clips/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clip_id: clipId,
        user_id: userId,
        output_format: options?.outputFormat || 'mp4',
        resolution: options?.resolution || '1080p',
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Clip export error:', error);
    throw error;
  }
}

/**
 * Get video information
 */
export async function getVideoInfo(
  videoId: string,
  userId: string
): Promise<any> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/video/${videoId}/info?user_id=${userId}`
    );

    const result: BackendResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get video info');
    }

    return result.data;
  } catch (error) {
    console.error('Get video info error:', error);
    throw error;
  }
}

/**
 * Generate thumbnail from video
 */
export async function generateThumbnail(
  videoId: string,
  userId: string,
  timestamp: number = 0
): Promise<string> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/video/${videoId}/thumbnail?user_id=${userId}&timestamp=${timestamp}`
    );

    const result: BackendResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate thumbnail');
    }

    return result.data.thumbnail_url;
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    throw error;
  }
}

/**
 * Transcode video to different format/resolution
 */
export async function transcodeVideo(
  videoId: string,
  userId: string,
  outputFormat: string = 'mp4',
  resolution: string = '1080p'
): Promise<BackendResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/video/transcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id: videoId,
        user_id: userId,
        output_format: outputFormat,
        resolution,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Transcoding error:', error);
    throw error;
  }
}

/**
 * Check if backend is available
 */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    const health = await checkBackendHealth();
    return health.status === 'healthy';
  } catch {
    return false;
  }
}
