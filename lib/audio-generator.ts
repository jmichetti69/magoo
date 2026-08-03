// Audio generation for Magoo ambient videos
// Creates atmospheric ambient soundscapes from descriptions

import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

const execFileAsync = promisify(execFile)

export interface AudioGenerationOptions {
  videoId: string
  duration: number
  audioDescription: string
}

// Extract audio mood/tempo from description
function parseAudioMood(description: string): {
  tempo: number // BPM
  isSynth: boolean
  isNature: boolean
  mood: "calm" | "meditative" | "energetic"
} {
  const lower = description.toLowerCase()

  const isSlow = /slow|gentle|soft|calm|serene|peaceful|quiet/.test(lower)
  const isMeditative = /meditative|contemplative|spiritual/.test(lower)
  const isEnergetic = /energetic|dynamic|vibrant|uplifting/.test(lower)

  const isSynth = /synth|electronic|digital|pad|ambient/.test(lower)
  const isNature = /nature|water|ocean|wind|forest|birds|rain/.test(lower)

  let tempo = 60 // default BPM
  if (isSlow) tempo = 40
  if (isMeditative) tempo = 50
  if (isEnergetic) tempo = 90

  const mood = isEnergetic ? "energetic" : isMeditative ? "meditative" : "calm"

  return { tempo, isSynth, isNature, mood }
}

export async function generateAudio(options: AudioGenerationOptions): Promise<string> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg"
  const outputDir = path.join("/tmp", "magoo-audio")
  const outputPath = path.join(outputDir, `${options.videoId}_audio.wav`)

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  try {
    const { tempo, mood } = parseAudioMood(options.audioDescription)

    // Use ffmpeg to generate ambient tone
    // Create a silent audio file with gentle pink noise overlay
    const ffmpegArgs = [
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=48000:cl=stereo:d=${options.duration}`,
      "-f",
      "lavfi",
      "-i",
      `anoise=c=pink:r=48000:duration=${options.duration}`,
      "-filter_complex",
      // Mix silent source with pink noise at low volume for ambient texture
      `[0][1]amix=inputs=2:duration=first:dropout_transition=2[a],volume=0.05[out]`,
      "-map",
      "[out]",
      "-acodec",
      "pcm_s16le",
      outputPath,
    ]

    await execFileAsync(ffmpegPath, ffmpegArgs)

    if (!fs.existsSync(outputPath)) {
      throw new Error("Audio file was not created")
    }

    return outputPath
  } catch (error) {
    console.error(`Failed to generate audio for ${options.videoId}:`, error)
    throw error
  }
}

export async function generateSilentAudio(
  videoId: string,
  duration: number
): Promise<string> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg"
  const outputDir = path.join("/tmp", "magoo-audio")
  const outputPath = path.join(outputDir, `${videoId}_audio.wav`)

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  try {
    // Generate silent audio track (for testing without actual audio synthesis)
    const ffmpegArgs = [
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=48000:cl=stereo:d=${duration}`,
      "-acodec",
      "pcm_s16le",
      outputPath,
    ]

    await execFileAsync(ffmpegPath, ffmpegArgs)

    if (!fs.existsSync(outputPath)) {
      throw new Error("Audio file was not created")
    }

    return outputPath
  } catch (error) {
    console.error(`Failed to generate silent audio for ${videoId}:`, error)
    throw error
  }
}
