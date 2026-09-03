import os
import asyncio
import tempfile
import shutil
from pathlib import Path

from app.config import settings

# Global rembg session initialized lazily to save startup time
_rembg_session = None
import asyncio
_ml_semaphore = asyncio.Semaphore(1)

def get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        import rembg
        # u2netp is a highly optimized, lightweight model (~4MB) suitable for free-tier hosting
        _rembg_session = rembg.new_session("u2netp")
    return _rembg_session

async def remove_image_background(input_path: str, output_path: str):
    """
    Removes background from an image.
    """
    def process():
        import rembg
        session = get_rembg_session()
        with open(input_path, 'rb') as i:
            input_data = i.read()
            output_data = rembg.remove(input_data, session=session)
            with open(output_path, 'wb') as o:
                o.write(output_data)

    loop = asyncio.get_running_loop()
    async with _ml_semaphore:
        await loop.run_in_executor(None, process)
    return output_path

async def remove_video_background(input_path: str, output_path: str, fps: float, progress_callback=None):
    """
    Removes background from a video by extracting frames, processing with rembg, and re-encoding to WebM (Alpha).
    """
    temp_dir = tempfile.mkdtemp(prefix="rembg_video_", dir=settings.UPLOADS_DIR)
    frames_in_dir = os.path.join(temp_dir, "in")
    frames_out_dir = os.path.join(temp_dir, "out")
    os.makedirs(frames_in_dir, exist_ok=True)
    os.makedirs(frames_out_dir, exist_ok=True)

    try:
        async with _ml_semaphore:
            # 1. Extract frames
            extract_cmd = [
                settings.get_ffmpeg_binary(),
                "-y", "-i", input_path,
                "-qscale:v", "2",
                os.path.join(frames_in_dir, "%05d.jpg")
            ]
            proc = await asyncio.create_subprocess_exec(
                *extract_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()

            frames = sorted(os.listdir(frames_in_dir))
            total_frames = len(frames)
            if total_frames == 0:
                raise Exception("No frames could be extracted from the video.")

            # 2. Process frames
            def process_frame(frame_name):
                import rembg
                in_f = os.path.join(frames_in_dir, frame_name)
                out_f = os.path.join(frames_out_dir, frame_name.replace('.jpg', '.png'))
                session = get_rembg_session()
                with open(in_f, 'rb') as i:
                    input_data = i.read()
                    output_data = rembg.remove(input_data, session=session)
                    with open(out_f, 'wb') as o:
                        o.write(output_data)

            loop = asyncio.get_running_loop()
            for idx, frame in enumerate(frames):
                await loop.run_in_executor(None, process_frame, frame)
                if progress_callback:
                    progress_callback(int((idx / total_frames) * 100))

            # 3. Stitch frames to transparent WebM
            stitch_cmd = [
                settings.get_ffmpeg_binary(),
                "-y",
                "-framerate", str(fps),
                "-i", os.path.join(frames_out_dir, "%05d.png"),
                "-c:v", "libvpx-vp9",
                "-pix_fmt", "yuva420p",
                # Include original audio
                "-i", input_path,
                "-c:a", "libopus",
                "-map", "0:v:0",
                "-map", "1:a:0?",
                "-shortest",
                output_path
            ]
            proc2 = await asyncio.create_subprocess_exec(
                *stitch_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await proc2.communicate()
        
            if progress_callback:
                progress_callback(100)

            return output_path

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
