import { create } from 'zustand';
import type { Settings, ActionId, KeyCombo } from '@/types';

const DEFAULT_SHORTCUTS: Record<ActionId, KeyCombo> = {
  playPause:        { key: ' ' },
  stepBack:         { key: 'ArrowLeft' },
  stepForward:      { key: 'ArrowRight' },
  setIn:            { key: '[' },
  setOut:           { key: ']' },
  applyClipToggle:  { key: 'Enter' },
  toggleRepeat:     { key: 'r' },
  openSettings:     { key: ',', ctrl: true },
  zoomTimelineIn:   { key: '=', ctrl: true },
  zoomTimelineOut:  { key: '-', ctrl: true },
  volumeUp:         { key: 'ArrowUp' },
  volumeDown:       { key: 'ArrowDown' },
  muteToggle:       { key: 'm' },
  clearIn:          { key: '[', shift: true },
  clearOut:         { key: ']', shift: true },
};

const DEFAULTS: Settings = {
  shortcuts: DEFAULT_SHORTCUTS,
  lastDisplayFps: 12,
  repeat: false,
  lastVolume: 1,
  muted: false,
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

// Deep-merge persisted settings with defaults so that keys added in newer
// versions (e.g. new shortcuts) are filled in for users with old data on disk.
function mergeWithDefaults(s: Partial<Settings> | undefined | null): Settings {
  const incomingShortcuts = (s?.shortcuts ?? {}) as Partial<Record<ActionId, KeyCombo>>;
  return {
    ...DEFAULTS,
    ...(s ?? {}),
    shortcuts: { ...DEFAULT_SHORTCUTS, ...incomingShortcuts } as Record<ActionId, KeyCombo>,
  };
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  load: async () => {
    const raw = (await window.refplayer.getSettings()) as Partial<Settings>;
    set({ ...mergeWithDefaults(raw), loaded: true });
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

  receiveExternal: (s) => set({ ...mergeWithDefaults(s), loaded: true }),
}));
