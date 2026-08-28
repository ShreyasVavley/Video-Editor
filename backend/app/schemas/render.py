from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Literal, List

class RenderJobCreate(BaseModel):
    project_id: str
    output_resolution: Literal["4K", "1080p", "720p", "480p", "1080x1920", "1080x1080"] = "1080p"
    fps: int = 30
    quality: Literal["fast", "balanced", "high"] = "balanced"
    format: Literal["mp4", "webm"] = "mp4"

class RenderJobResponse(BaseModel):
    id: str
    project_id: str
    status: str
    progress_percentage: int
    output_resolution: str
    output_file_path: Optional[str] = None
    error_log: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class RenderJobListResponse(BaseModel):
    jobs: List[RenderJobResponse]
    total: int
