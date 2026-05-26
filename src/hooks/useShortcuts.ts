import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { ActionId, KeyCombo } from '@/types';

function matchesCombo(e: KeyboardEvent, combo: KeyCombo): boolean {
  if (!!combo.ctrl !== e.ctrlKey) return false;
  if (!!combo.shift !== e.shiftKey) return false;
  if (!!combo.alt !== e.altKey) return false;
  if (!!combo.meta !== e.metaKey) return false;
  // Case-insensitive match for letters; exact for arrows/space etc.
  const eKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const cKey = combo.key.length === 1 ? combo.key.toLowerCase() : combo.key;
  return eKey === cKey;
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
};

export function useShortcuts() {
  const shortcuts = useSettingsStore((s) => s.shortcuts);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore events still inside IME composition
      if (e.isComposing || e.keyCode === 229) return;
      // Don't interfere with text input fields
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const isClipped = usePlayerStore.getState().isClipped;

      for (const [id, combo] of Object.entries(shortcuts) as [ActionId, KeyCombo][]) {
        if (!matchesCombo(e, combo)) continue;
        // While clipped, IN/OUT shortcuts are disabled (matches button disable behavior)
        if (isClipped && (id === 'setIn' || id === 'setOut')) continue;
        e.preventDefault();
        ACTIONS[id]();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts]);
}
