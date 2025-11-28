import { createClient } from "npm:@supabase/supabase-js@2";
import { createGroqClient } from "../shared/groq-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ClipAnalysisRequest {
  videoId: string;
  userId: string;
  options?: {
    targetPlatform?: string;
    clipCount?: number;
    minDuration?: number;
    maxDuration?: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { videoId, userId, options }: ClipAnalysisRequest = await req.json();

    if (!videoId || !userId) {
      throw new Error("videoId and userId are required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Fetching video data...");
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .eq("user_id", userId)
      .single();

    if (videoError || !video) {
      throw new Error("Video not found or access denied");
    }

    if (!video.transcription) {
      throw new Error("Video must be transcribed first. Please run transcription.");
    }

    const transcriptionText =
      typeof video.transcription === "object" && video.transcription.text
        ? video.transcription.text
        : JSON.stringify(video.transcription);

    console.log("Analyzing clips with Groq AI...");
    const groq = createGroqClient();
    const clipSuggestions = await groq.analyzeForClips(
      transcriptionText,
      video.duration || 0,
      {
        targetPlatform: options?.targetPlatform,
        clipCount: options?.clipCount || 10,
        minDuration: options?.minDuration || 15,
        maxDuration: options?.maxDuration || 60,
      }
    );

    console.log(`Found ${clipSuggestions.length} clip suggestions`);

    console.log("Creating clip records in database...");
    const clipsToInsert = clipSuggestions.map((clip) => ({
      video_id: videoId,
      user_id: userId,
      title: clip.title,
      start_time: clip.start_time,
      end_time: clip.end_time,
      duration: clip.duration,
      ai_score: clip.viral_score,
      aspect_ratio: "16:9" as const,
      status: "draft" as const,
      settings: {
        target_platform: clip.target_platform,
        hook_type: clip.hook_type,
        description: clip.description,
        reasoning: clip.reasoning,
        tags: clip.tags,
      },
    }));

    const { data: createdClips, error: insertError } = await supabase
      .from("clips")
      .insert(clipsToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to create clips: ${insertError.message}`);
    }

    const { error: jobError } = await supabase
      .from("processing_jobs")
      .update({
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
        metadata: { clips_generated: createdClips?.length || 0 },
      })
      .eq("video_id", videoId)
      .eq("job_type", "clip_generation")
      .eq("status", "processing");

    if (jobError) {
      console.error("Failed to update job status:", jobError);
    }

    const { error: usageError } = await supabase.rpc("increment_ai_credits", {
      p_user_id: userId,
      p_credits: clipSuggestions.length * 2,
    });

    if (usageError) {
      console.error("Failed to update AI credits:", usageError);
    }

    const { data: notification } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: "clips_generated",
        title: "Clips Generated Successfully",
        message: `${createdClips?.length || 0} viral clips have been generated from your video "${video.title}"`,
        link: `/clips?video=${videoId}`,
        metadata: {
          video_id: videoId,
          clip_count: createdClips?.length || 0,
        },
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoId,
        clips: createdClips,
        suggestions: clipSuggestions,
        message: `Successfully generated ${createdClips?.length || 0} clip suggestions`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Clip analysis error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Clip analysis failed",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
