from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Asset
from app.services.captions_service import captions_service
from app.utils.security import get_current_user

router = APIRouter(prefix="/captions", tags=["Captions & Subtitles"])

class TranscribeRequest(BaseModel):
    asset_id: str
    model_size: str = "tiny" # tiny, base, small

class CaptionSegment(BaseModel):
    id: str
    start_time: float
    end_time: float
    duration: float
    text: str
    words: Optional[List[Dict[str, Any]]] = None

class ExportSRTRequest(BaseModel):
    segments: List[CaptionSegment]
    filename: Optional[str] = "captions.srt"

@router.post("/transcribe", response_model=List[CaptionSegment])
async def transcribe_asset(
    req: TranscribeRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Asset).where(Asset.id == req.asset_id))
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    segments = await captions_service.transcribe_audio(asset.file_path, model_size=req.model_size)
    return segments

@router.post("/parse-file", response_model=List[CaptionSegment])
async def parse_subtitle_file(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    content_bytes = await file.read()
    content_text = content_bytes.decode("utf-8", errors="ignore")
    segments = captions_service.parse_srt(content_text)
    return segments

@router.post("/export-file")
async def export_subtitle_file(
    req: ExportSRTRequest
):
    srt_text = captions_service.export_srt([s.model_dump() for s in req.segments])
    return Response(
        content=srt_text,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{req.filename or "captions.srt"}"'
        }
    )
