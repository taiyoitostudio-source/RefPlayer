import { create } from 'zustand';
import type { ReactNode } from 'react';
import type { LoadedPluginRecord, PluginManifest } from '@/types';

/** A user-plugin panel mounts into the provided root and optionally returns a cleanup. */
export type PanelMountFn = (root: HTMLElement) => (() => void) | void;

export type RegisteredPanel = {
  pluginId: string;
  title: string;
  defaultOpen: boolean;
  node: ReactNode | PanelMountFn;
};

export type OverlayRenderer = (
  ctx: CanvasRenderingContext2D,
  state: { currentFrame: number; displayFps: number; sourceFps: number },
) => void;

export type RegisteredOverlay = {
  pluginId: string;
  render: OverlayRenderer;
};

type PluginStoreState = {
  records: LoadedPluginRecord[];
  panels: RegisteredPanel[];
  overlays: RegisteredOverlay[];
  /** Bumped to request an overlay canvas redraw from outside the player loop. */
  overlayRevision: number;
  setRecords: (r: LoadedPluginRecord[]) => void;
  addPanel: (p: RegisteredPanel) => void;
  removePanelsByPlugin: (id: string) => void;
  addOverlay: (o: RegisteredOverlay) => void;
  removeOverlaysByPlugin: (id: string) => void;
  bumpOverlayRevision: () => void;
};

export const usePluginStore = create<PluginStoreState>((set) => ({
  records: [],
  panels: [],
  overlays: [],
  overlayRevision: 0,
  setRecords: (records) => set({ records }),
  addPanel: (p) => set((s) => ({ panels: [...s.panels, p] })),
  removePanelsByPlugin: (id) =>
    set((s) => ({ panels: s.panels.filter((p) => p.pluginId !== id) })),
  addOverlay: (o) => set((s) => ({ overlays: [...s.overlays, o] })),
  removeOverlaysByPlugin: (id) =>
    set((s) => ({ overlays: s.overlays.filter((o) => o.pluginId !== id) })),
  bumpOverlayRevision: () => set((s) => ({ overlayRevision: s.overlayRevision + 1 })),
}));

export type { PluginManifest };
