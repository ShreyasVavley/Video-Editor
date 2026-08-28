#!/usr/bin/env bash
set -e

# ==============================================================================
# 🚀 1-CLICK PRODUCTION DEPLOYMENT SCRIPT
# Cloud-Native Non-Linear Video Editor Platform (Zero External APIs)
# ==============================================================================

echo "======================================================================"
echo "  🚀 DEPLOYING CLOUD-NATIVE VIDEO EDITING PLATFORM TO PRODUCTION"
echo "======================================================================"

# 1. Verify / Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "[*] Docker not found. Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable --now docker
fi

# 2. Setup Production Environment Variables
if [ ! -f .env.production ]; then
    echo "[*] Creating .env.production with secure generated secrets..."
    RANDOM_DB_PASS=$(openssl rand -hex 16 2>/dev/null || date +%s%N | sha256sum | head -c 32)
    RANDOM_SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)

    cat <<EOF > .env.production
POSTGRES_USER=editor_user
POSTGRES_PASSWORD=${RANDOM_DB_PASS}
POSTGRES_DB=video_editor_prod
SECRET_KEY=${RANDOM_SECRET_KEY}
MAX_UPLOAD_SIZE_MB=10240
EOF
    echo "[+] .env.production generated successfully."
fi

# 3. Create persistent directories and set permissions
echo "[*] Preparing media storage volumes..."
mkdir -p backend/media/uploads backend/media/proxies backend/media/exports nginx/ssl

# 4. Pull and Build Production Containers
echo "[*] Building and launching multi-container production stack..."
docker compose -f docker-compose.prod.yml --env-file .env.production pull || true
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 5. Wait for Services and Verify Health
echo "[*] Waiting for services to initialize..."
sleep 8

# Health check
if curl -s -f http://localhost/api/health > /dev/null; then
    echo ""
    echo "======================================================================"
    echo "  ✅ DEPLOYMENT SUCCESSFUL! PLATFORM IS LIVE"
    echo "======================================================================"
    echo "  - Web Workstation: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    echo "  - Backend API:    http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')/api"
    echo "  - API Swagger:    http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')/docs"
    echo "======================================================================"
else
    echo "[!] Stack launched. Checking logs with: docker compose -f docker-compose.prod.yml logs"
fi
