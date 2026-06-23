import { usePlayerStore } from '@/stores/playerStore';

const PRESETS = [0.25, 0.5, 1, 1.5, 2];

export function SpeedSelector() {
  const playbackRate = usePlayerStore((s) => s.playbackRate);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v)) usePlayerStore.getState().setPlaybackRate(v);
  };

  return (
    <select
      value={String(playbackRate)}
      onChange={onChange}
      title="再生速度"
      style={{
        fontSize: 11,
        fontFamily: 'var(--font-sans)',
        background: '#C0C0C0',
        color: 'var(--text-primary)',
        boxShadow: 'var(--bevel-raised)',
        border: 'none',
        padding: '2px 4px',
        cursor: 'pointer',
      }}
    >
      {PRESETS.map((p) => (
        <option key={p} value={String(p)}>{p}x</option>
      ))}
    </select>
  );
}
