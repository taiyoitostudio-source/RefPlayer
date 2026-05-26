import { contextBridge, ipcRenderer } from 'electron';

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
        source: 'builtin' | 'user';
      }>
    >,

  pathToFileURL: (path: string) => {
    // Convert Windows backslashes and return a file:// URL.
    // webSecurity is disabled in dev mode so file:// loads work from http://localhost.
    const normalised = path.replace(/\\/g, '/');
    return `file:///${encodeURI(normalised).replace(/#/g, '%23').replace(/\?/g, '%3F')}`;
  },
};

contextBridge.exposeInMainWorld('refplayer', api);

export type RefPlayerAPI = typeof api;
