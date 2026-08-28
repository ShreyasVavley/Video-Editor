from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any

class AssetResponse(BaseModel):
    id: str
    project_id: Optional[str] = None
    user_id: str
    file_name: str
    file_path: str
    proxy_path: Optional[str] = None
    mime_type: str
    file_size_bytes: int
    duration_seconds: float = 0.0
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    audio_waveform: Optional[List[float]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssetListResponse(BaseModel):
    assets: List[AssetResponse]
    total: int
