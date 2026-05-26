import { useEffect, useRef, useState } from 'react';
import type { PluginAPI } from '../api';

type TimerSettings = { seconds: number };

const DEFAULTS: TimerSettings = { seconds: 5 };

const PRESETS = [3, 5, 10];

export function registerDrawingTimer(api: PluginAPI) {
  api.registerPanel(<TimerPanel api={api} />, { title: 'ドローイングタイマー', defaultOpen: false });
}

function TimerPanel({ api }: { api: PluginAPI }) {
  const stored = api.getSetting<TimerSettings>('settings', DEFAULTS);
  const [seconds, setSeconds] = useState<number>(stored.seconds ?? DEFAULTS.seconds);
  const [running, setRunning] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(stored.seconds ?? DEFAULTS.seconds);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    api.setSetting('settings', { seconds });
    // If not running, reset display to match new seconds
    if (!running) setRemaining(seconds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    lastTickRef.current = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setRemaining((r) => {
        let next = r - dt;
        if (next <= 0) {
          api.stepFrame(+1);
          next = seconds; // restart cycle
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, seconds, api]);

  const toggle = () => {
    if (!running) setRemaining(seconds);
    setRunning((r) => !r);
  };

  const fraction = seconds > 0 ? Math.max(0, Math.min(1, remaining / seconds)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <CircleProgress fraction={fraction} value={remaining} />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            className={`btn-secondary${seconds === p ? ' active' : ''}`}
            onClick={() => setSeconds(p)}
            style={{ minWidth: 44, padding: '4px 10px', fontSize: 12 }}
          >
            {p}s
          </button>
        ))}
        <input
          type="number"
          value={seconds}
          min={0.5}
          step={0.5}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v) && v > 0) setSeconds(v);
          }}
          style={{ width: 64, fontSize: 12, padding: '4px 8px' }}
        />
      </div>
      <button
        className="btn-primary"
        onClick={toggle}
        style={{ width: '100%', justifyContent: 'center', padding: '8px 14px' }}
      >
        {running ? '停止' : '開始'}
      </button>
    </div>
  );
}

function CircleProgress({ fraction, value }: { fraction: number; value: number }) {
  const size = 128;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - fraction);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="dt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B1E5C" />
            <stop offset="100%" stopColor="#4B2A8A" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#dt-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 80ms linear' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          pointerEvents: 'none',
        }}
      >
        <div
          className="text-mono"
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          {value.toFixed(1)}
        </div>
        <div className="text-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>seconds</div>
      </div>
    </div>
  );
}
