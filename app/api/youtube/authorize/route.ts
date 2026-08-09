// Starts the one-time YouTube OAuth consent flow. Requires YOUTUBE_CLIENT_ID
// and YOUTUBE_CLIENT_SECRET to already be set (from a Google Cloud OAuth
// client) — this only automates obtaining the refresh token, not creating
// the OAuth client itself.

import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export async function GET(request: NextRequest) {
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    return NextResponse.json(
      {
        error:
          "Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env first (from a Google Cloud OAuth client), then restart the dev server.",
      },
      { status: 400 }
    )
  }

  const redirectUri = new URL("/api/youtube/callback", request.url).toString()

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    redirectUri
  )

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
  })

  return NextResponse.redirect(authUrl)
}
