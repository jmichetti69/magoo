import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Magoo | AI Ambient Videos",
  description: "Generate beautiful looping ambient videos for relaxation and focus",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
