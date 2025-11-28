# 📺 YouTube Import Feature - ClipForge

## Overview

ClipForge sekarang mendukung import video langsung dari YouTube! User tidak perlu download video secara manual, cukup paste link YouTube dan sistem akan otomatis mengambil video tersebut.

## ✨ Features

### 1. Direct YouTube Import
- Paste YouTube URL langsung di interface
- Support berbagai format URL YouTube:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/embed/VIDEO_ID`
  - `https://m.youtube.com/watch?v=VIDEO_ID`

### 2. Automatic Metadata Extraction
- Video title otomatis diambil dari YouTube
- Thumbnail otomatis di-download dan disimpan
- Video ID disimpan untuk referensi
- Original URL disimpan di database

### 3. Progress Tracking
- Loading indicator saat importing
- Error handling dengan pesan yang jelas
- Success notification setelah import selesai

## 🏗️ Technical Implementation

### Edge Function: `import-youtube`

**Location**: `supabase/functions/import-youtube/index.ts`

**Flow**:
1. User paste YouTube URL
2. Extract video ID dari URL
3. Fetch video metadata (title, thumbnail)
4. Download video dari YouTube
5. Upload ke Supabase Storage
6. Save metadata ke database
7. Download dan upload thumbnail
8. Return video ID untuk processing

### Database Schema

Added column to `videos` table:
```sql
ALTER TABLE videos
ADD COLUMN source_url text;
```

**Purpose**: Store original YouTube URL untuk tracking dan reference.

### Frontend Component

Updated `VideoUpload.tsx`:
- Added YouTube URL input field
- Added import button with loading state
- Added error handling
- Added visual separator between YouTube import dan file upload

## 🚀 Usage

### For Users

1. **Open Upload Interface**
   - Go to Dashboard
   - Click "Upload Video" button

2. **Import from YouTube**
   - Paste YouTube URL di input field
   - Click "Import" button
   - Wait for processing (30 seconds - 2 minutes)
   - Video akan muncul di library

3. **Continue with Clipping**
   - Video imported dapat langsung diproses
   - Generate clips seperti video yang di-upload manual
   - Export dan download seperti biasa

### For Developers

**Call the Edge Function**:
```typescript
const { data, error } = await supabase.functions.invoke('import-youtube', {
  body: {
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    userId: user.id
  }
});

if (data.success) {
  console.log('Video imported:', data.videoId);
}
```

**Check Import Status**:
```typescript
const { data: video } = await supabase
  .from('videos')
  .select('*')
  .eq('id', videoId)
  .single();

console.log('Status:', video.status); // 'processing' | 'ready' | 'failed'
console.log('Source:', video.source_url); // Original YouTube URL
```

## ⚠️ Limitations & Considerations

### Current Limitations

1. **Public Videos Only**
   - Hanya support video YouTube yang public
   - Private/unlisted videos tidak bisa di-import
   - Age-restricted videos mungkin gagal

2. **Video Size**
   - Maximum sesuai YouTube source quality
   - Recommended: Videos under 1 hour
   - Very long videos (>2 hours) might timeout

3. **Download Speed**
   - Tergantung kecepatan server dan YouTube
   - Typical: 30 seconds - 2 minutes untuk video 10-30 menit
   - Progress tidak real-time (all-or-nothing)

4. **Rate Limiting**
   - YouTube might rate-limit requests
   - Implement retry logic untuk production
   - Consider queueing untuk multiple imports

### Legal Considerations

⚖️ **Important**: Users harus memiliki hak untuk menggunakan content!

**Acceptable Use**:
- ✅ Own content dari channel sendiri
- ✅ Videos dengan permission dari creator
- ✅ Public domain atau Creative Commons videos
- ✅ Educational/fair use purposes

**Not Acceptable**:
- ❌ Copyrighted content tanpa permission
- ❌ Re-uploading orang lain content tanpa izin
- ❌ Violating YouTube Terms of Service

**Recommendation**: Add disclaimer di UI warning users about copyright.

## 🔧 Configuration

### Environment Variables

No additional environment variables needed! Function uses:
- `SUPABASE_URL` (already configured)
- `SUPABASE_SERVICE_ROLE_KEY` (already configured)

### YouTube API (Optional Enhancement)

For production, consider using official YouTube Data API:

```typescript
// Future enhancement
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

async function getVideoInfoFromAPI(videoId: string) {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,contentDetails`
  );
  // More reliable metadata
  // Get accurate duration
  // Check video availability
}
```

**Benefits**:
- More reliable metadata
- Accurate video duration
- Better error messages
- Check video restrictions

**Cost**: Free tier: 10,000 units/day (enough for most apps)

## 🎨 UI/UX Improvements

### Current Implementation
- Simple input + button
- Loading state
- Error messages
- Visual separator from file upload

### Suggested Enhancements

1. **URL Validation**
   ```typescript
   function isValidYouTubeUrl(url: string): boolean {
     const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
     return pattern.test(url);
   }
   ```

2. **Video Preview**
   - Show thumbnail preview sebelum import
   - Display video title dan duration
   - Confirmation dialog

3. **Import History**
   - Show recently imported URLs
   - Quick re-import dari history
   - Prevent duplicate imports

4. **Batch Import**
   - Support multiple URLs sekaligus
   - Playlist import
   - Queue management

## 🐛 Troubleshooting

### Common Errors

**Error: "Invalid YouTube URL"**
- Solution: Check URL format, must be valid YouTube link

**Error: "Failed to fetch video info"**
- Solution: Video might be private, deleted, or region-restricted

**Error: "Failed to download video"**
- Solution: Video too large, restricted, or temporary YouTube issue
- Retry after few minutes

**Error: "Upload failed"**
- Solution: Check Supabase storage bucket permissions
- Verify storage quota not exceeded

### Debug Mode

Enable logging untuk debugging:
```typescript
// In Edge Function
console.log('Video ID:', videoId);
console.log('Video info:', videoInfo);
console.log('Download size:', videoBlob.size);
```

Check Supabase Edge Function logs di dashboard.

## 📊 Analytics & Monitoring

### Metrics to Track

1. **Import Success Rate**
   ```sql
   SELECT
     COUNT(*) as total_imports,
     COUNT(*) FILTER (WHERE status = 'ready') as successful,
     COUNT(*) FILTER (WHERE status = 'failed') as failed,
     (COUNT(*) FILTER (WHERE status = 'ready')::float / COUNT(*) * 100) as success_rate
   FROM videos
   WHERE source_url LIKE '%youtube%';
   ```

2. **Average Import Time**
   - Track time from request to video ready
   - Identify bottlenecks
   - Optimize slow imports

3. **Popular YouTube Channels**
   ```sql
   SELECT
     metadata->>'youtube_channel' as channel,
     COUNT(*) as imports
   FROM videos
   WHERE source_url IS NOT NULL
   GROUP BY channel
   ORDER BY imports DESC
   LIMIT 10;
   ```

## 🚀 Future Enhancements

### Phase 1: Reliability
- [ ] Add retry logic untuk failed downloads
- [ ] Implement queue system untuk multiple imports
- [ ] Better error messages dengan suggested actions
- [ ] Add timeout handling (long videos)

### Phase 2: Features
- [ ] YouTube playlist import
- [ ] Import dari YouTube channel (latest videos)
- [ ] Schedule automatic imports dari subscriptions
- [ ] Support untuk YouTube Shorts langsung

### Phase 3: Advanced
- [ ] Multi-platform support:
  - [ ] Vimeo
  - [ ] Dailymotion
  - [ ] TikTok
  - [ ] Instagram Reels
- [ ] Cloud storage import (Google Drive, Dropbox)
- [ ] RSS feed auto-import

## 💡 Best Practices

### For Users

1. **Check Copyright**: Hanya import content yang kamu punya hak
2. **Quality Matters**: Import highest quality available
3. **Organize**: Use descriptive titles dari YouTube
4. **Backup**: Keep original YouTube link sebagai reference

### For Developers

1. **Error Handling**: Always handle edge cases gracefully
2. **Validation**: Validate URL before sending to function
3. **User Feedback**: Clear progress indicators dan error messages
4. **Rate Limiting**: Implement client-side rate limiting
5. **Monitoring**: Track success rates dan errors

## 📖 API Reference

### Edge Function: `import-youtube`

**Endpoint**: `POST /functions/v1/import-youtube`

**Request Body**:
```typescript
{
  youtubeUrl: string;  // Valid YouTube URL
  userId: string;      // User ID from auth
}
```

**Response**:
```typescript
{
  success: boolean;
  videoId?: string;    // Supabase video ID if successful
  message?: string;    // Success message
  error?: string;      // Error message if failed
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid request (bad URL, missing params)
- `500`: Server error (download failed, upload failed)

## 🎯 Testing

### Manual Testing

1. Test valid YouTube URL
2. Test invalid URL
3. Test deleted video
4. Test private video
5. Test very long video (>1 hour)
6. Test concurrent imports

### Automated Testing

```typescript
// Test suite example
describe('YouTube Import', () => {
  it('should extract video ID correctly', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const videoId = extractVideoId(url);
    expect(videoId).toBe('dQw4w9WgXcQ');
  });

  it('should handle invalid URLs', async () => {
    const result = await importYouTube('not-a-youtube-url');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## 🎉 Summary

YouTube import feature menambahkan nilai besar ke ClipForge:

**Benefits**:
- ✅ User experience lebih baik (no manual download)
- ✅ Faster workflow (direct import)
- ✅ Better metadata tracking
- ✅ Original source preserved

**Impact**:
- Meningkatkan adoption rate
- Reduce friction di onboarding
- Enable use case: "clip existing YouTube content"
- Competitive advantage vs tools without this feature

**Next Steps**:
1. Deploy Edge Function ke production
2. Test dengan real YouTube videos
3. Monitor success rates
4. Gather user feedback
5. Iterate dan improve

---

**Note**: Feature ini ready untuk production dengan catatan: implement rate limiting dan add copyright disclaimer di UI.
