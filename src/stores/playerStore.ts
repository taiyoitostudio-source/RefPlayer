import { create } from 'zustand';
import {
  totalDisplayFrames as calcTotalDisplay,
  clamp,
} from '@/utils/frameMath';
import type { VideoMeta } from '@/types';

type PlayerState = {
  filePath: string | null;
  fileUrl: string | null;
  sourceFps: number;
  totalSourceFrames: number;
  duration: number;
  videoWidth: number;
  videoHeight: number;

  currentFrame: number;     // display-domain frame index
  isPlaying: boolean;
  displayFps: number;
  repeat: boolean;

  inFrame: number | null;   // display-domain
  outFrame: number | null;  // display-domain
  isClipped: boolean;

  // Audio
  volume: number;           // 0..1
  muted: boolean;

  // Timeline view
  timelineZoom: number;     // 1 = whole range visible
  timelinePanFrame: number; // left edge frame
};

type Selectors = {
  getTotalDisplayFrames: () => number;
  getEffectiveStartFrame: () => number;
  getEffectiveEndFrame: () => number;
};

type Actions = {
  loadVideo: (filePath: string, meta: VideoMeta) => void;
  unloadVideo: () => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentFrame: (frame: number) => void;
  stepFrame: (delta: number) => void;
  seekToFrame: (frame: number) => void;
  setDisplayFps: (fps: number) => void;
  toggleRepeat: () => void;
  setRepeat: (r: boolean) => void;
  setInPoint: () => void;
  setOutPoint: () => void;
  setInFrame: (frame: number | null) => void;
  setOutFrame: (frame: number | null) => void;
  clearInPoint: () => void;
  clearOutPoint: () => void;
  applyClip: () => void;
  undoClip: () => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  toggleMute: () => void;
  setTimelineZoom: (zoom: number) => void;
  setTimelinePan: (panFrame: number) => void;
};

export type PlayerStore = PlayerState & Selectors & Actions;

const initialState: PlayerState = {
  filePath: null,
  fileUrl: null,
  sourceFps: 0,
  totalSourceFrames: 0,
  duration: 0,
  videoWidth: 0,
  videoHeight: 0,
  currentFrame: 0,
  isPlaying: false,
  displayFps: 12,
  repeat: false,
  inFrame: null,
  outFrame: null,
  isClipped: false,
  volume: 1,
  muted: false,
  timelineZoom: 1,
  timelinePanFrame: 0,
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ...initialState,

  getTotalDisplayFrames: () => {
    const s = get();
    if (!s.sourceFps || !s.totalSourceFrames) return 0;
    return calcTotalDisplay(s.totalSourceFrames, s.sourceFps, s.displayFps);
  },
  getEffectiveStartFrame: () => {
    const s = get();
    return s.isClipped && s.inFrame != null ? s.inFrame : 0;
  },
  getEffectiveEndFrame: () => {
    const s = get();
    const total = s.sourceFps
      ? calcTotalDisplay(s.totalSourceFrames, s.sourceFps, s.displayFps) - 1
      : 0;
    return s.isClipped && s.outFrame != null ? s.outFrame : total;
  },

  loadVideo: (filePath, meta) => {
    const fileUrl = window.refplayer.pathToFileURL(filePath);
    set({
      filePath,
      fileUrl,
      sourceFps: meta.sourceFps,
      totalSourceFrames: meta.totalSourceFrames,
      duration: meta.duration,
      videoWidth: meta.width,
      videoHeight: meta.height,
      currentFrame: 0,
      inFrame: null,
      outFrame: null,
      isClipped: false,
      isPlaying: false,
      timelineZoom: 1,
      timelinePanFrame: 0,
      displayFps: Math.min(get().displayFps, meta.sourceFps || get().displayFps),
    });
  },
  unloadVideo: () => set({ ...initialState, displayFps: get().displayFps, repeat: get().repeat }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentFrame: (frame) => {
    const total = get().getTotalDisplayFrames();
    set({ currentFrame: clamp(frame, 0, Math.max(0, total - 1)) });
  },
  stepFrame: (delta) => {
    const s = get();
    const total = s.getTotalDisplayFrames();
    const start = s.getEffectiveStartFrame();
    const end = s.getEffectiveEndFrame();
    let next = s.currentFrame + delta;
    if (s.isClipped) next = clamp(next, start, end);
    else next = clamp(next, 0, Math.max(0, total - 1));
    set({ currentFrame: next });
  },
  seekToFrame: (frame) => get().setCurrentFrame(frame),
  setDisplayFps: (fps) => {
    const s = get();
    if (s.sourceFps && fps > s.sourceFps) return;
    if (fps <= 0) return;
    // Preserve approximate playback position
    const oldTotal = s.getTotalDisplayFrames();
    const ratio = oldTotal > 0 ? s.currentFrame / oldTotal : 0;
    set({ displayFps: fps });
    const newTotal = get().getTotalDisplayFrames();
    set({ currentFrame: Math.round(ratio * newTotal) });
    // Re-map IN/OUT proportionally
    if (s.inFrame != null) {
      set({ inFrame: Math.round((s.inFrame / oldTotal) * newTotal) });
    }
    if (s.outFrame != null) {
      set({ outFrame: Math.round((s.outFrame / oldTotal) * newTotal) });
    }
  },
  toggleRepeat: () => set({ repeat: !get().repeat }),
  setRepeat: (r) => set({ repeat: r }),

  setInPoint: () => {
    const s = get();
    if (s.isClipped) return;
    const at = s.currentFrame;
    set({ inFrame: at, outFrame: s.outFrame != null && s.outFrame <= at ? null : s.outFrame });
  },
  setOutPoint: () => {
    const s = get();
    if (s.isClipped) return;
    const at = s.currentFrame;
    set({ outFrame: at, inFrame: s.inFrame != null && s.inFrame >= at ? null : s.inFrame });
  },
  setInFrame: (frame) => {
    if (get().isClipped) return;
    set({ inFrame: frame });
  },
  setOutFrame: (frame) => {
    if (get().isClipped) return;
    set({ outFrame: frame });
  },
  clearInPoint: () => {
    if (get().isClipped) return;
    set({ inFrame: null });
  },
  clearOutPoint: () => {
    if (get().isClipped) return;
    set({ outFrame: null });
  },
  applyClip: () => {
    const s = get();
    if (s.isClipped) return;
    if (s.inFrame == null || s.outFrame == null) return;
    if (s.outFrame <= s.inFrame) return;
    set({
      isClipped: true,
      currentFrame: s.inFrame,
      timelineZoom: 1,
      timelinePanFrame: 0,
    });
  },
  undoClip: () => {
    if (!get().isClipped) return;
    set({ isClipped: false });
  },

  setVolume: (v) => set({ volume: clamp(v, 0, 1) }),
  setMuted: (m) => set({ muted: m }),
  toggleMute: () => set({ muted: !get().muted }),

  setTimelineZoom: (zoom) => set({ timelineZoom: clamp(zoom, 1, 20) }),
  setTimelinePan: (panFrame) => set({ timelinePanFrame: Math.max(0, panFrame) }),
}));
