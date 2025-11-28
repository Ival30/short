"""Video processing using ffmpeg"""

import os
import logging
import subprocess
import ffmpeg
from pathlib import Path
from typing import Dict, Optional, Tuple
from .supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class VideoService:
    def __init__(self):
        self.temp_dir = Path("/tmp/clipforge")
        self.temp_dir.mkdir(exist_ok=True)

    def check_ffmpeg(self) -> bool:
        """Check if ffmpeg is available"""
        try:
            subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                check=True
            )
            return True
        except Exception:
            return False

    async def get_video_info(self, video_id: str, user_id: str) -> Dict:
        """Get video information from database"""
        supabase = get_supabase_client()

        result = supabase.table('videos')\
            .select('*')\
            .eq('id', video_id)\
            .eq('user_id', user_id)\
            .maybeSingle()\
            .execute()

        if not result.data:
            raise ValueError("Video not found")

        return result.data

    async def process_uploaded_video(
        self,
        file_path: str,
        user_id: str,
        filename: str
    ) -> Dict:
        """
        Process uploaded video file

        - Extract metadata
        - Generate thumbnail
        - Upload to Supabase storage
        - Create database record
        """
        supabase = get_supabase_client()
        video_id = None

        try:
            # Get video metadata using ffprobe
            metadata = self._get_video_metadata(file_path)
            file_size = Path(file_path).stat().st_size

            # Create database record
            video_data = {
                'user_id': user_id,
                'title': Path(filename).stem,
                'file_path': '',
                'file_size': file_size,
                'mime_type': 'video/mp4',
                'duration': int(metadata.get('duration', 0)),
                'status': 'uploading',
                'metadata': {
                    'width': metadata.get('width'),
                    'height': metadata.get('height'),
                    'codec': metadata.get('codec_name'),
                    'bit_rate': metadata.get('bit_rate'),
                }
            }

            result = supabase.table('videos').insert(video_data).execute()
            video_id = result.data[0]['id']

            # Upload to Supabase Storage
            storage_path = f"{user_id}/videos/{video_id}.mp4"

            with open(file_path, 'rb') as f:
                supabase.storage.from_('videos').upload(
                    storage_path,
                    f,
                    file_options={"content-type": "video/mp4"}
                )

            # Generate and upload thumbnail
            thumbnail_path = await self.generate_thumbnail(
                video_id,
                user_id,
                timestamp=int(metadata.get('duration', 30) / 2)
            )

            # Update database
            supabase.table('videos').update({
                'file_path': storage_path,
                'thumbnail_path': thumbnail_path,
                'status': 'ready'
            }).eq('id', video_id).execute()

            # Cleanup temp file
            if os.path.exists(file_path):
                os.unlink(file_path)

            return {
                'video_id': video_id,
                'status': 'ready'
            }

        except Exception as e:
            logger.error(f"Error processing video: {str(e)}")

            if video_id:
                supabase.table('videos').update({
                    'status': 'failed'
                }).eq('id', video_id).execute()

            if os.path.exists(file_path):
                os.unlink(file_path)

            raise

    def _get_video_metadata(self, file_path: str) -> Dict:
        """Extract video metadata using ffprobe"""
        try:
            probe = ffmpeg.probe(file_path)
            video_stream = next(
                (s for s in probe['streams'] if s['codec_type'] == 'video'),
                None
            )

            if not video_stream:
                raise ValueError("No video stream found")

            return {
                'duration': float(probe['format'].get('duration', 0)),
                'bit_rate': int(probe['format'].get('bit_rate', 0)),
                'width': int(video_stream.get('width', 0)),
                'height': int(video_stream.get('height', 0)),
                'codec_name': video_stream.get('codec_name', ''),
                'fps': eval(video_stream.get('r_frame_rate', '0/1')),
            }

        except Exception as e:
            logger.error(f"Error getting metadata: {str(e)}")
            raise

    async def generate_thumbnail(
        self,
        video_id: str,
        user_id: str,
        timestamp: int = 0
    ) -> str:
        """
        Generate thumbnail from video at specific timestamp

        Args:
            video_id: Video ID
            user_id: User ID
            timestamp: Timestamp in seconds

        Returns:
            Path to uploaded thumbnail in storage
        """
        supabase = get_supabase_client()
        temp_thumb = None

        try:
            # Get video file
            video_info = await self.get_video_info(video_id, user_id)
            video_path = self._download_from_storage(
                video_info['file_path'],
                'videos'
            )

            # Generate thumbnail
            temp_thumb = self.temp_dir / f"{video_id}_thumb.jpg"

            (
                ffmpeg
                .input(str(video_path), ss=timestamp)
                .filter('scale', 1280, -1)
                .output(str(temp_thumb), vframes=1, format='image2')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            # Upload to storage
            storage_path = f"{user_id}/thumbnails/{video_id}.jpg"

            with open(temp_thumb, 'rb') as f:
                supabase.storage.from_('videos').upload(
                    storage_path,
                    f,
                    file_options={"content-type": "image/jpeg"}
                )

            # Cleanup
            if video_path.exists():
                video_path.unlink()
            if temp_thumb.exists():
                temp_thumb.unlink()

            return storage_path

        except Exception as e:
            logger.error(f"Error generating thumbnail: {str(e)}")

            if temp_thumb and temp_thumb.exists():
                temp_thumb.unlink()

            raise

    async def transcode_video(
        self,
        video_id: str,
        user_id: str,
        output_format: str = "mp4",
        resolution: str = "1080p"
    ) -> Dict:
        """
        Transcode video to different format/resolution

        Supported resolutions: 480p, 720p, 1080p, 1440p, 4k
        """
        supabase = get_supabase_client()

        try:
            # Get video info
            video_info = await self.get_video_info(video_id, user_id)

            # Download video
            video_path = self._download_from_storage(
                video_info['file_path'],
                'videos'
            )

            # Transcode
            output_path = self.temp_dir / f"{video_id}_transcoded.{output_format}"

            # Resolution mapping
            resolution_map = {
                '480p': (854, 480),
                '720p': (1280, 720),
                '1080p': (1920, 1080),
                '1440p': (2560, 1440),
                '4k': (3840, 2160),
            }

            width, height = resolution_map.get(resolution, (1920, 1080))

            (
                ffmpeg
                .input(str(video_path))
                .filter('scale', width, height)
                .output(
                    str(output_path),
                    vcodec='libx264',
                    acodec='aac',
                    preset='medium',
                    crf=23
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            # Upload transcoded video
            storage_path = f"{user_id}/transcoded/{video_id}_{resolution}.{output_format}"

            with open(output_path, 'rb') as f:
                supabase.storage.from_('videos').upload(
                    storage_path,
                    f,
                    file_options={"content-type": f"video/{output_format}"}
                )

            # Cleanup
            if video_path.exists():
                video_path.unlink()
            if output_path.exists():
                output_path.unlink()

            return {
                'transcoded_path': storage_path,
                'format': output_format,
                'resolution': resolution
            }

        except Exception as e:
            logger.error(f"Error transcoding video: {str(e)}")
            raise

    def extract_audio(self, video_path: str, output_path: str) -> str:
        """
        Extract audio from video

        Args:
            video_path: Input video file
            output_path: Output audio file

        Returns:
            Path to extracted audio
        """
        try:
            (
                ffmpeg
                .input(video_path)
                .output(
                    output_path,
                    acodec='libmp3lame',
                    audio_bitrate='192k'
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            return output_path

        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode()}")
            raise

    def cut_video(
        self,
        input_path: str,
        output_path: str,
        start_time: int,
        end_time: int
    ) -> str:
        """
        Cut video segment

        Args:
            input_path: Input video file
            output_path: Output video file
            start_time: Start time in seconds
            end_time: End time in seconds

        Returns:
            Path to cut video
        """
        try:
            duration = end_time - start_time

            (
                ffmpeg
                .input(input_path, ss=start_time, t=duration)
                .output(
                    output_path,
                    vcodec='libx264',
                    acodec='aac',
                    preset='fast'
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            return output_path

        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode()}")
            raise

    def _download_from_storage(
        self,
        storage_path: str,
        bucket: str = 'videos'
    ) -> Path:
        """Download file from Supabase storage to temp directory"""
        supabase = get_supabase_client()

        filename = Path(storage_path).name
        local_path = self.temp_dir / filename

        data = supabase.storage.from_(bucket).download(storage_path)

        with open(local_path, 'wb') as f:
            f.write(data)

        return local_path
