from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.services.render_worker import render_worker
from app.routers import auth, projects, assets, renders, ws, captions

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await render_worker.start()
    print(f"[{settings.PROJECT_NAME}] Database initialized and Render Worker started.")
    print(f"[{settings.PROJECT_NAME}] FFmpeg binary: {settings.get_ffmpeg_binary()}")
    yield
    # Shutdown
    await render_worker.stop()
    print(f"[{settings.PROJECT_NAME}] Render Worker stopped.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Enable CORS for frontend and cloud deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(projects.router, prefix=settings.API_PREFIX)
app.include_router(assets.router, prefix=settings.API_PREFIX)
app.include_router(renders.router, prefix=settings.API_PREFIX)
app.include_router(captions.router, prefix=settings.API_PREFIX)
app.include_router(ws.router)

# Mount media static directory
app.mount("/media", StaticFiles(directory=settings.MEDIA_DIR), name="media")

@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ffmpeg": settings.get_ffmpeg_binary()
    }
