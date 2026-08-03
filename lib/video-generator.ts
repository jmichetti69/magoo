// Video generation pipeline for Magoo
// Converts prompts → descriptions → visual/audio → composite video

import Anthropic from "@anthropic-ai/sdk"
import { renderVideo } from "./ffmpeg-renderer"
import { generateAudio } from "./audio-generator"
import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

const execFileAsync = promisify(execFile)

export interface VideoGenerationRequest {
  prompt: string
  duration?: number // seconds, default 60
  width?: number
  height?: number
}

export interface VideoGenerationResult {
  videoId: string
  status: "queued" | "processing" | "completed" | "failed"
  visualDescription: string
  audioDescription: string
  videoPath?: string
}

// Canned descriptions used when MAGOO_MOCK_MODE=true, so the ffmpeg/audio
// pipeline can be built and tested before an Anthropic key is available.
const MOCK_VISUAL_DESCRIPTION = `Soft diagonal gradient from #1e3c72 to #2a5298, evoking a calm twilight sky.
Gentle, slow-moving grain texture drifts across the frame like light mist.
Serene, meditative pacing with no abrupt transitions — designed for a seamless 60-second loop.`

const MOCK_AUDIO_DESCRIPTION = `Calm, meditative ambient bed built from a low sustained drone with soft pink-noise
texture underneath, evoking gentle, slow-moving water. No percussion, no sharp transients —
just a continuous, seamless atmosphere suited for looping.`

export async function generateVideoDescription(
  prompt: string
): Promise<{ visual: string; audio: string }> {
  if (process.env.MAGOO_MOCK_MODE === "true") {
    console.log("[mock mode] Skipping Claude call, using canned descriptions")
    return { visual: MOCK_VISUAL_DESCRIPTION, audio: MOCK_AUDIO_DESCRIPTION }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured")
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a creative director for procedurally-generated ambient video composition.

The user wants to create a beautiful, looping ambient video with this description:
"${prompt}"

Generate two detailed outputs for our video pipeline:

1. VISUAL DESCRIPTION: Detailed procedural generation instructions for the visual layer. Include:
   - Color palette (hex codes, gradients, dominant tones)
   - Visual elements (particles, gradients, shapes, patterns)
   - Motion patterns (speed, direction, easing, loops)
   - Lighting/effects (blur, glow, opacity changes)
   - Layer composition (foreground/background/overlays)
   - Animation timing and sync points
   - Resolution and aspect ratio considerations

2. AUDIO DESCRIPTION: Detailed description of ambient music that complements the visuals:
   - Musical mood and atmosphere
   - Instrumentation (piano, strings, synth pads, ambient sounds, etc.)
   - Tempo and time signature
   - Dynamics (crescendos, dropouts, subtle transitions)
   - Sound design elements (ambient textures, nature sounds, electronic elements)
   - Duration considerations for seamless looping

Format your response EXACTLY as:
VISUAL:
[your detailed visual instructions here]

AUDIO:
[your detailed audio instructions here]`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") throw new Error("Unexpected response type from Claude")

  const text = content.text
  const visualMatch = text.match(/VISUAL:\s*([\s\S]*?)(?=AUDIO:|$)/i)
  const audioMatch = text.match(/AUDIO:\s*([\s\S]*?)$/i)

  const visual = visualMatch?.[1]?.trim() || ""
  const audio = audioMatch?.[1]?.trim() || ""

  if (!visual || !audio) {
    console.warn("Claude response parsing warning:", { visual: !!visual, audio: !!audio })
  }

  return { visual, audio }
}

async function composeVideoWithAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg"

  const ffmpegArgs = [
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-shortest",
    outputPath,
  ]

  await execFileAsync(ffmpegPath, ffmpegArgs)
}

export async function generateVideo(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  const videoId = `video_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const duration = req.duration || 60
  const width = req.width || 1920
  const height = req.height || 1080
  const fps = 30

  try {
    // Step 1: Generate visual and audio descriptions from Claude
    console.log(`[${videoId}] Generating descriptions from Claude...`)
    const { visual, audio } = await generateVideoDescription(req.prompt)

    if (!visual || !audio) {
      throw new Error("Failed to generate visual or audio descriptions")
    }

    // Step 2: Render visual video
    console.log(`[${videoId}] Rendering visual layer...`)
    const videoPath = await renderVideo({
      videoId,
      duration,
      width,
      height,
      fps,
      visualDescription: visual,
    })

    // Step 3: Generate audio track
    console.log(`[${videoId}] Generating audio...`)
    const audioPath = await generateAudio({
      videoId,
      duration,
      audioDescription: audio,
    })

    // Step 4: Compose video + audio
    console.log(`[${videoId}] Composing final video...`)
    const outputDir = path.join("/tmp", "magoo-videos")
    const finalPath = path.join(outputDir, `${videoId}_final.mp4`)
    await composeVideoWithAudio(videoPath, audioPath, finalPath)

    console.log(`[${videoId}] ✓ Video generation complete: ${finalPath}`)

    return {
      videoId,
      status: "completed",
      visualDescription: visual,
      audioDescription: audio,
      videoPath: finalPath,
    }
  } catch (error) {
    console.error(`[${videoId}] Video generation error:`, error)
    return {
      videoId,
      status: "failed",
      visualDescription: "",
      audioDescription: "",
    }
  }
}
