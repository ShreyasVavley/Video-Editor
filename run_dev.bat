@echo off
echo ===================================================
echo   CLOUD-NATIVE VIDEO EDITING PLATFORM (NLE)
echo ===================================================
echo Starting FastAPI Backend and Next.js Frontend...

REM Start Backend
start "Video Editor Backend (FastAPI)" cmd /k "cd backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

REM Start Frontend
start "Video Editor Frontend (Next.js)" cmd /k "cd frontend && npm run dev"

echo.
echo Application is starting:
echo  - Frontend: http://localhost:3000
echo  - Backend API: http://localhost:8000/api
echo  - API Docs: http://localhost:8000/docs
echo.
pause
