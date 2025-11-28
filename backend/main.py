"""
ClipForge Backend - Video Processing API
Uses yt-dlp and ffmpeg for video processing
"""

import os
import tempfile
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import uvicorn

from services.youtube_service import YouTubeService
from services.video_service import VideoService
from services.transcription_service import TranscriptionService
from services.clip_service import ClipService
from services.supabase_client import get_supabase_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ClipForge Backend",
    description="Video processing API using yt-dlp and ffmpeg",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

youtube_service = YouTubeService()
video_service = VideoService()
transcription_service = TranscriptionService()
clip_service = ClipService()


class YouTubeImportRequest(BaseModel):
    url: HttpUrl
    user_id: str


class VideoUploadResponse(BaseModel):
    video_id: str
    status: str
    message: str


class TranscriptionRequest(BaseModel):
    video_id: str
    user_id: str
    language: Optional[str] = "en"


class ClipGenerationRequest(BaseModel):
    video_id: str
    user_id: str
    clip_count: Optional[int] = 10
    min_duration: Optional[int] = 15
    max_duration: Optional[int] = 60


class ClipExportRequest(BaseModel):
    clip_id: str
    user_id: str
    output_format: Optional[str] = "mp4"
    resolution: Optional[str] = "1080p"


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "ClipForge Backend",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "yt-dlp": youtube_service.check_availability(),
            "ffmpeg": video_service.check_ffmpeg(),
            "whisper": transcription_service.check_availability(),
        }
    }


@app.post("/api/youtube/import")
async def import_from_youtube(
    request: YouTubeImportRequest,
    background_tasks: BackgroundTasks
):
    """
    Import video from YouTube URL

    - Downloads video using yt-dlp
    - Extracts metadata
    - Uploads to Supabase storage
    - Creates video record in database
    """
    try:
        logger.info(f"Starting YouTube import: {request.url}")

        # Start background job
        background_tasks.add_task(
            youtube_service.import_video,
            str(request.url),
            request.user_id
        )

        return {
            "success": True,
            "message": "YouTube import started",
            "status": "processing"
        }

    except Exception as e:
        logger.error(f"YouTube import error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/youtube/info")
async def get_youtube_info(url: HttpUrl):
    """
    Get YouTube video information without downloading

    - Video title, duration, thumbnail
    - Channel info
    - Format options
    """
    try:
        info = await youtube_service.get_video_info(str(url))
        return {
            "success": True,
            "data": info
        }
    except Exception as e:
        logger.error(f"Error getting YouTube info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/video/upload")
async def upload_video(
    file: UploadFile = File(...),
    user_id: str = "",
    background_tasks: BackgroundTasks = None
):
    """
    Upload video file directly

    - Validates video file
    - Extracts metadata
    - Uploads to Supabase storage
    - Creates video record
    """
    try:
        if not file.content_type or not file.content_type.startswith('video/'):
            raise HTTPException(
                status_code=400,
                detail="File must be a video"
            )

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Process in background
        background_tasks.add_task(
            video_service.process_uploaded_video,
            tmp_path,
            user_id,
            file.filename
        )

        return {
            "success": True,
            "message": "Video upload started",
            "status": "processing"
        }

    except Exception as e:
        logger.error(f"Video upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/video/transcode")
async def transcode_video(
    video_id: str,
    user_id: str,
    output_format: str = "mp4",
    resolution: str = "1080p"
):
    """
    Transcode video to different format/resolution

    - Uses ffmpeg for conversion
    - Supports multiple formats and resolutions
    """
    try:
        result = await video_service.transcode_video(
            video_id,
            user_id,
            output_format,
            resolution
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Transcoding error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transcription/start")
async def start_transcription(
    request: TranscriptionRequest,
    background_tasks: BackgroundTasks
):
    """
    Start video transcription using Whisper

    - Extracts audio using ffmpeg
    - Transcribes using OpenAI Whisper or Groq
    - Saves to database with timestamps
    """
    try:
        logger.info(f"Starting transcription for video: {request.video_id}")

        background_tasks.add_task(
            transcription_service.transcribe_video,
            request.video_id,
            request.user_id,
            request.language
        )

        return {
            "success": True,
            "message": "Transcription started",
            "video_id": request.video_id
        }

    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/clips/generate")
async def generate_clips(
    request: ClipGenerationRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate clip suggestions using AI

    - Analyzes transcription
    - Identifies viral-worthy segments
    - Uses Groq AI for analysis
    - Creates clip records in database
    """
    try:
        logger.info(f"Generating clips for video: {request.video_id}")

        background_tasks.add_task(
            clip_service.generate_clips,
            request.video_id,
            request.user_id,
            request.clip_count,
            request.min_duration,
            request.max_duration
        )

        return {
            "success": True,
            "message": "Clip generation started",
            "video_id": request.video_id
        }

    except Exception as e:
        logger.error(f"Clip generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/clips/export")
async def export_clip(
    request: ClipExportRequest,
    background_tasks: BackgroundTasks
):
    """
    Export/render a specific clip

    - Cuts video using ffmpeg
    - Applies effects (captions, branding, etc)
    - Exports in desired format and resolution
    """
    try:
        logger.info(f"Exporting clip: {request.clip_id}")

        background_tasks.add_task(
            clip_service.export_clip,
            request.clip_id,
            request.user_id,
            request.output_format,
            request.resolution
        )

        return {
            "success": True,
            "message": "Clip export started",
            "clip_id": request.clip_id
        }

    except Exception as e:
        logger.error(f"Clip export error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/video/{video_id}/info")
async def get_video_info(video_id: str, user_id: str):
    """Get video information and processing status"""
    try:
        info = await video_service.get_video_info(video_id, user_id)
        return {
            "success": True,
            "data": info
        }
    except Exception as e:
        logger.error(f"Error getting video info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/video/{video_id}/thumbnail")
async def generate_thumbnail(
    video_id: str,
    user_id: str,
    timestamp: int = 0
):
    """
    Generate thumbnail from video at specific timestamp

    - Uses ffmpeg to extract frame
    - Uploads to Supabase storage
    """
    try:
        thumbnail_url = await video_service.generate_thumbnail(
            video_id,
            user_id,
            timestamp
        )
        return {
            "success": True,
            "thumbnail_url": thumbnail_url
        }
    except Exception as e:
        logger.error(f"Thumbnail generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
