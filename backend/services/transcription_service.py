"""Video transcription using Whisper and Groq"""

import os
import logging
from pathlib import Path
from typing import Dict, Optional
import whisper
from groq import Groq
from .video_service import VideoService
from .supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class TranscriptionService:
    def __init__(self):
        self.video_service = VideoService()
        self.temp_dir = Path("/tmp/clipforge")
        self.temp_dir.mkdir(exist_ok=True)
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.use_groq = bool(self.groq_api_key)

    def check_availability(self) -> bool:
        """Check if Whisper is available"""
        try:
            whisper.available_models()
            return True
        except Exception:
            return False

    async def transcribe_video(
        self,
        video_id: str,
        user_id: str,
        language: str = "en"
    ) -> Dict:
        """
        Transcribe video using Whisper (local) or Groq (API)

        Args:
            video_id: Video ID
            user_id: User ID
            language: Language code (default: en)

        Returns:
            Transcription data with timestamps
        """
        supabase = get_supabase_client()
        audio_path = None
        video_path = None

        try:
            logger.info(f"Starting transcription for video: {video_id}")

            # Update status
            supabase.table('videos').update({
                'status': 'processing'
            }).eq('id', video_id).execute()

            # Get video info
            video_info = await self.video_service.get_video_info(
                video_id,
                user_id
            )

            # Download video
            video_path = self.video_service._download_from_storage(
                video_info['file_path'],
                'videos'
            )

            # Extract audio
            audio_path = self.temp_dir / f"{video_id}.mp3"
            self.video_service.extract_audio(str(video_path), str(audio_path))

            logger.info(f"Audio extracted: {audio_path}")

            # Transcribe
            if self.use_groq:
                transcription = await self._transcribe_with_groq(
                    audio_path,
                    language
                )
            else:
                transcription = await self._transcribe_with_whisper(
                    audio_path,
                    language
                )

            logger.info(f"Transcription completed: {len(transcription.get('text', ''))} chars")

            # Save to database
            supabase.table('videos').update({
                'transcription': transcription,
                'status': 'ready'
            }).eq('id', video_id).execute()

            # Create processing job record
            supabase.table('processing_jobs').insert({
                'user_id': user_id,
                'video_id': video_id,
                'job_type': 'transcription',
                'status': 'completed',
                'progress': 100,
                'completed_at': 'now()',
                'metadata': {
                    'word_count': len(transcription.get('text', '').split()),
                    'language': language,
                    'method': 'groq' if self.use_groq else 'whisper'
                }
            }).execute()

            # Cleanup
            if audio_path and audio_path.exists():
                audio_path.unlink()
            if video_path and video_path.exists():
                video_path.unlink()

            return {
                'video_id': video_id,
                'transcription': transcription,
                'status': 'completed'
            }

        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")

            # Update status to failed
            supabase.table('videos').update({
                'status': 'failed'
            }).eq('id', video_id).execute()

            # Cleanup
            if audio_path and audio_path.exists():
                audio_path.unlink()
            if video_path and video_path.exists():
                video_path.unlink()

            raise

    async def _transcribe_with_groq(
        self,
        audio_path: Path,
        language: str
    ) -> Dict:
        """Transcribe using Groq Whisper API (fast, cloud-based)"""
        try:
            client = Groq(api_key=self.groq_api_key)

            with open(audio_path, 'rb') as audio_file:
                response = client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3",
                    language=language,
                    response_format="verbose_json",
                    temperature=0.0
                )

            # Convert to our format
            transcription = {
                'text': response.text,
                'language': response.language,
                'duration': response.duration,
                'segments': [
                    {
                        'id': idx,
                        'start': segment.start,
                        'end': segment.end,
                        'text': segment.text,
                    }
                    for idx, segment in enumerate(response.segments or [])
                ],
                'words': [
                    {
                        'word': word.word,
                        'start': word.start,
                        'end': word.end,
                    }
                    for word in (response.words or [])
                ] if hasattr(response, 'words') else []
            }

            return transcription

        except Exception as e:
            logger.error(f"Groq transcription error: {str(e)}")
            raise

    async def _transcribe_with_whisper(
        self,
        audio_path: Path,
        language: str
    ) -> Dict:
        """Transcribe using local Whisper model (slower, offline)"""
        try:
            # Load model (can cache this)
            model = whisper.load_model("base")

            # Transcribe
            result = model.transcribe(
                str(audio_path),
                language=language,
                word_timestamps=True,
                verbose=False
            )

            # Format output
            transcription = {
                'text': result['text'],
                'language': result['language'],
                'duration': 0,  # Will be set from video metadata
                'segments': [
                    {
                        'id': segment['id'],
                        'start': segment['start'],
                        'end': segment['end'],
                        'text': segment['text'],
                    }
                    for segment in result['segments']
                ],
                'words': [
                    {
                        'word': word['word'],
                        'start': word['start'],
                        'end': word['end'],
                    }
                    for segment in result['segments']
                    for word in segment.get('words', [])
                ]
            }

            return transcription

        except Exception as e:
            logger.error(f"Whisper transcription error: {str(e)}")
            raise
