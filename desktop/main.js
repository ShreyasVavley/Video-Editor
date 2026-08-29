const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

let mainWindow;
let backendProcess;

function startBackendAndCreateWindow() {
  // Start backend process
  const exePath = path.join(__dirname, "backend", "backend.exe");
  backendProcess = spawn(exePath, [], { stdio: "ignore" });

  backendProcess.on("error", (err) => {
    console.error("Failed to start backend process.", err);
  });

  // Wait for backend to be ready
  const checkInterval = setInterval(() => {
    http.get("http://127.0.0.1:8000/api/health", (res) => {
      if (res.statusCode === 200) {
        clearInterval(checkInterval);
        createWindow();
      }
    }).on("error", () => {
      // Still waiting
    });
  }, 1000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load Next.js static HTML
  mainWindow.loadFile(path.join(__dirname, "out", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendAndCreateWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
