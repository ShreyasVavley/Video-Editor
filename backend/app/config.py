import os
import shutil
from pathlib import Path
from pydantic_settings import BaseSettings

# Base directories
BACKEND_DIR = Path(__file__).resolve().parent.parent
BASE_MEDIA_DIR = BACKEND_DIR / "media"
FONTS_DIR = BACKEND_DIR / "assets" / "fonts"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cloud-Native Video Editor API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Security
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BACKEND_DIR / 'editor.db'}")
    
    # Media Storage Paths
    MEDIA_DIR: Path = BASE_MEDIA_DIR
    UPLOADS_DIR: Path = BASE_MEDIA_DIR / "uploads"
    PROXIES_DIR: Path = BASE_MEDIA_DIR / "proxies"
    EXPORTS_DIR: Path = BASE_MEDIA_DIR / "exports"
    FONTS_DIR: Path = FONTS_DIR
    DEFAULT_FONT_PATH: Path = FONTS_DIR / "Roboto-Bold.ttf"
    
    # FFmpeg binary path resolver
    FFMPEG_PATH: str = os.getenv("FFMPEG_PATH", "")

    def get_ffmpeg_binary(self) -> str:
        if self.FFMPEG_PATH and os.path.exists(self.FFMPEG_PATH):
            return self.FFMPEG_PATH
        
        # Check system PATH
        sys_ffmpeg = shutil.which("ffmpeg")
        if sys_ffmpeg:
            return sys_ffmpeg
            
        # Try imageio_ffmpeg
        try:
            import imageio_ffmpeg
            return imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            return "ffmpeg"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure directories exist
for directory in [settings.MEDIA_DIR, settings.UPLOADS_DIR, settings.PROXIES_DIR, settings.EXPORTS_DIR, settings.FONTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)
