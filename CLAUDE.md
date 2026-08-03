# Magoo

> AI-powered ambient video generator for relaxation and focus.

## About
Magoo generates beautiful looping videos with procedurally generated visuals + AI-composed ambient music. Built for Joe's sister; v1 uses code-based visuals (ffmpeg + gradients/particles/motion graphics), not real footage or paid video-gen AI.

## Current status (Sun Aug 03 2026)
- ✅ **Project initialized**: Next.js full-stack app (TypeScript)
- ✅ **Full pipeline**: Claude → ffmpeg visual render → audio synthesis → composition
- ✅ **Landing page**: Video request form with preview/download
- ✅ **Gallery page**: View and redownload previously generated videos
- ✅ **Deployment-ready**: ffmpeg-static bundled, Vercel timeout configured, input validation
- ✅ **Mock mode**: Test ffmpeg/audio/compose pipeline without an API key (set MAGOO_MOCK_MODE=true)
- 🔄 **Waiting on**: Sister's Anthropic API key to enable real Claude calls

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API routes
- **AI**: Anthropic Claude API (visual + audio descriptions)
- **Video**: ffmpeg-static (procedurally-generated gradients + grain, bundled with app)
- **Audio**: ffmpeg lavfi (sine drone + pink noise ambient bed)
- **Hosting**: Vercel (serverless, auto-scaling; ffmpeg included via ffmpeg-static npm package)

## Architecture
```
User Input (Web UI)
  → API route (/api/generate)
  → Claude (visual description)
  → Claude (audio description)
  → ffmpeg (render procedural visuals)
  → Audio synthesis (ambient music)
  → Compose final video + audio
  → Return video metadata
```

## Key Decisions
- **Framework**: Next.js (tighter integration than separate frontend/backend, Vercel native)
- **Visuals**: Procedurally generated (gradients + grain via ffmpeg filters, not AI video-gen or real footage) — cheaper, fully automatable
- **Audio**: Simple ambient bed (sine drone + pink noise) generated via ffmpeg lavfi — no dependency on external music libraries or APIs
- **ffmpeg**: Bundled via `ffmpeg-static` npm package, so the app works on Vercel without requiring ffmpeg to be pre-installed
- **Hosting**: Vercel (auto-scaling, serverless; ffmpeg now included via npm)
- **UI**: Landing page + form, gallery/history for redownloading videos; YouTube upload deferred to v2

## Blockers / Waiting On
- Sister's Anthropic API key (not yet received) — she'll use her own account, so API costs bill to her, not Joe. Set `.env` `ANTHROPIC_API_KEY` once she creates the account.
- Sister's style confirmation (abstract motion graphics OK? or does she want something different?)

## Testing / Local Dev
1. `npm install` — installs ffmpeg-static as a bundled dependency
2. `cp .env.example .env` and set `ANTHROPIC_API_KEY=...` (or leave blank and set `MAGOO_MOCK_MODE=true` to test without an API key)
3. `npm run dev` — starts the dev server on http://localhost:3000
4. Form submission will generate a video end-to-end (Claude call optional with mock mode)
5. `/gallery` page shows all previously generated videos

## Deployment to Vercel
1. `git push` to your repo (or `vercel` CLI for instant push)
2. Vercel auto-detects Next.js and deploys
3. Set environment variables in Vercel dashboard or `.env.production.local`
4. API functions get a 5-minute timeout (vercel.json) — sufficient for the full pipeline

## Files
- `app/page.tsx` — landing page + video request form
- `app/gallery/page.tsx` — gallery showing previously generated videos
- `app/api/generate/route.ts` — video generation endpoint (accepts prompt, returns videoId + metadata)
- `app/api/history/route.ts` — list completed videos from filesystem
- `app/api/status/route.ts` — check generation status by videoId
- `app/api/download/route.ts` — download a finished video
- `lib/video-generator.ts` — orchestrates Claude API calls + ffmpeg render + audio + composition
- `lib/ffmpeg-renderer.ts` — procedural visual generation (gradient + grain)
- `lib/audio-generator.ts` — ambient audio synthesis (sine + pink noise)
- `vercel.json` — 5-minute timeout for serverless functions
- `package.json` — includes ffmpeg-static
