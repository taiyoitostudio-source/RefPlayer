import type { ReactNode } from 'react';
import { usePluginStore, type OverlayRenderer } from '@/stores/pluginStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';

export type PluginPlayerState = {
  currentFrame: number;
  displayFps: number;
  sourceFps: number;
  isPlaying: boolean;
  isClipped: boolean;
  totalDisplayFrames: number;
  effectiveStartFrame: number;
  effectiveEndFrame: number;
};

export type PluginAPI = {
  /** Register a panel UI in the right sidebar. */
  registerPanel(node: ReactNode, opts: { title: string; defaultOpen?: boolean }): void;

  /** Register a canvas overlay drawn on top of the video. */
  registerOverlay(render: OverlayRenderer): void;

  /** Subscribe to currentFrame changes. Returns an unsubscribe function. */
  subscribeFrame(handler: (frame: number, displayFps: number) => void): () => void;

  /** Get a snapshot of the player state. */
  getPlayerState(): PluginPlayerState;

  /** Seek to a frame (display-domain). */
  setFrame(frame: number): void;

  /** Step the current frame by delta. */
  stepFrame(delta: number): void;

  /** Read/write plugin-scoped settings (persisted). */
  getSetting<T>(key: string, defaultValue: T): T;
  setSetting(key: string, value: unknown): void;
};

export function createPluginAPI(pluginId: string): PluginAPI {
  const projectKey = (k: string) => `${pluginId}::${k}`;

  return {
    registerPanel(node, opts) {
      usePluginStore.getState().addPanel({
        pluginId,
        title: opts.title,
        defaultOpen: opts.defaultOpen ?? true,
        node,
      });
    },

    registerOverlay(render) {
      usePluginStore.getState().addOverlay({ pluginId, render });
    },

    subscribeFrame(handler) {
      let lastFrame = -1;
      return usePlayerStore.subscribe((s) => {
        if (s.currentFrame !== lastFrame) {
          lastFrame = s.currentFrame;
          try { handler(s.currentFrame, s.displayFps); } catch (e) { console.warn(e); }
        }
      });
    },

    getPlayerState(): PluginPlayerState {
      const s = usePlayerStore.getState();
      return {
        currentFrame: s.currentFrame,
        displayFps: s.displayFps,
        sourceFps: s.sourceFps,
        isPlaying: s.isPlaying,
        isClipped: s.isClipped,
        totalDisplayFrames: s.getTotalDisplayFrames(),
        effectiveStartFrame: s.getEffectiveStartFrame(),
        effectiveEndFrame: s.getEffectiveEndFrame(),
      };
    },

    setFrame(frame) {
      usePlayerStore.getState().seekToFrame(frame);
    },

    stepFrame(delta) {
      usePlayerStore.getState().stepFrame(delta);
    },

    getSetting<T>(key: string, defaultValue: T): T {
      const s = useSettingsStore.getState();
      const v = (s.pluginSettings ?? {})[projectKey(key)];
      return (v === undefined ? defaultValue : v) as T;
    },

    setSetting(key, value) {
      const s = useSettingsStore.getState();
      const next = { ...(s.pluginSettings ?? {}), [projectKey(key)]: value };
      void s.update({ pluginSettings: next });
    },
  };
}
