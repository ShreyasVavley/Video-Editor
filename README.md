# Cloud-Native Browser-Based Non-Linear Video Editor (NLE)

A complete, self-hosted, browser-based Non-Linear Video Editing (NLE) platform running entirely on local infrastructure with **zero third-party cloud/SaaS API dependencies**.

---

## 🌟 Key Features

### 🎬 Frontend Video Editing Engine
- **Next.js (App Router, TypeScript) + Tailwind CSS + Lucide Icons**
- **Multi-Track Timeline Dock:**
  - Video tracks (V1, V2...), Audio tracks (A1, A2...), Text/Overlay tracks (T1, T2...)
  - Track controls: Mute, Solo, Lock, Hide, Volume
  - Dynamic zoomable timeline ruler (seconds, frames, timecodes `HH:MM:SS:FF`)
  - Interactive laser playhead with drag scrubbing
  - Trimmable clip in/out handles, ripple edit toggle, and magnetic snapping
  - Frame-accurate razor split tool (`C` / `S` keyboard shortcuts)
  - Speed adjustments (0.25x to 4x)
- **High-Performance Compositor Canvas:**
  - Frame-accurate HTML5 Canvas multi-layer video compositor
  - Real-time CSS and Canvas transform matrices (Position X/Y, Scale, Rotation, Opacity, Blend modes)
  - Live Color Grading & Filters (Brightness, Contrast, Saturation, Hue, Blur, Sepia, Grayscale, Invert)
  - On-canvas interactive bounding box controls for visual drag-repositioning
  - Safe margins & aspect ratio guides (16:9 Landscape, 9:16 Shorts/Reels, 1:1 Square, 21:9 Ultrawide)
- **Web Audio API Engine:**
  - Multi-track synchronized audio playback with gain nodes, pan controls, and master mixdown
- **Video Decoder Recycling Pool:**
  - Dynamically reuses a constrained set of HTML5 video decoders to eliminate browser hardware limits
- **Zustand + Immer State Store:**
  - Immutable timeline manipulation with full Undo/Redo history stack (`Ctrl+Z` / `Ctrl+Y`) and autosave

### 🚀 High-Performance Backend & Media Core
- **FastAPI (Python 3.13) + SQLAlchemy 2.0:**
  - Relational database schema with SQLite WAL (Write-Ahead Logging) mode and PostgreSQL compatibility
  - Strongly typed Pydantic validation schemas (`Clip`, `Track`, `Transform`, `FilterConfig`, `TimelineState`)
- **Local FFmpeg 7.1 Media Processing Engine:**
  - Fast metadata probing (`duration`, `fps`, `resolution`, audio streams)
  - Automatic 720p/360p H.264 proxy transcoding for smooth browser scrubbing
  - Normalized 150-bucket peak audio waveform extraction
  - Frame snapshot thumbnail generation
  - **Dynamic Multi-Track Filtergraph Render Pipeline:** Compiles complex timeline JSON (layering, cuts, trims, opacity, scale, rotation, drawtext, color filters, speed changes, transitions, and audio mixing) directly into final MP4 exports.
- **Dedicated HTTP 206 Partial Content Streamer:**
  - Generator-based byte-range streamer (`Range: bytes=start-end`) for instant video seeking
- **Asynchronous Worker Queue & WebSockets:**
  - Live 0–100% render progress updates and event broadcasting to connected frontend clients

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand, Immer, Lucide Icons |
| **Canvas & Audio** | HTML5 Canvas, Web Audio API, Video Decoder Pool |
| **Backend** | FastAPI (Python 3.13), Uvicorn, SQLAlchemy 2.0, Pydantic v2 |
| **Media Processing** | FFmpeg 7.1 (libx264, AAC, FreeType `drawtext`, scale, overlay, amix) |
| **Storage & Database** | Local Filesystem (`/media/uploads`, `/media/proxies`, `/media/exports`), SQLite WAL / PostgreSQL |
| **Realtime** | WebSockets (`ws://localhost:8000/ws/renders/{jobId}`) |
| **Containerization** | Docker Compose, Multi-stage Dockerfiles |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause playback |
| `S` / `C` | Razor Split clip at current playhead position |
| `V` | Switch to Selection Tool |
| `Delete` / `Backspace` | Delete selected clip(s) |
| `Home` | Rewind playhead to 0:00.0 |
| `Left Arrow` / `Right Arrow` | Step backward / forward 1 frame |
| `Shift + Left / Right Arrow` | Step backward / forward 1.0 second |
| `Ctrl + Z` | Undo timeline action |
| `Ctrl + Y` | Redo timeline action |
| `Ctrl + S` | Save project state to backend |

---

## 🚀 Quickstart & Local Launch

### Option 1: Native Windows / macOS / Linux (Recommended for Local Dev)

#### Windows:
Double-click `run_dev.bat` or run:
```powershell
.\start_dev.ps1
```

#### macOS / Linux:
```bash
chmod +x start_dev.sh
./start_dev.sh
```

#### Manual:
1. **Start Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m uvicorn app.main:app --reload --port 8000
   ```
2. **Start Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

---

### Option 2: Docker Compose

```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`
- API Interactive Docs: `http://localhost:8000/docs`

---

## 🗄️ Relational Database Schema

```sql
-- Users
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects
CREATE TABLE projects (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Project',
    width INT NOT NULL DEFAULT 1920,
    height INT NOT NULL DEFAULT 1080,
    fps INT NOT NULL DEFAULT 30,
    duration_seconds FLOAT NOT NULL DEFAULT 0.0,
    thumbnail_url VARCHAR(512),
    timeline_state JSON NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Media Assets
CREATE TABLE assets (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    proxy_path VARCHAR(512),
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    duration_seconds FLOAT DEFAULT 0.0,
    width INT,
    height INT,
    fps FLOAT,
    audio_waveform JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Render & Export Jobs
CREATE TABLE render_jobs (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    progress_percentage INT DEFAULT 0,
    output_resolution VARCHAR(50) DEFAULT '1080p',
    output_file_path VARCHAR(512),
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

---

## 🤝 Authors & Contributors

- **[Shreyas Vavley](https://github.com/ShreyasVavley)** - Architecture, NLE Timeline Engine & Full-Stack Platform
- **[Shreyas BR](https://github.com/ShreyasBR21)** - Multimedia Engineering, Captions System & Optimization

