// Exchanges the authorization code Google redirects back with for a refresh
// token, then persists it to .env (and the running process) so the pipeline
// picks it up immediately, without requiring a manual copy/paste + restart.

import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import fs from "fs"
import path from "path"

const ENV_PATH = path.join(process.cwd(), ".env")

function upsertEnvVar(key: string, value: string): void {
  const contents = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf-8") : ""
  const line = `${key}=${value}`
  const pattern = new RegExp(`^${key}=.*$`, "m")

  const updated = pattern.test(contents)
    ? contents.replace(pattern, line)
    : contents.replace(/\n?$/, "\n") + line + "\n"

  fs.writeFileSync(ENV_PATH, updated)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const oauthError = searchParams.get("error")

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/?youtube_error=${encodeURIComponent(oauthError)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?youtube_error=missing_authorization_code", request.url)
    )
  }

  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL("/?youtube_error=missing_client_credentials", request.url)
    )
  }

  const redirectUri = new URL("/api/youtube/callback", request.url).toString()
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    redirectUri
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      // Google only issues a refresh token on the first consent for a given
      // client+account; a stale prior grant silently omits it on retries.
      return NextResponse.redirect(
        new URL("/?youtube_error=no_refresh_token", request.url)
      )
    }

    upsertEnvVar("YOUTUBE_REFRESH_TOKEN", tokens.refresh_token)
    process.env.YOUTUBE_REFRESH_TOKEN = tokens.refresh_token

    return NextResponse.redirect(new URL("/?youtube=connected", request.url))
  } catch (error) {
    console.error("YouTube OAuth callback error:", error)
    return NextResponse.redirect(new URL("/?youtube_error=token_exchange_failed", request.url))
  }
}
