import { NextRequest, NextResponse } from "next/server"
import { startJob } from "@/lib/pipeline-orchestrator"

const MAX_VIDEO_BYTES = 500 * 1024 * 1024 // 500MB

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const videoValue = form.get("video")
    const uploadedVideo = videoValue instanceof File && videoValue.size > 0 ? videoValue : undefined

    if (!uploadedVideo) {
      return NextResponse.json(
        { error: "Video file is required" },
        { status: 400 }
      )
    }

    if (uploadedVideo.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: "Video must be 500MB or smaller" },
        { status: 400 }
      )
    }

    const jobId = await startJob({ uploadedVideo })

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error("Job creation error:", error)
    return NextResponse.json({ error: "Failed to start job" }, { status: 500 })
  }
}
