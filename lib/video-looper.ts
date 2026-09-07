// Repeats a Kling clip into a multi-hour looping video for YouTube
// "screensaver" playback. Two earlier approaches both produced an audible/
// visible glitch at every loop boundary:
//   1. -stream_loop with -c copy (stream copy) hard-concatenates
//      independently-encoded segments, which glitches at every seam.
//   2. -stream_loop with a full re-encode still glitches, because
//      -stream_loop works by having the demuxer re-open the input file at
//      each repetition — that restart itself produces a ~0.1s freeze frame,
//      regardless of whether the output is stream-copied or re-encoded.
// The fix is ffmpeg's loop/aloop *filters*, which repeat already-decoded
// frames within a single continuous decode — there's no file reopen, so
// there's no seam for a freeze to occur at.

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

// loop's "size" is a frame count, capped at 32767 by ffmpeg. A source clip
// this long (~34 minutes at 24fps) is far beyond any realistic Kling clip,
// so a fixed constant avoids an extra probe/decode pass to count frames.
const MAX_LOOP_FRAME_SIZE = 32767

export async function loopVideoToDuration(options: LoopOptions): Promise<string> {
  const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg"
  const { clipPath, targetDurationSeconds, outputPath } = options

  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const ffmpegArgs = [
    "-i",
    clipPath,
    "-filter_complex",
    `[0:v]loop=loop=-1:size=${MAX_LOOP_FRAME_SIZE}:start=0,setpts=N/FRAME_RATE/TB[v];` +
      `[0:a]aloop=loop=-1:size=2e9:start=0,asetpts=N/SR/TB[a]`,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-t",
    String(targetDurationSeconds),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "21",
    "-c:a",
    "aac",
    "-ar",
    "44100",
    "-movflags",
    "+faststart",
    outputPath,
  ]

  await execFileAsync(ffmpegPath, ffmpegArgs, { maxBuffer: 1024 * 1024 * 50 })

  if (!fs.existsSync(outputPath)) {
    throw new Error("Looped video file was not created")
  }

  return outputPath
}
