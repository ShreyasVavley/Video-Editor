# 🎬 Cloud-Native Non-Linear Video Editor (NLE)

A blazing-fast, fully local, self-hosted web-based Video Editor powered by **Next.js, Tailwind, Zustand, FastAPI, and FFmpeg**. 

![Editor Screenshot](docs/screenshot.png) *(Preview of the Editor interface)*

## ✨ Features

- **Multi-track Timeline**: Layer unlimited video, audio, text, and sticker tracks. Seamless drag-and-drop, trimming, snapping, and undo/redo systems.
- **Hardware-Accelerated Canvas**: Real-time 60fps WebGL/HTML5 Canvas compositor for instant playback preview.
- **Advanced FFmpeg Engine**: Broadcast-quality backend rendering pipeline with WebSockets for live progress tracking.
- **AI Captions (Local Whisper)**: Automatically generate subtitles completely offline using OpenAI's Whisper models.
- **AI Voiceovers (Text-to-Speech)**: Type a script and instantly generate lifelike voiceovers using integrated TTS.
- **Green Screen (Chroma Key)**: Remove solid backgrounds with live canvas preview and FFmpeg `colorkey` compositing.
- **Speed Ramping**: Variable playback speed control (`0.10x` to `10.0x`) and reverse playback.
- **Keyframe Animation (Pan & Zoom)**: Dynamic "Ken Burns" effects and smooth interpolation.
- **Audio Mixing & EQ**: Adjust volume, panning, bass, treble, and pitch shifting per clip.
- **Animated Stickers & GIFs**: Built-in Tenor API search with automatic WebM transcoding for alpha transparency.
- **Transitions & Visual Filters**: Crossfades, Wipes, Saturation, Blur, Hue Rotation, and more.

## 🛠️ Architecture

The application is split into a **Frontend (Next.js)** and a **Backend (FastAPI)**. 

### Frontend (`/frontend`)
- **Framework**: Next.js 15 (App Router) + React 19
- **State Management**: Zustand (Multi-store architecture)
- **Styling**: Tailwind CSS + Lucide Icons
- **Compositing**: Native HTML5 Canvas API with Offscreen Canvas buffers

### Backend (`/backend`)
- **Framework**: FastAPI (Python)
- **Database**: SQLite (SQLAlchemy + Async)
- **Engine**: FFmpeg (Complex Filtergraphs) + FFprobe
- **AI/ML**: `faster-whisper` (Captions), `gTTS` (Voiceovers), `rembg` (Background removal)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- FFmpeg installed and accessible in your system PATH.

### 1. Start the Backend (API)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Start the Frontend (UI)
```bash
cd frontend
npm install
npm run dev
```

### 3. Open the Editor
Navigate to `http://localhost:3000` in your web browser. Create a new project, upload media, and start editing!

## 📜 License
MIT License. Created by Shreyas Vavley.
