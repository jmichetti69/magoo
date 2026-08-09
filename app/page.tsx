"use client"

import { useEffect, useRef, useState } from "react"

interface JobRecord {
  jobId: string
  stage: string
  error?: string
  youtubeUrl?: string
}

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued...",
  looping: "Looping video for extended playback...",
  youtube_upload: "Uploading to YouTube...",
  completed: "Done!",
  failed: "Failed",
}

const POLL_INTERVAL_MS = 4000

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [job, setJob] = useState<JobRecord | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [])

  const pollJob = (jobId: string) => {
    if (pollTimer.current) clearInterval(pollTimer.current)
    pollTimer.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Failed to check job status")

        setJob(data)
        if (data.stage === "completed" || data.stage === "failed") {
          if (pollTimer.current) clearInterval(pollTimer.current)
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unknown error")
        if (pollTimer.current) clearInterval(pollTimer.current)
      }
    }, POLL_INTERVAL_MS)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setJob(null)

    try {
      const formData = new FormData()
      formData.append("video", videoFile)

      const response = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to start generation")

      setJob({ jobId: data.jobId, stage: "queued" })
      pollJob(data.jobId)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isRunning = Boolean(job) && job?.stage !== "completed" && job?.stage !== "failed"

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Magoo</h1>
          <p style={styles.subtitle}>AI-generated ambient looping videos</p>
        </div>
        <a href="/gallery" style={styles.galleryLink}>
          Gallery
        </a>
      </header>

      <section style={styles.content}>
        <div style={styles.card}>
          <h2>Create a Video</h2>
          <p style={styles.description}>
            Upload a video from Kling AI. Magoo will loop it for extended playback and upload it to YouTube.
          </p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.fileLabel}>
              Kling video file (MP4 or WebM)
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                disabled={isSubmitting || isRunning}
                style={styles.fileInput}
              />
            </label>
            <button
              type="submit"
              style={{
                ...styles.button,
                opacity: isSubmitting || isRunning || !videoFile ? 0.6 : 1,
              }}
              disabled={isSubmitting || isRunning || !videoFile}
            >
              {isSubmitting ? "Starting..." : isRunning ? "Processing..." : "Process Video"}
            </button>
          </form>

          {errorMessage && <div style={{ ...styles.status, backgroundColor: "#7f1d1d" }}>{errorMessage}</div>}

          {job && (
            <div
              style={{
                ...styles.status,
                backgroundColor: job.stage === "failed" ? "#7f1d1d" : "#1e3a1f",
              }}
            >
              {job.stage === "failed"
                ? `Failed: ${job.error || "unknown error"}`
                : STAGE_LABELS[job.stage] || job.stage}
            </div>
          )}

          {job?.stage === "completed" && (
            <div style={styles.videoPreview}>
              <video
                controls
                loop
                style={styles.video}
                src={`/api/download?videoId=${encodeURIComponent(job.jobId)}`}
              />
              <a
                href={`/api/download?videoId=${encodeURIComponent(job.jobId)}`}
                download
                style={styles.downloadLink}
              >
                Download video
              </a>
              {job.youtubeUrl && (
                <a href={job.youtubeUrl} target="_blank" rel="noreferrer" style={styles.downloadLink}>
                  View on YouTube
                </a>
              )}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2>What is Magoo?</h2>
          <p style={styles.description}>
            Magoo processes Kling AI videos and loops them for extended playback—perfect for relaxation, focus, or background ambience. Create your Kling video in the Kling app, download it, then upload it here.
          </p>
          <ul style={styles.list}>
            <li>🎬 Create video in Kling AI (kling.ai)</li>
            <li>💾 Download the MP4</li>
            <li>📤 Upload to Magoo</li>
            <li>♾️ Looped for hours of seamless playback</li>
            <li>📺 Direct YouTube upload</li>
          </ul>
        </div>
      </section>

      <footer style={styles.footer}>
        <p>Magoo © 2026</p>
      </footer>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "3rem",
  },
  title: {
    fontSize: "3.5rem",
    fontWeight: "900",
    background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "0.5rem",
  },
  subtitle: {
    fontSize: "1.25rem",
    color: "#94a3b8",
  },
  galleryLink: {
    padding: "0.75rem 1.5rem",
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: "0.5rem",
    color: "#93c5fd",
    textDecoration: "none",
    fontWeight: "600",
  },
  content: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2rem",
    maxWidth: "1200px",
    margin: "0 auto",
    flex: 1,
  },
  card: {
    background: "rgba(30, 41, 59, 0.8)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "1rem",
    padding: "2rem",
    backdropFilter: "blur(10px)",
  },
  description: {
    color: "#cbd5e1",
    marginBottom: "1.5rem",
    lineHeight: 1.6,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  textarea: {
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: "0.5rem",
    padding: "1rem",
    minHeight: "120px",
    resize: "vertical",
    color: "#e2e8f0",
  },
  fileLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    fontSize: "0.85rem",
    color: "#94a3b8",
  },
  fileInput: {
    color: "#e2e8f0",
  },
  button: {
    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
    color: "#ffffff",
    padding: "0.75rem 1.5rem",
    borderRadius: "0.5rem",
    fontWeight: "600",
    transition: "transform 0.2s",
  },
  status: {
    padding: "1rem",
    borderRadius: "0.5rem",
    marginTop: "1rem",
    fontSize: "0.9rem",
  },
  videoPreview: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  video: {
    width: "100%",
    borderRadius: "0.5rem",
    border: "1px solid rgba(148, 163, 184, 0.3)",
  },
  downloadLink: {
    textAlign: "center",
    background: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.4)",
    borderRadius: "0.5rem",
    padding: "0.6rem",
    fontWeight: "600",
    color: "#93c5fd",
  },
  list: {
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  footer: {
    textAlign: "center",
    marginTop: "2rem",
    paddingTop: "2rem",
    borderTop: "1px solid rgba(148, 163, 184, 0.1)",
    color: "#64748b",
    fontSize: "0.9rem",
  },
}
