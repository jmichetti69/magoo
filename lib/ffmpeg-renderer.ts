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

// Derive a grain amount and motion pace from mood hints in the description.
function extractMoodParams(visualDescription: string): {
  grain: number
  breatheSeconds: number
  hueSeconds: number
} {
  const lower = visualDescription.toLowerCase()
  const isSlow = /slow|gentle|soft|calm|serene/.test(lower)
  const isFast = /fast|quick|energetic|dynamic|vibrant/.test(lower)

  if (isSlow) return { grain: 12, breatheSeconds: 30, hueSeconds: 60 }
  if (isFast) return { grain: 28, breatheSeconds: 10, hueSeconds: 20 }
  return { grain: 18, breatheSeconds: 18, hueSeconds: 36 }
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
    const { grain, breatheSeconds, hueSeconds } = extractMoodParams(
      options.visualDescription
    )

    // Two color sources cross-blended with a slowly oscillating ratio (a
    // "breathing" effect via T in the blend expression), plus a gentle hue
    // drift, grain, and a soft vignette — real motion instead of a static
    // gradient card.
    const breathe = `(0.5+0.5*sin(2*PI*T/${breatheSeconds}))`
    const filterComplex =
      `[0][1]blend=all_expr='A*${breathe}+B*(1-${breathe})'[grad];` +
      `[grad]hue=h='15*sin(2*PI*t/${hueSeconds})':s=1[hued];` +
      `[hued]noise=alls=${grain}:allf=t+u[grained];` +
      `[grained]vignette[out]`

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
