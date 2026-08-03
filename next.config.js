/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Without this, Next.js's server bundler rewrites ffmpeg-static's binary
  // path into a .next/server/vendor-chunks/ path that doesn't actually
  // contain the binary, causing spawn ENOENT at runtime.
  serverExternalPackages: ["ffmpeg-static"],
}

module.exports = nextConfig
