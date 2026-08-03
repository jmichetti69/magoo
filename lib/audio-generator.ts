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
    const { mood } = parseAudioMood(options.audioDescription)

    // Base drone frequency: lower for calmer/meditative moods
    const frequency = mood === "meditative" ? 96 : mood === "energetic" ? 220 : 130

    // Mix a soft sine drone with pink noise texture for a simple ambient bed
    const ffmpegArgs = [
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${frequency}:sample_rate=48000:duration=${options.duration}`,
      "-f",
      "lavfi",
      "-i",
      `anoisesrc=sample_rate=48000:amplitude=0.03:duration=${options.duration}:color=pink`,
      "-filter_complex",
      `[0]volume=0.12[tone];[1]volume=0.06[noise];[tone][noise]amix=inputs=2:duration=first:dropout_transition=2[out]`,
      "-map",
      "[out]",
      "-ac",
      "2",
      "-ar",
      "48000",
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
