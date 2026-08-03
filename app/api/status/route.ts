import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get("videoId")

  if (!videoId) {
    return NextResponse.json({ error: "videoId required" }, { status: 400 })
  }

  if (!/^video_\d+_[a-z0-9]+$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid video ID" }, { status: 403 })
  }

  try {
    const videoDir = path.join("/tmp", "magoo-videos")
    const finalVideoPath = path.join(videoDir, `${videoId}_final.mp4`)
    const videoPath = path.join(videoDir, `${videoId}.mp4`)

    // Check if video exists
    if (fs.existsSync(finalVideoPath)) {
      const stats = fs.statSync(finalVideoPath)
      return NextResponse.json({
        videoId,
        status: "completed",
        videoPath: finalVideoPath,
        fileSize: stats.size,
      })
    }

    if (fs.existsSync(videoPath)) {
      const stats = fs.statSync(videoPath)
      return NextResponse.json({
        videoId,
        status: "processing",
        fileSize: stats.size,
      })
    }

    // Video still queued or not found
    return NextResponse.json({
      videoId,
      status: "queued",
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({ error: "Status check failed" }, { status: 500 })
  }
}
