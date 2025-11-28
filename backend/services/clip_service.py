"""Clip generation and export using AI and ffmpeg"""

import os
import logging
from pathlib import Path
from typing import Dict, List, Optional
from groq import Groq
from .video_service import VideoService
from .supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class ClipService:
    def __init__(self):
        self.video_service = VideoService()
        self.temp_dir = Path("/tmp/clipforge")
        self.temp_dir.mkdir(exist_ok=True)
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    async def generate_clips(
        self,
        video_id: str,
        user_id: str,
        clip_count: int = 10,
        min_duration: int = 15,
        max_duration: int = 60
    ) -> Dict:
        """
        Generate clip suggestions using AI

        Args:
            video_id: Video ID
            user_id: User ID
            clip_count: Number of clips to generate
            min_duration: Minimum clip duration in seconds
            max_duration: Maximum clip duration in seconds

        Returns:
            Dictionary with generated clips
        """
        supabase = get_supabase_client()

        try:
            logger.info(f"Generating {clip_count} clips for video: {video_id}")

            # Get video with transcription
            video_info = await self.video_service.get_video_info(
                video_id,
                user_id
            )

            if not video_info.get('transcription'):
                raise ValueError("Video must be transcribed first")

            transcription = video_info['transcription']
            transcription_text = transcription.get('text', '')
            duration = video_info.get('duration', 0)

            # Analyze with AI
            clip_suggestions = await self._analyze_with_ai(
                transcription_text,
                duration,
                clip_count,
                min_duration,
                max_duration
            )

            logger.info(f"AI suggested {len(clip_suggestions)} clips")

            # Create clip records in database
            created_clips = []

            for suggestion in clip_suggestions:
                clip_data = {
                    'video_id': video_id,
                    'user_id': user_id,
                    'title': suggestion['title'],
                    'start_time': suggestion['start_time'],
                    'end_time': suggestion['end_time'],
                    'duration': suggestion['end_time'] - suggestion['start_time'],
                    'ai_score': suggestion['viral_score'],
                    'aspect_ratio': '16:9',
                    'status': 'draft',
                    'settings': {
                        'hook_type': suggestion['hook_type'],
                        'target_platform': suggestion['target_platform'],
                        'description': suggestion['description'],
                        'reasoning': suggestion['reasoning'],
                        'tags': suggestion.get('tags', []),
                    }
                }

                result = supabase.table('clips').insert(clip_data).execute()
                created_clips.append(result.data[0])

            # Update processing job
            supabase.table('processing_jobs').insert({
                'user_id': user_id,
                'video_id': video_id,
                'job_type': 'clip_generation',
                'status': 'completed',
                'progress': 100,
                'completed_at': 'now()',
                'metadata': {
                    'clips_generated': len(created_clips)
                }
            }).execute()

            logger.info(f"Created {len(created_clips)} clip records")

            return {
                'video_id': video_id,
                'clips': created_clips,
                'count': len(created_clips),
                'status': 'completed'
            }

        except Exception as e:
            logger.error(f"Clip generation error: {str(e)}")
            raise

    async def _analyze_with_ai(
        self,
        transcription: str,
        video_duration: int,
        clip_count: int,
        min_duration: int,
        max_duration: int
    ) -> List[Dict]:
        """Analyze transcription with Groq AI to identify viral clips"""

        prompt = f"""You are an expert video editor analyzing video transcriptions to identify viral-worthy clip segments.

Video Duration: {video_duration} seconds
Requested Clips: {clip_count}
Min Duration: {min_duration} seconds
Max Duration: {max_duration} seconds

Transcription:
{transcription[:8000]}  # Limit to avoid token limits

Analyze this video transcription and identify {clip_count} viral clip opportunities.

For each clip, provide:
1. start_time: Start time in seconds (integer)
2. end_time: End time in seconds (integer)
3. title: Compelling title (5-7 words, hook-worthy)
4. description: Brief description of the clip content
5. viral_score: Score from 0-100 indicating viral potential
6. hook_type: Type of hook (question/statement/story/statistic/reveal/emotional)
7. target_platform: Best platform (tiktok/instagram/youtube_shorts/all)
8. reasoning: Why this clip has viral potential (1-2 sentences)
9. tags: Array of 3-5 relevant hashtags/keywords

Return ONLY a valid JSON array with no additional text or markdown formatting.

Example format:
[
  {{
    "start_time": 45,
    "end_time": 75,
    "title": "Mind-Blowing AI Secret Revealed",
    "description": "Discussion about breakthrough AI technology",
    "viral_score": 92,
    "hook_type": "reveal",
    "target_platform": "tiktok",
    "reasoning": "Strong hook with surprising information and clear payoff",
    "tags": ["ai", "technology", "mindblown"]
  }}
]
"""

        try:
            response = self.groq_client.chat.completions.create(
                model="mixtral-8x7b-32768",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=3000
            )

            content = response.choices[0].message.content

            # Extract JSON from response
            import json
            import re

            json_match = re.search(r'\[[\s\S]*\]', content)
            if json_match:
                clips = json.loads(json_match.group(0))
            else:
                clips = json.loads(content)

            # Validate and filter clips
            valid_clips = []
            for clip in clips:
                if (
                    clip.get('start_time', 0) >= 0 and
                    clip.get('end_time', 0) <= video_duration and
                    clip.get('start_time', 0) < clip.get('end_time', 0) and
                    (clip.get('end_time', 0) - clip.get('start_time', 0)) >= min_duration and
                    (clip.get('end_time', 0) - clip.get('start_time', 0)) <= max_duration
                ):
                    valid_clips.append(clip)

            return valid_clips[:clip_count]

        except Exception as e:
            logger.error(f"AI analysis error: {str(e)}")
            raise

    async def export_clip(
        self,
        clip_id: str,
        user_id: str,
        output_format: str = "mp4",
        resolution: str = "1080p"
    ) -> Dict:
        """
        Export/render a clip

        Args:
            clip_id: Clip ID
            user_id: User ID
            output_format: Output format (mp4, mov, etc)
            resolution: Output resolution (1080p, 720p, etc)

        Returns:
            Dictionary with exported clip info
        """
        supabase = get_supabase_client()
        video_path = None
        output_path = None

        try:
            logger.info(f"Exporting clip: {clip_id}")

            # Get clip info
            clip_result = supabase.table('clips')\
                .select('*, videos(*)')\
                .eq('id', clip_id)\
                .eq('user_id', user_id)\
                .single()\
                .execute()

            if not clip_result.data:
                raise ValueError("Clip not found")

            clip = clip_result.data
            video = clip['videos']

            # Update clip status
            supabase.table('clips').update({
                'status': 'processing'
            }).eq('id', clip_id).execute()

            # Download video
            video_path = self.video_service._download_from_storage(
                video['file_path'],
                'videos'
            )

            # Cut clip
            output_path = self.temp_dir / f"{clip_id}.{output_format}"

            self.video_service.cut_video(
                str(video_path),
                str(output_path),
                clip['start_time'],
                clip['end_time']
            )

            logger.info(f"Clip cut: {output_path}")

            # Upload to storage
            storage_path = f"{user_id}/clips/{clip_id}.{output_format}"

            with open(output_path, 'rb') as f:
                supabase.storage.from_('videos').upload(
                    storage_path,
                    f,
                    file_options={"content-type": f"video/{output_format}"}
                )

            # Generate thumbnail
            thumbnail_path = self.temp_dir / f"{clip_id}_thumb.jpg"
            import ffmpeg

            (
                ffmpeg
                .input(str(output_path), ss=1)
                .filter('scale', 1280, -1)
                .output(str(thumbnail_path), vframes=1, format='image2')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            # Upload thumbnail
            thumb_storage_path = f"{user_id}/clips/thumbnails/{clip_id}.jpg"

            with open(thumbnail_path, 'rb') as f:
                supabase.storage.from_('videos').upload(
                    thumb_storage_path,
                    f,
                    file_options={"content-type": "image/jpeg"}
                )

            # Update clip
            supabase.table('clips').update({
                'file_path': storage_path,
                'thumbnail_path': thumb_storage_path,
                'status': 'ready'
            }).eq('id', clip_id).execute()

            # Cleanup
            if video_path and video_path.exists():
                video_path.unlink()
            if output_path and output_path.exists():
                output_path.unlink()
            if thumbnail_path.exists():
                thumbnail_path.unlink()

            logger.info(f"Clip exported successfully: {clip_id}")

            return {
                'clip_id': clip_id,
                'file_path': storage_path,
                'thumbnail_path': thumb_storage_path,
                'status': 'ready'
            }

        except Exception as e:
            logger.error(f"Clip export error: {str(e)}")

            # Update status to failed
            supabase.table('clips').update({
                'status': 'failed'
            }).eq('id', clip_id).execute()

            # Cleanup
            if video_path and video_path.exists():
                video_path.unlink()
            if output_path and output_path.exists():
                output_path.unlink()

            raise
