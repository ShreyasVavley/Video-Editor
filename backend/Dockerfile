FROM python:3.11-slim

# Install system dependencies & FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-roboto \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source & assets
COPY app/ ./app/
COPY assets/ ./assets/

# Prepare persistent media storage directories
RUN mkdir -p media/uploads media/proxies media/exports

ENV PORT=8000
EXPOSE 8000 10000

# Bind dynamically to $PORT (Render/Cloud) or default 8000 (Docker) with 2 workers for 512MB free tier
CMD ["sh", "-c", "gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:${PORT:-8000} --timeout 120"]
