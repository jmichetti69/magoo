// Repeats a Kling clip into a multi-hour looping video for
// YouTube "screensaver" playback, using ffmpeg's -stream_loop with a stream
// copy (no re-encode) so an 8-hour output takes seconds, not hours, to build.

import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import ffmpegStatic from "ffmpeg-static"

const execFileAsync = promisify(execFile)

export interface LoopOptions {
  clipPath: string
  targetDurationSeconds: number
  outputPath: string
}

async function getVideoDuration(videoPath: string): Promise<number> {
  const ffprobePath = "ffprobe"
  const { stdout } = await execFileAsync(ffprobePath, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1:nokey=1",
    videoPath,
  ])
  return parseFloat(stdout.trim())
}

export async function loopVideoToDuration(options: LoopOptions): Promise<string> {
  const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg"
  const { clipPath, targetDurationSeconds, outputPath } = options

  const clipDurationSeconds = await getVideoDuration(clipPath)
  if (clipDurationSeconds <= 0) {
    throw new Error(`Invalid video duration: ${clipDurationSeconds}s`)
  }

  // -stream_loop N loops the input N *additional* times (N+1 total plays).
  const totalPlays = Math.ceil(targetDurationSeconds / clipDurationSeconds)
  const loopCount = Math.max(0, totalPlays - 1)

  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const ffmpegArgs = [
    "-stream_loop",
    String(loopCount),
    "-i",
    clipPath,
    "-t",
    String(targetDurationSeconds),
    "-c",
    "copy",
    outputPath,
  ]

  await execFileAsync(ffmpegPath, ffmpegArgs, { maxBuffer: 1024 * 1024 * 50 })

  if (!fs.existsSync(outputPath)) {
    throw new Error("Looped video file was not created")
  }

  return outputPath
}
