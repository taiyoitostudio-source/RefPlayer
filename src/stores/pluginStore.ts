import { create } from 'zustand';
import type { ReactNode } from 'react';
import type { LoadedPluginRecord, PluginManifest } from '@/types';

export type RegisteredPanel = {
  pluginId: string;
  title: string;
  defaultOpen: boolean;
  node: ReactNode;
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
  setRecords: (r: LoadedPluginRecord[]) => void;
  addPanel: (p: RegisteredPanel) => void;
  removePanelsByPlugin: (id: string) => void;
  addOverlay: (o: RegisteredOverlay) => void;
  removeOverlaysByPlugin: (id: string) => void;
};

export const usePluginStore = create<PluginStoreState>((set) => ({
  records: [],
  panels: [],
  overlays: [],
  setRecords: (records) => set({ records }),
  addPanel: (p) => set((s) => ({ panels: [...s.panels, p] })),
  removePanelsByPlugin: (id) =>
    set((s) => ({ panels: s.panels.filter((p) => p.pluginId !== id) })),
  addOverlay: (o) => set((s) => ({ overlays: [...s.overlays, o] })),
  removeOverlaysByPlugin: (id) =>
    set((s) => ({ overlays: s.overlays.filter((o) => o.pluginId !== id) })),
}));

export type { PluginManifest };
