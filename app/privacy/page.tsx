export default function Privacy() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Magoo Privacy Policy</h1>
        <p style={styles.updated}>Last updated: 2026</p>

        <p>
          Magoo is a personal-use tool that loops short ambient videos into extended-playback
          versions and, optionally, uploads them to YouTube on behalf of the person using it. It
          is not a public product or service — it is operated for a single individual&apos;s own
          YouTube channel.
        </p>

        <h2 style={styles.heading}>What data Magoo handles</h2>
        <p>
          When you use Magoo, you upload a video file that Magoo processes (looped for extended
          playback) and stores temporarily on the server that runs it. Magoo does not share,
          sell, or transmit your video files to any third party other than YouTube, and only when
          you have connected your YouTube account and chosen to upload.
        </p>

        <h2 style={styles.heading}>Google/YouTube data access</h2>
        <p>
          Magoo requests exactly one Google API scope:{" "}
          <code>https://www.googleapis.com/auth/youtube.upload</code>. This permission is used
          solely to upload the videos you process in Magoo to your own YouTube channel, as{" "}
          <strong>Unlisted</strong> by default so nothing is published without your review. Magoo
          does not read, modify, or delete any other content on your YouTube channel or Google
          account, and does not access any other Google data.
        </p>

        <h2 style={styles.heading}>Data retention</h2>
        <p>
          Uploaded and processed video files are stored temporarily on the server used to run
          Magoo, solely for the purpose of completing the looping and upload process, and may be
          deleted at any time by the person operating Magoo.
        </p>

        <h2 style={styles.heading}>Data sharing</h2>
        <p>
          Magoo does not sell, rent, or share your data with third parties. The only external
          service Magoo communicates with is the YouTube Data API, used exclusively to upload
          videos as described above.
        </p>

        <h2 style={styles.heading}>Contact</h2>
        <p>
          Questions about this policy or Magoo&apos;s use of your data can be sent to{" "}
          <a href="mailto:jmichetti69@gmail.com" style={styles.link}>
            jmichetti69@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "#e2e8f0",
    padding: "3rem 2rem",
  },
  content: {
    maxWidth: "720px",
    margin: "0 auto",
    lineHeight: 1.7,
  },
  title: {
    fontSize: "2rem",
    fontWeight: "900",
    marginBottom: "0.25rem",
  },
  updated: {
    color: "#94a3b8",
    marginBottom: "2rem",
    fontSize: "0.9rem",
  },
  heading: {
    marginTop: "2rem",
    marginBottom: "0.5rem",
    color: "#93c5fd",
  },
  link: {
    color: "#93c5fd",
  },
}
