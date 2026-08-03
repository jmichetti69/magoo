# Magoo

> AI-powered ambient video generator for relaxation and focus.

## About
Magoo generates beautiful looping videos with procedurally generated visuals + AI-composed ambient music. Built for Joe's sister; v1 uses code-based visuals (ffmpeg + gradients/particles/motion graphics), not real footage or paid video-gen AI.

## Current status (Sun Aug 03 2026)
- ✅ **Project initialized**: Next.js full-stack app (TypeScript)
- ✅ **Landing page**: Beautiful dark UI with video request form
- ✅ **API endpoint**: `/api/generate` skeleton (ready for pipeline integration)
- ✅ **Claude integration**: Library scaffold for vision + audio descriptions
- 🔄 **Next**: Implement full video generation pipeline

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API routes
- **AI**: Anthropic Claude API (vision descriptions)
- **Video**: ffmpeg (procedural visuals), TBD audio synthesis
- **Hosting**: Vercel (auto-scaling, serverless)

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
- **Framework**: Next.js (tighter integration than separate frontend/backend)
- **Visuals**: Procedurally generated code (not AI video-gen or real footage) — cheaper, fully automatable
- **Hosting**: Vercel (easy for Joe, auto-scaling for concurrent requests)
- **Infrastructure**: Needs ffmpeg access; cannot use Anthropic's hosted sandbox alone
- **UI**: Start simple (landing + request form), add gallery/YouTube upload later

## Blockers / Waiting On
- Sister's Anthropic API key (not yet received) — she'll use her own Anthropic account, so the API costs are billed to her, not Joe. `.env` `ANTHROPIC_API_KEY` should be set to her key.
- Sister's style confirmation (abstract motion graphics acceptable?)
- Audio generation method TBD (royalty-free, synthesis, or AI-composed)

## Next Steps
1. **Implement pipeline** (highest priority):
   - Wire Claude calls for visual/audio descriptions
   - Implement ffmpeg procedural rendering
   - Test locally end-to-end
2. **Sister's input** (depends on Joe):
   - API key setup
   - Visual style confirmation
3. **Polish & deploy**:
   - Error handling + status tracking
   - Gallery page (view/reuse generated videos)
   - Deploy to Vercel

## Files
- `app/page.tsx` — landing page + form
- `app/api/generate/route.ts` — generation endpoint
- `lib/video-generator.ts` — Claude integration + pipeline logic
- `package.json` — dependencies (Next.js, Claude SDK)
