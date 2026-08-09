// Ties the pipeline together: user-provided Kling video -> loop to a
// multi-hour screensaver-length file -> optional YouTube upload.
// Runs as a fire-and-forget background job (see startJob) since the whole
// thing can take from minutes to well over an hour and can't run inside a
// single HTTP request/serverless function invocation.

import path from "path"
import { createJob, updateJob, generateJobId } from "./job-store"
import { saveUploadedVideo } from "./video-source"
import { loopVideoToDuration } from "./video-looper"
import { isYouTubeConfigured, uploadToYouTube } from "./youtube-uploader"

const LOOP_TARGET_SECONDS = Number(process.env.LOOP_TARGET_HOURS || 8) * 3600

export interface StartJobOptions {
  uploadedVideo: File
}

export async function startJob(options: StartJobOptions): Promise<string> {
  const jobId = generateJobId()
  createJob(jobId, {})

  // Not awaited: the API route returns jobId to the client immediately and
  // the frontend polls /api/jobs/[jobId] for progress while this continues
  // running in the background of the long-lived `next dev` / `next start`
  // process.
  runPipeline(jobId, options).catch((error) => {
    updateJob(jobId, {
      stage: "failed",
      error: error instanceof Error ? error.message : String(error),
    })
  })

  return jobId
}

async function runPipeline(jobId: string, options: StartJobOptions): Promise<void> {
  const videoPath = await saveUploadedVideo(jobId, options.uploadedVideo)
  updateJob(jobId, { sourceVideoPath: videoPath })

  updateJob(jobId, { stage: "looping" })
  const loopedPath = path.join("/tmp", "magoo-videos", `${jobId}_final.mp4`)
  await loopVideoToDuration({
    clipPath: videoPath,
    targetDurationSeconds: LOOP_TARGET_SECONDS,
    outputPath: loopedPath,
  })
  updateJob(jobId, { loopedVideoPath: loopedPath })

  if (isYouTubeConfigured()) {
    updateJob(jobId, { stage: "youtube_upload" })
    const { videoId, url } = await uploadToYouTube({
      filePath: loopedPath,
      title: "Magoo ambient video",
      description: "Ambient video looped for extended playback",
    })
    updateJob(jobId, { youtubeVideoId: videoId, youtubeUrl: url })
  }

  updateJob(jobId, { stage: "completed" })
}
