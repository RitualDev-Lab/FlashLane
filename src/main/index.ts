import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Disable hardware acceleration issues if running in some VM environments
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const distPreload = path.resolve(__dirname, '../preload/index.cjs');
  const devPreload = path.resolve(__dirname, '../../src/preload/index.cjs');
  const preloadPath = fs.existsSync(distPreload) ? distPreload : devPreload;

  console.log('⚡ [FlashLane Main] Initializing BrowserWindow...');
  console.log('⚡ [FlashLane Main] Preload script path:', preloadPath);
  console.log('⚡ [FlashLane Main] Preload exists:', fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 600,
    height: 840,
    minWidth: 540,
    minHeight: 760,
    resizable: true,
    frame: false,
    show: false,
    backgroundColor: '#090d16',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Track preload script loading errors
  mainWindow.webContents.on('preload-error', (_event, scriptPath, err) => {
    console.error('❌ [FlashLane Main] CRITICAL PRELOAD ERROR at', scriptPath, ':', err);
  });

  // Relay renderer console messages to the terminal
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    console.log(`[Renderer Log]:`, message);
  });

  registerIpcHandlers(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
