import Groq from "npm:groq-sdk@0.7.0";

export interface GroqConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class GroqClient {
  private client: Groq;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config?: GroqConfig) {
    const apiKey = config?.apiKey || Deno.env.get("GROQ_API_KEY");

    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is required");
    }

    this.client = new Groq({ apiKey });
    this.defaultModel = config?.model || "mixtral-8x7b-32768";
    this.defaultTemperature = config?.temperature ?? 0.7;
    this.defaultMaxTokens = config?.maxTokens || 2000;
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ) {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages: messages as any,
        temperature: options?.temperature ?? this.defaultTemperature,
        max_tokens: options?.maxTokens || this.defaultMaxTokens,
        stream: options?.stream || false,
      });

      return response;
    } catch (error) {
      console.error("Groq API error:", error);
      throw new Error(`Groq API call failed: ${error.message}`);
    }
  }

  async transcribe(
    audioFile: Blob | File,
    options?: {
      model?: string;
      language?: string;
      prompt?: string;
      responseFormat?: "json" | "text" | "verbose_json";
      temperature?: number;
    }
  ) {
    try {
      const response = await this.client.audio.transcriptions.create({
        file: audioFile as any,
        model: options?.model || "whisper-large-v3",
        language: options?.language,
        prompt: options?.prompt,
        response_format: options?.responseFormat || "verbose_json",
        temperature: options?.temperature ?? 0,
      });

      return response;
    } catch (error) {
      console.error("Groq transcription error:", error);
      throw new Error(`Groq transcription failed: ${error.message}`);
    }
  }

  async analyzeForClips(
    transcription: string,
    videoDuration: number,
    options?: {
      targetPlatform?: string;
      clipCount?: number;
      minDuration?: number;
      maxDuration?: number;
    }
  ): Promise<ClipSuggestion[]> {
    const prompt = `You are an expert video editor analyzing transcriptions to identify viral-worthy clip segments.

Video Duration: ${videoDuration} seconds
Target Platform: ${options?.targetPlatform || "all platforms"}
Requested Clips: ${options?.clipCount || 10}
Min Duration: ${options?.minDuration || 15} seconds
Max Duration: ${options?.maxDuration || 60} seconds

Transcription:
${transcription}

Analyze this video transcription and identify ${options?.clipCount || 10} viral clip opportunities.

For each clip, provide:
1. start_time: Start time in seconds (integer)
2. end_time: End time in seconds (integer)
3. title: Compelling title (5-7 words, hook-worthy)
4. description: Brief description of the clip content
5. viral_score: Score from 0-100 indicating viral potential
6. hook_type: Type of hook (question/statement/story/statistic/reveal/emotional)
7. target_platform: Best platform (tiktok/instagram/youtube_shorts/all)
8. reasoning: Why this clip has viral potential
9. tags: Array of relevant hashtags/keywords

Return ONLY a valid JSON array with no additional text or markdown formatting.

Example format:
[
  {
    "start_time": 45,
    "end_time": 75,
    "title": "Mind-Blowing AI Secret Revealed",
    "description": "Discussion about breakthrough AI technology",
    "viral_score": 92,
    "hook_type": "reveal",
    "target_platform": "tiktok",
    "reasoning": "Strong hook with surprising information and clear payoff",
    "tags": ["ai", "technology", "mindblown", "tech"]
  }
]`;

    try {
      const response = await this.chat(
        [{ role: "user", content: prompt }],
        {
          model: "mixtral-8x7b-32768",
          temperature: 0.7,
          maxTokens: 3000,
        }
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const clips = JSON.parse(jsonStr);

      const validatedClips = clips
        .filter((clip: any) => {
          return (
            clip.start_time >= 0 &&
            clip.end_time <= videoDuration &&
            clip.start_time < clip.end_time &&
            clip.end_time - clip.start_time >= (options?.minDuration || 15) &&
            clip.end_time - clip.start_time <= (options?.maxDuration || 60)
          );
        })
        .map((clip: any) => ({
          ...clip,
          duration: clip.end_time - clip.start_time,
        }));

      return validatedClips;
    } catch (error) {
      console.error("Clip analysis error:", error);
      throw new Error(`Failed to analyze clips: ${error.message}`);
    }
  }

  async generateCaptions(
    transcription: string,
    clipStartTime: number,
    clipEndTime: number,
    options?: {
      platform?: string;
      style?: string;
      includeEmojis?: boolean;
    }
  ): Promise<string> {
    const prompt = `Generate engaging social media captions for a video clip.

Clip Duration: ${clipEndTime - clipStartTime} seconds
Platform: ${options?.platform || "general"}
Style: ${options?.style || "engaging"}
Include Emojis: ${options?.includeEmojis !== false}

Clip Transcription:
${transcription}

Generate a compelling caption that:
1. Hooks attention in the first line
2. Summarizes the key message
3. Includes relevant emojis (if requested)
4. Ends with a call-to-action
5. Is optimized for ${options?.platform || "social media"}

Return only the caption text, no additional formatting.`;

    try {
      const response = await this.chat(
        [{ role: "user", content: prompt }],
        {
          temperature: 0.8,
          maxTokens: 500,
        }
      );

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Caption generation error:", error);
      throw new Error(`Failed to generate captions: ${error.message}`);
    }
  }

  async generateHashtags(
    clipContent: string,
    options?: {
      platform?: string;
      count?: number;
    }
  ): Promise<string[]> {
    const prompt = `Generate ${options?.count || 10} relevant hashtags for this video clip.

Platform: ${options?.platform || "general"}
Content: ${clipContent}

Requirements:
- Mix of popular and niche hashtags
- Platform-appropriate
- Include trending topics if relevant
- No special characters except #

Return as JSON array of strings.`;

    try {
      const response = await this.chat(
        [{ role: "user", content: prompt }],
        {
          temperature: 0.6,
          maxTokens: 300,
        }
      );

      const content = response.choices[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : "[]";
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Hashtag generation error:", error);
      return [];
    }
  }
}

export interface ClipSuggestion {
  start_time: number;
  end_time: number;
  duration: number;
  title: string;
  description: string;
  viral_score: number;
  hook_type: string;
  target_platform: string;
  reasoning: string;
  tags: string[];
}

export function createGroqClient(config?: GroqConfig): GroqClient {
  return new GroqClient(config);
}
