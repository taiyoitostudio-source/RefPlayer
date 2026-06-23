import { useEffect, useRef, useState } from 'react';
import type { PluginAPI } from '../api';

type TimerSettings = { seconds: number };

const DEFAULTS: TimerSettings = { seconds: 30 };

const PRESETS = [15, 30, 60];

export function registerDrawingTimer(api: PluginAPI) {
  api.registerPanel(<TimerPanel api={api} />, { title: 'ドローイングタイマー', defaultOpen: false });
}

const SIZE = 128;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function TimerPanel({ api }: { api: PluginAPI }) {
  const stored = api.getSetting<TimerSettings>('settings', DEFAULTS);
  const initialSeconds = PRESETS.includes(stored.seconds) ? stored.seconds : DEFAULTS.seconds;
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const [running, setRunning] = useState<boolean>(false);
  const [displayRemaining, setDisplayRemaining] = useState<number>(initialSeconds);

  // The animation loop reads these via refs so its body never depends on closure
  // state. This lets us run the loop with a stable effect (just [running, api])
  // — and update the SVG via direct DOM mutation rather than React state, which
  // avoids the 60fps re-render storm that caused stutter in production builds.
  const secondsRef = useRef(initialSeconds);
  const remainingRef = useRef(initialSeconds);
  const circleRef = useRef<SVGCircleElement>(null);

  // Sync seconds-related refs and persist the setting.
  useEffect(() => {
    secondsRef.current = seconds;
    api.setSetting('settings', { seconds });
    if (!running) {
      remainingRef.current = seconds;
      setDisplayRemaining(seconds);
      paint(remainingRef.current, seconds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  // Update DOM directly from the current remaining/total.
  const paint = (rem: number, total: number) => {
    const c = circleRef.current;
    if (!c) return;
    const fraction = total > 0 ? Math.max(0, Math.min(1, rem / total)) : 0;
    c.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - fraction));
  };

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let lastTick = performance.now();
    let lastTextUpdate = 0;
    const TEXT_INTERVAL_MS = 100; // ~10 fps for the React text update

    const loop = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      let rem = remainingRef.current - dt;
      const total = secondsRef.current;
      if (rem <= 0) {
        api.stepFrame(+1);
        rem = total; // restart cycle
      }
      remainingRef.current = rem;
      paint(rem, total);
      if (now - lastTextUpdate >= TEXT_INTERVAL_MS) {
        lastTextUpdate = now;
        setDisplayRemaining(rem);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, api]);

  const toggle = () => {
    if (!running) {
      remainingRef.current = secondsRef.current;
      setDisplayRemaining(secondsRef.current);
      paint(remainingRef.current, secondsRef.current);
    }
    setRunning((r) => !r);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <CircleProgress circleRef={circleRef} value={displayRemaining} />
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

function CircleProgress({
  circleRef,
  value,
}: {
  circleRef: React.RefObject<SVGCircleElement>;
  value: number;
}) {
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE}>
        <defs>
          <linearGradient id="dt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#000080" />
            <stop offset="100%" stopColor="#1084D0" />
          </linearGradient>
        </defs>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
        />
        <circle
          ref={circleRef}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#dt-grad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
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
