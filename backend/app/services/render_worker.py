import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Set, Optional
from fastapi import WebSocket
from sqlalchemy import select, update

from app.database import AsyncSessionLocal
from app.models import RenderJob, Project, Asset
from app.schemas.timeline import TimelineState
from app.services.ffmpeg_service import ffmpeg_service
from app.config import settings

class ConnectionManager:
    """Manages active WebSocket connections for live render progress updates"""
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {} # job_id -> set of WebSockets

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = set()
        self.active_connections[job_id].add(websocket)

    def disconnect(self, job_id: str, websocket: WebSocket):
        if job_id in self.active_connections:
            self.active_connections[job_id].discard(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

    async def broadcast(self, job_id: str, message: dict):
        if job_id in self.active_connections:
            dead_sockets = set()
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.active_connections[job_id].discard(dead)

ws_manager = ConnectionManager()

class RenderWorkerQueue:
    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.is_running: bool = False
        self.worker_task: Optional[asyncio.Task] = None

    async def start(self):
        if not self.is_running:
            self.is_running = True
            self.worker_task = asyncio.create_task(self._process_queue())

    async def stop(self):
        self.is_running = False
        if self.worker_task:
            self.worker_task.cancel()

    async def enqueue_job(self, job_id: str):
        await self.queue.put(job_id)

    async def _process_queue(self):
        while self.is_running:
            try:
                job_id = await self.queue.get()
                await self._execute_render(job_id)
                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[RenderWorker Error] {e}")
                await asyncio.sleep(1)

    async def _execute_render(self, job_id: str):
        async with AsyncSessionLocal() as db:
            # Fetch Job
            result = await db.execute(select(RenderJob).where(RenderJob.id == job_id))
            job = result.scalars().first()
            if not job:
                return

            # Fetch Project
            p_result = await db.execute(select(Project).where(Project.id == job.project_id))
            project = p_result.scalars().first()
            if not project:
                job.status = "FAILED"
                job.error_log = "Project not found"
                await db.commit()
                return

            # Mark PROCESSING
            job.status = "PROCESSING"
            job.progress_percentage = 0
            await db.commit()

            await ws_manager.broadcast(job_id, {
                "job_id": job_id,
                "status": "PROCESSING",
                "progress": 0,
                "message": "Initializing render pipeline..."
            })

            # Parse timeline state
            raw_timeline = project.timeline_state or {}
            try:
                timeline = TimelineState(**raw_timeline)
            except Exception as e:
                # If raw dict, fallback or build empty
                timeline = TimelineState(
                    width=project.width,
                    height=project.height,
                    fps=project.fps,
                    duration_seconds=project.duration_seconds
                )

            # Build asset path map
            a_result = await db.execute(select(Asset).where(Asset.project_id == project.id))
            assets = a_result.scalars().all()
            asset_map: Dict[str, Path] = {}
            for asset in assets:
                asset_map[asset.id] = Path(asset.file_path)

            output_filename = f"export_{project.id}_{job.id}.mp4"
            output_file_path = settings.EXPORTS_DIR / output_filename

            loop = asyncio.get_running_loop()

            def progress_callback(pct: int, msg: str):
                # Schedule DB update & WS broadcast
                asyncio.run_coroutine_threadsafe(
                    self._update_progress(job_id, pct, msg),
                    loop
                )

            success = await ffmpeg_service.render_timeline(
                timeline=timeline,
                asset_map=asset_map,
                output_file_path=output_file_path,
                progress_callback=progress_callback,
                output_res=job.output_resolution or "1080p",
                target_fps=project.fps or 30
            )

            # Finalize DB state
            if success and output_file_path.exists():
                job.status = "COMPLETED"
                job.progress_percentage = 100
                job.output_file_path = str(output_file_path)
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()

                await ws_manager.broadcast(job_id, {
                    "job_id": job_id,
                    "status": "COMPLETED",
                    "progress": 100,
                    "download_url": f"{settings.API_PREFIX}/renders/{job_id}/download",
                    "message": "Render completed successfully!"
                })
            else:
                job.status = "FAILED"
                job.error_log = "FFmpeg render process failed."
                await db.commit()

                await ws_manager.broadcast(job_id, {
                    "job_id": job_id,
                    "status": "FAILED",
                    "progress": 0,
                    "error": "Render process failed."
                })

    async def _update_progress(self, job_id: str, percentage: int, message: str):
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(RenderJob)
                    .where(RenderJob.id == job_id)
                    .values(progress_percentage=percentage)
                )
                await db.commit()

            await ws_manager.broadcast(job_id, {
                "job_id": job_id,
                "status": "PROCESSING",
                "progress": percentage,
                "message": message
            })
        except Exception:
            pass

render_worker = RenderWorkerQueue()
