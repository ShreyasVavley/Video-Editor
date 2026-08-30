import asyncio
import os
import re
import math
import struct
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
from app.config import settings
from app.schemas.timeline import TimelineState, Clip, Track, FilterConfig, TransformConfig, TextConfig

class FFmpegService:
    def __init__(self):
        self.ffmpeg_bin = settings.get_ffmpeg_binary()

    def _escape_filter_path(self, path: Path | str) -> str:
        """Escapes file path for FFmpeg filtergraph strings"""
        p = str(Path(path).resolve()).replace("\\", "/")
        # Escape colon after drive letter for FFmpeg filters
        if len(p) > 1 and p[1] == ":":
            p = p[0] + "\\:" + p[2:]
        return p

    async def probe_media(self, file_path: Path | str) -> Dict[str, Any]:
        """
        Extracts duration, resolution, fps, audio presence from media using FFmpeg
        """
        path = Path(file_path)
        if not path.exists():
            return {"duration": 0.0, "width": None, "height": None, "fps": None, "has_audio": False}

        cmd = [
            self.ffmpeg_bin,
            "-hide_banner",
            "-i", str(path)
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        _, stderr_bytes = await proc.communicate()
        stderr_text = stderr_bytes.decode("utf-8", errors="ignore")

        info: Dict[str, Any] = {
            "duration": 0.0,
            "width": None,
            "height": None,
            "fps": 30.0,
            "has_audio": False,
            "audio_sample_rate": 44100,
            "audio_channels": 2
        }

        # Parse Duration: 00:01:23.45
        dur_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", stderr_text)
        if dur_match:
            hours, mins, secs = dur_match.groups()
            info["duration"] = float(hours) * 3600 + float(mins) * 60 + float(secs)

        # Parse Video Stream: Video: ..., 1920x1080, ... 30 fps
        res_match = re.search(r"Video:.*,\s*(\d{2,5})x(\d{2,5})", stderr_text)
        if res_match:
            info["width"] = int(res_match.group(1))
            info["height"] = int(res_match.group(2))

        fps_match = re.search(r"(\d+(?:\.\d+)?)\s*fps", stderr_text)
        if fps_match:
            info["fps"] = float(fps_match.group(1))

        # Parse Audio Stream
        if "Audio:" in stderr_text:
            info["has_audio"] = True
            rate_match = re.search(r"Audio:.*,\s*(\d+)\s*Hz", stderr_text)
            if rate_match:
                info["audio_sample_rate"] = int(rate_match.group(1))
            if "stereo" in stderr_text:
                info["audio_channels"] = 2
            elif "mono" in stderr_text:
                info["audio_channels"] = 1

        return info

    async def generate_proxy(self, input_path: Path | str, output_proxy_path: Path | str) -> bool:
        """
        Creates a fast 720p/360p H.264 proxy with faststart for seamless browser timeline scrubbing
        """
        input_path = Path(input_path)
        output_path = Path(output_proxy_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-hide_banner",
            "-i", str(input_path),
            "-vf", "scale=-2:720",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-c:a", "aac",
            "-b:a", "96k",
            "-movflags", "+faststart",
            str(output_path)
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await proc.communicate()
        return proc.returncode == 0

    async def generate_thumbnail(self, input_path: Path | str, output_thumb_path: Path | str, timestamp: float = 1.0) -> bool:
        """
        Extracts a single frame snapshot as JPEG thumbnail
        """
        input_path = Path(input_path)
        output_path = Path(output_thumb_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-hide_banner",
            "-ss", str(timestamp),
            "-i", str(input_path),
            "-vframes", "1",
            "-vf", "scale=480:-1",
            "-q:v", "3",
            str(output_path)
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE
        )
        await proc.communicate()
        return proc.returncode == 0

    async def generate_waveform(self, input_path: Path | str, num_peaks: int = 150) -> List[float]:
        """
        Extracts peak audio amplitude data normalized to [0.0, 1.0] for the timeline visualizer
        """
        input_path = Path(input_path)
        if not input_path.exists():
            return [0.0] * num_peaks

        cmd = [
            self.ffmpeg_bin,
            "-hide_banner",
            "-i", str(input_path),
            "-ac", "1",
            "-ar", "4000",
            "-f", "s16le",
            "-"
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL
        )
        stdout_bytes, _ = await proc.communicate()

        if not stdout_bytes:
            return [0.0] * num_peaks

        # Parse 16-bit signed PCM integers using array to prevent OOM
        # struct.unpack creates a massive tuple of Python ints which explodes memory
        import array
        samples = array.array('h', stdout_bytes)
        
        sample_count = len(samples)
        if sample_count == 0:
            return [0.0] * num_peaks

        bucket_size = max(1, sample_count // num_peaks)

        peaks = []
        for i in range(num_peaks):
            start = i * bucket_size
            end = min(sample_count, start + bucket_size)
            if start >= sample_count:
                peaks.append(0.0)
                continue
            chunk = samples[start:end]
            if chunk:
                peak = max(abs(s) for s in chunk) / 32768.0
                peaks.append(round(min(1.0, peak), 3))
            else:
                peaks.append(0.0)

        return peaks

    def _build_filtergraph(
        self,
        timeline: TimelineState,
        asset_map: Dict[str, Path],
        target_width: int,
        target_height: int,
        target_fps: int,
        total_duration: float
    ) -> tuple[List[str], str, str]:
        """
        Compiles the multi-track timeline into FFmpeg input arguments and complex filtergraph
        Returns (input_args, video_map, audio_map)
        """
        input_args = []
        filter_chains = []
        
        # Base canvas generator (black background for entire project duration)
        filter_chains.append(
            f"color=c=black:s={target_width}x{target_height}:r={target_fps}:d={total_duration}[base_bg]"
        )
        
        # Audio silent base generator
        filter_chains.append(
            f"anullsrc=r=44100:cl=stereo:d={total_duration}[base_audio]"
        )

        input_index_map: Dict[str, int] = {}
        curr_input_idx = 0

        # Register input files
        sorted_clips = sorted(timeline.clips, key=lambda c: c.start_time)
        for clip in sorted_clips:
            if clip.asset_id and clip.asset_id in asset_map:
                asset_path = asset_map[clip.asset_id]
                if str(asset_path) not in input_index_map:
                    input_args.extend(["-i", str(asset_path)])
                    input_index_map[str(asset_path)] = curr_input_idx
                    curr_input_idx += 1

        # Process Video / Visual Clips
        active_video_layers = []
        audio_stream_labels = ["[base_audio]"]
        
        # Font file path for drawtext
        font_path_escaped = self._escape_filter_path(settings.DEFAULT_FONT_PATH)

        current_canvas = "[base_bg]"
        layer_idx = 0

        for clip in sorted_clips:
            start_t = clip.start_time
            dur = clip.duration
            end_t = start_t + dur
            
            # --- Text Overlay Clip ---
            if clip.type == "text" and clip.text:
                txt = clip.text
                text_content = txt.content.replace(":", "\\:").replace("'", "\\'")
                font_size = txt.font_size
                font_color = txt.font_color.replace("#", "0x")
                
                # Alignments
                x_pos = f"(w-text_w)/2 + {int(clip.transform.x * target_width)}"
                y_pos = f"(h-text_h)/2 + {int(clip.transform.y * target_height)}"
                if txt.alignment == "left":
                    x_pos = f"50 + {int(clip.transform.x * target_width)}"
                elif txt.alignment == "right":
                    x_pos = f"w-text_w-50 + {int(clip.transform.x * target_width)}"

                anim_style = getattr(txt, 'animation_style', 'none')
                anim_dur = getattr(txt, 'animation_duration', 1.0)

                # Animating Y position for slides
                if anim_style == 'slide_up':
                    y_pos = f"({y_pos}) + max(0, 1 - (t-{start_t:.3f})/{anim_dur:.3f}) * {int(target_height * 0.2)}"
                elif anim_style == 'slide_down':
                    y_pos = f"({y_pos}) - max(0, 1 - (t-{start_t:.3f})/{anim_dur:.3f}) * {int(target_height * 0.2)}"

                if anim_style == 'typewriter':
                    # Typewriter uses a transparent color source -> drawtext -> width-animated crop mask -> overlay
                    text_layer = f"[text_layer_{layer_idx}]"
                    draw_filter = (
                        f"color=c=black@0:s={target_width}x{target_height}:r={target_fps}:d={total_duration}[col_{layer_idx}]; "
                        f"[col_{layer_idx}]format=rgba,"
                        f"drawtext=fontfile='{font_path_escaped}':text='{text_content}':fontsize={font_size}:fontcolor={font_color}:"
                        f"x={x_pos}:y={y_pos}:enable='between(t,{start_t:.3f},{end_t:.3f})',"
                        f"crop=w='iw*min(1, max(0, (t-{start_t:.3f})/{anim_dur:.3f}))':h='ih':x=0:y=0"
                        f"{text_layer}"
                    )
                    filter_chains.append(draw_filter)
                    
                    next_canvas = f"[canvas_v{layer_idx}]"
                    overlay_filter = f"{current_canvas}{text_layer}overlay=x=0:y=0:enable='between(t,{start_t:.3f},{end_t:.3f})'{next_canvas}"
                    filter_chains.append(overlay_filter)
                    
                    current_canvas = next_canvas
                    layer_idx += 1
                else:
                    next_canvas = f"[canvas_v{layer_idx}]"
                    draw_filter = (
                        f"{current_canvas}drawtext="
                        f"fontfile='{font_path_escaped}':"
                        f"text='{text_content}':"
                        f"fontsize={font_size}:"
                        f"fontcolor={font_color}:"
                        f"x={x_pos}:y={y_pos}:"
                        f"enable='between(t,{start_t:.3f},{end_t:.3f})'"
                        f"{next_canvas}"
                    )
                    filter_chains.append(draw_filter)
                    current_canvas = next_canvas
                    layer_idx += 1
                continue

            # --- Video / Image Clip ---
            if clip.asset_id and clip.asset_id in asset_map:
                asset_path = asset_map[clip.asset_id]
                inp_idx = input_index_map[str(asset_path)]
                
                if clip.type in ["video", "image"]:
                    # Visual Processing Chain
                    v_in = f"[{inp_idx}:v]"
                    v_processed = f"[v_proc_{clip.id}]"
                    
                    filters = []
                    # Trim source
                    trim_in = clip.trim_in
                    trim_out = clip.trim_in + (dur * clip.speed)
                    filters.append(f"trim=start={trim_in:.3f}:end={trim_out:.3f},setpts=PTS-STARTPTS")
                    
                    # Speed adjustment
                    if clip.speed != 1.0 and clip.speed > 0:
                        pts_scale = 1.0 / clip.speed
                        filters.append(f"setpts={pts_scale:.4f}*PTS")
                        
                    # Reverse
                    if getattr(clip, 'reverse', False):
                        filters.append("reverse")
                        
                    # Cropping (Edge masking)
                    ct = getattr(clip.transform, 'crop_top', 0)
                    cb = getattr(clip.transform, 'crop_bottom', 0)
                    cl = getattr(clip.transform, 'crop_left', 0)
                    cr = getattr(clip.transform, 'crop_right', 0)
                    if ct > 0 or cb > 0 or cl > 0 or cr > 0:
                        cw = f"iw*(1-{cl}-{cr})"
                        ch = f"ih*(1-{ct}-{cb})"
                        cx = f"iw*{cl}"
                        cy = f"ih*{ct}"
                        filters.append(f"crop={cw}:{ch}:{cx}:{cy}")
                        
                    # Flip / Mirror
                    if getattr(clip.transform, 'flip_x', False):
                        filters.append("hflip")
                    if getattr(clip.transform, 'flip_y', False):
                        filters.append("vflip")
                    
                    # Scaling & Transform
                    scale_w = int(target_width * clip.transform.scale_x)
                    scale_h = int(target_height * clip.transform.scale_y)
                    filters.append(f"scale={scale_w}:{scale_h}:force_original_aspect_ratio=decrease,pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:black")

                    # Color / Filters
                    f = clip.filters
                    if f.brightness != 1.0 or f.contrast != 1.0 or f.saturation != 1.0:
                        filters.append(f"eq=brightness={f.brightness - 1.0:.2f}:contrast={f.contrast:.2f}:saturation={f.saturation:.2f}")
                    if f.blur > 0:
                        blur_radius = max(1, int(f.blur))
                        filters.append(f"boxblur={blur_radius}")
                    if f.grayscale > 0:
                        filters.append(f"hue=s={1.0 - f.grayscale:.2f}")

                    # Chroma Key (Green Screen)
                    chroma_enabled = getattr(f, 'chroma_key_enabled', False)
                    if chroma_enabled:
                        c_color = getattr(f, 'chroma_key_color', '#00ff00').replace('#', '0x')
                        c_sim = getattr(f, 'chroma_key_similarity', 0.3)
                        c_blend = getattr(f, 'chroma_key_blend', 0.1)
                        filters.append(f"format=yuva420p,colorkey=color={c_color}:similarity={c_sim:.3f}:blend={c_blend:.3f}")

                    # Alpha / Opacity
                    if clip.transform.opacity < 1.0:
                        filters.append(f"format=yuva420p,colorchannelmixer=aa={clip.transform.opacity:.2f}")

                    # Video Transitions (Fade)
                    t_in = getattr(clip, 'transition_in', None)
                    if t_in and t_in.type == 'fade_black':
                        filters.append(f"fade=t=in:st=0:d={t_in.duration:.3f}")
                        
                    t_out = getattr(clip, 'transition_out', None)
                    if t_out and t_out.type == 'fade_black':
                        filters.append(f"fade=t=out:st={dur - t_out.duration:.3f}:d={t_out.duration:.3f}")

                    filter_chains.append(f"{v_in}{','.join(filters)}{v_processed}")

                    # Overlay onto canvas
                    next_canvas = f"[canvas_v{layer_idx}]"
                    
                    is_anim = getattr(clip.transform, 'is_animated', False)
                    if is_anim:
                        e_x = getattr(clip.transform, 'end_x', clip.transform.x)
                        e_y = getattr(clip.transform, 'end_y', clip.transform.y)
                        start_px_x = int(clip.transform.x * target_width)
                        start_px_y = int(clip.transform.y * target_height)
                        end_px_x = int(e_x * target_width)
                        end_px_y = int(e_y * target_height)
                        
                        # t is global time. clip time is (t - start_t). progress is (t - start_t) / dur
                        x_expr = f"{start_px_x}+({end_px_x}-{start_px_x})*min(1.0,max(0.0,(t-{start_t:.3f})/{dur:.3f}))"
                        y_expr = f"{start_px_y}+({end_px_y}-{start_px_y})*min(1.0,max(0.0,(t-{start_t:.3f})/{dur:.3f}))"
                    else:
                        x_expr = f"{int(clip.transform.x * target_width)}"
                        y_expr = f"{int(clip.transform.y * target_height)}"

                    overlay_str = (
                        f"{current_canvas}{v_processed}overlay="
                        f"x='{x_expr}':y='{y_expr}':"
                        f"enable='between(t,{start_t:.3f},{end_t:.3f})':"
                        f"eof_action=pass"
                        f"{next_canvas}"
                    )
                    filter_chains.append(overlay_str)
                    current_canvas = next_canvas
                    layer_idx += 1

                # Audio Processing Chain (for video with audio or dedicated audio clips)
                if clip.type in ["video", "audio"] and not clip.audio.muted:
                    a_in = f"[{inp_idx}:a]"
                    a_processed = f"[a_proc_{clip.id}]"
                    
                    a_filters = []
                    trim_in = clip.trim_in
                    trim_out = clip.trim_in + (dur * clip.speed)
                    a_filters.append(f"atrim=start={trim_in:.3f}:end={trim_out:.3f},asetpts=PTS-STARTPTS")
                    
                    # Audio speed (atempo 0.5 to 2.0)
                    if clip.speed != 1.0 and clip.speed > 0:
                        speed = clip.speed
                        while speed > 2.0:
                            a_filters.append("atempo=2.0")
                            speed /= 2.0
                        while speed < 0.5:
                            a_filters.append("atempo=0.5")
                            speed /= 0.5
                        if speed != 1.0:
                            a_filters.append(f"atempo={speed:.4f}")

                    # Reverse
                    if getattr(clip, 'reverse', False):
                        a_filters.append("areverse")

                    # Volume
                    vol = clip.audio.volume
                    if vol != 1.0:
                        a_filters.append(f"volume={vol:.2f}")
                        
                    # Pitch Shift (asetrate + atempo combo)
                    pitch = getattr(clip.audio, 'pitch', 0)
                    if pitch != 0:
                        factor = 2 ** (pitch / 12.0)
                        a_filters.append(f"asetrate=44100*{factor:.4f},atempo={1.0/factor:.4f}")
                        
                    # Bass / Treble EQ
                    bass = getattr(clip.audio, 'bass', 0)
                    if bass != 0:
                        a_filters.append(f"bass=g={bass}")
                        
                    treble = getattr(clip.audio, 'treble', 0)
                    if treble != 0:
                        a_filters.append(f"treble=g={treble}")
                        
                    # Panning
                    pan = getattr(clip.audio, 'pan', 0)
                    if pan != 0:
                        left_mult = 1.0 - max(0.0, float(pan))
                        right_mult = 1.0 - max(0.0, -float(pan))
                        a_filters.append(f"pan=stereo|c0={left_mult:.2f}*c0|c1={right_mult:.2f}*c1")
                    # Audio Transitions (Fade)
                    t_in = getattr(clip, 'transition_in', None)
                    if t_in and t_in.type == 'fade_black':
                        a_filters.append(f"afade=t=in:st=0:d={t_in.duration:.3f}")
                        
                    t_out = getattr(clip, 'transition_out', None)
                    if t_out and t_out.type == 'fade_black':
                        a_filters.append(f"afade=t=out:st={dur - t_out.duration:.3f}:d={t_out.duration:.3f}")

                    # Delay to place on timeline
                    delay_ms = int(start_t * 1000)
                    if delay_ms > 0:
                        a_filters.append(f"adelay={delay_ms}|{delay_ms}")

                    filter_chains.append(f"{a_in}{','.join(a_filters)}{a_processed}")
                    audio_stream_labels.append(a_processed)

        # Mix Audio Streams
        final_audio = "[final_a]"
        if len(audio_stream_labels) > 1:
            inputs_count = len(audio_stream_labels)
            mix_inputs = "".join(audio_stream_labels)
            filter_chains.append(
                f"{mix_inputs}amix=inputs={inputs_count}:duration=first:dropout_transition=0{final_audio}"
            )
        else:
            final_audio = audio_stream_labels[0]

        final_video = current_canvas
        complex_filter = ";".join(filter_chains)
        return input_args, complex_filter, final_video, final_audio

    async def render_timeline(
        self,
        timeline: TimelineState,
        asset_map: Dict[str, Path],
        output_file_path: Path | str,
        progress_callback: Optional[Callable[[int, str], None]] = None,
        output_res: str = "1080p",
        target_fps: int = 30,
        quality: str = "balanced"
    ) -> bool:
        """
        Compiles timeline into full FFmpeg command and renders final MP4 with live progress tracking
        """
        out_path = Path(output_file_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)

        # Determine dimensions
        res_presets = {
            "4K": (3840, 2160),
            "1080p": (1920, 1080),
            "720p": (1280, 720),
            "480p": (854, 480),
            "1080x1920": (1080, 1920), # Shorts / Reels
            "1080x1080": (1080, 1080)  # Square
        }
        target_w, target_h = res_presets.get(output_res, (timeline.width or 1920, timeline.height or 1080))
        
        # Calculate total timeline duration
        total_duration = timeline.duration_seconds
        if total_duration <= 0.0:
            for clip in timeline.clips:
                total_duration = max(total_duration, clip.start_time + clip.duration)
        if total_duration <= 0.0:
            total_duration = 5.0 # fallback default

        total_frames = max(1, int(total_duration * target_fps))

        # Preset & CRF based on quality
        preset = "medium" if quality == "balanced" else ("ultrafast" if quality == "fast" else "slow")
        crf = "23" if quality == "balanced" else ("28" if quality == "fast" else "18")

        # Compile filtergraph
        input_args, filter_str, v_out, a_out = self._build_filtergraph(
            timeline=timeline,
            asset_map=asset_map,
            target_width=target_w,
            target_height=target_h,
            target_fps=target_fps,
            total_duration=total_duration
        )

        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-hide_banner",
            *input_args,
            "-filter_complex", filter_str,
            "-map", v_out,
            "-map", a_out,
            "-c:v", "libx264",
            "-preset", preset,
            "-crf", crf,
            "-pix_fmt", "yuv420p",
            "-r", str(target_fps),
            "-c:a", "aac",
            "-b:a", "192k",
            "-t", f"{total_duration:.3f}",
            "-movflags", "+faststart",
            str(out_path)
        ]

        if progress_callback:
            progress_callback(5, f"Starting render for {total_duration:.1f}s video ({total_frames} frames)...")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        # Parse stderr progress asynchronously
        async def read_stderr():
            buffer = ""
            while True:
                chunk = await proc.stderr.read(256)
                if not chunk:
                    break
                text = chunk.decode("utf-8", errors="ignore")
                buffer += text
                
                # Match frame= 123
                frame_matches = re.findall(r"frame=\s*(\d+)", buffer)
                if frame_matches:
                    latest_frame = int(frame_matches[-1])
                    pct = min(99, int((latest_frame / total_frames) * 100))
                    if progress_callback:
                        progress_callback(pct, f"Rendering frame {latest_frame}/{total_frames} ({pct}%)")

        try:
            await asyncio.gather(read_stderr(), proc.wait())
        except Exception as e:
            if progress_callback:
                progress_callback(0, f"Error during render: {str(e)}")
            return False

        if proc.returncode == 0:
            if progress_callback:
                progress_callback(100, "Render completed successfully!")
            return True
        else:
            if progress_callback:
                progress_callback(0, f"FFmpeg exited with error code {proc.returncode}")
            return False

ffmpeg_service = FFmpegService()
