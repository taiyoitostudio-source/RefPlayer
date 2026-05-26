import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';

const PRESETS = [8, 12, 24];

export function FpsSelector() {
  const sourceFps = usePlayerStore((s) => s.sourceFps);
  const displayFps = usePlayerStore((s) => s.displayFps);
  const [customStr, setCustomStr] = useState('');

  const apply = (fps: number) => {
    if (sourceFps && fps > sourceFps) return;
    usePlayerStore.getState().setDisplayFps(fps);
    void useSettingsStore.getState().update({ lastDisplayFps: fps });
  };

  const isDef = sourceFps > 0 && Math.abs(displayFps - sourceFps) < 0.01;

  // When source changes, snap displayFps if needed
  useEffect(() => {
    if (sourceFps > 0 && displayFps > sourceFps) {
      apply(Math.min(displayFps, sourceFps));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFps]);

  const commitCustom = () => {
    const v = parseFloat(customStr);
    if (!Number.isFinite(v) || v <= 0) return;
    apply(v);
  };

  return (
    <div className="flex items-center gap-1.5" style={{ flexWrap: 'nowrap' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 6, fontFamily: 'var(--font-mono)' }}>
        FPS
      </span>
      <button
        className={`btn-secondary${isDef ? ' active' : ''}`}
        disabled={!sourceFps}
        onClick={() => apply(sourceFps)}
        title={sourceFps ? `元のFPS (${sourceFps.toFixed(2)})` : '動画未選択'}
      >
        Def{sourceFps ? <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>{sourceFps.toFixed(1)}</span> : null}
      </button>
      {PRESETS.map((p) => {
        const disabled = !sourceFps || p > sourceFps;
        const active = !isDef && Math.abs(displayFps - p) < 0.01;
        return (
          <button
            key={p}
            className={`btn-secondary${active ? ' active' : ''}`}
            disabled={disabled}
            onClick={() => apply(p)}
            title={disabled ? `元動画は ${sourceFps?.toFixed(1) || '?'} fps` : `${p} fps`}
          >
            {p}
          </button>
        );
      })}
      <input
        type="number"
        placeholder="Custom"
        value={customStr}
        min={1}
        max={sourceFps || undefined}
        onChange={(e) => setCustomStr(e.target.value)}
        onBlur={commitCustom}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        disabled={!sourceFps}
        style={{ width: 80, fontSize: 12, padding: '5px 8px' }}
      />
    </div>
  );
}
