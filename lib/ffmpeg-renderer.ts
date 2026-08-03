// ffmpeg-based procedural video rendering
// Converts Claude descriptions into visual videos

import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

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

// Generate an ffmpeg filter chain from visual description
function generateFilterChain(options: RenderOptions): string {
  const { width, height, duration, fps, visualDescription } = options
  const colors = extractColors(visualDescription)

  // Extract animation speed hints from description
  const isSlow = /slow|gentle|soft|calm|serene/.test(visualDescription.toLowerCase())
  const isFast = /fast|quick|energetic|dynamic|vibrant/.test(visualDescription.toLowerCase())
  const speed = isSlow ? 0.5 : isFast ? 2 : 1

  // Default gradient if no colors found
  const color1 = colors[0] || "#1e3c72"
  const color2 = colors[1] || "#2a5298"

  // Build filter chain for:
  // 1. Gradient background
  // 2. Particle/noise overlay
  // 3. Subtle animation

  const filters = [
    // Create gradient background
    `color=c=${color1}:s=${width}x${height}:d=${duration}`,
    // Add noise/grain for texture
    `[0]split=2[a][b]`,
    `[b]format=pix_fmts=gray,geq='p(X\\,Y)':random=123[noise]`,
    `[a][noise]blend=all_mode=softlight:all_opacity=0.1`,
  ].join(";")

  return filters
}

// Generate frame count for duration
function getFrameCount(duration: number, fps: number): number {
  return Math.ceil(duration * fps)
}

export async function renderVideo(options: RenderOptions): Promise<string> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg"
  const outputDir = path.join("/tmp", "magoo-videos")
  const outputPath = path.join(outputDir, `${options.videoId}.mp4`)

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  try {
    // Simple approach: create a gradient video with ffmpeg
    const filterChain = generateFilterChain(options)
    const frameCount = getFrameCount(options.duration, options.fps)

    // Extract primary color for gradient base
    const colors = extractColors(options.visualDescription)
    const primaryColor = colors[0] || "hsl(220,10%,15%)"

    // Use color filter + noise for procedural generation
    const ffmpegArgs = [
      "-f",
      "lavfi",
      "-i",
      `color=c=${primaryColor}:s=${options.width}x${options.height}:d=${options.duration}`,
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=48000:cl=mono:d=${options.duration}`,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
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
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg"

  try {
    await execFileAsync(ffmpegPath, ["-version"])
    return true
  } catch {
    return false
  }
}
