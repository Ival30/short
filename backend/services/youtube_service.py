"""YouTube video download and processing using yt-dlp"""

import os
import logging
import yt_dlp
from pathlib import Path
from typing import Dict, Optional
from .supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class YouTubeService:
    def __init__(self):
        self.temp_dir = Path("/tmp/clipforge")
        self.temp_dir.mkdir(exist_ok=True)

    def check_availability(self) -> bool:
        """Check if yt-dlp is available"""
        try:
            yt_dlp.version.__version__
            return True
        except Exception:
            return False

    async def get_video_info(self, url: str) -> Dict:
        """
        Get video information without downloading

        Args:
            url: YouTube video URL

        Returns:
            Dictionary with video metadata
        """
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                return {
                    'title': info.get('title'),
                    'description': info.get('description'),
                    'duration': info.get('duration'),
                    'thumbnail': info.get('thumbnail'),
                    'uploader': info.get('uploader'),
                    'upload_date': info.get('upload_date'),
                    'view_count': info.get('view_count'),
                    'like_count': info.get('like_count'),
                    'channel': info.get('channel'),
                    'channel_url': info.get('channel_url'),
                    'formats': [
                        {
                            'format_id': f.get('format_id'),
                            'ext': f.get('ext'),
                            'resolution': f.get('resolution'),
                            'filesize': f.get('filesize'),
                        }
                        for f in info.get('formats', [])
                        if f.get('vcodec') != 'none' and f.get('acodec') != 'none'
                    ][:5]  # Top 5 formats
                }

        except Exception as e:
            logger.error(f"Error getting video info: {str(e)}")
            raise

    async def import_video(self, url: str, user_id: str) -> Dict:
        """
        Download video from YouTube and upload to Supabase

        Args:
            url: YouTube video URL
            user_id: User ID for database record

        Returns:
            Dictionary with video_id and status
        """
        supabase = get_supabase_client()
        video_path = None
        video_id = None

        try:
            # Get video info first
            info = await self.get_video_info(url)
            logger.info(f"Downloading: {info['title']}")

            # Configure download options
            output_template = str(self.temp_dir / '%(id)s.%(ext)s')
            ydl_opts = {
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'outtmpl': output_template,
                'quiet': False,
                'no_warnings': False,
                'merge_output_format': 'mp4',
            }

            # Download video
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                download_info = ydl.extract_info(url, download=True)
                video_id_yt = download_info.get('id')
                video_path = self.temp_dir / f"{video_id_yt}.mp4"

            if not video_path.exists():
                raise FileNotFoundError("Downloaded video not found")

            file_size = video_path.stat().st_size
            logger.info(f"Video downloaded: {file_size} bytes")

            # Create database record
            video_data = {
                'user_id': user_id,
                'title': info['title'],
                'description': info.get('description', ''),
                'file_path': '',  # Will be updated after upload
                'file_size': file_size,
                'mime_type': 'video/mp4',
                'duration': info.get('duration', 0),
                'source_url': url,
                'status': 'uploading',
                'metadata': {
                    'youtube_id': video_id_yt,
                    'uploader': info.get('uploader'),
                    'thumbnail': info.get('thumbnail'),
                    'view_count': info.get('view_count'),
                }
            }

            result = supabase.table('videos').insert(video_data).execute()
            video_id = result.data[0]['id']
            logger.info(f"Video record created: {video_id}")

            # Upload to Supabase Storage
            storage_path = f"{user_id}/videos/{video_id}.mp4"

            with open(video_path, 'rb') as f:
                supabase.storage.from_('videos').upload(
                    storage_path,
                    f,
                    file_options={"content-type": "video/mp4"}
                )

            # Update database with file path
            supabase.table('videos').update({
                'file_path': storage_path,
                'status': 'ready'
            }).eq('id', video_id).execute()

            logger.info(f"Video uploaded successfully: {video_id}")

            # Cleanup temp file
            if video_path and video_path.exists():
                video_path.unlink()

            return {
                'video_id': video_id,
                'status': 'ready',
                'message': 'Video imported successfully'
            }

        except Exception as e:
            logger.error(f"Error importing video: {str(e)}")

            # Update status to failed if record exists
            if video_id:
                supabase.table('videos').update({
                    'status': 'failed',
                    'metadata': {'error': str(e)}
                }).eq('id', video_id).execute()

            # Cleanup on error
            if video_path and video_path.exists():
                video_path.unlink()

            raise

    def download_video(self, url: str, output_path: str) -> str:
        """
        Download video to specific path

        Args:
            url: YouTube URL
            output_path: Output file path

        Returns:
            Path to downloaded file
        """
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': output_path,
            'merge_output_format': 'mp4',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        return output_path
