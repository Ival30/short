# Technical Implementation Guide - ClipForge

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + TS)                    │
│  - User Interface                                            │
│  - Video Player                                              │
│  - Editor Controls                                           │
│  - Real-time Preview                                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ REST API / WebSockets
                    │
┌───────────────────▼─────────────────────────────────────────┐
│              Supabase Edge Functions                         │
│  - Video Processing                                          │
│  - AI Analysis                                               │
│  - Export Pipeline                                           │
│  - Webhook Handlers                                          │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
┌───────▼─────────┐    ┌────────▼─────────┐
│   Supabase DB   │    │  Supabase Storage│
│  - PostgreSQL   │    │  - Videos        │
│  - RLS Policies │    │  - Clips         │
│  - Triggers     │    │  - Assets        │
└─────────────────┘    └──────────────────┘
        │
        │ Webhooks / API Calls
        │
┌───────▼─────────────────────────────────────────────────────┐
│                   External Services                          │
│  - AssemblyAI (Transcription)                               │
│  - OpenAI (AI Analysis)                                      │
│  - FFmpeg (Video Processing)                                 │
│  - Social Media APIs                                         │
└─────────────────────────────────────────────────────────────┘
```

## 🎬 Video Processing Pipeline

### Step 1: Upload & Initial Processing

```typescript
// Edge Function: process-video-upload
export async function processVideoUpload(videoId: string) {
  // 1. Get video from storage
  const videoFile = await supabase.storage
    .from('videos')
    .download(filePath);

  // 2. Extract metadata
  const metadata = await extractVideoMetadata(videoFile);

  // 3. Generate thumbnail
  const thumbnail = await generateThumbnail(videoFile, 5); // at 5 seconds

  // 4. Upload thumbnail
  await supabase.storage
    .from('thumbnails')
    .upload(thumbnailPath, thumbnail);

  // 5. Update video record
  await supabase
    .from('videos')
    .update({
      thumbnail_path: thumbnailPath,
      duration: metadata.duration,
      status: 'processing',
      metadata: metadata
    })
    .eq('id', videoId);

  // 6. Trigger transcription
  await triggerTranscription(videoId);
}
```

### Step 2: Transcription

```typescript
// Edge Function: transcribe-video
import AssemblyAI from 'assemblyai';

export async function transcribeVideo(videoId: string) {
  const client = new AssemblyAI({
    apiKey: Deno.env.get('ASSEMBLYAI_API_KEY')!
  });

  // Get video URL
  const { data: video } = await supabase
    .from('videos')
    .select('file_path')
    .eq('id', videoId)
    .single();

  const videoUrl = getPublicUrl(video.file_path);

  // Transcribe with speaker labels and timestamps
  const transcript = await client.transcripts.transcribe({
    audio: videoUrl,
    speaker_labels: true,
    word_boost: ['custom', 'keywords'],
    language_detection: true,
    punctuate: true,
    format_text: true
  });

  // Wait for completion
  const result = await client.transcripts.waitUntilReady(transcript.id);

  // Store transcription
  await supabase
    .from('videos')
    .update({
      transcription: {
        words: result.words,
        utterances: result.utterances,
        text: result.text,
        language: result.language_code
      }
    })
    .eq('id', videoId);

  // Trigger AI analysis
  await triggerAIAnalysis(videoId);
}
```

### Step 3: AI Clip Detection

```typescript
// Edge Function: ai-clip-analysis
import OpenAI from 'openai';

export async function analyzeClips(videoId: string) {
  const openai = new OpenAI({
    apiKey: Deno.env.get('OPENAI_API_KEY')!
  });

  // Get transcription
  const { data: video } = await supabase
    .from('videos')
    .select('transcription, duration')
    .eq('id', videoId)
    .single();

  const transcription = video.transcription;

  // AI Analysis Prompt
  const prompt = `
Analyze this video transcription and identify 5-10 viral-worthy clips.

Transcription:
${JSON.stringify(transcription)}

For each clip, provide:
1. Start time (seconds)
2. End time (seconds)
3. Title (catchy, 5-7 words)
4. Hook type (question, statement, story, statistic)
5. Viral score (0-100) based on:
   - Emotional impact
   - Uniqueness
   - Clear message
   - Visual appeal potential
6. Reason for high score
7. Suggested hashtags
8. Target platform (TikTok, Instagram, YouTube Shorts)

Return as JSON array.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: 'You are a viral video content expert.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });

  const suggestions = JSON.parse(response.choices[0].message.content!);

  // Store suggestions as clips
  for (const suggestion of suggestions.clips) {
    await supabase.from('clips').insert({
      video_id: videoId,
      user_id: video.user_id,
      title: suggestion.title,
      start_time: suggestion.start_time,
      end_time: suggestion.end_time,
      duration: suggestion.end_time - suggestion.start_time,
      ai_score: suggestion.viral_score,
      status: 'draft',
      settings: {
        hook_type: suggestion.hook_type,
        suggested_hashtags: suggestion.hashtags,
        suggested_platform: suggestion.platform,
        reasoning: suggestion.reason
      }
    });
  }

  // Update video status
  await supabase
    .from('videos')
    .update({ status: 'ready' })
    .eq('id', videoId);
}
```

### Step 4: Clip Export

```typescript
// Edge Function: export-clip
export async function exportClip(clipId: string) {
  const { data: clip } = await supabase
    .from('clips')
    .select('*, videos(*)')
    .eq('id', clipId)
    .single();

  // Update status
  await supabase
    .from('clips')
    .update({ status: 'processing' })
    .eq('id', clipId);

  // Download source video
  const videoFile = await supabase.storage
    .from('videos')
    .download(clip.videos.file_path);

  // FFmpeg processing
  const outputPath = `/tmp/${clipId}.mp4`;

  await processWithFFmpeg({
    input: videoFile,
    output: outputPath,
    startTime: clip.start_time,
    duration: clip.duration,
    aspectRatio: clip.aspect_ratio,
    captions: clip.captions,
    settings: clip.settings
  });

  // Upload processed clip
  const processedFile = await Deno.readFile(outputPath);
  const clipPath = `${clip.user_id}/clips/${clipId}.mp4`;

  await supabase.storage
    .from('clips')
    .upload(clipPath, processedFile);

  // Generate thumbnail
  const thumbnail = await generateThumbnail(processedFile, 1);
  const thumbnailPath = `${clip.user_id}/clips/${clipId}_thumb.jpg`;

  await supabase.storage
    .from('thumbnails')
    .upload(thumbnailPath, thumbnail);

  // Update clip
  await supabase
    .from('clips')
    .update({
      file_path: clipPath,
      thumbnail_path: thumbnailPath,
      status: 'ready'
    })
    .eq('id', clipId);

  // Clean up
  await Deno.remove(outputPath);
}
```

## 🎨 Caption Rendering with FFmpeg

```typescript
async function processWithFFmpeg(options: {
  input: Blob;
  output: string;
  startTime: number;
  duration: number;
  aspectRatio: string;
  captions?: any;
  settings?: any;
}) {
  const {
    input,
    output,
    startTime,
    duration,
    aspectRatio,
    captions,
    settings
  } = options;

  // Save input to temp file
  const inputPath = `/tmp/input_${Date.now()}.mp4`;
  await Deno.writeFile(inputPath, new Uint8Array(await input.arrayBuffer()));

  // Build FFmpeg command
  let ffmpegCmd = [
    'ffmpeg',
    '-i', inputPath,
    '-ss', startTime.toString(),
    '-t', duration.toString(),
  ];

  // Aspect ratio conversion
  const [width, height] = getAspectRatioDimensions(aspectRatio);
  ffmpegCmd.push(
    '-vf', `scale=${width}:${height},setsar=1:1`,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23'
  );

  // Add captions if provided
  if (captions && captions.enabled) {
    const subtitleFile = await generateSubtitleFile(captions);
    ffmpegCmd.push(
      '-vf', `subtitles=${subtitleFile}:force_style='${getCaptionStyle(captions)}'`
    );
  }

  // Audio processing
  ffmpegCmd.push(
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100'
  );

  // Output
  ffmpegCmd.push(output);

  // Execute FFmpeg
  const process = Deno.run({
    cmd: ffmpegCmd,
    stdout: 'piped',
    stderr: 'piped'
  });

  await process.status();

  // Clean up
  await Deno.remove(inputPath);
}

function getAspectRatioDimensions(ratio: string): [number, number] {
  const dimensions = {
    '16:9': [1920, 1080],
    '9:16': [1080, 1920],
    '1:1': [1080, 1080],
    '4:5': [1080, 1350]
  };
  return dimensions[ratio] || [1920, 1080];
}

async function generateSubtitleFile(captions: any): Promise<string> {
  const srtContent = captions.words.map((word: any, index: number) => {
    return `${index + 1}
${formatSrtTime(word.start)} --> ${formatSrtTime(word.end)}
${word.text}
`;
  }).join('\n');

  const subtitlePath = `/tmp/subtitles_${Date.now()}.srt`;
  await Deno.writeTextFile(subtitlePath, srtContent);
  return subtitlePath;
}

function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function getCaptionStyle(captions: any): string {
  const style = captions.style || {};
  return [
    `FontName=${style.fontFamily || 'Arial'}`,
    `FontSize=${style.fontSize || 24}`,
    `PrimaryColour=${style.color || '&HFFFFFF'}`,
    `OutlineColour=${style.outlineColor || '&H000000'}`,
    `Outline=${style.outline || 2}`,
    `Alignment=${style.alignment || 2}`,
    `MarginV=${style.marginV || 20}`
  ].join(',');
}
```

## 📊 Database Schema Extensions

```sql
-- Add AI analysis results
ALTER TABLE videos ADD COLUMN IF NOT EXISTS ai_analysis jsonb;

-- Add engagement metrics
CREATE TABLE IF NOT EXISTS clip_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid REFERENCES clips(id) ON DELETE CASCADE,
  platform text NOT NULL,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  shares integer DEFAULT 0,
  comments integer DEFAULT 0,
  watch_time_avg integer,
  engagement_rate real,
  posted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add template system
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  name text NOT NULL,
  description text,
  category text,
  settings jsonb NOT NULL,
  is_public boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add asset library
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  type text CHECK (type IN ('image', 'video', 'audio', 'font')),
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add social media connections
CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  platform text NOT NULL,
  account_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add scheduled posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid REFERENCES clips(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES social_accounts(id),
  scheduled_for timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed')),
  post_url text,
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

## 🔄 Real-time Updates

```typescript
// Frontend: Subscribe to processing updates
useEffect(() => {
  const channel = supabase
    .channel('video-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'videos',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('Video updated:', payload);
        // Update UI
        setVideos(prev =>
          prev.map(v => v.id === payload.new.id ? payload.new : v)
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
```

## 🎯 Performance Optimization

### 1. Video Upload Optimization
```typescript
// Chunked upload for large files
async function uploadLargeVideo(file: File, onProgress: (progress: number) => void) {
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const chunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    await uploadChunk(chunk, i, chunks);
    onProgress((i + 1) / chunks * 100);
  }
}
```

### 2. Lazy Loading & Code Splitting
```typescript
// Lazy load heavy components
const ClipEditor = lazy(() => import('./pages/ClipEditorPage'));
const VideoUpload = lazy(() => import('./components/VideoUpload'));

// Use React.memo for expensive components
export const VideoList = memo(({ videos }: VideoListProps) => {
  // Component code
});
```

### 3. Database Query Optimization
```sql
-- Create indexes for common queries
CREATE INDEX idx_videos_user_status ON videos(user_id, status);
CREATE INDEX idx_clips_video_score ON clips(video_id, ai_score DESC);
CREATE INDEX idx_clips_user_status ON clips(user_id, status);

-- Use materialized views for analytics
CREATE MATERIALIZED VIEW user_stats AS
SELECT
  user_id,
  COUNT(DISTINCT videos.id) as video_count,
  COUNT(DISTINCT clips.id) as clip_count,
  SUM(videos.file_size) as storage_used,
  AVG(clips.ai_score) as avg_clip_score
FROM videos
LEFT JOIN clips ON videos.id = clips.video_id
GROUP BY user_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW user_stats;
```

## 🔐 Security Best Practices

```typescript
// Rate limiting for API endpoints
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(userId: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];

  // Remove old requests
  const recentRequests = userRequests.filter(time => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    return false;
  }

  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
  return true;
}

// Validate file types
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska'
];

function validateVideoFile(file: File): boolean {
  return ALLOWED_VIDEO_TYPES.includes(file.type) &&
         file.size <= 5 * 1024 * 1024 * 1024; // 5GB
}

// Sanitize user input
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}
```

## 📱 Social Media Integration Example

```typescript
// TikTok Upload
async function uploadToTikTok(clipId: string, accessToken: string) {
  const { data: clip } = await supabase
    .from('clips')
    .select('*, videos(*)')
    .eq('id', clipId)
    .single();

  const videoUrl = getPublicUrl(clip.file_path);

  // TikTok API endpoint
  const response = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      post_info: {
        title: clip.title,
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_url: videoUrl
      }
    })
  });

  const result = await response.json();
  return result;
}
```

## 🎬 Next Steps

1. **Set up Edge Functions infrastructure**
2. **Integrate AssemblyAI for transcription**
3. **Implement OpenAI GPT-4 for clip analysis**
4. **Set up FFmpeg for video processing**
5. **Add real-time status updates**
6. **Implement export queue system**
7. **Add social media integrations**
8. **Build analytics dashboard**

---

**Catatan**: Semua kode di atas adalah template yang perlu disesuaikan dengan kebutuhan spesifik. Pastikan untuk menambahkan error handling, logging, dan monitoring yang proper.
