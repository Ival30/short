export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          storage_used: number
          storage_limit: number
          role: 'user' | 'admin' | 'super_admin'
          permissions: Json
          is_active: boolean
          subscription_tier: 'free' | 'pro' | 'business' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          storage_used?: number
          storage_limit?: number
          role?: 'user' | 'admin' | 'super_admin'
          permissions?: Json
          is_active?: boolean
          subscription_tier?: 'free' | 'pro' | 'business' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          storage_used?: number
          storage_limit?: number
          role?: 'user' | 'admin' | 'super_admin'
          permissions?: Json
          is_active?: boolean
          subscription_tier?: 'free' | 'pro' | 'business' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          file_path: string
          thumbnail_path: string | null
          duration: number | null
          file_size: number
          mime_type: string
          status: 'uploading' | 'processing' | 'ready' | 'failed'
          source_url: string | null
          transcription: Json | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          file_path: string
          thumbnail_path?: string | null
          duration?: number | null
          file_size: number
          mime_type: string
          status?: 'uploading' | 'processing' | 'ready' | 'failed'
          source_url?: string | null
          transcription?: Json | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          file_path?: string
          thumbnail_path?: string | null
          duration?: number | null
          file_size?: number
          mime_type?: string
          status?: 'uploading' | 'processing' | 'ready' | 'failed'
          source_url?: string | null
          transcription?: Json | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      clips: {
        Row: {
          id: string
          video_id: string
          user_id: string
          title: string
          start_time: number
          end_time: number
          duration: number
          file_path: string | null
          thumbnail_path: string | null
          ai_score: number
          aspect_ratio: '16:9' | '9:16' | '1:1' | '4:5'
          captions: Json | null
          status: 'draft' | 'processing' | 'ready' | 'failed'
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          video_id: string
          user_id: string
          title: string
          start_time: number
          end_time: number
          duration: number
          file_path?: string | null
          thumbnail_path?: string | null
          ai_score?: number
          aspect_ratio?: '16:9' | '9:16' | '1:1' | '4:5'
          captions?: Json | null
          status?: 'draft' | 'processing' | 'ready' | 'failed'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          user_id?: string
          title?: string
          start_time?: number
          end_time?: number
          duration?: number
          file_path?: string | null
          thumbnail_path?: string | null
          ai_score?: number
          aspect_ratio?: '16:9' | '9:16' | '1:1' | '4:5'
          captions?: Json | null
          status?: 'draft' | 'processing' | 'ready' | 'failed'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: Json
          category: 'features' | 'limits' | 'pricing' | 'ai' | 'general'
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          category: 'features' | 'limits' | 'pricing' | 'ai' | 'general'
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          category?: 'features' | 'limits' | 'pricing' | 'ai' | 'general'
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      admin_audit_log: {
        Row: {
          id: string
          admin_id: string | null
          action: string
          target_type: string | null
          target_id: string | null
          old_value: Json | null
          new_value: Json | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_id?: string | null
          action: string
          target_type?: string | null
          target_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string | null
          action?: string
          target_type?: string | null
          target_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          month: string
          videos_uploaded: number
          clips_generated: number
          ai_credits_used: number
          storage_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          videos_uploaded?: number
          clips_generated?: number
          ai_credits_used?: number
          storage_used?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          videos_uploaded?: number
          clips_generated?: number
          ai_credits_used?: number
          storage_used?: number
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          link: string | null
          is_read: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          link?: string | null
          is_read?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          link?: string | null
          is_read?: boolean
          metadata?: Json
          created_at?: string
        }
      }
      processing_jobs: {
        Row: {
          id: string
          user_id: string
          video_id: string | null
          clip_id: string | null
          job_type: 'transcription' | 'clip_generation' | 'export'
          status: 'queued' | 'processing' | 'completed' | 'failed'
          progress: number
          error_message: string | null
          metadata: Json
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id?: string | null
          clip_id?: string | null
          job_type: 'transcription' | 'clip_generation' | 'export'
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          progress?: number
          error_message?: string | null
          metadata?: Json
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string | null
          clip_id?: string | null
          job_type?: 'transcription' | 'clip_generation' | 'export'
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          progress?: number
          error_message?: string | null
          metadata?: Json
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
