import { contextBridge, ipcRenderer, webUtils } from 'electron';

const api = {
  openVideoDialog: () => ipcRenderer.invoke('dialog:openVideo') as Promise<string | null>,
  saveMp4Dialog: (defaultName: string) =>
    ipcRenderer.invoke('dialog:saveMp4', defaultName) as Promise<string | null>,

  probeVideo: (filePath: string) =>
    ipcRenderer.invoke('video:probe', filePath) as Promise<{
      sourceFps: number;
      totalSourceFrames: number;
      duration: number;
      width: number;
      height: number;
    }>,

  exportMp4: (opts: {
    inputPath: string;
    outputPath: string;
    startSec: number;
    endSec: number;
    targetFps: number;
    sourceFps: number;
    isClipped: boolean;
  }) => ipcRenderer.invoke('video:export', opts) as Promise<boolean>,

  onExportProgress: (cb: (pct: number) => void) => {
    const listener = (_: unknown, pct: number) => cb(pct);
    ipcRenderer.on('video:exportProgress', listener);
    return () => ipcRenderer.removeListener('video:exportProgress', listener);
  },

  getSettings: () => ipcRenderer.invoke('settings:getAll') as Promise<Record<string, unknown>>,
  setSettings: (partial: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:set', partial) as Promise<Record<string, unknown>>,
  onSettingsChanged: (cb: (s: Record<string, unknown>) => void) => {
    const listener = (_: unknown, s: Record<string, unknown>) => cb(s);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },

  openSettingsWindow: () => ipcRenderer.invoke('window:openSettings') as Promise<void>,

  loadPlugins: () =>
    ipcRenderer.invoke('plugins:loadAll') as Promise<
      Array<{
        manifest: {
          id: string;
          name: string;
          version: string;
          entry: string;
          panel?: { title: string; defaultOpen?: boolean };
        };
        code: string;
        source: 'user';
      }>
    >,

  openPluginsFolder: () => ipcRenderer.invoke('plugins:openFolder') as Promise<void>,

  getPendingOpenFile: () =>
    ipcRenderer.invoke('app:getPendingOpenFile') as Promise<string | null>,

  // Window controls for the custom Win95-style title bar.
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize') as Promise<void>,
    close: () => ipcRenderer.invoke('window:close') as Promise<void>,
    isMaximized: () => ipcRenderer.invoke('window:isMaximized') as Promise<boolean>,
    setFullscreen: (on: boolean) => ipcRenderer.invoke('window:setFullscreen', on) as Promise<void>,
    onMaximizedChange: (cb: (maximized: boolean) => void) => {
      const l = (_: unknown, m: boolean) => cb(m);
      ipcRenderer.on('window:stateChanged', l);
      return () => ipcRenderer.removeListener('window:stateChanged', l);
    },
    onFocusChange: (cb: (focused: boolean) => void) => {
      const l = (_: unknown, f: boolean) => cb(f);
      ipcRenderer.on('window:focusChanged', l);
      return () => ipcRenderer.removeListener('window:focusChanged', l);
    },
  },

  cancelExport: () => ipcRenderer.invoke('video:cancelExport') as Promise<boolean>,
  savePngDialog: (defaultName: string) =>
    ipcRenderer.invoke('dialog:savePng', defaultName) as Promise<string | null>,
  writePngFile: (path: string, data: Uint8Array) =>
    ipcRenderer.invoke('image:writePng', path, data) as Promise<void>,
  getAppVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
  onOpenFile: (cb: (path: string) => void) => {
    const listener = (_: unknown, path: string) => cb(path);
    ipcRenderer.on('app:openFile', listener);
    return () => ipcRenderer.removeListener('app:openFile', listener);
  },

  // Electron 32+ removed File.path for security. Use webUtils.getPathForFile
  // which is the supported way to recover a drag-and-dropped file's path.
  getFilePath: (file: File) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return null;
    }
  },

  pathToFileURL: (path: string) => {
    // Convert Windows backslashes and return a file:// URL.
    // webSecurity is disabled in dev mode so file:// loads work from http://localhost.
    const normalised = path.replace(/\\/g, '/');
    return `file:///${encodeURI(normalised).replace(/#/g, '%23').replace(/\?/g, '%3F')}`;
  },
};

contextBridge.exposeInMainWorld('refplayer', api);

export type RefPlayerAPI = typeof api;
