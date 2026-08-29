import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import RenderJob, Project, User
from app.schemas.render import RenderJobCreate, RenderJobResponse, RenderJobListResponse
from app.utils.security import get_current_user
from app.services.render_worker import render_worker

router = APIRouter(prefix="/renders", tags=["Render & Export Jobs"])

@router.post("", response_model=RenderJobResponse, status_code=status.HTTP_201_CREATED)
async def create_render_job(
    job_data: RenderJobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify project exists and user owns it
    result = await db.execute(
        select(Project).where(Project.id == job_data.project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    new_job = RenderJob(
        project_id=project.id,
        status="QUEUED",
        progress_percentage=0,
        output_resolution=job_data.output_resolution,
        fps=job_data.fps,
        quality=job_data.quality
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    # Enqueue in background worker
    await render_worker.enqueue_job(new_job.id)

    return RenderJobResponse.model_validate(new_job)

@router.get("", response_model=RenderJobListResponse)
async def list_render_jobs(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(RenderJob).join(Project).where(Project.user_id == current_user.id)
    if project_id:
        query = query.where(RenderJob.project_id == project_id)
    query = query.order_by(desc(RenderJob.created_at))

    result = await db.execute(query)
    jobs = result.scalars().all()
    return RenderJobListResponse(
        jobs=[RenderJobResponse.model_validate(j) for j in jobs],
        total=len(jobs)
    )

@router.get("/{job_id}", response_model=RenderJobResponse)
async def get_render_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(RenderJob).where(RenderJob.id == job_id)
    )
    job = result.scalars().first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Render job not found"
        )
    return RenderJobResponse.model_validate(job)

@router.get("/{job_id}/download")
async def download_render_output(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(RenderJob).where(RenderJob.id == job_id)
    )
    job = result.scalars().first()
    if not job or not job.output_file_path or not os.path.exists(job.output_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exported video file not found or render still in progress"
        )

    filename = Path(job.output_file_path).name
    return FileResponse(
        path=job.output_file_path,
        media_type="video/mp4",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
