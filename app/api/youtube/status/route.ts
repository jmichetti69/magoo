import { NextResponse } from "next/server"
import { isYouTubeConfigured } from "@/lib/youtube-uploader"

export async function GET() {
  return NextResponse.json({ configured: isYouTubeConfigured() })
}
