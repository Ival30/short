# ClipForge Backend - Python Video Processing API

Python backend menggunakan **yt-dlp** dan **ffmpeg** untuk memproses semua operasi video.

## 🚀 Features

### Video Processing
- ✅ **YouTube Import** - Download video dari YouTube menggunakan yt-dlp
- ✅ **Video Upload** - Upload video langsung
- ✅ **Video Transcoding** - Convert format dan resolusi
- ✅ **Metadata Extraction** - Extract info video (duration, resolution, codec)
- ✅ **Thumbnail Generation** - Generate thumbnail dari timestamp tertentu

### AI Features
- ✅ **Transcription** - Transcribe audio menggunakan Whisper atau Groq
- ✅ **Clip Generation** - Analisis AI untuk detect viral clips
- ✅ **Smart Segmentation** - Automatic scene detection

### Clip Export
- ✅ **Clip Cutting** - Cut video segments dengan ffmpeg
- ✅ **Format Conversion** - Export ke berbagai format (MP4, MOV, etc)
- ✅ **Resolution Scaling** - 480p, 720p, 1080p, 1440p, 4K
- ✅ **Thumbnail Generation** - Auto-generate thumbnail untuk clips

## 📦 Tech Stack

- **FastAPI** - Modern Python web framework
- **yt-dlp** - YouTube downloader (fork of youtube-dl)
- **ffmpeg-python** - Python wrapper untuk ffmpeg
- **OpenAI Whisper** - Speech recognition (optional, local)
- **Groq API** - Fast AI inference untuk transcription & analysis
- **Supabase** - Database dan storage

## 🛠️ Installation

### Prerequisites
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y ffmpeg python3-pip

# Or on macOS
brew install ffmpeg python3
```

### Setup

1. **Clone dan masuk ke direktori backend**
```bash
cd backend
```

2. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

3. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env dengan credentials Anda
```

4. **Run server**
```bash
python main.py
# atau
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🐳 Docker Deployment

### Build dan Run dengan Docker Compose

```bash
# Build image
docker-compose build

# Run container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop container
docker-compose down
```

### Deploy ke Production

```bash
# Build untuk production
docker build -t clipforge-backend:latest .

# Run di production
docker run -d \
  --name clipforge-backend \
  -p 8000:8000 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  -e GROQ_API_KEY=your_groq_key \
  clipforge-backend:latest
```

## 📚 API Documentation

Setelah server running, akses:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main Endpoints

#### Health Check
```bash
GET /health
```

#### YouTube Import
```bash
POST /api/youtube/import
{
  "url": "https://youtube.com/watch?v=xxx",
  "user_id": "user-uuid"
}
```

#### Get YouTube Info (tanpa download)
```bash
POST /api/youtube/info
{
  "url": "https://youtube.com/watch?v=xxx"
}
```

#### Upload Video
```bash
POST /api/video/upload
Content-Type: multipart/form-data

file: video.mp4
user_id: user-uuid
```

#### Start Transcription
```bash
POST /api/transcription/start
{
  "video_id": "video-uuid",
  "user_id": "user-uuid",
  "language": "en"
}
```

#### Generate Clips (AI)
```bash
POST /api/clips/generate
{
  "video_id": "video-uuid",
  "user_id": "user-uuid",
  "clip_count": 10,
  "min_duration": 15,
  "max_duration": 60
}
```

#### Export Clip
```bash
POST /api/clips/export
{
  "clip_id": "clip-uuid",
  "user_id": "user-uuid",
  "output_format": "mp4",
  "resolution": "1080p"
}
```

#### Generate Thumbnail
```bash
GET /api/video/{video_id}/thumbnail?user_id=xxx&timestamp=10
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Yes |
| `GROQ_API_KEY` | Groq API key untuk AI | Yes |
| `PORT` | Server port (default: 8000) | No |

### Groq vs Local Whisper

Backend support 2 mode transcription:

**Groq API (Recommended)**
- ✅ Sangat cepat (15x lebih cepat)
- ✅ No GPU required
- ✅ Cheaper than OpenAI
- ✅ Set `GROQ_API_KEY` di environment

**Local Whisper**
- ✅ Offline, tidak perlu internet
- ❌ Butuh GPU untuk performance baik
- ❌ Lebih lambat
- ✅ Auto-used jika `GROQ_API_KEY` tidak diset

## 🚀 Deployment Options

### 1. Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### 2. Render
1. Connect GitHub repo
2. Select "Docker" deployment
3. Add environment variables
4. Deploy

### 3. DigitalOcean App Platform
1. Connect GitHub repo
2. Select Dockerfile
3. Configure environment
4. Deploy

### 4. AWS ECS / Google Cloud Run
- Build Docker image
- Push to registry (ECR/GCR)
- Deploy container
- Set environment variables

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "services": {
    "yt-dlp": true,
    "ffmpeg": true,
    "whisper": true
  }
}
```

### Logs
```bash
# Docker logs
docker-compose logs -f backend

# или
tail -f /var/log/clipforge/backend.log
```

## 🔒 Security

### Best Practices

1. **Use Service Role Key** - Backend needs full access to Supabase
2. **Secure API Keys** - Never commit `.env` file
3. **Rate Limiting** - Implement rate limiting for production
4. **File Size Limits** - Set max file upload size
5. **Temp File Cleanup** - Auto-cleanup temp files

### Rate Limiting (Optional)

Install slowapi:
```bash
pip install slowapi
```

Add to `main.py`:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/youtube/import")
@limiter.limit("5/minute")
async def import_from_youtube(...):
    ...
```

## 🐛 Troubleshooting

### ffmpeg not found
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Check installation
ffmpeg -version
```

### yt-dlp errors
```bash
# Update yt-dlp
pip install --upgrade yt-dlp

# Test download
yt-dlp "https://youtube.com/watch?v=xxx"
```

### Whisper model download
First run will download Whisper models (~1GB):
```python
import whisper
whisper.load_model("base")  # Downloads model
```

### Memory issues
Untuk video besar, increase Docker memory:
```yaml
# docker-compose.yml
services:
  backend:
    mem_limit: 4g
    mem_reservation: 2g
```

## 📈 Performance Tips

### 1. Use Groq for Transcription
- 15x faster than local Whisper
- No GPU needed
- Cheaper than OpenAI

### 2. Optimize ffmpeg Commands
```python
# Fast preset untuk quick processing
preset='ultrafast'

# Medium preset untuk balanced quality/speed
preset='medium'

# Slow preset untuk best quality
preset='slow'
```

### 3. Background Processing
Semua heavy operations run di background:
```python
background_tasks.add_task(long_running_function)
```

### 4. Cleanup Temp Files
```python
# Auto-cleanup after processing
if temp_file.exists():
    temp_file.unlink()
```

## 🧪 Testing

### Manual Test
```bash
# Health check
curl http://localhost:8000/health

# YouTube info
curl -X POST http://localhost:8000/api/youtube/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### Unit Tests (Coming Soon)
```bash
pytest tests/
```

## 📝 Project Structure

```
backend/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
├── .env.example          # Environment variables example
├── services/
│   ├── __init__.py
│   ├── supabase_client.py    # Supabase integration
│   ├── youtube_service.py    # yt-dlp wrapper
│   ├── video_service.py      # ffmpeg operations
│   ├── transcription_service.py  # Whisper/Groq
│   └── clip_service.py       # Clip generation & export
└── README.md             # This file
```

## 🤝 Integration dengan Frontend

### Update Frontend untuk Use Backend API

```typescript
// src/services/api.ts
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function importFromYouTube(url: string, userId: string) {
  const response = await fetch(`${BACKEND_URL}/api/youtube/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, user_id: userId })
  });

  return response.json();
}

export async function transcribeVideo(videoId: string, userId: string) {
  const response = await fetch(`${BACKEND_URL}/api/transcription/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_id: videoId,
      user_id: userId,
      language: 'en'
    })
  });

  return response.json();
}

export async function generateClips(videoId: string, userId: string) {
  const response = await fetch(`${BACKEND_URL}/api/clips/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_id: videoId,
      user_id: userId,
      clip_count: 10
    })
  });

  return response.json();
}
```

## 🎯 Roadmap

- [ ] Batch video processing
- [ ] Video effects (filters, transitions)
- [ ] Auto-captions with styling
- [ ] Social media direct upload
- [ ] Webhook notifications
- [ ] S3/CloudFlare storage support
- [ ] Multiple audio tracks
- [ ] Advanced color grading

## 📄 License

MIT License - See LICENSE file

## 🆘 Support

- **Issues**: GitHub Issues
- **Docs**: http://localhost:8000/docs
- **Email**: support@clipforge.com

---

**Made with ❤️ using Python, FastAPI, ffmpeg, and yt-dlp**
