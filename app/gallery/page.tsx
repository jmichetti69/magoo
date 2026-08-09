"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface VideoItem {
  videoId: string
  fileName: string
  fileSize: number
  createdAt: number
}

export default function Gallery() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch("/api/history")
        const data = await response.json()
        setVideos(data.videos || [])
      } catch (error) {
        console.error("Failed to fetch videos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideos()
  }, [])

  const handleDelete = async (videoId: string) => {
    if (!confirm("Delete this video? This can't be undone.")) return

    setDeletingId(videoId)
    try {
      const response = await fetch(`/api/download?videoId=${encodeURIComponent(videoId)}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete video")
      }
      setVideos((prev) => prev.filter((v) => v.videoId !== videoId))
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete video")
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = (bytes / (1024 * 1024)).toFixed(1)
    return `${mb} MB`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Gallery</h1>
        <Link href="/" style={styles.backLink}>
          ← Back to create
        </Link>
      </header>

      <main style={styles.main}>
        {isLoading ? (
          <p style={styles.message}>Loading...</p>
        ) : videos.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.message}>No videos yet</p>
            <p style={styles.submessage}>Create your first video to get started.</p>
            <Link href="/" style={styles.createLink}>
              Create a video
            </Link>
          </div>
        ) : (
          <div style={styles.grid}>
            {videos.map((video) => (
              <div key={video.videoId} style={styles.videoCard}>
                <video
                  controls
                  loop
                  style={styles.videoThumbnail}
                  src={`/api/download?videoId=${encodeURIComponent(video.videoId)}`}
                />
                <div style={styles.videoInfo}>
                  <p style={styles.videoId}>{video.videoId}</p>
                  <p style={styles.videoMeta}>{formatFileSize(video.fileSize)}</p>
                  <p style={styles.videoMeta}>{formatDate(video.createdAt)}</p>
                  <div style={styles.actionRow}>
                    <a
                      href={`/api/download?videoId=${encodeURIComponent(video.videoId)}`}
                      download
                      style={styles.downloadBtn}
                    >
                      Download
                    </a>
                    <button
                      onClick={() => handleDelete(video.videoId)}
                      disabled={deletingId === video.videoId}
                      style={{
                        ...styles.deleteBtn,
                        opacity: deletingId === video.videoId ? 0.6 : 1,
                      }}
                    >
                      {deletingId === video.videoId ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "#e2e8f0",
    padding: "2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    maxWidth: "1200px",
    margin: "0 auto 2rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "900",
    background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  backLink: {
    color: "#93c5fd",
    textDecoration: "none",
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(147, 197, 253, 0.3)",
    fontSize: "0.9rem",
  },
  main: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  message: {
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: "1.1rem",
  },
  submessage: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: "0.5rem",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 2rem",
  },
  createLink: {
    display: "inline-block",
    marginTop: "1rem",
    padding: "0.75rem 1.5rem",
    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
    color: "#ffffff",
    borderRadius: "0.5rem",
    fontWeight: "600",
    textDecoration: "none",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1.5rem",
  },
  videoCard: {
    background: "rgba(30, 41, 59, 0.8)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "1rem",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  },
  videoThumbnail: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
  },
  videoInfo: {
    padding: "1rem",
  },
  videoId: {
    fontSize: "0.85rem",
    color: "#94a3b8",
    margin: "0 0 0.5rem",
    wordBreak: "break-all",
  },
  videoMeta: {
    fontSize: "0.8rem",
    color: "#64748b",
    margin: "0.25rem 0",
  },
  actionRow: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.75rem",
  },
  downloadBtn: {
    flex: 1,
    textAlign: "center",
    padding: "0.5rem 1rem",
    background: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.4)",
    borderRadius: "0.5rem",
    color: "#93c5fd",
    fontSize: "0.85rem",
    fontWeight: "600",
    textDecoration: "none",
  },
  deleteBtn: {
    flex: 1,
    textAlign: "center",
    padding: "0.5rem 1rem",
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "0.5rem",
    color: "#fca5a5",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
}
