import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
  videoId: string;
}

async function getVideoInfo(url: string): Promise<VideoInfo> {
  const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);

  if (!videoIdMatch) {
    throw new Error("Invalid YouTube URL");
  }

  const videoId = videoIdMatch[1];

  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const response = await fetch(oembedUrl);

  if (!response.ok) {
    throw new Error("Failed to fetch video info");
  }

  const data = await response.json();

  return {
    title: data.title,
    duration: 0,
    thumbnail: data.thumbnail_url,
    videoId: videoId
  };
}

async function downloadYouTubeVideo(videoId: string): Promise<Blob> {
  const ytDlpUrl = `https://yt-dlp-api.vercel.app/api/download?url=https://www.youtube.com/watch?v=${videoId}&format=best`;

  const response = await fetch(ytDlpUrl);

  if (!response.ok) {
    throw new Error("Failed to download video");
  }

  return await response.blob();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { youtubeUrl, userId } = await req.json();

    if (!youtubeUrl) {
      throw new Error("YouTube URL is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const videoInfo = await getVideoInfo(youtubeUrl);

    const videoBlob = await downloadYouTubeVideo(videoInfo.videoId);

    const fileName = `${userId}/${Date.now()}_${videoInfo.videoId}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, videoBlob, {
        contentType: "video/mp4",
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: videoData, error: insertError } = await supabase
      .from("videos")
      .insert({
        user_id: userId,
        title: videoInfo.title,
        file_path: fileName,
        file_size: videoBlob.size,
        mime_type: "video/mp4",
        status: "processing",
        source_url: youtubeUrl,
        metadata: {
          source: "youtube",
          youtube_id: videoInfo.videoId,
          youtube_url: youtubeUrl
        }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (videoInfo.thumbnail) {
      try {
        const thumbnailResponse = await fetch(videoInfo.thumbnail);
        const thumbnailBlob = await thumbnailResponse.blob();
        const thumbnailPath = `${userId}/${videoData.id}_thumb.jpg`;

        await supabase.storage
          .from("thumbnails")
          .upload(thumbnailPath, thumbnailBlob, {
            contentType: "image/jpeg",
            upsert: true
          });

        await supabase
          .from("videos")
          .update({ thumbnail_path: thumbnailPath })
          .eq("id", videoData.id);
      } catch (thumbError) {
        console.error("Failed to upload thumbnail:", thumbError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoData.id,
        message: "Video imported successfully from YouTube"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error importing YouTube video:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to import video from YouTube"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
