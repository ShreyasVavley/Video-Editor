import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db, AsyncSessionLocal
from app.models import Asset, Project, User
from app.schemas.asset import AssetResponse, AssetListResponse
from app.utils.security import get_current_user
from app.utils.range_stream import range_stream_response
from app.services.ffmpeg_service import ffmpeg_service
from app.config import settings

router = APIRouter(prefix="/assets", tags=["Media Assets"])

async def process_asset_in_background(asset_id: str):
    """Background task to generate proxy, thumbnail, and audio waveform"""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Asset).where(Asset.id == asset_id))
        asset = result.scalars().first()
        if not asset:
            return

        file_path = Path(asset.file_path)
        proxy_path = settings.PROXIES_DIR / f"proxy_{asset.id}.mp4"
        thumb_path = settings.PROXIES_DIR / f"thumb_{asset.id}.jpg"

        # Generate Waveform
        try:
            waveform = await ffmpeg_service.generate_waveform(file_path, num_peaks=150)
            asset.audio_waveform = waveform
        except Exception as e:
            print(f"Waveform generation error: {e}")

        # If Video
        if asset.mime_type.startswith("video"):
            try:
                ok_proxy = await ffmpeg_service.generate_proxy(file_path, proxy_path)
                if ok_proxy and proxy_path.exists():
                    asset.proxy_path = str(proxy_path)
            except Exception as e:
                print(f"Proxy generation error: {e}")

            try:
                await ffmpeg_service.generate_thumbnail(file_path, thumb_path, timestamp=1.0)
            except Exception as e:
                print(f"Thumbnail error: {e}")

        # If Audio
        elif asset.mime_type.startswith("audio"):
            try:
                # Thumbnail placeholder for audio
                pass
            except Exception:
                pass

        await db.commit()

@router.get("", response_model=AssetListResponse)
async def list_assets(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Asset).where(Asset.user_id == current_user.id)
    if project_id:
        query = query.where((Asset.project_id == project_id) | (Asset.project_id == None))
    query = query.order_by(desc(Asset.created_at))
    
    result = await db.execute(query)
    assets = result.scalars().all()
    return AssetListResponse(
        assets=[AssetResponse.model_validate(a) for a in assets],
        total=len(assets)
    )

@router.post("/upload", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def upload_asset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset_id = str(uuid.uuid4())
    safe_filename = f"{asset_id}_{Path(file.filename or 'upload').name}"
    save_path = settings.UPLOADS_DIR / safe_filename

    # Save uploaded file
    file_size = 0
    async with aiofiles.open(save_path, "wb") as out_file:
        while chunk := await file.read(1024 * 1024): # 1MB chunks
            await out_file.write(chunk)
            file_size += len(chunk)

    mime_type = file.content_type or "application/octet-stream"

    # Fast probe metadata
    probe_info = await ffmpeg_service.probe_media(save_path)

    new_asset = Asset(
        id=asset_id,
        project_id=project_id,
        user_id=current_user.id,
        file_name=file.filename or safe_filename,
        file_path=str(save_path),
        mime_type=mime_type,
        file_size_bytes=file_size,
        duration_seconds=probe_info.get("duration", 0.0),
        width=probe_info.get("width"),
        height=probe_info.get("height"),
        fps=probe_info.get("fps")
    )

    db.add(new_asset)
    await db.commit()
    await db.refresh(new_asset)

    # Trigger background proxy & waveform generation
    background_tasks.add_task(process_asset_in_background, asset_id)

    return AssetResponse.model_validate(new_asset)

@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id)
    )
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return AssetResponse.model_validate(asset)

@router.get("/{asset_id}/stream")
async def stream_asset(
    asset_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    return range_stream_response(asset.file_path, request, content_type=asset.mime_type)

@router.get("/{asset_id}/proxy")
async def stream_proxy(
    asset_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    target_path = asset.proxy_path if (asset.proxy_path and os.path.exists(asset.proxy_path)) else asset.file_path
    return range_stream_response(target_path, request, content_type="video/mp4")

@router.get("/{asset_id}/thumbnail")
async def get_thumbnail(
    asset_id: str,
    db: AsyncSession = Depends(get_db)
):
    thumb_path = settings.PROXIES_DIR / f"thumb_{asset_id}.jpg"
    if thumb_path.exists():
        return FileResponse(thumb_path, media_type="image/jpeg")
    
    # Fallback to asset directly if it is an image
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalars().first()
    if asset and asset.mime_type.startswith("image") and os.path.exists(asset.file_path):
        return FileResponse(asset.file_path, media_type=asset.mime_type)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not available yet")

@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id)
    )
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    # Remove files
    for p in [asset.file_path, asset.proxy_path]:
        if p and os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass

    await db.delete(asset)
    await db.commit()
    return None

from app.services.ml_service import remove_image_background, remove_video_background
from app.routers.ws import manager

@router.post("/{asset_id}/remove-background")
async def api_remove_background(
    asset_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id))
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    is_video = asset.mime_type.startswith("video/")
    
    # We will process it in the background to avoid blocking the HTTP request
    background_tasks.add_task(process_background_removal, asset_id, asset.file_path, is_video, asset.fps, asset.project_id, current_user.id)
    
    return {"message": "Background removal started", "asset_id": asset_id}

async def process_background_removal(asset_id: str, file_path: str, is_video: bool, fps: float, project_id: str, user_id: str):
    try:
        filename = os.path.basename(file_path)
        name, _ = os.path.splitext(filename)
        out_ext = ".webm" if is_video else ".png"
        out_name = f"{name}_nobg_{uuid.uuid4().hex[:6]}{out_ext}"
        out_path = str(settings.UPLOADS_DIR / out_name)

        if is_video:
            def progress_cb(pct):
                import asyncio
                # Background tasks execute in the same event loop normally, but this cb runs in a thread
                async def send_prog():
                    await manager.broadcast({
                        "type": "progress",
                        "progress": pct,
                        "status": "removing background"
                    })
                try:
                    asyncio.run_coroutine_threadsafe(send_prog(), asyncio.get_running_loop())
                except Exception:
                    pass

            await remove_video_background(file_path, out_path, fps or 30.0, progress_cb)
        else:
            await remove_image_background(file_path, out_path)
            
        # Add new asset to DB
        async with AsyncSessionLocal() as session:
            size = os.path.getsize(out_path)
            mime = "video/webm" if is_video else "image/png"
            new_asset = Asset(
                id=str(uuid.uuid4()),
                project_id=project_id,
                user_id=user_id,
                file_name=out_name,
                file_path=out_path,
                mime_type=mime,
                file_size_bytes=size,
                width=None,
                height=None,
                fps=fps if is_video else None
            )
            session.add(new_asset)
            await session.commit()
            
            # trigger standard asset processing (proxies, thumbs)
            await process_asset_in_background(new_asset.id)
            
            # notify clients that a new asset is ready
            await manager.broadcast({
                "type": "asset_ready",
                "asset": {
                    "id": new_asset.id,
                    "file_name": new_asset.file_name,
                    "url": f"/api/assets/{new_asset.id}/stream"
                }
            })
            
    except Exception as e:
        print(f"Error in background removal: {e}")
