// Persistent job tracking for the async image -> Kling -> loop -> YouTube
// pipeline. The old text-prompt pipeline could infer status by checking
// which files existed in /tmp because it had exactly two states (rendering,
// done). This pipeline has several long-running stages and real failure
// modes per stage, so each job gets an explicit record instead.

import fs from "fs"
import path from "path"

export type JobStage =
  | "queued"
  | "looping"
  | "youtube_upload"
  | "completed"
  | "failed"

export interface JobRecord {
  jobId: string
  stage: JobStage
  createdAt: number
  updatedAt: number
  sourceVideoPath?: string
  clipDurationSeconds?: number
  loopedVideoPath?: string
  youtubeVideoId?: string
  youtubeUrl?: string
  error?: string
}

const JOBS_DIR = path.join("/tmp", "magoo-jobs")

function ensureDir(): void {
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true })
  }
}

function jobPath(jobId: string): string {
  return path.join(JOBS_DIR, `${jobId}.json`)
}

export function createJob(
  jobId: string,
  initial: Partial<JobRecord>
): JobRecord {
  ensureDir()
  const now = Date.now()
  const record: JobRecord = {
    jobId,
    stage: "queued",
    createdAt: now,
    updatedAt: now,
    ...initial,
  }
  fs.writeFileSync(jobPath(jobId), JSON.stringify(record, null, 2))
  return record
}

export function getJob(jobId: string): JobRecord | null {
  const p = jobPath(jobId)
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, "utf-8")) as JobRecord
}

export function updateJob(jobId: string, patch: Partial<JobRecord>): JobRecord {
  const existing = getJob(jobId)
  if (!existing) {
    throw new Error(`Job ${jobId} not found`)
  }
  const updated: JobRecord = { ...existing, ...patch, updatedAt: Date.now() }
  fs.writeFileSync(jobPath(jobId), JSON.stringify(updated, null, 2))
  return updated
}

export function listJobs(): JobRecord[] {
  ensureDir()
  return fs
    .readdirSync(JOBS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(JOBS_DIR, f), "utf-8")) as JobRecord)
    .sort((a, b) => b.createdAt - a.createdAt)
}

// Reuses the "video_" prefix (not "job_") so the existing /api/download,
// /api/history, and /api/status routes — which validate IDs against
// ^video_\d+_[a-z0-9]+$ and locate files by ID alone — keep working
// unmodified once a job's looped output lands in /tmp/magoo-videos.
export function generateJobId(): string {
  return `video_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
