import { NextRequest, NextResponse } from "next/server"
import { generateVideo } from "@/lib/video-generator"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const isMockMode = process.env.MAGOO_MOCK_MODE === "true"
    if (!isMockMode && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      )
    }

    const result = await generateVideo({
      prompt: prompt.trim(),
      duration: 60,
      width: 1920,
      height: 1080,
    })

    if (result.status === "failed") {
      return NextResponse.json(
        { error: "Failed to generate video" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      videoId: result.videoId,
      status: result.status,
      message:
        result.status === "completed"
          ? "Video generated successfully!"
          : "Video generation in progress...",
      videoPath: result.videoPath,
      descriptions: {
        visual: result.visualDescription.substring(0, 500) + "...",
        audio: result.audioDescription.substring(0, 500) + "...",
      },
    })
  } catch (error) {
    console.error("Generation error:", error)
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    )
  }
}
