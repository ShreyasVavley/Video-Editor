import pytest
import pytest_asyncio
import asyncio
from pathlib import Path
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import init_db
from app.config import settings
from app.services.ffmpeg_service import ffmpeg_service
from app.schemas.timeline import TimelineState, Track, Clip, TextConfig, TransformConfig, FilterConfig

@pytest_asyncio.fixture(autouse=True)
async def prepare_database():
    await init_db()
    yield

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "ffmpeg" in data

@pytest.mark.asyncio
async def test_auth_and_project_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Guest Login
        guest_res = await ac.post("/api/auth/guest")
        assert guest_res.status_code == 200
        token_data = guest_res.json()
        assert "access_token" in token_data
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Project
        create_res = await ac.post(
            "/api/projects",
            json={"title": "Test Cinematic Video", "width": 1920, "height": 1080, "fps": 30, "duration_seconds": 15.0},
            headers=headers
        )
        assert create_res.status_code == 201
        project = create_res.json()
        project_id = project["id"]
        assert project["title"] == "Test Cinematic Video"
        assert len(project["timeline_state"]["tracks"]) >= 3

        # 3. Get Project
        get_res = await ac.get(f"/api/projects/{project_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == project_id

        # 4. Update Project Timeline
        updated_timeline = project["timeline_state"]
        updated_timeline["clips"].append({
            "id": "clip_t1",
            "track_id": "track_t1",
            "type": "text",
            "name": "Intro Title",
            "start_time": 0.0,
            "duration": 5.0,
            "trim_in": 0.0,
            "trim_out": 5.0,
            "speed": 1.0,
            "transform": {"x": 0.0, "y": 0.0, "scale_x": 1.0, "scale_y": 1.0, "rotation": 0.0, "opacity": 1.0, "blend_mode": "normal"},
            "filters": {"brightness": 1.0, "contrast": 1.0, "saturation": 1.0, "hue": 0.0, "blur": 0.0, "vignette": 0.0, "sepia": 0.0, "grayscale": 0.0, "invert": 0.0},
            "text": {
                "content": "HELLO ANTIGRAVITY",
                "font_family": "Roboto-Bold",
                "font_size": 52,
                "font_color": "#FFFFFF",
                "background_color": "transparent",
                "alignment": "center",
                "outline_color": "#000000",
                "outline_width": 2,
                "shadow": True
            },
            "audio": {"volume": 1.0, "muted": False, "pan": 0.0, "fade_in": 0.0, "fade_out": 0.0}
        })

        put_res = await ac.put(
            f"/api/projects/{project_id}",
            json={"title": "Updated Cinematic Title", "timeline_state": updated_timeline},
            headers=headers
        )
        assert put_res.status_code == 200
        assert put_res.json()["title"] == "Updated Cinematic Title"
        assert len(put_res.json()["timeline_state"]["clips"]) == 1

@pytest.mark.asyncio
async def test_ffmpeg_render_timeline_pipeline(tmp_path):
    """Verifies that the FFmpeg complex filtergraph compiler renders a valid MP4 from timeline state"""
    timeline = TimelineState(
        width=1280,
        height=720,
        fps=30,
        duration_seconds=2.0,
        tracks=[
            Track(id="t1", name="Text", type="text", order=0)
        ],
        clips=[
            Clip(
                id="clip_title",
                track_id="t1",
                type="text",
                name="Title",
                start_time=0.0,
                duration=2.0,
                trim_in=0.0,
                trim_out=2.0,
                text=TextConfig(
                    content="RENDER TEST 100%",
                    font_size=40,
                    font_color="#00FF00"
                )
            )
        ]
    )

    output_video = tmp_path / "test_render.mp4"
    progress_records = []

    def on_progress(pct: int, msg: str):
        progress_records.append((pct, msg))

    success = await ffmpeg_service.render_timeline(
        timeline=timeline,
        asset_map={},
        output_file_path=output_video,
        progress_callback=on_progress,
        output_res="720p",
        target_fps=30,
        quality="fast"
    )

    assert success is True
    assert output_video.exists()
    assert output_video.stat().st_size > 0
    assert any(p[0] == 100 for p in progress_records)

    # Probe the generated output
    probe = await ffmpeg_service.probe_media(output_video)
    assert probe["width"] == 1280
    assert probe["height"] == 720
    assert probe["duration"] >= 1.9
