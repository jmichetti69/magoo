// ffmpeg-based procedural video rendering
// Converts Claude descriptions into visual videos

import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import ffmpegStatic from "ffmpeg-static"

const execFileAsync = promisify(execFile)

export interface RenderOptions {
  videoId: string
  duration: number
  width: number
  height: number
  fps: number
  visualDescription: string
}

// Parse color hex from description (e.g., "#3b82f6" or "rgb(59, 130, 246)")
function extractColors(description: string): string[] {
  const hexMatches = description.match(/#[0-9a-f]{6}/gi) || []
  const rgbMatches = description.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/gi) || []
  return [...hexMatches, ...rgbMatches]
}

// Derive a grain amount from mood hints in the description. Kept visible
// enough that the video reads as "alive" rather than a static color card.
function extractGrainLevel(visualDescription: string): number {
  const lower = visualDescription.toLowerCase()
  const isSlow = /slow|gentle|soft|calm|serene/.test(lower)
  const isFast = /fast|quick|energetic|dynamic|vibrant/.test(lower)
  return isSlow ? 12 : isFast ? 28 : 18
}

export async function renderVideo(options: RenderOptions): Promise<string> {
  const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg"
  const outputDir = path.join("/tmp", "magoo-videos")
  const outputPath = path.join(outputDir, `${options.videoId}.mp4`)

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  try {
    const colors = extractColors(options.visualDescription)
    const color1 = colors[0] || "#1e3c72"
    const color2 = colors[1] || "#2a5298"
    const grain = extractGrainLevel(options.visualDescription)

    // Two color sources blended into a diagonal gradient, with subtle
    // animated grain layered on top for texture.
    const filterComplex =
      `[0][1]blend=all_expr='A*(X/W)+B*(1-X/W)'[grad];` +
      `[grad]noise=alls=${grain}:allf=t+u[out]`

    const ffmpegArgs = [
      "-f",
      "lavfi",
      "-i",
      `color=c=${color1}:s=${options.width}x${options.height}:d=${options.duration}`,
      "-f",
      "lavfi",
      "-i",
      `color=c=${color2}:s=${options.width}x${options.height}:d=${options.duration}`,
      "-filter_complex",
      filterComplex,
      "-map",
      "[out]",
      "-r",
      String(options.fps),
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-pix_fmt",
      "yuv420p",
      "-an",
      outputPath,
    ]

    await execFileAsync(ffmpegPath, ffmpegArgs)

    if (!fs.existsSync(outputPath)) {
      throw new Error("Video file was not created")
    }

    return outputPath
  } catch (error) {
    console.error(`Failed to render video ${options.videoId}:`, error)
    throw error
  }
}

export async function checkFfmpegAvailable(): Promise<boolean> {
  const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg"

  try {
    await execFileAsync(ffmpegPath, ["-version"])
    return true
  } catch {
    return false
  }
}
