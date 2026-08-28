import os
import re
from pathlib import Path
from typing import Optional, Generator
from fastapi import Request, HTTPException, status
from fastapi.responses import StreamingResponse

def parse_byte_range(range_header: str, file_size: int):
    """
    Parses a Range header (e.g. 'bytes=0-1048575' or 'bytes=1000-')
    Returns (start, end, content_length)
    """
    match = re.match(r"^bytes=(\d*)-(\d*)$", range_header.strip())
    if not match:
        return 0, file_size - 1, file_size

    start_str, end_str = match.groups()
    if start_str and end_str:
        start = int(start_str)
        end = int(end_str)
    elif start_str:
        start = int(start_str)
        end = file_size - 1
    elif end_str:
        # Suffix byte range
        suffix_length = int(end_str)
        start = max(0, file_size - suffix_length)
        end = file_size - 1
    else:
        start = 0
        end = file_size - 1

    # Clamp ranges to valid file bounds
    start = max(0, min(start, file_size - 1))
    end = max(start, min(end, file_size - 1))
    content_length = end - start + 1
    return start, end, content_length

def file_chunk_generator(file_path: Path, start: int, content_length: int, chunk_size: int = 1024 * 1024) -> Generator[bytes, None, None]:
    """
    Yields chunks of bytes from start up to content_length
    """
    bytes_remaining = content_length
    with open(file_path, "rb") as f:
        f.seek(start)
        while bytes_remaining > 0:
            current_read_size = min(chunk_size, bytes_remaining)
            chunk = f.read(current_read_size)
            if not chunk:
                break
            bytes_remaining -= len(chunk)
            yield chunk

def range_stream_response(file_path: Path | str, request: Request, content_type: str = "video/mp4") -> StreamingResponse:
    """
    Creates an optimized HTTP 206 Partial Content or HTTP 200 StreamingResponse
    for high-performance HTML5 video & audio scrubbing.
    """
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media file not found on disk"
        )

    file_size = os.path.getsize(path)
    range_header = request.headers.get("Range")

    if range_header:
        start, end, content_length = parse_byte_range(range_header, file_size)
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": content_type,
            "Cache-Control": "public, max-age=3600",
        }
        return StreamingResponse(
            file_chunk_generator(path, start, content_length),
            status_code=status.HTTP_206_PARTIAL_CONTENT,
            headers=headers
        )
    else:
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": content_type,
            "Cache-Control": "public, max-age=3600",
        }
        return StreamingResponse(
            file_chunk_generator(path, 0, file_size),
            status_code=status.HTTP_200_OK,
            headers=headers
        )
