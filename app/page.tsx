"use client"

import { useState } from "react"

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    setStatus(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) throw new Error("Generation failed")
      const data = await response.json()
      setStatus(`Video generated: ${data.videoId}`)
      setPrompt("")
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Magoo</h1>
        <p style={styles.subtitle}>AI-generated ambient looping videos</p>
      </header>

      <section style={styles.content}>
        <div style={styles.card}>
          <h2>Create a Video</h2>
          <p style={styles.description}>
            Describe the ambient scene you'd like to generate. Magoo will create a beautiful
            looping video with matching music.
          </p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Soft ocean waves washing onto a sandy beach at sunset, with gentle light reflections'"
              style={styles.textarea}
              disabled={isLoading}
            />
            <button
              type="submit"
              style={{
                ...styles.button,
                opacity: isLoading || !prompt.trim() ? 0.6 : 1,
              }}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? "Generating..." : "Generate Video"}
            </button>
          </form>

          {status && (
            <div
              style={{
                ...styles.status,
                backgroundColor: status.startsWith("Error") ? "#7f1d1d" : "#1e3a1f",
              }}
            >
              {status}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2>What is Magoo?</h2>
          <p style={styles.description}>
            Magoo generates beautiful, looping ambient videos perfect for relaxation, focus,
            or background ambience. Each video features procedurally generated visuals with
            AI-composed music.
          </p>
          <ul style={styles.list}>
            <li>✨ AI-generated visuals</li>
            <li>🎵 Ambient music composition</li>
            <li>♾️ Seamless looping</li>
            <li>🎬 Direct YouTube export</li>
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
    textAlign: "center",
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
