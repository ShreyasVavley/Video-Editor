import asyncio
import json
import os
import subprocess
import tempfile
import time
import sys
from pathlib import Path
import httpx
import websockets

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings

BASE_API = "http://127.0.0.1:8000/api"
BASE_WS = "ws://127.0.0.1:8000"
BASE_FRONTEND = "http://localhost:3000"
FFMPEG_BIN = settings.get_ffmpeg_binary()

async def create_synthetic_test_media(output_dir: Path):
    """Generates synthetic test video, audio, and image files using local FFmpeg binary"""
    output_dir.mkdir(parents=True, exist_ok=True)
    video_path = output_dir / "sample_video.mp4"
    audio_path = output_dir / "sample_audio.wav"
    image_path = output_dir / "sample_logo.png"

    # 1. 3-second synthetic test video (SMPTE color bars + 440Hz sine beep)
    if not video_path.exists():
        cmd = [
            FFMPEG_BIN, "-y", "-hide_banner",
            "-f", "lavfi", "-i", "smptebars=size=1280x720:rate=30",
            "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100",
            "-t", "3.0",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            str(video_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # 2. 4-second synthetic test audio track (melody chirp)
    if not audio_path.exists():
        cmd = [
            FFMPEG_BIN, "-y", "-hide_banner",
            "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=44100",
            "-t", "4.0",
            "-c:a", "pcm_s16le",
            str(audio_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # 3. Synthetic test image (640x360 solid color card)
    if not image_path.exists():
        cmd = [
            FFMPEG_BIN, "-y", "-hide_banner",
            "-f", "lavfi", "-i", "color=c=navy:s=640x360:d=1",
            "-vframes", "1",
            str(image_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    return video_path, audio_path, image_path

async def run_full_qa_suite():
    print("=" * 70)
    print("  QA TEST SUITE: FULL-STACK CLOUD-NATIVE VIDEO EDITING PLATFORM")
    print("=" * 70)
    
    results = {}
    temp_dir = Path(tempfile.gettempdir()) / "video_editor_qa"
    video_file, audio_file, image_file = await create_synthetic_test_media(temp_dir)
    print(f"[*] Synthetic media prepared at: {temp_dir}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # TEST 1: Health Check
        print("\n[TEST 1] Backend Health & Engine Verification...")
        try:
            r = await client.get(f"{BASE_API}/health")
            assert r.status_code == 200, f"Status: {r.status_code}"
            data = r.json()
            assert data["status"] == "healthy"
            assert "ffmpeg" in data
            print(f"  [PASS] Backend Healthy! FFmpeg engine: {data['ffmpeg']}")
            results["1. Backend Health"] = "PASS"
        except Exception as e:
            print(f"  [FAIL] {e}")
            results["1. Backend Health"] = f"FAIL: {e}"

        # TEST 2: Guest Authentication & Session
        print("\n[TEST 2] Guest Authentication & JWT Issuance...")
        token = ""
        user_id = ""
        try:
            r = await client.post(f"{BASE_API}/auth/guest")
            assert r.status_code == 200
            auth_data = r.json()
            assert "access_token" in auth_data
            token = auth_data["access_token"]
            user_id = auth_data["user"]["id"]
            
            # Verify /auth/me
            me_res = await client.get(f"{BASE_API}/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert me_res.status_code == 200
            assert me_res.json()["id"] == user_id
            print(f"  [PASS] Authenticated as User ID: {user_id}")
            results["2. Authentication"] = "PASS"
        except Exception as e:
            print(f"  [FAIL] {e}")
            results["2. Authentication"] = f"FAIL: {e}"

        headers = {"Authorization": f"Bearer {token}"}

        # TEST 3: Project CRUD & Duplicate
        print("\n[TEST 3] Project Creation, Update & Duplicate Lifecycle...")
        project_id = ""
        try:
            # Create Project (16:9 1080p 30fps)
            create_payload = {
                "title": "QA Test Cinematic Reel",
                "width": 1920,
                "height": 1080,
                "fps": 30,
                "duration_seconds": 10.0
            }
            cr = await client.post(f"{BASE_API}/projects", json=create_payload, headers=headers)
            assert cr.status_code == 201
            proj = cr.json()
            project_id = proj["id"]
            assert proj["title"] == "QA Test Cinematic Reel"
            assert len(proj["timeline_state"]["tracks"]) >= 4

            # Duplicate Project
            dup_r = await client.post(f"{BASE_API}/projects/{project_id}/duplicate", headers=headers)
            assert dup_r.status_code == 200
            dup_proj = dup_r.json()
            assert "(Copy)" in dup_proj["title"]

            # Delete Duplicate
            del_r = await client.delete(f"{BASE_API}/projects/{dup_proj['id']}", headers=headers)
            assert del_r.status_code == 204

            print(f"  [PASS] Project CRUD operational. Active Project ID: {project_id}")
            results["3. Project Lifecycle"] = "PASS"
        except Exception as e:
            print(f"  [FAIL] {e}")
            results["3. Project Lifecycle"] = f"FAIL: {e}"

        # TEST 4: Media Upload, Metadata Probing & Waveform Extraction
        print("\n[TEST 4] Media Upload, Probe & Peak Waveform Extraction...")
        video_asset_id = ""
        audio_asset_id = ""
        try:
            # Upload Video
            with open(video_file, "rb") as f:
                vr = await client.post(
                    f"{BASE_API}/assets/upload",
                    data={"project_id": project_id},
                    files={"file": ("sample_video.mp4", f, "video/mp4")},
                    headers=headers
                )
            assert vr.status_code == 201
            v_asset = vr.json()
            video_asset_id = v_asset["id"]
            assert v_asset["width"] == 1280
            assert v_asset["height"] == 720
            assert v_asset["duration_seconds"] >= 2.9

            # Upload Audio
            with open(audio_file, "rb") as f:
                ar = await client.post(
                    f"{BASE_API}/assets/upload",
                    data={"project_id": project_id},
                    files={"file": ("sample_audio.wav", f, "audio/wav")},
                    headers=headers
                )
            assert ar.status_code == 201
            a_asset = ar.json()
            audio_asset_id = a_asset["id"]

            # Allow background proxy and waveform worker 2 seconds to process
            await asyncio.sleep(2.0)

            # Query updated asset metadata
            check_res = await client.get(f"{BASE_API}/assets/{video_asset_id}", headers=headers)
            updated_v = check_res.json()
            assert updated_v["audio_waveform"] is not None
            assert len(updated_v["audio_waveform"]) == 150
            print(f"  [PASS] Video Probe: {v_asset['width']}x{v_asset['height']}, Waveform: {len(updated_v['audio_waveform'])} buckets")
            results["4. Media Ingestion & Waveform"] = "PASS"
        except Exception as e:
            print(f"  [FAIL] {e}")
            results["4. Media Ingestion & Waveform"] = f"FAIL: {e}"

        # TEST 5: HTTP 206 Partial Content Range Streaming
        print("\n[TEST 5] HTTP 206 Partial Content Byte-Range Streaming...")
        try:
            range_headers = {"Range": "bytes=0-1023"}
            stream_res = await client.get(f"{BASE_API}/assets/{video_asset_id}/stream", headers=range_headers)
            assert stream_res.status_code == 206, f"Expected 206, got {stream_res.status_code}"
            assert "Content-Range" in stream_res.headers
            assert stream_res.headers["Content-Range"].startswith("bytes 0-1023/")
            assert len(stream_res.content) == 1024
            assert stream_res.headers.get("Accept-Ranges") == "bytes"
            print(f"  [PASS] Streamer returned HTTP 206 with Content-Range: {stream_res.headers['Content-Range']}")
            results["5. HTTP 206 Range Streamer"] = "PASS"
        except Exception as e:
            print(f"  [FAIL] {e}")
            results["5. HTTP 206 Range Streamer"] = f"FAIL: {e}"

        # TEST 6: Timeline Multi-Track Composition Assembly
        print("\n[TEST 6] Multi-Track Timeline Assembly (Video + Audio + Text Overlay + Transforms + Filters)...")
        try:
            timeline_payload = {
                "version": 1,
                "width": 1920,
                "height": 1080,
                "fps": 30,
                "duration_seconds": 6.0,
                "playhead_position": 0.0,
                "tracks": [
                    {"id": "t_text", "name": "Text T1", "type": "text", "order": 0, "muted": False, "locked": False, "hidden": False, "volume": 1.0, "solo": False},
                    {"id": "t_video", "name": "Video V1", "type": "video", "order": 1, "muted": False, "locked": False, "hidden": False, "volume": 1.0, "solo": False},
                    {"id": "t_audio", "name": "Audio A1", "type": "audio", "order": 2, "muted": False, "locked": False, "hidden": False, "volume": 1.0, "solo": False}
                ],
                "clips": [
                    # Clip 1: Video clip on track V1 with scaling, opacity and color grading
                    {
                        "id": "clip_v1",
                        "track_id": "t_video",
                        "asset_id": video_asset_id,
                        "type": "video",
                        "name": "Background Bars",
                        "start_time": 0.0,
                        "duration": 3.0,
                        "trim_in": 0.0,
                        "trim_out": 3.0,
                        "speed": 1.0,
                        "transform": {"x": 0.0, "y": 0.0, "scale_x": 1.0, "scale_y": 1.0, "rotation": 0.0, "opacity": 0.9, "blend_mode": "normal"},
                        "filters": {"brightness": 1.1, "contrast": 1.2, "saturation": 1.3, "hue": 10.0, "blur": 0.0, "vignette": 0.0, "sepia": 0.0, "grayscale": 0.0, "invert": 0.0},
                        "audio": {"volume": 0.8, "muted": False, "pan": 0.0, "fade_in": 0.0, "fade_out": 0.0}
                    },
                    # Clip 2: Audio clip on track A1
                    {
                        "id": "clip_a1",
                        "track_id": "t_audio",
                        "asset_id": audio_asset_id,
                        "type": "audio",
                        "name": "Melody Chime",
                        "start_time": 1.0,
                        "duration": 4.0,
                        "trim_in": 0.0,
                        "trim_out": 4.0,
                        "speed": 1.0,
                        "transform": {"x": 0.0, "y": 0.0, "scale_x": 1.0, "scale_y": 1.0, "rotation": 0.0, "opacity": 1.0, "blend_mode": "normal"},
                        "filters": {"brightness": 1.0, "contrast": 1.0, "saturation": 1.0, "hue": 0.0, "blur": 0.0, "vignette": 0.0, "sepia": 0.0, "grayscale": 0.0, "invert": 0.0},
                        "audio": {"volume": 1.0, "muted": False, "pan": 0.0, "fade_in": 0.5, "fade_out": 0.5}
                    },
                    # Clip 3: Text overlay on track T1 with bundled Roboto font
                    {
                        "id": "clip_t1",
                        "track_id": "t_text",
                        "type": "text",
                        "name": "Main Title",
                        "start_time": 0.5,
                        "duration": 4.0,
                        "trim_in": 0.0,
                        "trim_out": 4.0,
                        "speed": 1.0,
                        "transform": {"x": 0.0, "y": -0.2, "scale_x": 1.0, "scale_y": 1.0, "rotation": 0.0, "opacity": 1.0, "blend_mode": "normal"},
                        "filters": {"brightness": 1.0, "contrast": 1.0, "saturation": 1.0, "hue": 0.0, "blur": 0.0, "vignette": 0.0, "sepia": 0.0, "grayscale": 0.0, "invert": 0.0},
                        "text": {
                            "content": "ANTIGRAVITY NLE PRO",
                            "font_family": "Roboto-Bold",
                            "font_size": 60,
                            "font_color": "#FFD700",
                            "background_color": "transparent",
                            "alignment": "center",
                            "outline_color": "#000000",
                            "outline_width": 3,
                            "shadow": True
                        },
                        "audio": {"volume": 1.0, "muted": False, "pan": 0.0, "fade_in": 0.0, "fade_out": 0.0}
                    }
                ],
                "selected_clip_ids": [],
                "zoom_level": 60.0,
                "snap_enabled": True,
                "ripple_edit": False
            }

            save_res = await client.put(
                f"{BASE_API}/projects/{project_id}",
                json={"timeline_state": timeline_payload, "duration_seconds": 6.0},
                headers=headers
            )
            assert save_res.status_code == 200
            assert len(save_res.json()["timeline_state"]["clips"]) == 3
            print("  [PASS] Timeline assembled and validated via Pydantic schema.")
            results["6. Timeline Assembly"] = "PASS"
        except Exception as e:
            print(f"  [FAIL] {e}")
            results["6. Timeline Assembly"] = f"FAIL: {e}"

        # TEST 7: Render Job Trigger, WebSocket Progress & Final MP4 Verification
        print("\n[TEST 7] Render Job Trigger, Live WebSocket Progress & MP4 Export...")
        job_id = ""
        try:
            render_res = await client.post(
                f"{BASE_API}/renders",
                json={"project_id": project_id, "output_resolution": "720p", "fps": 30, "quality": "fast"},
                headers=headers
            )
            assert render_res.status_code == 201
            job = render_res.json()
            job_id = job["id"]
            print(f"  Render Job Created: {job_id} (Status: {job['status']})")

            # Connect to WebSocket to track live progress
            ws_url = f"{BASE_WS}/ws/renders/{job_id}"
            progress_events = []
            
            async with websockets.connect(ws_url) as ws:
                start_time = time.time()
                while time.time() - start_time < 30.0:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                        data = json.loads(msg)
                        progress_events.append(data)
                        print(f"    -> [WS Event] Status: {data.get('status')}, Progress: {data.get('progress')}% - {data.get('message', '')}")
                        if data.get("status") in ["COMPLETED", "FAILED"]:
                            break
                    except asyncio.TimeoutError:
                        # Poll DB status if socket is quiet
                        job_poll = await client.get(f"{BASE_API}/renders/{job_id}", headers=headers)
                        if job_poll.json()["status"] in ["COMPLETED", "FAILED"]:
                            break

            # Verify Final DB Job Status
            final_job_res = await client.get(f"{BASE_API}/renders/{job_id}", headers=headers)
            final_job = final_job_res.json()
            assert final_job["status"] == "COMPLETED", f"Job failed: {final_job.get('error_log')}"
            assert final_job["progress_percentage"] == 100
            assert final_job["output_file_path"] is not None
            assert os.path.exists(final_job["output_file_path"])

            # Verify Download Endpoint
            download_res = await client.get(f"{BASE_API}/renders/{job_id}/download")
            assert download_res.status_code == 200
            assert len(download_res.content) > 10000
            print(f"  [PASS] Render completed! Output size: {len(download_res.content) / 1024:.1f} KB")
            results["7. Render Engine & WebSocket"] = "PASS"
        except Exception as e:
            import traceback
            traceback.print_exc()
            results["7. Render Engine & WebSocket"] = f"FAIL: {repr(e)}"

        # TEST 8: Frontend Next.js UI Pages (Dashboard & Workstation)...
        print("\n[TEST 8] Frontend Next.js UI Pages (Dashboard & Workstation)...")
        try:
            # Test Dashboard
            dash_res = await client.get(f"{BASE_FRONTEND}/")
            assert dash_res.status_code == 200
            assert len(dash_res.text) > 1000

            # Test Editor Workstation
            editor_res = await client.get(f"{BASE_FRONTEND}/editor/{project_id}")
            assert editor_res.status_code == 200
            assert len(editor_res.text) > 1000
            print(f"  [PASS] Frontend Dashboard & Workstation served with HTTP 200 OK.")
            results["8. Frontend Next.js UI"] = "PASS"
        except Exception as e:
            print(f"  [FAIL] {e}")
            results["8. Frontend Next.js UI"] = f"FAIL: {e}"

    print("\n" + "=" * 70)
    print("  QA TEST REPORT SUMMARY")
    print("=" * 70)
    all_passed = True
    for test_name, status in results.items():
        print(f"  {test_name.ljust(40)}: {status}")
        if not status.startswith("PASS"):
            all_passed = False

    print("=" * 70)
    print(f"  FINAL RESULT: {'[SUCCESS] ALL TESTS PASSED' if all_passed else '[FAILURE] SOME TESTS FAILED'}")
    print("=" * 70)
    return all_passed

if __name__ == "__main__":
    success = asyncio.run(run_full_qa_suite())
    exit(0 if success else 1)
