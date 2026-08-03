# Magoo

**Magoo** is an AI-powered ambient video generator that creates beautiful looping videos for relaxation and focus. Each video features procedurally generated visuals paired with AI-composed ambient music.

## Features

- ✨ AI-generated procedural visuals (gradients, particles, motion graphics)
- 🎵 AI-composed ambient music
- ♾️ Seamless looping videos
- 🎬 Direct YouTube upload (coming soon)
- 🌐 Web UI for easy access

## Tech Stack

- **Frontend**: Next.js + React + TypeScript
- **Backend**: Next.js API routes + Node.js
- **AI**: Anthropic Claude API
- **Video Generation**: ffmpeg + procedural graphics
- **Hosting**: Vercel (planned)

## Quick Start

### Prerequisites

- Node.js 18+
- ffmpeg (for video generation)
- Anthropic API key

### Setup

1. **Clone/enter the directory**:
   ```bash
   cd Magoo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your ANTHROPIC_API_KEY
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

   Open http://localhost:3000 in your browser.

### Build & Deploy

```bash
npm run build
npm start
```

Deploy to Vercel:
```bash
vercel deploy
```

## Project Structure

```
app/
  ├── page.tsx           # Landing page & video request form
  ├── layout.tsx         # Root layout
  ├── globals.css        # Styles
  └── api/
      └── generate/      # Video generation endpoint
lib/
  └── video-generator.ts # Core video generation pipeline
```

## Roadmap

- [x] Landing page & request form
- [ ] Video generation pipeline (visual synthesis)
- [ ] Ambient music generation
- [ ] Video composition & encoding
- [ ] Video gallery / history
- [ ] YouTube upload integration
- [ ] User accounts & analytics

## Development Notes

- The video generation endpoint is stubbed and returns mock data. Full implementation requires:
  1. Claude API calls for creative descriptions
  2. ffmpeg for procedural visual generation
  3. Audio synthesis or royalty-free ambient music
  4. Final video composition

## License

Private project for personal use.
