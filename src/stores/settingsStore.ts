import { create } from 'zustand';
import type { Settings, ActionId, KeyCombo } from '@/types';

const DEFAULT_SHORTCUTS: Record<ActionId, KeyCombo> = {
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

const DEFAULTS: Settings = {
  shortcuts: DEFAULT_SHORTCUTS,
  lastDisplayFps: 12,
  repeat: false,
  windowBounds: { width: 1280, height: 800 },
  ffmpegPath: null,
  sidebarOpen: true,
  pluginSettings: {},
};

type SettingsStoreState = Settings & {
  loaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<Settings>) => Promise<void>;
  updateShortcut: (id: ActionId, combo: KeyCombo) => Promise<void>;
  resetShortcuts: () => Promise<void>;
  receiveExternal: (s: Settings) => void;
};

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  load: async () => {
    const s = (await window.refplayer.getSettings()) as Settings;
    set({ ...DEFAULTS, ...s, loaded: true });
  },

  update: async (partial) => {
    const next = { ...get(), ...partial };
    set(partial as never);
    await window.refplayer.setSettings(partial);
    return void next;
  },

  updateShortcut: async (id, combo) => {
    const next = { ...get().shortcuts, [id]: combo };
    set({ shortcuts: next });
    await window.refplayer.setSettings({ shortcuts: next });
  },

  resetShortcuts: async () => {
    set({ shortcuts: DEFAULT_SHORTCUTS });
    await window.refplayer.setSettings({ shortcuts: DEFAULT_SHORTCUTS });
  },

  receiveExternal: (s) => set({ ...DEFAULTS, ...s, loaded: true }),
}));
