import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePlayerStore } from '@/stores/playerStore';
import { saveCurrentFrame } from '@/lib/saveCurrentFrame';
import { displayFrameLabel } from '@/utils/frameMath';
import type { ActionId, KeyCombo } from '@/types';

// Pairs of unshifted ↔ shifted characters on a US/JIS keyboard layout.
// Pressing Shift+[ produces e.key === '{' (the shifted form), so when a combo
// stores either side and shift is required, both keys should match.
const SHIFT_PAIRS: Record<string, string> = {
  '[': '{', '{': '[',
  ']': '}', '}': ']',
  '=': '+', '+': '=',
  '-': '_', '_': '-',
  ';': ':', ':': ';',
  "'": '"', '"': "'",
  ',': '<', '<': ',',
  '.': '>', '>': '.',
  '/': '?', '?': '/',
  '\\': '|', '|': '\\',
  '`': '~', '~': '`',
  '1': '!', '!': '1',
  '2': '@', '@': '2',
  '3': '#', '#': '3',
  '4': '$', '$': '4',
  '5': '%', '%': '5',
  '6': '^', '^': '6',
  '7': '&', '&': '7',
  '8': '*', '*': '8',
  '9': '(', '(': '9',
  '0': ')', ')': '0',
};

function matchesCombo(e: KeyboardEvent, combo: KeyCombo): boolean {
  if (!!combo.ctrl !== e.ctrlKey) return false;
  if (!!combo.shift !== e.shiftKey) return false;
  if (!!combo.alt !== e.altKey) return false;
  if (!!combo.meta !== e.metaKey) return false;
  // Case-insensitive match for letters; exact for arrows/space etc.
  const eKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const cKey = combo.key.length === 1 ? combo.key.toLowerCase() : combo.key;
  if (eKey === cKey) return true;
  // When shift is part of the combo, accept the shift-equivalent character —
  // e.g. default `{ key: '[', shift: true }` should match e.key === '{' that
  // the browser reports when the user actually presses Shift+[.
  if (combo.shift && SHIFT_PAIRS[cKey] === eKey) return true;
  return false;
}

const ACTIONS: Record<ActionId, () => void> = {
  playPause: () => {
    const s = usePlayerStore.getState();
    if (!s.filePath) return;
    s.setIsPlaying(!s.isPlaying);
  },
  stepBack: () => usePlayerStore.getState().stepFrame(-1),
  stepForward: () => usePlayerStore.getState().stepFrame(+1),
  setIn: () => usePlayerStore.getState().setInPoint(),
  setOut: () => usePlayerStore.getState().setOutPoint(),
  applyClipToggle: () => {
    const s = usePlayerStore.getState();
    if (s.isClipped) s.undoClip();
    else s.applyClip();
  },
  toggleRepeat: () => {
    const s = usePlayerStore.getState();
    s.toggleRepeat();
    void useSettingsStore.getState().update({ repeat: !s.repeat });
  },
  openSettings: () => {
    void window.refplayer.openSettingsWindow();
  },
  zoomTimelineIn: () => {
    const s = usePlayerStore.getState();
    s.setTimelineZoom(s.timelineZoom * 1.4);
  },
  zoomTimelineOut: () => {
    const s = usePlayerStore.getState();
    s.setTimelineZoom(s.timelineZoom / 1.4);
  },
  volumeUp: () => {
    const p = usePlayerStore.getState();
    const next = Math.min(1, Math.round((p.volume + 0.05) * 100) / 100);
    p.setVolume(next);
    if (p.muted) p.setMuted(false);
    void useSettingsStore.getState().update({ lastVolume: next, muted: false });
  },
  volumeDown: () => {
    const p = usePlayerStore.getState();
    const next = Math.max(0, Math.round((p.volume - 0.05) * 100) / 100);
    p.setVolume(next);
    void useSettingsStore.getState().update({ lastVolume: next });
  },
  muteToggle: () => {
    const p = usePlayerStore.getState();
    const next = !p.muted;
    p.setMuted(next);
    void useSettingsStore.getState().update({ muted: next });
  },
  clearIn: () => usePlayerStore.getState().clearInPoint(),
  clearOut: () => usePlayerStore.getState().clearOutPoint(),
  toggleFullscreen: () => {
    const p = usePlayerStore.getState();
    const next = !p.fullscreen;
    p.setFullscreen(next);
    void window.refplayer.windowControls.setFullscreen(next);
  },
  saveFrame: () => {
    const p = usePlayerStore.getState();
    if (!p.videoElement || !p.filePath) return;
    const startFrame = p.isClipped && p.inFrame != null ? p.inFrame : 0;
    const displayNum = displayFrameLabel(p.currentFrame, startFrame);
    void saveCurrentFrame(p.videoElement, p.filePath, displayNum).catch((err) => {
      console.error('[saveFrame]', err);
    });
  },
};

export function useShortcuts() {
  const shortcuts = useSettingsStore((s) => s.shortcuts);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore events still inside IME composition
      if (e.isComposing || e.keyCode === 229) return;
      // Don't interfere with text input fields, but allow non-text inputs
      // (range sliders, buttons, etc.) so volume / mute shortcuts work when
      // the slider has focus from a recent click.
      const target = e.target as HTMLElement | null;
      if (target) {
        if (target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        if (target.tagName === 'INPUT') {
          const t = (target as HTMLInputElement).type;
          if (t === 'text' || t === 'number' || t === 'password' || t === 'email' || t === 'search' || t === 'tel' || t === 'url') {
            return;
          }
        }
      }
      const isClipped = usePlayerStore.getState().isClipped;

      for (const [id, combo] of Object.entries(shortcuts) as [ActionId, KeyCombo][]) {
        if (!matchesCombo(e, combo)) continue;
        // While clipped, IN/OUT set/clear shortcuts are disabled (matches button disable behavior)
        if (isClipped && (id === 'setIn' || id === 'setOut' || id === 'clearIn' || id === 'clearOut')) continue;
        e.preventDefault();
        ACTIONS[id]();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts]);
}
