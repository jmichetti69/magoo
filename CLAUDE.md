# Magoo

> AI-powered ambient video generator for relaxation and focus.

## About
Magoo generates beautiful looping videos for YouTube "screensaver"-style extended playback. Built for Joe's sister (Adelle). v1's procedural ffmpeg visuals (gradients/noise/sine-wave audio) were tested twice and found too subtle/flat to perceive even after tuning — the project has moved to v2: a real image-to-video AI pipeline.

## Current status (Wed Aug 05 2026)
- ✅ **v1 pipeline (deprecated)**: Claude → ffmpeg procedural visuals → ffmpeg sine-wave audio → composition. Fully working end-to-end (real Claude API confirmed), but visual/audio quality judged too subtle/static after two rounds of parameter tuning — kept in the repo (`/api/generate`, `lib/video-generator.ts`) but no longer the primary path.
- 🔄 **v2 pipeline (in progress)**: still photo (uploaded or generated via OpenAI image API) → Kling AI image-to-video (with native audio) → ffmpeg loop to ~8 hours → YouTube auto-upload. Code scaffolding built; **not yet tested end-to-end** — blocked on the Kling API key (pending) and OpenAI/YouTube credentials (see Blockers below).
- ✅ **Job-based async architecture**: new `lib/job-store.ts` tracks multi-stage job state (image → kling_submit → kling_poll → looping → youtube_upload → completed/failed) in `/tmp/magoo-jobs/<jobId>.json`, since the old "infer status from which files exist" pattern only worked for v1's single-stage synchronous flow.
- ⚠️ **Vercel deployment gap (known, deferred)**: v2 stages (Kling generation+polling, building an 8-hour file, YouTube upload) can run far longer than Vercel's serverless function limit (5 min configured in `vercel.json`, ~13 min max even on paid tiers). Pipeline currently targets **local `npm run dev` only** (runs as a background job in the long-lived Node process) — production deployment needs a real job queue/worker (e.g. Inngest/QStash) as a separate follow-up task.

## Current state
- Repo live at github.com/jmichetti69/magoo (pushed via dedicated deploy key `magoo-deploy`); Joe has it cloned and running locally on his MacBook.
- v1 bugs already fixed: ffmpeg-static's binary path broken by Next.js bundling (`serverExternalPackages`), download endpoint lacked HTTP Range support (broke Safari playback), stray duplicate `npm run dev` processes caused a request-storm bug (resolved by killing the port and restarting clean).
- v1 visual/audio tuning: two rounds (wider hue swing/faster cycles/color-contrast fix; tremolo depth + amix normalize fix) both still read as "same, just a different color" / "constant hum" to Joe — concluded this is a ceiling of flat-gradient ffmpeg blends + stacked sine tones, not a tuning problem.
- Joe confirmed his sister actually uses **Sora-in-ChatGPT-style workflow**, but specifically: starts with a still image (from ChatGPT) then animates it in **Kling AI** (paid consumer subscription — does NOT include API access, which is billed separately) using Kling's free built-in background music.
- Since she doesn't have ChatGPT Plus, the image step will use the **OpenAI images API directly** (billed separately from ChatGPT Plus, no subscription required) instead of relying on her ChatGPT account.
- Video length: Kling's API only generates 5-10s clips per call (not a full 60s+ clip) — the "generate once, loop to 8 hours" plan loops that short clip via `ffmpeg -stream_loop -c copy` (fast, no re-encode).

## Tech Stack (v2)
- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API routes + background job pipeline (not serverless-request-scoped)
- **Descriptions**: Anthropic Claude API (unchanged from v1)
- **Image**: OpenAI images API (`gpt-image-1`) for AI-generated starting photo, or direct user upload
- **Video**: Kling AI image-to-video API (single API key used as Bearer token — confirmed live 2026-08-06, not the Access/Secret-key JWT scheme third-party writeups described), includes native audio generation
- **Looping**: ffmpeg `-stream_loop` stream-copy to reach `LOOP_TARGET_HOURS` (default 8h)
- **Upload**: YouTube Data API v3 (OAuth refresh token, resumable upload via `googleapis`), gated behind config — pipeline still completes with a local download link if unset
- **Hosting**: local dev for now; Vercel deployment deferred (see status above)

## Architecture (v2)
```
User Input (prompt and/or uploaded photo)
  → POST /api/jobs (returns jobId immediately, kicks off background job)
  → lib/image-source.ts: OpenAI image gen OR pass through uploaded photo
  → lib/kling-client.ts: submit image to Kling image-to-video, poll until done, download clip
  → lib/video-looper.ts: ffmpeg -stream_loop to ~8 hours
  → lib/youtube-uploader.ts: resumable upload (skipped if not configured)
  → lib/job-store.ts: stage/status tracked throughout, polled via GET /api/jobs/[jobId]
```

## Key Decisions
- **v1 → v2 pivot**: after two tuning rounds, flat ffmpeg gradients + sine-wave audio were judged an inherent quality ceiling, not fixable by parameter tuning — see "v1 visual/audio tuning" above.
- **Kling over other video-gen APIs**: matches the tool Adelle already uses and is comfortable with (rather than introducing an unfamiliar tool like Runway).
- **OpenAI images API over ChatGPT**: API billing is separate from ChatGPT Plus, so no subscription is required — works even though Adelle doesn't have ChatGPT Plus.
- **Kling's `sound` param for audio** instead of a separate music API (Mubert/Stable Audio): Adelle already uses Kling's free background music in the consumer app; API audio quality/fit is unverified until a real key is available.
- **Job-store + background pipeline over synchronous request/response**: v2 stages can take minutes to over an hour combined, incompatible with a single HTTP request/serverless timeout.
- **YouTube privacy default: `unlisted`** — nothing goes live on her channel without her reviewing it in YouTube Studio first.

## Blockers / Waiting On
- **Kling API key**: ✅ obtained (2026-08-06) — single `KLING_API_KEY`, not an Access/Secret pair as originally assumed (see Tech Stack note).
- **OpenAI API key**: obtained; lower priority now since Adelle is uploading her own photos rather than generating them (only needed as a fallback for text-only prompts).
- **YouTube OAuth**: no Google Cloud project yet. Joe sent Adelle setup steps (create project → enable YouTube Data API v3 → configure OAuth consent screen → create OAuth client) — still needs her Client ID/Secret, then a one-time joint authorization to get a refresh token.
- Endpoint paths/response field names in `lib/kling-client.ts` are still unverified against a real call (their docs site blocked automated fetches) — next step once `KLING_API_KEY` is in `.env` is an actual end-to-end test.

## Testing / Local Dev
1. `npm install` — installs bundled dependencies (add `googleapis` via `npm install googleapis` once ready to test YouTube upload)
2. `cp .env.example .env` and fill in `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `KLING_API_KEY`, and (optionally) `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN`
3. `npm run dev` — starts the dev server on http://localhost:3000
4. Submit the form (prompt and/or photo upload) — polls job status until the looped video (and YouTube link, if configured) is ready
5. `/gallery` page shows all previously generated videos (v1 and v2 outputs both land in `/tmp/magoo-videos` as `<jobId>_final.mp4`)
6. v1 pipeline (`/api/generate`, procedural ffmpeg) still works standalone if needed, including `MAGOO_MOCK_MODE=true` for Claude-free testing

## Deployment to Vercel
**Currently blocked for v2** — see "Vercel deployment gap" above. v1's synchronous pipeline still deploys fine (steps below apply to v1 only until v2 gets a queue/worker rework):
1. `git push` to your repo (or `vercel` CLI for instant push)
2. Vercel auto-detects Next.js and deploys
3. Set environment variables in Vercel dashboard or `.env.production.local`
4. API functions get a 5-minute timeout (vercel.json) — sufficient for v1, not v2

## Files
- `app/page.tsx` — landing page: prompt + photo upload form, polls job status, shows result
- `app/gallery/page.tsx` — gallery showing previously generated videos
- `app/api/jobs/route.ts` — **v2** job creation endpoint (multipart: prompt and/or image file), returns jobId
- `app/api/jobs/[jobId]/route.ts` — **v2** job status polling endpoint
- `app/api/generate/route.ts` — **v1** synchronous generation endpoint (deprecated but functional)
- `app/api/history/route.ts` / `app/api/status/route.ts` / `app/api/download/route.ts` — shared by v1 and v2 (v2 final files use the same `video_<id>_final.mp4` naming so these keep working unmodified)
- `lib/job-store.ts` — **v2** multi-stage job persistence
- `lib/image-source.ts` — **v2** OpenAI image generation + upload passthrough
- `lib/kling-client.ts` — **v2** Kling image-to-video submit/poll/download (unverified against live API)
- `lib/video-looper.ts` — **v2** ffmpeg stream-copy looping to target duration
- `lib/youtube-uploader.ts` — **v2** YouTube resumable upload, gated behind config
- `lib/pipeline-orchestrator.ts` — **v2** ties the above together as a background job
- `lib/video-generator.ts` / `lib/ffmpeg-renderer.ts` / `lib/audio-generator.ts` — **v1** procedural pipeline (deprecated)
- `vercel.json` — 5-minute timeout for serverless functions (v1-sufficient only)
- `package.json` — includes ffmpeg-static; `googleapis` needed once YouTube upload is tested
