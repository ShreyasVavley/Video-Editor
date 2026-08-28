# 🌐 Real-World Production Deployment Guide

This guide details how to deploy the **Cloud-Native Video Editing Platform (NLE)** to production on any cloud server, Virtual Private Server (VPS), or dedicated bare-metal machine with **zero external cloud API dependencies**.

---

## 🏗️ Recommended Cloud Infrastructure

| Workload Tier | Recommended Specs | Cloud Providers | Estimated Cost |
|---|---|---|---|
| **Starter / Fast Testing** | 2-4 vCPU, 4-8 GB RAM, 50 GB NVMe | DigitalOcean Droplet, Hetzner Cloud CPX21, Linode | ~$10 - $20/mo |
| **Production Team Studio (1080p)** | 8 vCPU, 16-32 GB RAM, 200 GB NVMe | AWS EC2 `c6i.2xlarge`, Hetzner CCX33 | ~$40 - $80/mo |
| **High-End 4K Studio (GPU Accelerated)** | 8+ vCPU, 32 GB RAM, 1TB NVMe, Nvidia T4 / A10G | AWS EC2 `g4dn.xlarge`, Lambda Cloud, RunPod | ~$100 - $200/mo |

---

## 🚀 Quick Deployment (1-Click Automated Script)

### Step 1: Connect to your Ubuntu / Debian VPS
```bash
ssh root@YOUR_SERVER_IP
```

### Step 2: Clone the Repository
```bash
git clone https://github.com/YOUR_REPO/video-editor.git
cd video-editor
```

### Step 3: Run the 1-Click Deployment Script
```bash
chmod +x deploy.sh
./deploy.sh
```

The script will automatically:
1. Install Docker and Docker Compose (if not already installed).
2. Generate secure cryptographic secrets for PostgreSQL and JWT authentication in `.env.production`.
3. Create optimized storage directories for `/uploads`, `/proxies`, `/exports`.
4. Build the standalone Next.js frontend, Gunicorn multi-worker FastAPI backend, PostgreSQL database, Redis broker, and Nginx reverse proxy.
5. Launch all services with automatic restart policies.

---

## 🔒 Custom Domain & Free HTTPS (SSL) Setup

To connect your custom domain (e.g., `studio.yourdomain.com`) with automated SSL certificates:

### 1. Point DNS Records
Add an `A Record` in your DNS provider:
- **Host / Name:** `studio` (or `@` for root domain)
- **Value / Target:** `YOUR_SERVER_IP`

### 2. Install Certbot on Server
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Generate Free Let's Encrypt Certificate
```bash
sudo certbot certonly --standalone -d studio.yourdomain.com
```

### 4. Enable HTTPS in Nginx
Update `nginx/conf.d/editor.conf` to enable port 443 with your certificate paths:
```nginx
server {
    listen 80;
    server_name studio.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name studio.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/studio.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/studio.yourdomain.com/privkey.pem;

    client_max_body_size 10G;

    # ... remaining reverse proxy config ...
}
```
Reload Nginx:
```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## ⚡ GPU Hardware Acceleration (Nvidia NVENC)

To enable ultra-fast GPU video transcoding (rendering 1080p/4K footage at 5x–10x real-time speed):

### 1. Install Nvidia Container Toolkit
```bash
# Add Nvidia drivers and toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### 2. Enable GPU in `docker-compose.prod.yml`
Add the `deploy.resources.reservations.devices` block to the `backend` service:
```yaml
backend:
  # ...
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu, video]
```

FFmpeg will automatically leverage `h264_nvenc` and `hevc_nvenc` for hardware-accelerated video encoding.

---

## 📊 Maintenance, Logs & Scaling

### View Live Logs
```bash
# All containers
docker compose -f docker-compose.prod.yml logs -f

# Backend FFmpeg rendering logs
docker compose -f docker-compose.prod.yml logs -f backend

# Frontend logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Database Backup
```bash
# Backup PostgreSQL to a timestamped SQL dump
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U editor_user video_editor_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Updating to Latest Version
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
