import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import { promises as fs } from 'node:fs';
import { probeVideo, exportMp4 } from './ffmpeg';
import { settingsManager, type SettingsSchema } from './settings';
import { loadAllPlugins, userPluginsRoot } from './plugin-loader';
import { openSettingsWindow, getMainWindow } from './index';

export function registerIpcHandlers() {
  ipcMain.handle('dialog:openVideo', async () => {
    const win = getMainWindow() ?? undefined;
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [
        { name: 'Video', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:saveMp4', async (_e, defaultName: string) => {
    const win = getMainWindow() ?? undefined;
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: defaultName,
      filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
    });
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  });

  ipcMain.handle('video:probe', async (_e, filePath: string) => {
    return await probeVideo(filePath);
  });

  ipcMain.handle('video:export', async (_e, opts: Parameters<typeof exportMp4>[0]) => {
    const win = getMainWindow();
    await exportMp4({
      ...opts,
      onProgress: (pct) => {
        win?.webContents.send('video:exportProgress', pct);
      },
    });
    return true;
  });

  ipcMain.handle('settings:getAll', () => settingsManager.getAll());
  ipcMain.handle('settings:set', (_e, partial: Partial<SettingsSchema>) => {
    settingsManager.replace(partial);
    // Broadcast to all windows so the settings window and main window stay in sync.
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('settings:changed', settingsManager.getAll());
    }
    return settingsManager.getAll();
  });

  ipcMain.handle('window:openSettings', () => {
    openSettingsWindow();
  });

  ipcMain.handle('plugins:loadAll', async () => {
    return await loadAllPlugins();
  });

  ipcMain.handle('plugins:openFolder', async () => {
    const dir = userPluginsRoot();
    await fs.mkdir(dir, { recursive: true }).catch(() => {});
    await shell.openPath(dir);
  });
}
