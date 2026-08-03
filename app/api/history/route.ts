import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export interface VideoListItem {
  videoId: string
  fileName: string
  fileSize: number
  createdAt: number
}

export async function GET(request: NextRequest) {
  try {
    const videoDir = path.join("/tmp", "magoo-videos")

    if (!fs.existsSync(videoDir)) {
      return NextResponse.json({ videos: [] })
    }

    const files = fs.readdirSync(videoDir)
    const videos: VideoListItem[] = []

    for (const file of files) {
      // Only include final, completed videos
      if (!file.endsWith("_final.mp4")) continue

      const filePath = path.join(videoDir, file)
      const stats = fs.statSync(filePath)
      const videoId = file.replace("_final.mp4", "")

      // Validate videoId format to prevent listing garbage files
      if (!/^video_\d+_[a-z0-9]+$/.test(videoId)) continue

      videos.push({
        videoId,
        fileName: file,
        fileSize: stats.size,
        createdAt: stats.birthtimeMs || stats.mtimeMs,
      })
    }

    // Sort by creation time, newest first
    videos.sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json({
      videos,
      count: videos.length,
    })
  } catch (error) {
    console.error("History error:", error)
    return NextResponse.json({ error: "Failed to list videos" }, { status: 500 })
  }
}
