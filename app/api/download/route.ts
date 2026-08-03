import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get("videoId")

  if (!videoId) {
    return NextResponse.json({ error: "videoId required" }, { status: 400 })
  }

  try {
    const videoDir = path.join("/tmp", "magoo-videos")
    const videoPath = path.join(videoDir, `${videoId}_final.mp4`)

    // Security: ensure the path is within the video directory
    const resolvedPath = path.resolve(videoPath)
    const resolvedDir = path.resolve(videoDir)
    if (!resolvedPath.startsWith(resolvedDir)) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 403 })
    }

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
