// The starting still image for a video: either generated from a text prompt
// via OpenAI's image API, or passed through directly when the user uploads
// their own photo.

import fs from "fs"
import path from "path"

const IMAGES_DIR = path.join("/tmp", "magoo-images")

function ensureDir(): void {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true })
  }
}

function imagePathFor(jobId: string): string {
  return path.join(IMAGES_DIR, `${jobId}.png`)
}

export async function generateImage(jobId: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured")
  }

  ensureDir()

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI image generation failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  const b64 = data?.data?.[0]?.b64_json
  if (!b64) {
    throw new Error("OpenAI response did not include image data")
  }

  const outputPath = imagePathFor(jobId)
  fs.writeFileSync(outputPath, Buffer.from(b64, "base64"))
  return outputPath
}

export async function saveUploadedImage(jobId: string, file: File): Promise<string> {
  ensureDir()
  const outputPath = imagePathFor(jobId)
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(outputPath, buffer)
  return outputPath
}
