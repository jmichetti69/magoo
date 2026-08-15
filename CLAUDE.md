# Magoo

> AI-powered ambient video generator for relaxation and focus.

## About
Magoo generates beautiful looping videos for YouTube "screensaver"-style extended playback. Built for Joe's sister (Adelle). Kling API billing was too complex/expensive, so v2 now uses a simpler manual workflow: Adelle creates the video in Kling's free consumer app, downloads it as an MP4, and uploads it to Magoo for looping + YouTube upload.

## Current status (Fri Aug 09 2026)
- ✅ **v1 pipeline (deprecated)**: Claude → ffmpeg procedural visuals → ffmpeg sine-wave audio → composition. Fully working end-to-end (real Claude API confirmed), but visual/audio quality judged too subtle/static after two rounds of parameter tuning — kept in the repo (`/api/generate`, `lib/video-generator.ts`) but no longer the primary path.
- 🔄 **v2 pipeline (ready to test)**: Pre-made Kling video (downloaded by Adelle) → ffmpeg loop to ~8 hours → YouTube auto-upload. Simplified to remove Kling API dependency. Code complete and ready for testing.
- ✅ **Job-based async architecture**: `lib/job-store.ts` tracks job state (looping → youtube_upload → completed/failed) in `/tmp/magoo-jobs/<jobId>.json`.
- ⚠️ **Vercel deployment gap (known, deferred)**: building an 8-hour file and YouTube upload can exceed Vercel's serverless timeout. Pipeline currently targets **local `npm run dev` only** — production deployment needs a real job queue/worker (e.g. Inngest/QStash) as a separate follow-up task.

## Current state
- v2 pipeline simplified (Kling API → manual step); code complete and untested end-to-end (ready for Joe to test with Adelle).
- No Kling API blockers: Adelle uses her free Kling consumer subscription to generate videos, downloads them, and uploads to Magoo.
- YouTube OAuth still needed for upload; optional (pipeline completes with a local download link if not configured).
- **Immediate next step**: test the full flow locally → iterate if needed.

## Tech Stack (v2)
- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API routes + background job pipeline (not serverless-request-scoped)
- **Video Input**: User uploads pre-made Kling video (MP4/WebM)
- **Looping**: ffmpeg `-stream_loop` stream-copy with duration auto-detection to reach `LOOP_TARGET_HOURS` (default 8h)
- **Upload**: YouTube Data API v3 (OAuth refresh token, resumable upload via `googleapis`), gated behind config — pipeline still completes with a local download link if unset
- **Hosting**: local dev for now; Vercel deployment deferred (see status above)

## Architecture (v2)
```
User Input (pre-made Kling video MP4)
  → POST /api/jobs (returns jobId immediately, kicks off background job)
  → lib/video-source.ts: save uploaded video
  → lib/video-looper.ts: ffmpeg -stream_loop to ~8 hours (auto-detects source duration)
  → lib/youtube-uploader.ts: resumable upload (skipped if not configured)
  → lib/job-store.ts: stage/status tracked throughout, polled via GET /api/jobs/[jobId]
```

## Key Decisions
- **v1 → v2 pivot**: after two tuning rounds, flat ffmpeg gradients + sine-wave audio were judged an inherent quality ceiling, not fixable by parameter tuning.
- **Manual Kling step**: Kling API billing/approvals were too expensive and complex. Adelle already uses Kling's free consumer app successfully — leveraging that instead of building an API integration eliminates cost/complexity and ships faster.
- **Job-store + background pipeline over synchronous request/response**: looping to 8h and YouTube upload can take minutes, incompatible with a single HTTP request/serverless timeout.
- **YouTube privacy default: `unlisted`** — nothing goes live on her channel without her reviewing it in YouTube Studio first.

## Blockers / Waiting On
- ✅ **Kling dependency**: removed by pivoting to manual Kling workflow.
- **YouTube OAuth** (optional for MVP): in progress. Adelle started creating the Google Cloud OAuth client herself but got stuck — Google rejects raw IP addresses (e.g. the Mac mini's Tailscale IP) as an "Authorized redirect URI," and only accepts `localhost`/`127.0.0.1` (over plain HTTP) or a real domain (HTTPS required). **Decision: abandoned that in-progress attempt — Joe will set up the Google Cloud project + OAuth client himself** (as the app operator) rather than Adelle, then just hand Adelle the one-time "log in and click Allow" consent step once it's wired up. Pipeline still completes with a local download link if unset, so this isn't a hard blocker for testing the rest of the flow.
  - Once Joe has it: set redirect URI to `http://localhost:<port>/api/youtube/callback`, add the channel-owner Google account as a Test User on the OAuth consent screen (required — the upload scope is a restricted scope, and the app isn't going through Google's full verification review), get `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET` into `.env`, then use the in-app "Connect YouTube" button (`/api/youtube/authorize` → `/api/youtube/callback`) to mint the refresh token automatically instead of a manual token exchange.
  - Because the app currently runs on a separate Mac mini reachable only via Tailscale IP (not a real hostname), the one-time OAuth step needs an SSH tunnel (`ssh -L <port>:localhost:<port> user@<tailscale-ip>`) so the browser's address bar genuinely says `localhost` and matches the registered redirect URI.

## Testing / Local Dev
1. `npm install` — installs bundled dependencies
2. `cp .env.example .env` (no API keys required for v2; optionally set `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN` for auto-upload)
3. `npm run dev` — starts the dev server on http://localhost:3000
4. Submit the form with a Kling video file (MP4/WebM) — polls job status until the looped video (and YouTube link, if configured) is ready
5. `/gallery` page shows all previously generated videos (v2 outputs land in `/tmp/magoo-videos` as `<jobId>_final.mp4`)
6. v1 pipeline (`/api/generate`, procedural ffmpeg) still works standalone if needed

## Deployment to Vercel
**Currently blocked for v2** — see "Vercel deployment gap" above. v1's synchronous pipeline still deploys fine (steps below apply to v1 only until v2 gets a queue/worker rework):
1. `git push` to your repo (or `vercel` CLI for instant push)
2. Vercel auto-detects Next.js and deploys
3. Set environment variables in Vercel dashboard or `.env.production.local`
4. API functions get a 5-minute timeout (vercel.json) — sufficient for v1, not v2

## Files
- `app/page.tsx` — landing page: video file upload form, polls job status, shows result
- `app/gallery/page.tsx` — gallery showing previously generated videos
- `app/api/jobs/route.ts` — **v2** job creation endpoint (multipart: video file), returns jobId
- `app/api/jobs/[jobId]/route.ts` — **v2** job status polling endpoint
- `app/api/generate/route.ts` — **v1** synchronous generation endpoint (deprecated but functional)
- `app/api/history/route.ts` / `app/api/status/route.ts` / `app/api/download/route.ts` — shared by v1 and v2 (v2 final files use the same `video_<id>_final.mp4` naming so these keep working unmodified)
- `lib/job-store.ts` — **v2** job persistence (looping → youtube_upload → completed)
- `lib/video-source.ts` — **v2** video file upload handling
- `lib/video-looper.ts` — **v2** ffmpeg stream-copy looping to target duration, auto-detects source duration
- `lib/youtube-uploader.ts` — **v2** YouTube resumable upload, gated behind config
- `lib/pipeline-orchestrator.ts` — **v2** ties the above together as a background job
- `lib/video-generator.ts` / `lib/ffmpeg-renderer.ts` / `lib/audio-generator.ts` — **v1** procedural pipeline (deprecated)
- `vercel.json` — 5-minute timeout for serverless functions (v1-sufficient only)
- `package.json` — includes ffmpeg-static and googleapis
