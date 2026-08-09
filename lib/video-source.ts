import fs from "fs"
import path from "path"

export async function saveUploadedVideo(jobId: string, file: File): Promise<string> {
  const videoDir = path.join("/tmp", "magoo-videos")
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true })
  }

  const ext = file.name.split(".").pop() || "mp4"
  const videoPath = path.join(videoDir, `${jobId}_source.${ext}`)

  const buffer = await file.arrayBuffer()
  fs.writeFileSync(videoPath, Buffer.from(buffer))

  return videoPath
}
