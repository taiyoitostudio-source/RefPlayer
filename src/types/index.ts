export type KeyCombo = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export type ActionId =
  | 'playPause' | 'stepBack' | 'stepForward'
  | 'setIn' | 'setOut' | 'applyClipToggle'
  | 'toggleRepeat' | 'openSettings'
  | 'zoomTimelineIn' | 'zoomTimelineOut';

export type Settings = {
  shortcuts: Record<ActionId, KeyCombo>;
  lastDisplayFps: number;
  repeat: boolean;
  windowBounds: { x?: number; y?: number; width: number; height: number };
  ffmpegPath: string | null;
  sidebarOpen: boolean;
  pluginSettings: Record<string, unknown>;
};

export type VideoMeta = {
  sourceFps: number;
  totalSourceFrames: number;
  duration: number;
  width: number;
  height: number;
};

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  entry: string;
  panel?: { title: string; defaultOpen?: boolean };
};

export type LoadedPluginRecord = {
  manifest: PluginManifest;
  code: string;
  source: 'user';
};

declare global {
  interface Window {
    refplayer: {
      openVideoDialog: () => Promise<string | null>;
      saveMp4Dialog: (defaultName: string) => Promise<string | null>;
      probeVideo: (filePath: string) => Promise<VideoMeta>;
      exportMp4: (opts: {
        inputPath: string;
        outputPath: string;
        startSec: number;
        endSec: number;
        targetFps: number;
        sourceFps: number;
        isClipped: boolean;
      }) => Promise<boolean>;
      onExportProgress: (cb: (pct: number) => void) => () => void;
      getSettings: () => Promise<Settings>;
      setSettings: (partial: Partial<Settings>) => Promise<Settings>;
      onSettingsChanged: (cb: (s: Settings) => void) => () => void;
      openSettingsWindow: () => Promise<void>;
      loadPlugins: () => Promise<LoadedPluginRecord[]>;
      openPluginsFolder: () => Promise<void>;
      pathToFileURL: (path: string) => string;
    };
  }
}

  // Frame-precise playback callback metadata (Chromium)
  interface VideoFrameCallbackMetadata {
    presentationTime: DOMHighResTimeStamp;
    expectedDisplayTime: DOMHighResTimeStamp;
    width: number;
    height: number;
    mediaTime: number;
    presentedFrames: number;
    processingDuration?: number;
    captureTime?: DOMHighResTimeStamp;
    receiveTime?: DOMHighResTimeStamp;
    rtpTimestamp?: number;
  }

  type VideoFrameRequestCallback = (
    now: DOMHighResTimeStamp,
    metadata: VideoFrameCallbackMetadata,
  ) => void;

  interface HTMLVideoElement {
    requestVideoFrameCallback(callback: VideoFrameRequestCallback): number;
    cancelVideoFrameCallback(handle: number): void;
  }
