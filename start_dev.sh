#!/usr/bin/env bash
set -e

echo "==================================================="
echo "   CLOUD-NATIVE VIDEO EDITING PLATFORM (NLE)"
echo "==================================================="
echo "Starting FastAPI Backend and Next.js Frontend..."

# Function to kill child processes on exit
cleanup() {
    echo "Stopping services..."
    kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Start Backend
(cd backend && python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &

# Start Frontend
(cd frontend && npm run dev) &

echo ""
echo "Services active:"
echo " - Frontend:    http://localhost:3000"
echo " - Backend API: http://localhost:8000/api"
echo " - API Docs:    http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services."

wait
