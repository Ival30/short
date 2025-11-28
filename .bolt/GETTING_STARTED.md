# 🚀 Getting Started - Implementasi Fitur Opus Clips

## 📋 Checklist Persiapan

### 1. Account & API Keys Yang Dibutuhkan

#### AssemblyAI (Transcription) - CRITICAL
- [ ] Daftar di https://www.assemblyai.com/
- [ ] Ambil API key dari dashboard
- [ ] Test dengan sample video
- **Pricing**: $0.15/menit (atau $0.25/menit untuk advanced)
- **Free tier**: $50 credit gratis

#### OpenAI (AI Analysis) - CRITICAL
- [ ] Daftar di https://platform.openai.com/
- [ ] Setup billing
- [ ] Ambil API key
- **Pricing**: $0.01/1K tokens (GPT-4o-mini) atau $0.15/1K tokens (GPT-4-turbo)
- **Recommendation**: Start dengan GPT-4o-mini untuk testing

#### Pexels (Stock Footage) - OPTIONAL
- [ ] Daftar di https://www.pexels.com/api/
- [ ] Ambil API key (gratis!)
- **Pricing**: FREE untuk 200 requests/hour

#### Social Media APIs - PHASE 2
- [ ] TikTok Developer Account
- [ ] Meta Developer Account (Instagram)
- [ ] YouTube Data API
- [ ] Twitter Developer Account

### 2. Environment Variables

Update `.env` file:

```bash
# Existing
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# New - Add these
ASSEMBLYAI_API_KEY=your_assemblyai_key
OPENAI_API_KEY=your_openai_key
PEXELS_API_KEY=your_pexels_key

# Optional for Phase 2
TIKTOK_CLIENT_KEY=your_tiktok_key
TIKTOK_CLIENT_SECRET=your_tiktok_secret
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_secret
```

### 3. Install Additional Dependencies

```bash
# Untuk Edge Functions
npm install assemblyai openai

# Untuk frontend improvements
npm install @radix-ui/react-slider
npm install @radix-ui/react-tabs
npm install react-hot-toast
npm install zustand
```

## 🏗️ Step-by-Step Implementation

### WEEK 1: Transcription Integration

#### Day 1-2: Setup Edge Function

Create file: `supabase/functions/transcribe-video/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import AssemblyAI from 'npm:assemblyai@4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();

    // Initialize clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const assemblyai = new AssemblyAI({
      apiKey: Deno.env.get('ASSEMBLYAI_API_KEY')!
    });

    // Get video
    const { data: video } = await supabase
      .from('videos')
      .select('file_path, user_id')
      .eq('id', videoId)
      .single();

    if (!video) {
      throw new Error('Video not found');
    }

    // Get signed URL for video
    const { data: signedUrl } = await supabase.storage
      .from('videos')
      .createSignedUrl(video.file_path, 3600);

    // Transcribe
    const transcript = await assemblyai.transcripts.transcribe({
      audio: signedUrl.signedUrl,
      speaker_labels: true,
      language_detection: true,
      punctuate: true,
      format_text: true
    });

    // Store result
    await supabase
      .from('videos')
      .update({
        transcription: {
          text: transcript.text,
          words: transcript.words,
          utterances: transcript.utterances,
          language: transcript.language_code
        },
        status: 'processing'
      })
      .eq('id', videoId);

    return new Response(
      JSON.stringify({ success: true, videoId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### Day 3: Deploy Edge Function

```bash
# Deploy to Supabase
# (The system will handle this automatically when you create the function)
```

#### Day 4-5: Update Frontend

Update `VideoUpload.tsx` to trigger transcription:

```typescript
// After video upload success
const { error: functionError } = await supabase.functions.invoke(
  'transcribe-video',
  { body: { videoId: data.id } }
);

if (functionError) {
  console.error('Transcription error:', functionError);
}
```

Add transcription display in `ClipEditorPage.tsx`:

```typescript
// Show transcription in sidebar
{video?.transcription && (
  <div className="bg-white rounded-xl border border-slate-200 p-6">
    <h3 className="font-semibold mb-3">Transcription</h3>
    <div className="max-h-96 overflow-y-auto">
      <p className="text-sm text-slate-600 leading-relaxed">
        {video.transcription.text}
      </p>
    </div>
  </div>
)}
```

### WEEK 2: AI Clip Detection

#### Day 1-2: Create AI Analysis Function

Create file: `supabase/functions/analyze-clips/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai@4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!
    });

    // Get video with transcription
    const { data: video } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (!video?.transcription) {
      throw new Error('Video transcription not found');
    }

    // AI Analysis
    const prompt = `
Analyze this video transcription and identify 5-10 potential viral clips.

Video Duration: ${video.duration} seconds
Transcription: ${JSON.stringify(video.transcription)}

For each clip, provide:
1. start_time (in seconds)
2. end_time (in seconds)
3. title (catchy, 5-7 words)
4. viral_score (0-100, based on engagement potential)
5. reasoning (why this clip could be viral)
6. hook_type (question/statement/story/statistic)
7. suggested_hashtags (array of 3-5 hashtags)
8. target_platform (tiktok/instagram/youtube_shorts)

Important:
- Clips should be 15-90 seconds long
- Look for hooks, emotional moments, key insights
- Prefer clips with complete thoughts
- Score based on: uniqueness, emotional impact, clarity

Return as JSON object with "clips" array.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at identifying viral-worthy video content.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const analysis = JSON.parse(response.choices[0].message.content!);

    // Store clips
    for (const clip of analysis.clips) {
      await supabase.from('clips').insert({
        video_id: videoId,
        user_id: video.user_id,
        title: clip.title,
        start_time: clip.start_time,
        end_time: clip.end_time,
        duration: clip.end_time - clip.start_time,
        ai_score: clip.viral_score,
        status: 'draft',
        settings: {
          reasoning: clip.reasoning,
          hook_type: clip.hook_type,
          suggested_hashtags: clip.suggested_hashtags,
          target_platform: clip.target_platform
        }
      });
    }

    // Update video status
    await supabase
      .from('videos')
      .update({ status: 'ready' })
      .eq('id', videoId);

    return new Response(
      JSON.stringify({ success: true, clipsCount: analysis.clips.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### Day 3: Chain Functions

Update transcription function to trigger analysis:

```typescript
// At the end of transcribe-video function
// Trigger clip analysis
await supabase.functions.invoke('analyze-clips', {
  body: { videoId }
});
```

#### Day 4-5: Update UI

Update `ClipEditorPage.tsx` to load real clips:

```typescript
// Remove mock data, load from database
useEffect(() => {
  loadClips();
}, [videoId]);

const loadClips = async () => {
  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .eq('video_id', videoId)
    .order('ai_score', { ascending: false });

  if (data) {
    setSuggestedClips(data.map(clip => ({
      id: clip.id,
      startTime: clip.start_time,
      endTime: clip.end_time,
      title: clip.title,
      aiScore: clip.ai_score,
      reasoning: clip.settings?.reasoning,
      hashtags: clip.settings?.suggested_hashtags
    })));
  }
};
```

### WEEK 3-4: Video Export Pipeline

#### Day 1-3: Setup FFmpeg Processing

Create file: `supabase/functions/export-clip/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { clipId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get clip and video
    const { data: clip } = await supabase
      .from('clips')
      .select('*, videos(*)')
      .eq('id', clipId)
      .single();

    if (!clip) throw new Error('Clip not found');

    // Update status
    await supabase
      .from('clips')
      .update({ status: 'processing' })
      .eq('id', clipId);

    // Download source video
    const { data: videoBlob } = await supabase.storage
      .from('videos')
      .download(clip.videos.file_path);

    if (!videoBlob) throw new Error('Failed to download video');

    // Save to temp file
    const inputPath = `/tmp/input_${Date.now()}.mp4`;
    const outputPath = `/tmp/output_${Date.now()}.mp4`;

    await Deno.writeFile(inputPath, new Uint8Array(await videoBlob.arrayBuffer()));

    // FFmpeg command
    const aspectRatios = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
      '4:5': { width: 1080, height: 1350 }
    };

    const dims = aspectRatios[clip.aspect_ratio] || aspectRatios['16:9'];

    const ffmpegProcess = new Deno.Command('ffmpeg', {
      args: [
        '-i', inputPath,
        '-ss', clip.start_time.toString(),
        '-t', clip.duration.toString(),
        '-vf', `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease,pad=${dims.width}:${dims.height}:(ow-iw)/2:(oh-ih)/2`,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputPath
      ],
      stdout: 'piped',
      stderr: 'piped'
    });

    const { code, stdout, stderr } = await ffmpegProcess.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`FFmpeg failed: ${errorText}`);
    }

    // Read processed file
    const processedFile = await Deno.readFile(outputPath);

    // Upload to storage
    const clipPath = `${clip.user_id}/clips/${clipId}.mp4`;
    await supabase.storage
      .from('clips')
      .upload(clipPath, processedFile, {
        contentType: 'video/mp4',
        upsert: true
      });

    // Update clip
    await supabase
      .from('clips')
      .update({
        file_path: clipPath,
        status: 'ready'
      })
      .eq('id', clipId);

    // Cleanup
    await Deno.remove(inputPath);
    await Deno.remove(outputPath);

    return new Response(
      JSON.stringify({ success: true, clipPath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### Day 4-5: Add Download UI

Update `ClipEditorPage.tsx`:

```typescript
const handleExportClip = async (clipId: string) => {
  try {
    setExporting(true);

    const { error } = await supabase.functions.invoke('export-clip', {
      body: { clipId }
    });

    if (error) throw error;

    // Reload clips to get updated status
    await loadClips();

    toast.success('Clip exported successfully!');
  } catch (error) {
    toast.error('Failed to export clip');
  } finally {
    setExporting(false);
  }
};

const handleDownloadClip = async (clip: Clip) => {
  if (!clip.file_path) return;

  const { data } = await supabase.storage
    .from('clips')
    .createSignedUrl(clip.file_path, 3600);

  if (data) {
    window.open(data.signedUrl, '_blank');
  }
};
```

## 🎨 UI Improvements

### Add Toast Notifications

```typescript
// Install
npm install react-hot-toast

// In main.tsx or App.tsx
import { Toaster } from 'react-hot-toast';

<Toaster position="top-right" />
```

### Add Loading States

Create `LoadingSpinner.tsx`:

```typescript
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
  );
}
```

### Add Progress Bar

```typescript
// For video processing
<div className="w-full bg-slate-200 rounded-full h-2">
  <div
    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>
```

## 🧪 Testing

### Test Transcription

```bash
# Upload a test video
# Check if transcription appears in database
# Verify words have timestamps
```

### Test Clip Detection

```bash
# Wait for transcription to complete
# Check if clips are generated
# Verify viral scores are reasonable (0-100)
# Check if suggested hashtags are relevant
```

### Test Export

```bash
# Select a clip
# Click export
# Wait for processing
# Download and verify video quality
# Check aspect ratio is correct
```

## 📊 Monitor & Debug

### Check Edge Function Logs

```bash
# In Supabase Dashboard
# Go to Edge Functions
# Click on function
# View Logs tab
```

### Check Processing Jobs

```sql
-- Create a view for monitoring
CREATE VIEW processing_status AS
SELECT
  v.id,
  v.title,
  v.status,
  v.created_at,
  COUNT(c.id) as clip_count,
  AVG(c.ai_score) as avg_score
FROM videos v
LEFT JOIN clips c ON v.id = c.video_id
GROUP BY v.id, v.title, v.status, v.created_at
ORDER BY v.created_at DESC;
```

## 🎯 Success Criteria

After completing these steps, you should have:

- ✅ Videos automatically transcribed
- ✅ AI generates 5-10 clip suggestions per video
- ✅ Each clip has a viral score (0-100)
- ✅ Users can export clips in different aspect ratios
- ✅ Clips can be downloaded

## 🚀 Next Steps

Once core features work:

1. **Improve AI prompts** - Fine-tune for better suggestions
2. **Add caption editor** - Let users customize captions
3. **Add templates** - Pre-made styling presets
4. **Add batch export** - Export multiple clips at once
5. **Add analytics** - Track clip performance

## 💡 Pro Tips

1. **Start small**: Test with 1-2 minute videos first
2. **Monitor costs**: Watch API usage in AssemblyAI and OpenAI dashboards
3. **Optimize prompts**: Better prompts = better AI suggestions
4. **Cache results**: Store AI responses to avoid reprocessing
5. **Add retries**: Handle API failures gracefully

## 📞 Support

If stuck:
- Check Supabase Edge Function logs
- Test APIs independently (AssemblyAI, OpenAI)
- Verify environment variables are set
- Check database permissions (RLS)
- Review storage bucket policies

---

**Selamat coding! 🚀**

Dokumentasi ini akan guide kamu dari aplikasi basic sampai fully functional AI video clipping platform seperti Opus Clips.
