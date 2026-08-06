// Kling AI image-to-video client.
//
// NOTE: written to Kling's documented API pattern (async submit + poll task
// lifecycle), since their docs site (kling.ai/document-api) blocks
// automated fetches. Endpoint paths and response field names below should
// be double-checked against the real API reference now that we have a live
// key. Auth confirmed live (2026-08-06, screenshot of the real console at
// kling.ai): Kling issues a single static API key — not an Access/Secret
// key pair with self-signed JWTs as some third-party writeups described —
// used directly as a Bearer token.

import fs from "fs"
import path from "path"

const KLING_API_BASE = process.env.KLING_API_BASE || "https://api-singapore.klingai.com"
const CLIPS_DIR = path.join("/tmp", "magoo-clips")

function ensureDir(): void {
  if (!fs.existsSync(CLIPS_DIR)) {
    fs.mkdirSync(CLIPS_DIR, { recursive: true })
  }
}

function getKlingToken(): string {
  const apiKey = process.env.KLING_API_KEY
  if (!apiKey) {
    throw new Error("KLING_API_KEY not configured")
  }
  return apiKey
}

export interface KlingSubmitOptions {
  imagePath: string
  prompt: string
  durationSeconds: 5 | 10
  withSound: boolean
}

export async function submitImageToVideo(options: KlingSubmitOptions): Promise<string> {
  const token = getKlingToken()
  const imageB64 = fs.readFileSync(options.imagePath).toString("base64")

  const response = await fetch(`${KLING_API_BASE}/v1/videos/image2video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: "kling-v1",
      image: imageB64,
      prompt: options.prompt,
      duration: String(options.durationSeconds),
      // Kling's schema wants the string "on"/"off" here, not a JSON boolean
      // — sending a boolean is what caused the earlier "failed to resolve
      // the request body" (code 1201) error.
      sound: options.withSound ? "on" : "off",
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Kling submit failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  const taskId = data?.data?.task_id
  if (!taskId) {
    throw new Error("Kling response did not include a task_id")
  }
  return taskId
}

export interface KlingPollResult {
  status: "submitted" | "processing" | "succeed" | "failed"
  videoUrl?: string
  error?: string
}

export async function pollTaskStatus(taskId: string): Promise<KlingPollResult> {
  const token = getKlingToken()
  const response = await fetch(`${KLING_API_BASE}/v1/videos/image2video/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Kling status check failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  const task = data?.data

  return {
    status: task?.task_status,
    videoUrl: task?.task_result?.videos?.[0]?.url,
    error: task?.task_status_msg,
  }
}

export async function waitForCompletion(
  taskId: string,
  { pollIntervalMs = 5000, timeoutMs = 10 * 60 * 1000 } = {}
): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const result = await pollTaskStatus(taskId)
    if (result.status === "succeed") {
      if (!result.videoUrl) {
        throw new Error("Kling task succeeded but returned no video URL")
      }
      return result.videoUrl
    }
    if (result.status === "failed") {
      throw new Error(`Kling task failed: ${result.error || "unknown error"}`)
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }
  throw new Error("Kling task polling timed out")
}

export async function downloadClip(jobId: string, videoUrl: string): Promise<string> {
  ensureDir()
  const outputPath = path.join(CLIPS_DIR, `${jobId}.mp4`)
  const response = await fetch(videoUrl)
  if (!response.ok) {
    throw new Error(`Failed to download Kling clip (${response.status})`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(outputPath, buffer)
  return outputPath
}
