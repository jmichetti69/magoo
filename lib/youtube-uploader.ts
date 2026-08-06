// Uploads the final looped video to YouTube via a resumable upload, using a
// pre-authorized refresh token for the target channel. Gated behind
// isYouTubeConfigured() so the rest of the pipeline still completes (with a
// local download link) while YouTube API access is still being set up.

import fs from "fs"
import { google } from "googleapis"

export interface YouTubeUploadOptions {
  filePath: string
  title: string
  description?: string
}

export interface YouTubeUploadResult {
  videoId: string
  url: string
}

export function isYouTubeConfigured(): boolean {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID &&
      process.env.YOUTUBE_CLIENT_SECRET &&
      process.env.YOUTUBE_REFRESH_TOKEN
  )
}

export async function uploadToYouTube(
  options: YouTubeUploadOptions
): Promise<YouTubeUploadResult> {
  if (!isYouTubeConfigured()) {
    throw new Error(
      "YouTube API not configured (missing YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET/YOUTUBE_REFRESH_TOKEN)"
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN })

  const youtube = google.youtube({ version: "v3", auth: oauth2Client })

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: options.title,
        description: options.description || "",
      },
      status: {
        // Unlisted by default so nothing goes live on her channel without
        // her reviewing it first; she can change visibility in YouTube Studio.
        privacyStatus: "unlisted",
      },
    },
    media: {
      body: fs.createReadStream(options.filePath),
    },
  })

  const videoId = response.data.id
  if (!videoId) {
    throw new Error("YouTube upload did not return a video ID")
  }

  return { videoId, url: `https://youtu.be/${videoId}` }
}
