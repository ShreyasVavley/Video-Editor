from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.render_worker import ws_manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/renders/{job_id}")
async def websocket_render_progress(websocket: WebSocket, job_id: str):
    await ws_manager.connect(job_id, websocket)
    try:
        while True:
            # Keep socket alive and accept ping/heartbeat
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(job_id, websocket)
    except Exception:
        ws_manager.disconnect(job_id, websocket)
