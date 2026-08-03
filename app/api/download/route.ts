import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get("videoId")

  if (!videoId) {
    return NextResponse.json({ error: "videoId required" }, { status: 400 })
  }

  // Only accept IDs matching the format we generate (video_<timestamp>_<random>).
  // This rules out path traversal outright, rather than relying on a
  // string-prefix check against the resolved directory (which sibling-directory
  // names like "magoo-videos-evil" can slip past).
  if (!/^video_\d+_[a-z0-9]+$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid video ID" }, { status: 403 })
  }

  try {
    const videoDir = path.join("/tmp", "magoo-videos")
    const videoPath = path.join(videoDir, `${videoId}_final.mp4`)

    if (!fs.existsSync(videoPath)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(videoPath)
    const fileName = `magoo-${videoId}.mp4`

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
