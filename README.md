# 🎵 Vibe

Your premium personal music app powered by Jellyfin.

## Setup

### 1. Fill in your credentials

Open `.env` and add your values:

```env
VITE_JELLYFIN_URL=http://100.79.48.48:8096
VITE_JELLYFIN_API_KEY=paste_your_api_key_here
VITE_JELLYFIN_USER_ID=paste_your_user_id_here
```

**How to get your User ID:**
- Open Jellyfin dashboard → Users → click your username
- Look at the URL: `...?userId=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- Copy that string

**How to get your API Key:**
- Jellyfin dashboard → API Keys → + Add → name it "Vibe" → copy it

### 2. Install & run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — Vibe boots straight into your library.

### 3. Build for production (PWA)

```bash
npm run build
npm run preview
```

## Features

- 🎵 Real Jellyfin library — no mock data
- 🎚️ Sweet Fades — 6 second crossfade between tracks
- 🌊 Live waveform visualizer driven by album art colors
- 📻 Stations — Artist Mix, Album Mix, Vibe Radio
- 🔀 Shuffle, Repeat (one/all), Queue management
- 📖 Recently Played, Recently Added, Top Albums, History
- 🎭 Genre browsing — More In: Christian, Christian Rap, etc.
- 📱 PWA — installable, offline audio caching
- 🔊 Volume control, seek bar

## Stack

- React + Vite
- Zustand (state)
- Web Audio API (Sweet Fades, waveform)
- Jellyfin REST API
- Tailscale (remote access)
