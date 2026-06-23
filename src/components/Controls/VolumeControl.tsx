import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';

export function VolumeControl() {
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);

  const onSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    const p = usePlayerStore.getState();
    p.setVolume(v);
    // Auto-unmute when the user raises the volume from a muted state.
    const nextMuted = v === 0 ? true : muted ? false : muted;
    if (nextMuted !== muted) p.setMuted(nextMuted);
    void useSettingsStore.getState().update({ lastVolume: v, muted: nextMuted });
  };

  const onMuteClick = () => {
    const next = !muted;
    usePlayerStore.getState().setMuted(next);
    void useSettingsStore.getState().update({ muted: next });
  };

  const effectivelyMuted = muted || volume === 0;
  const sliderValue = muted ? 0 : volume;

  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <button
        className="btn-icon"
        onClick={onMuteClick}
        title={muted ? 'ミュート解除' : 'ミュート'}
      >
        {effectivelyMuted ? <VolumeMuteIcon /> : volume < 0.5 ? <VolumeLowIcon /> : <VolumeHighIcon />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={sliderValue}
        onChange={onSliderChange}
        title={`音量: ${Math.round(sliderValue * 100)}%`}
        style={{ width: 80, accentColor: '#000080' }}
      />
    </div>
  );
}

function VolumeHighIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function VolumeLowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function VolumeMuteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}
