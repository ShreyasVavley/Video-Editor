from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone

from app.database import get_db
from app.models import Project, User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])

def create_default_timeline(width: int = 1920, height: int = 1080, fps: int = 30) -> dict:
    return {
        "version": 1,
        "width": width,
        "height": height,
        "fps": fps,
        "duration_seconds": 30.0,
        "playhead_position": 0.0,
        "tracks": [
            {"id": "track_t1", "name": "Text T1", "type": "text", "order": 0, "muted": False, "locked": False, "hidden": False, "volume": 1.0, "solo": False},
            {"id": "track_v2", "name": "Overlay V2", "type": "video", "order": 1, "muted": False, "locked": False, "hidden": False, "volume": 1.0, "solo": False},
            {"id": "track_v1", "name": "Main V1", "type": "video", "order": 2, "muted": False, "locked": False, "hidden": False, "volume": 1.0, "solo": False},
            {"id": "track_a1", "name": "Audio A1", "type": "audio", "order": 3, "muted": False, "locked": False, "hidden": False, "volume": 1.0, "solo": False},
            {"id": "track_a2", "name": "Music A2", "type": "audio", "order": 4, "muted": False, "locked": False, "hidden": False, "volume": 1.0, "solo": False},
        ],
        "clips": [],
        "selected_clip_ids": [],
        "zoom_level": 1.0,
        "snap_enabled": True,
        "ripple_edit": False
    }

@router.get("", response_model=ProjectListResponse)
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(desc(Project.updated_at))
    )
    projects = result.scalars().all()
    return ProjectListResponse(
        projects=[ProjectResponse.model_validate(p) for p in projects],
        total=len(projects)
    )

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    timeline = create_default_timeline(
        width=project_data.width,
        height=project_data.height,
        fps=project_data.fps
    )
    if project_data.duration_seconds > 0:
        timeline["duration_seconds"] = project_data.duration_seconds

    new_project = Project(
        user_id=current_user.id,
        title=project_data.title,
        width=project_data.width,
        height=project_data.height,
        fps=project_data.fps,
        duration_seconds=project_data.duration_seconds or 30.0,
        timeline_state=timeline
    )
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return ProjectResponse.model_validate(new_project)

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return ProjectResponse.model_validate(project)

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project_update.title is not None:
        project.title = project_update.title
    if project_update.width is not None:
        project.width = project_update.width
    if project_update.height is not None:
        project.height = project_update.height
    if project_update.fps is not None:
        project.fps = project_update.fps
    if project_update.duration_seconds is not None:
        project.duration_seconds = project_update.duration_seconds
    if project_update.thumbnail_url is not None:
        project.thumbnail_url = project_update.thumbnail_url
    if project_update.timeline_state is not None:
        project.timeline_state = project_update.timeline_state.model_dump()
        project.duration_seconds = project_update.timeline_state.duration_seconds

    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    return ProjectResponse.model_validate(project)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    await db.delete(project)
    await db.commit()
    return None

@router.post("/{project_id}/duplicate", response_model=ProjectResponse)
async def duplicate_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    dup = Project(
        user_id=current_user.id,
        title=f"{project.title} (Copy)",
        width=project.width,
        height=project.height,
        fps=project.fps,
        duration_seconds=project.duration_seconds,
        thumbnail_url=project.thumbnail_url,
        timeline_state=project.timeline_state
    )
    db.add(dup)
    await db.commit()
    await db.refresh(dup)
    return ProjectResponse.model_validate(dup)
