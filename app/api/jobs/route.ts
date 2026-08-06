import { NextRequest, NextResponse } from "next/server"
import { startJob } from "@/lib/pipeline-orchestrator"

const MAX_PROMPT_LENGTH = 2000
const MAX_IMAGE_BYTES = 20 * 1024 * 1024 // 20MB

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const promptValue = form.get("prompt")
    const prompt = typeof promptValue === "string" ? promptValue.trim() : ""
    const imageValue = form.get("image")
    const uploadedImage = imageValue instanceof File && imageValue.size > 0 ? imageValue : undefined

    if (!prompt && !uploadedImage) {
      return NextResponse.json(
        { error: "Provide a prompt, an image, or both" },
        { status: 400 }
      )
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or less` },
        { status: 400 }
      )
    }

    if (uploadedImage && uploadedImage.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image must be 20MB or smaller" },
        { status: 400 }
      )
    }

    if (!uploadedImage && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured (required to generate an image from a prompt)" },
        { status: 500 }
      )
    }

    const jobId = await startJob({ prompt, uploadedImage })

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error("Job creation error:", error)
    return NextResponse.json({ error: "Failed to start job" }, { status: 500 })
  }
}
