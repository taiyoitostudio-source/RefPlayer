import Store from 'electron-store';

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

export type SettingsSchema = {
  shortcuts: Record<ActionId, KeyCombo>;
  lastDisplayFps: number;
  repeat: boolean;
  windowBounds: { x?: number; y?: number; width: number; height: number };
  ffmpegPath: string | null;
  sidebarOpen: boolean;
  pluginSettings: Record<string, unknown>;
};

export const DEFAULT_SHORTCUTS: Record<ActionId, KeyCombo> = {
  playPause:        { key: ' ' },
  stepBack:         { key: 'ArrowLeft' },
  stepForward:      { key: 'ArrowRight' },
  setIn:            { key: 'i' },
  setOut:           { key: 'o' },
  applyClipToggle:  { key: 'Enter' },
  toggleRepeat:     { key: 'r' },
  openSettings:     { key: ',', ctrl: true },
  zoomTimelineIn:   { key: '=', ctrl: true },
  zoomTimelineOut:  { key: '-', ctrl: true },
};

const DEFAULTS: SettingsSchema = {
  shortcuts: DEFAULT_SHORTCUTS,
  lastDisplayFps: 12,
  repeat: false,
  windowBounds: { width: 1280, height: 800 },
  ffmpegPath: null,
  sidebarOpen: true,
  pluginSettings: {},
};

class SettingsManager {
  private store = new Store<SettingsSchema>({ defaults: DEFAULTS, name: 'settings' });

  get<K extends keyof SettingsSchema>(key: K): SettingsSchema[K] {
    return this.store.get(key);
  }
  set<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]) {
    this.store.set(key, value);
  }
  getAll(): SettingsSchema {
    return this.store.store as SettingsSchema;
  }
  replace(values: Partial<SettingsSchema>) {
    for (const k of Object.keys(values) as (keyof SettingsSchema)[]) {
      this.store.set(k, values[k] as never);
    }
  }
}

export const settingsManager = new SettingsManager();
