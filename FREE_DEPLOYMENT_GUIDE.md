# 🆓 100% Free Deployment Guide

Here are the best ways to host the entire **Video Editor (Frontend + Backend + FFmpeg + WebSockets)** for **$0 / month**.

---

## 🥇 Method 1: Render.com + Vercel (Easiest & Most Popular)

In this setup:
- **Backend (FastAPI + FFmpeg + Docker)** runs on **Render.com** (Free Web Service).
- **Frontend (Next.js)** runs on **Vercel** (Free Unlimited Bandwidth).

### Step 1: Deploy Backend on Render (Free)
1. Go to [Render.com](https://render.com/) and log in with your GitHub account.
2. Click **"New +"** $\rightarrow$ **"Web Service"**.
3. Select your repository: **`ShreyasVavley/Video-Editor`**.
4. Set the settings:
   - **Name:** `video-editor-backend`
   - **Language / Environment:** `Docker`
   - **Dockerfile Path:** `Dockerfile` (or leave default)
   - **Docker Build Context:** `.` (or leave default)
   - **Instance Type:** `Free`
5. Click **"Deploy Web Service"**.
6. Once deployed, copy your backend URL (e.g. `https://video-editor-backend-xxxx.onrender.com`).

---

### Step 2: Deploy Frontend on Vercel (Free)
1. Go to [Vercel.com](https://vercel.com/) and log in with GitHub.
2. Click **"Add New..."** $\rightarrow$ **"Project"**.
3. Import **`ShreyasVavley/Video-Editor`**.
4. Set the settings:
   - **Root Directory:** Click "Edit" and select `frontend`.
   - **Framework Preset:** `Next.js`.
5. Under **Environment Variables**, add:
   - **Key:** `BACKEND_URL`
   - **Value:** `https://video-editor-backend-xxxx.onrender.com` (Your Render backend URL from Step 1)
   - **Key:** `NEXT_PUBLIC_WS_URL`
   - **Value:** `video-editor-backend-xxxx.onrender.com`
6. Click **"Deploy"**.

🎉 **Your Video Editor is now live for free on your Vercel URL!**

---

## 🏆 Method 2: Oracle Cloud Always Free Tier (Most Powerful)
*Oracle Cloud offers the most generous free tier in the world: **4 ARM CPU Cores, 24 GB RAM, and 200 GB NVMe Storage** completely free forever!*

1. Create a free account at [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
2. Create an **Ubuntu 24.04** Compute Instance (select Ampere A1 Compute with 4 OCPUs and 24 GB RAM).
3. Connect to your instance via SSH:
   ```bash
   ssh ubuntu@YOUR_ORACLE_IP
   ```
4. Clone and run the 1-click deployment script:
   ```bash
   git clone https://github.com/ShreyasVavley/Video-Editor.git
   cd Video-Editor
   chmod +x deploy.sh
   ./deploy.sh
   ```
5. Open ports 80 and 443 in your Oracle Cloud Security List.
6. Access your editor at `http://YOUR_ORACLE_IP`!

---

## 🚀 Method 3: Hugging Face Spaces (Free Docker 16GB RAM)
1. Go to [Hugging Face Spaces](https://huggingface.co/spaces).
2. Click **"Create new Space"**.
3. Select **Docker** (Blank).
4. Connect your GitHub repository or push the `backend` folder.
5. Hugging Face provides **16 GB RAM and 2 vCPUs** for free!
