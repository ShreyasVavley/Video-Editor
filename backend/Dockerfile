FROM python:3.11-slim

# Install system dependencies & FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-roboto \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Universally copy files whether Docker context is root (.) or ./backend
COPY . /tmp/build/
RUN if [ -d /tmp/build/backend/app ]; then \
        cp /tmp/build/backend/requirements.txt ./ && \
        cp -r /tmp/build/backend/app ./ && \
        cp -r /tmp/build/backend/assets ./; \
    else \
        cp /tmp/build/requirements.txt ./ && \
        cp -r /tmp/build/app ./ && \
        cp -r /tmp/build/assets ./; \
    fi && \
    rm -rf /tmp/build

# Install Python requirements
RUN pip install --no-cache-dir -r requirements.txt

# Prepare persistent media storage directories
RUN mkdir -p media/uploads media/proxies media/exports

ENV PORT=8000
EXPOSE 8000 10000

# Bind dynamically to $PORT (Render/Cloud) or default 8000 (Docker) with 2 workers for 512MB free tier
CMD ["sh", "-c", "gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:${PORT:-8000} --timeout 120"]
