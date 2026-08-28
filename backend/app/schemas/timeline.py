from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Any

class TransformConfig(BaseModel):
    x: float = 0.0          # Normalized center offset or pixel offset (-0.5 to 0.5 or px)
    y: float = 0.0
    scale_x: float = 1.0    # 1.0 = 100%
    scale_y: float = 1.0
    rotation: float = 0.0   # Degrees
    opacity: float = 1.0    # 0.0 to 1.0
    blend_mode: str = "normal"

class FilterConfig(BaseModel):
    brightness: float = 1.0 # 0.0 to 2.0 (1.0 default)
    contrast: float = 1.0   # 0.0 to 2.0 (1.0 default)
    saturation: float = 1.0 # 0.0 to 2.0 (1.0 default)
    hue: float = 0.0        # -180 to 180 degrees
    blur: float = 0.0       # Radius in pixels
    vignette: float = 0.0   # 0.0 to 1.0
    sepia: float = 0.0      # 0.0 to 1.0
    grayscale: float = 0.0  # 0.0 to 1.0
    invert: float = 0.0     # 0.0 to 1.0

class TransitionConfig(BaseModel):
    type: Literal[
        "none",
        "crossfade",
        "fade_black",
        "fade_white",
        "wipe_left",
        "wipe_right",
        "slide_up",
        "slide_down"
    ] = "none"
    duration: float = 0.5   # Seconds

class TextConfig(BaseModel):
    content: str = "Sample Text"
    font_family: str = "Roboto-Bold"
    font_size: int = 48
    font_color: str = "#FFFFFF"
    background_color: str = "transparent"
    background_padding: int = 10
    alignment: Literal["left", "center", "right"] = "center"
    vertical_alignment: Literal["top", "center", "bottom"] = "center"
    outline_color: str = "#000000"
    outline_width: int = 2
    shadow: bool = True

class AudioConfig(BaseModel):
    volume: float = 1.0     # 0.0 to 2.0 (1.0 default)
    muted: bool = False
    pan: float = 0.0        # -1.0 (Left) to +1.0 (Right)
    fade_in: float = 0.0    # Seconds
    fade_out: float = 0.0   # Seconds

class Clip(BaseModel):
    id: str
    track_id: str
    asset_id: Optional[str] = None
    type: Literal["video", "audio", "image", "text", "color"] = "video"
    name: str = "Clip"
    start_time: float = 0.0 # Position on timeline in seconds
    duration: float = 5.0   # Visible duration on timeline in seconds
    trim_in: float = 0.0    # Source media in-point in seconds
    trim_out: float = 5.0   # Source media out-point in seconds
    speed: float = 1.0      # Playback rate (0.25 to 4.0)
    transform: TransformConfig = Field(default_factory=TransformConfig)
    filters: FilterConfig = Field(default_factory=FilterConfig)
    text: Optional[TextConfig] = None
    audio: AudioConfig = Field(default_factory=AudioConfig)
    transition_in: Optional[TransitionConfig] = None
    transition_out: Optional[TransitionConfig] = None
    color: Optional[str] = "#3B82F6" # UI clip color

class Track(BaseModel):
    id: str
    name: str
    type: Literal["video", "audio", "text"]
    order: int
    muted: bool = False
    locked: bool = False
    hidden: bool = False
    volume: float = 1.0
    solo: bool = False

class TimelineState(BaseModel):
    version: int = 1
    width: int = 1920
    height: int = 1080
    fps: int = 30
    duration_seconds: float = 0.0
    playhead_position: float = 0.0
    tracks: List[Track] = Field(default_factory=list)
    clips: List[Clip] = Field(default_factory=list)
    selected_clip_ids: List[str] = Field(default_factory=list)
    zoom_level: float = 1.0
    snap_enabled: bool = True
    ripple_edit: bool = False
