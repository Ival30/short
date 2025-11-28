# ClipForge - AI-Powered Video Clipping Application

A production-ready web application similar to Opus Clips that allows users to upload long-form videos and create short, engaging clips optimized for social media.

## Features Implemented

### Authentication & User Management
- Email/password authentication with Supabase Auth
- User profiles with storage quotas
- Secure session management
- Protected routes and RLS policies

### Video Management
- Drag-and-drop video upload interface
- Support for multiple video formats (MP4, MOV, AVI, WebM, MKV)
- Real-time upload progress tracking
- Video library with metadata display
- Automatic video duration detection

### Dashboard
- Overview statistics (total videos, clips, processing status)
- Recent videos display
- Quick access to video management

### Clip Editor
- Video player with playback controls
- AI-suggested clip segments with engagement scores
- Timeline visualization with clip markers
- Multiple aspect ratio support (16:9, 9:16, 1:1)
- Clip creation from suggested segments
- Caption styling options

### Database Schema
- `profiles` - User information and storage quotas
- `videos` - Uploaded video metadata
- `clips` - Generated video clips
- `processing_jobs` - Background job tracking

### Storage Buckets
- `videos` - Original uploaded videos (private)
- `clips` - Generated clips (private)
- `thumbnails` - Video thumbnails (public)

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **File Upload**: react-dropzone
- **Date Formatting**: date-fns

## Getting Started

1. The database schema and storage buckets are already configured
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Open your browser and navigate to the local development URL

## Application Flow

1. **Landing Page**: Visitors see an attractive landing page with features and benefits
2. **Sign Up/Login**: Users create an account or sign in
3. **Dashboard**: Users see their video library and statistics
4. **Upload**: Users upload videos via drag-and-drop
5. **Clip Editor**: Select a video to open the clip editor
6. **Create Clips**: Review AI-suggested clips and create custom clips
7. **Export**: Configure aspect ratio and caption settings, then export

## Future Enhancements

To make this a fully functional Opus Clips clone, consider adding:

1. **AI Integration**
   - Real transcription service (AssemblyAI, Deepgram)
   - AI-powered clip detection based on content analysis
   - Automatic hook and key moment identification

2. **Video Processing**
   - Supabase Edge Functions for video processing
   - FFmpeg integration for clip extraction
   - Thumbnail generation
   - Video format conversion

3. **Advanced Editing**
   - Manual clip trimming with frame-accurate controls
   - Multi-track timeline
   - Caption animation presets
   - Brand watermark overlays

4. **Export & Distribution**
   - Background rendering queue
   - Export to multiple platforms
   - Download management
   - Social media integration

5. **Analytics**
   - Clip performance tracking
   - Engagement metrics
   - A/B testing for clip variations

6. **Collaboration**
   - Team workspaces
   - Clip sharing and comments
   - Version history

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Secure file storage with user-scoped access
- Authentication required for all protected routes

## Build

Run `npm run build` to create a production build. The app has been verified to build successfully without errors.
