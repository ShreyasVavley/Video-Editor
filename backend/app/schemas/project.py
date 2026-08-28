from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any, List
from app.schemas.timeline import TimelineState

class ProjectCreate(BaseModel):
    title: str = "Untitled Project"
    width: int = 1920
    height: int = 1080
    fps: int = 30
    duration_seconds: float = 0.0

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[int] = None
    duration_seconds: Optional[float] = None
    thumbnail_url: Optional[str] = None
    timeline_state: Optional[TimelineState] = None

class ProjectResponse(BaseModel):
    id: str
    user_id: str
    title: str
    width: int
    height: int
    fps: int
    duration_seconds: float
    thumbnail_url: Optional[str] = None
    timeline_state: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int
