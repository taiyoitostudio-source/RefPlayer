import { app, BrowserWindow, shell } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { registerIpcHandlers } from './ipc';
import { settingsManager } from './settings';

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.wmv', '.flv', '.ogv', '.ts'];

/**
 * Extract a video file path from process argv. When the app is launched via
 * "Open with" or by double-clicking an associated file, the path is appended
 * to argv. We skip flags and non-file args, and only accept paths with a
 * known video extension that exist on disk.
 */
function extractFilePathFromArgv(argv: string[]): string | null {
  for (const arg of argv) {
    if (!arg || arg.startsWith('-')) continue;
    const lower = arg.toLowerCase();
    if (!VIDEO_EXTS.some((ext) => lower.endsWith(ext))) continue;
    try {
      if (existsSync(arg)) return arg;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Pending file path captured from argv before the renderer is ready.
 * The renderer queries this once via IPC on startup, then it's cleared.
 */
let pendingOpenFile: string | null = null;
export function consumePendingOpenFile(): string | null {
  const f = pendingOpenFile;
  pendingOpenFile = null;
  return f;
}

function createMainWindow() {
  const bounds = settingsManager.get('windowBounds') ?? { width: 1280, height: 800 };
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#C0C0C0',
    title: 'RefPlayer',
    frame: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Allow the renderer to load local file:// URLs for video playback.
      // This is safe for a desktop app that only plays user-chosen local files.
      webSecurity: !isDev,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:stateChanged', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:stateChanged', false));
  mainWindow.on('focus', () => mainWindow?.webContents.send('window:focusChanged', true));
  mainWindow.on('blur', () => mainWindow?.webContents.send('window:focusChanged', false));

  mainWindow.on('close', () => {
    if (!mainWindow) return;
    const b = mainWindow.getBounds();
    settingsManager.set('windowBounds', b);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

export function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 820,
    height: 640,
    parent: mainWindow ?? undefined,
    modal: false,
    backgroundColor: '#C0C0C0',
    title: '設定 — RefPlayer',
    frame: false,
    show: false,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: !isDev,
    },
  });
  settingsWindow.on('ready-to-show', () => settingsWindow?.show());
  settingsWindow.on('closed', () => { settingsWindow = null; });
  settingsWindow.on('maximize', () => settingsWindow?.webContents.send('window:stateChanged', true));
  settingsWindow.on('unmaximize', () => settingsWindow?.webContents.send('window:stateChanged', false));
  settingsWindow.on('focus', () => settingsWindow?.webContents.send('window:focusChanged', true));
  settingsWindow.on('blur', () => settingsWindow?.webContents.send('window:focusChanged', false));

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/settings.html`);
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'));
  }
}

export function getMainWindow() { return mainWindow; }

// ---- Single-instance lock + file association ----
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  pendingOpenFile = extractFilePathFromArgv(process.argv);

  app.on('second-instance', (_event, argv) => {
    const file = extractFilePathFromArgv(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (file) mainWindow.webContents.send('app:openFile', file);
    } else if (file) {
      pendingOpenFile = file;
    }
  });

  app.whenReady().then(() => {
    registerIpcHandlers();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
