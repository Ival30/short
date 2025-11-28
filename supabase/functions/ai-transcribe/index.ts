import { createClient } from "npm:@supabase/supabase-js@2";
import { createGroqClient } from "../shared/groq-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TranscriptionRequest {
  videoId: string;
  userId: string;
  language?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { videoId, userId, language }: TranscriptionRequest = await req.json();

    if (!videoId || !userId) {
      throw new Error("videoId and userId are required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .eq("user_id", userId)
      .single();

    if (videoError || !video) {
      throw new Error("Video not found or access denied");
    }

    const { data: videoBlob, error: downloadError } = await supabase.storage
      .from("videos")
      .download(video.file_path);

    if (downloadError || !videoBlob) {
      throw new Error("Failed to download video file");
    }

    console.log("Extracting audio from video...");
    const audioBlob = await extractAudio(videoBlob);

    console.log("Transcribing with Groq...");
    const groq = createGroqClient();
    const transcriptionResult = await groq.transcribe(audioBlob, {
      language: language || "en",
      responseFormat: "verbose_json",
    });

    console.log("Processing transcription...");
    const processedTranscription = {
      text: transcriptionResult.text,
      segments: transcriptionResult.segments || [],
      language: transcriptionResult.language,
      duration: transcriptionResult.duration,
      words: transcriptionResult.words || [],
    };

    const { error: updateError } = await supabase
      .from("videos")
      .update({
        transcription: processedTranscription,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", videoId);

    if (updateError) {
      throw updateError;
    }

    const { error: jobError } = await supabase
      .from("processing_jobs")
      .update({
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
        metadata: { transcription_length: transcriptionResult.text?.length || 0 },
      })
      .eq("video_id", videoId)
      .eq("job_type", "transcription")
      .eq("status", "processing");

    if (jobError) {
      console.error("Failed to update job status:", jobError);
    }

    const { error: usageError } = await supabase.rpc("increment_ai_credits", {
      p_user_id: userId,
      p_credits: 10,
    });

    if (usageError) {
      console.error("Failed to update AI credits:", usageError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoId,
        transcription: processedTranscription,
        message: "Video transcribed successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Transcription error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Transcription failed",
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

async function extractAudio(videoBlob: Blob): Promise<Blob> {
  try {
    const formData = new FormData();
    formData.append("file", videoBlob, "video.mp4");

    const response = await fetch("https://api.cloudconvert.com/v2/convert", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("CLOUDCONVERT_API_KEY")}`,
      },
      body: JSON.stringify({
        tasks: {
          "import-video": {
            operation: "import/upload",
          },
          "convert-audio": {
            operation: "convert",
            input: "import-video",
            output_format: "mp3",
            engine: "ffmpeg",
            audio_codec: "mp3",
            audio_bitrate: 128,
          },
          "export-audio": {
            operation: "export/url",
            input: "convert-audio",
          },
        },
      }),
    });

    if (!response.ok) {
      console.warn("Audio extraction failed, using video file directly");
      return videoBlob;
    }

    const result = await response.json();
    const audioUrl = result.data.tasks["export-audio"].result.files[0].url;

    const audioResponse = await fetch(audioUrl);
    return await audioResponse.blob();
  } catch (error) {
    console.warn("Audio extraction error, using video file directly:", error);
    return videoBlob;
  }
}
