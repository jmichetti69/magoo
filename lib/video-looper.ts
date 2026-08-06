// Repeats a short Kling clip (5-10s) into a multi-hour looping video for
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
  clipDurationSeconds: number
  targetDurationSeconds: number
  outputPath: string
}

export async function loopVideoToDuration(options: LoopOptions): Promise<string> {
  const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg"
  const { clipPath, clipDurationSeconds, targetDurationSeconds, outputPath } = options

  if (clipDurationSeconds <= 0) {
    throw new Error("clipDurationSeconds must be greater than 0")
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
    // Trim the ragged final partial loop so the output lands exactly on
    // targetDurationSeconds instead of overshooting by up to one clip length.
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
