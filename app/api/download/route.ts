import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { Readable } from "stream"

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

    const fileSize = fs.statSync(videoPath).size
    const fileName = `magoo-${videoId}.mp4`
    // Content-Disposition is left as "inline" here: the <video> player needs
    // inline playback, and the frontend's download link still forces a save
    // via its own `download` attribute regardless of this header.
    const baseHeaders = {
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Content-Disposition": `inline; filename="${fileName}"`,
    }

    // Safari (and most browsers) require Range request support to play
    // video via <video> tags — without it, playback can silently fail even
    // though a plain download of the same file works fine.
    const range = request.headers.get("range")
    if (range) {
      const match = range.match(/^bytes=(\d+)-(\d*)$/)
      if (!match) {
        return NextResponse.json({ error: "Invalid range" }, { status: 416 })
      }

      const start = parseInt(match[1], 10)
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1

      if (start >= fileSize || end >= fileSize || start > end) {
        return NextResponse.json({ error: "Invalid range" }, { status: 416 })
      }

      const stream = fs.createReadStream(videoPath, { start, end })

      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": String(end - start + 1),
        },
      })
    }

    const stream = fs.createReadStream(videoPath)

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": String(fileSize),
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
