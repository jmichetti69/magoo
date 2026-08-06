// Audio generation for Magoo ambient videos
// Creates atmospheric ambient soundscapes from descriptions

import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import ffmpegStatic from "ffmpeg-static"

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
  const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg"
  const outputDir = path.join("/tmp", "magoo-audio")
  const outputPath = path.join(outputDir, `${options.videoId}_audio.wav`)

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  try {
    const { mood } = parseAudioMood(options.audioDescription)

    // Root frequency: lower for calmer/meditative moods
    const root = mood === "meditative" ? 96 : mood === "energetic" ? 220 : 130
    const fifth = root * 1.5
    const octave = root * 2
    const tremoloRate = mood === "energetic" ? 0.35 : mood === "meditative" ? 0.12 : 0.15
    const d = options.duration

    // A simple three-note drone (root + fifth + octave) instead of a single
    // tone, mixed with pink noise texture, then run through a tremolo for
    // audible amplitude pulsing so the bed doesn't read as a flat, static hum.
    const ffmpegArgs = [
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${root}:sample_rate=48000:duration=${d}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${fifth}:sample_rate=48000:duration=${d}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${octave}:sample_rate=48000:duration=${d}`,
      "-f",
      "lavfi",
      "-i",
      `anoisesrc=sample_rate=48000:amplitude=0.15:duration=${d}:color=pink`,
      "-filter_complex",
      `[0]volume=0.3[root];[1]volume=0.15[fifth];[2]volume=0.1[octave];[3]volume=0.2[noise];` +
        // normalize=0: amix's default normalize divides output by input count,
        // which on top of the per-track volume already applied made the mix
        // faint enough to read as a barely-audible hum instead of a mixed chord.
        `[root][fifth][octave][noise]amix=inputs=4:duration=first:dropout_transition=2:normalize=0[mixed];` +
        `[mixed]tremolo=f=${tremoloRate}:d=0.65[out]`,
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
