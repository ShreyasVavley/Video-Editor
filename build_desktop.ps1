Write-Host "Building Next.js frontend..."
cd frontend
npm run build
cd ..

Write-Host "Copying frontend out/ to desktop/"
if (Test-Path desktop/out) { Remove-Item -Recurse -Force desktop/out }
Copy-Item -Recurse frontend/out desktop/out

Write-Host "Building Python backend..."
cd backend
pip install pyinstaller
pyinstaller --name backend --onedir --clean --noconfirm app/main.py
cd ..

Write-Host "Copying backend dist/ to desktop/"
if (Test-Path desktop/backend) { Remove-Item -Recurse -Force desktop/backend }
Copy-Item -Recurse backend/dist/backend desktop/backend

Write-Host "Installing Electron dependencies..."
cd desktop
npm install

Write-Host "Building Electron App..."
npm run dist
cd ..

Write-Host "Build complete! Look in desktop/dist for your setup file."

