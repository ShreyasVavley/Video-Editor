import pytest
import io
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_captions_suite():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Guest Auth
        auth_res = await ac.post("/api/auth/guest")
        assert auth_res.status_code == 200
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Test SRT Parsing
        sample_srt = """1
00:00:01,000 --> 00:00:03,500
Hello and welcome to the studio!

2
00:00:03,800 --> 00:00:06,200
This is automated subtitle generation.
"""
        files = {"file": ("test.srt", io.BytesIO(sample_srt.encode("utf-8")), "text/plain")}
        parse_res = await ac.post("/api/captions/parse-file", files=files, headers=headers)
        assert parse_res.status_code == 200
        segments = parse_res.json()
        assert len(segments) == 2
        assert segments[0]["start_time"] == 1.0
        assert segments[0]["end_time"] == 3.5
        assert "Hello and welcome" in segments[0]["text"]
        assert segments[1]["start_time"] == 3.8
        assert segments[1]["end_time"] == 6.2

        # 3. Test SRT Export
        export_payload = {
            "segments": segments,
            "filename": "exported_subtitles.srt"
        }
        exp_res = await ac.post("/api/captions/export-file", json=export_payload)
        assert exp_res.status_code == 200
        assert "00:00:01,000 --> 00:00:03,500" in exp_res.text
        assert "Hello and welcome to the studio!" in exp_res.text
