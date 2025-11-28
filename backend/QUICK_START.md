# 🚀 Quick Start - ClipForge Python Backend

## ⚡ Get Running in 5 Minutes

### 1. Install Dependencies

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y ffmpeg python3-pip

# macOS
brew install ffmpeg python3

# Verify installation
ffmpeg -version
python3 --version
```

### 2. Setup Backend

```bash
cd backend

# Install Python packages
pip3 install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 3. Configure .env

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
PORT=8000
```

### 4. Run Server

```bash
# Development mode
python main.py

# Or with uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Test API

```bash
# Health check
curl http://localhost:8000/health

# Should return:
# {
#   "status": "healthy",
#   "services": {
#     "yt-dlp": true,
#     "ffmpeg": true,
#     "whisper": true
#   }
# }
```

## 🐳 Docker Quick Start

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Access API
curl http://localhost:8000/health
```

## 📝 API Examples

### Import from YouTube

```bash
curl -X POST http://localhost:8000/api/youtube/import \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "user_id": "your-user-id"
  }'
```

### Upload Video

```bash
curl -X POST http://localhost:8000/api/video/upload \
  -F "file=@video.mp4" \
  -F "user_id=your-user-id"
```

### Transcribe Video

```bash
curl -X POST http://localhost:8000/api/transcription/start \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "video-uuid",
    "user_id": "user-uuid",
    "language": "en"
  }'
```

### Generate Clips

```bash
curl -X POST http://localhost:8000/api/clips/generate \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "video-uuid",
    "user_id": "user-uuid",
    "clip_count": 10
  }'
```

## 📚 Full Documentation

- **API Docs**: http://localhost:8000/docs
- **README**: See README.md for complete documentation

## 🐛 Common Issues

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
uvicorn main:app --port 8001
```

### ffmpeg Not Found
```bash
# Install ffmpeg
sudo apt-get install ffmpeg

# Verify
which ffmpeg
```

### Python Module Errors
```bash
# Upgrade pip
pip3 install --upgrade pip

# Reinstall requirements
pip3 install -r requirements.txt --force-reinstall
```

## ✅ Next Steps

1. ✅ Server running on http://localhost:8000
2. ✅ Test with Swagger UI at http://localhost:8000/docs
3. ✅ Update frontend to use backend API
4. ✅ Deploy to production (Railway, Render, etc)

---

**Backend is ready! Now integrate with frontend.** 🎉
