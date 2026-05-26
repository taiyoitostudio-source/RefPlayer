import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';

export function RepeatToggle() {
  const repeat = usePlayerStore((s) => s.repeat);
  const onClick = () => {
    const next = !repeat;
    usePlayerStore.getState().setRepeat(next);
    void useSettingsStore.getState().update({ repeat: next });
  };
  return (
    <button
      className={`btn-icon${repeat ? ' active' : ''}`}
      onClick={onClick}
      title={`リピート: ${repeat ? 'オン' : 'オフ'} (R)`}
    >
      <RepeatIcon />
    </button>
  );
}

function RepeatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
