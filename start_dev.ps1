# PowerShell launcher for Cloud-Native Video Editor
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   CLOUD-NATIVE VIDEO EDITING PLATFORM (NLE)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Starting FastAPI Backend and Next.js Frontend concurrently..." -ForegroundColor Yellow

$backendJob = Start-Process -FilePath "python" -ArgumentList "-m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000" -WorkingDirectory "$PSScriptRoot\backend" -PassThru
$frontendJob = Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru

Write-Host "`nServices launched:" -ForegroundColor Green
Write-Host " - Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host " - Backend API: http://localhost:8000/api" -ForegroundColor White
Write-Host " - API Docs:    http://localhost:8000/docs" -ForegroundColor White
Write-Host "`nPress Ctrl+C or close the terminal windows to exit." -ForegroundColor Gray
