// Ties the full pipeline together: still image -> Kling image-to-video ->
// loop to a multi-hour screensaver-length file -> optional YouTube upload.
// Runs as a fire-and-forget background job (see startJob) since the whole
// thing can take from minutes to well over an hour and can't run inside a
// single HTTP request/serverless function invocation.

import path from "path"
import { createJob, updateJob, generateJobId } from "./job-store"
import { generateImage, saveUploadedImage } from "./image-source"
import { submitImageToVideo, waitForCompletion, downloadClip } from "./kling-client"
import { loopVideoToDuration } from "./video-looper"
import { isYouTubeConfigured, uploadToYouTube } from "./youtube-uploader"

const CLIP_DURATION_SECONDS: 5 | 10 = 10
const LOOP_TARGET_SECONDS = Number(process.env.LOOP_TARGET_HOURS || 8) * 3600

export interface StartJobOptions {
  prompt: string
  uploadedImage?: File
}

export async function startJob(options: StartJobOptions): Promise<string> {
  const jobId = generateJobId()
  createJob(jobId, {
    prompt: options.prompt,
    imageSource: options.uploadedImage ? "uploaded" : "generated",
  })

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
  updateJob(jobId, { stage: "image" })
  const imagePath = options.uploadedImage
    ? await saveUploadedImage(jobId, options.uploadedImage)
    : await generateImage(jobId, options.prompt)
  updateJob(jobId, { imagePath })

  updateJob(jobId, { stage: "kling_submit" })
  const taskId = await submitImageToVideo({
    imagePath,
    prompt: options.prompt,
    durationSeconds: CLIP_DURATION_SECONDS,
    withSound: true,
  })
  updateJob(jobId, { klingTaskId: taskId, stage: "kling_poll" })

  const videoUrl = await waitForCompletion(taskId)
  const clipPath = await downloadClip(jobId, videoUrl)
  updateJob(jobId, { clipPath, clipDurationSeconds: CLIP_DURATION_SECONDS })

  updateJob(jobId, { stage: "looping" })
  const loopedPath = path.join("/tmp", "magoo-videos", `${jobId}_final.mp4`)
  await loopVideoToDuration({
    clipPath,
    clipDurationSeconds: CLIP_DURATION_SECONDS,
    targetDurationSeconds: LOOP_TARGET_SECONDS,
    outputPath: loopedPath,
  })
  updateJob(jobId, { loopedVideoPath: loopedPath })

  if (isYouTubeConfigured()) {
    updateJob(jobId, { stage: "youtube_upload" })
    const { videoId, url } = await uploadToYouTube({
      filePath: loopedPath,
      title: options.prompt.slice(0, 100) || "Magoo ambient video",
      description: options.prompt,
    })
    updateJob(jobId, { youtubeVideoId: videoId, youtubeUrl: url })
  }

  updateJob(jobId, { stage: "completed" })
}
