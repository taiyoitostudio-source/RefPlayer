import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { displayFrameToTime, sourceToDisplayFrame, timeToFrame } from '@/utils/frameMath';
import type { PluginAPI } from '../api';

const MAX_ONION = 5;

type OnionSettings = {
  enabled: boolean;
  prevN: number;
  nextN: number;
  prevColor: string;
  nextColor: string;
  opacityStart: number;
  opacityDecay: number;
};

const DEFAULTS: OnionSettings = {
  enabled: false,
  prevN: 2,
  nextN: 2,
  prevColor: '#E04F6B',
  nextColor: '#4F7FE0',
  opacityStart: 0.45,
  opacityDecay: 0.35,
};

type SharedState = {
  settings: OnionSettings;
  prevVideos: HTMLVideoElement[];
  nextVideos: HTMLVideoElement[];
  scratch: HTMLCanvasElement;
};

const shared: SharedState = {
  settings: DEFAULTS,
  prevVideos: [],
  nextVideos: [],
  scratch: document.createElement('canvas'),
};

export function registerOnionSkin(api: PluginAPI) {
  const stored = api.getSetting<OnionSettings | undefined>('settings', undefined);
  if (stored) shared.settings = { ...DEFAULTS, ...stored };

  api.registerPanel(<OnionPanel api={api} />, { title: 'オニオンスキン', defaultOpen: false });

  api.registerOverlay((ctx) => {
    if (!shared.settings.enabled) return;

    const w = ctx.canvas.width / (window.devicePixelRatio || 1);
    const h = ctx.canvas.height / (window.devicePixelRatio || 1);

    const drawOnion = (videos: HTMLVideoElement[], color: string) => {
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (!v || v.readyState < 2 || v.videoWidth === 0) continue;
        const distance = i + 1;
        const alpha = Math.max(
          0,
          shared.settings.opacityStart * Math.pow(1 - shared.settings.opacityDecay, distance - 1),
        );
        if (alpha <= 0.01) continue;
        drawTintedFrame(ctx, v, color, alpha, w, h);
      }
    };

    drawOnion(shared.prevVideos, shared.settings.prevColor);
    drawOnion(shared.nextVideos, shared.settings.nextColor);
  });
}

function drawTintedFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  color: string,
  alpha: number,
  w: number,
  h: number,
) {
  // Fit video into w×h preserving aspect (centered)
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.min(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  const dpr = window.devicePixelRatio || 1;
  shared.scratch.width = Math.max(8, Math.round(dw * dpr));
  shared.scratch.height = Math.max(8, Math.round(dh * dpr));
  const sctx = shared.scratch.getContext('2d');
  if (!sctx) return;
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, shared.scratch.width, shared.scratch.height);
  sctx.globalCompositeOperation = 'source-over';
  sctx.drawImage(video, 0, 0, shared.scratch.width, shared.scratch.height);
  // Tint via multiply: white→tint, black stays black, midtones shift toward tint
  sctx.globalCompositeOperation = 'multiply';
  sctx.fillStyle = color;
  sctx.fillRect(0, 0, shared.scratch.width, shared.scratch.height);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(shared.scratch, dx, dy, dw, dh);
  ctx.restore();
}

function OnionPanel({ api }: { api: PluginAPI }) {
  const [s, setS] = useState<OnionSettings>(shared.settings);
  const fileUrl = usePlayerStore((s2) => s2.fileUrl);
  const currentFrame = usePlayerStore((s2) => s2.currentFrame);
  const sourceFps = usePlayerStore((s2) => s2.sourceFps);
  const displayFps = usePlayerStore((s2) => s2.displayFps);

  const prevRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const nextRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const prevTargets = useRef<number[]>([]);
  const nextTargets = useRef<number[]>([]);

  // Pre-mount up to MAX_ONION hidden videos once the user enables onion skin for the
  // current file. We keep them mounted (even if prevN/nextN later goes lower or
  // enabled toggles off) until fileUrl changes, so adjusting the slider never spawns
  // a new <video>/decoder pair — which is what was producing repeated
  // "Unsupported pixel format: -1" warnings from Chromium's internal ffmpeg.
  const [mountCount, setMountCount] = useState(0);
  useEffect(() => {
    setMountCount(0);
  }, [fileUrl]);
  useEffect(() => {
    if (s.enabled && mountCount < MAX_ONION) setMountCount(MAX_ONION);
  }, [s.enabled, mountCount]);

  useEffect(() => {
    shared.settings = s;
    api.setSetting('settings', s);
    api.requestRedraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  // Keep shared.prevVideos / nextVideos in sync with refs, sliced to the active range.
  useEffect(() => {
    const allPrev = prevRefs.current.filter(Boolean) as HTMLVideoElement[];
    const allNext = nextRefs.current.filter(Boolean) as HTMLVideoElement[];
    shared.prevVideos = allPrev.slice(0, s.prevN);
    shared.nextVideos = allNext.slice(0, s.nextN);
  }, [s.prevN, s.nextN, fileUrl, mountCount]);

  // When currentFrame or active counts change, seek each ACTIVE hidden video to the
  // appropriate frame. Targets for inactive slots are still updated so that when the
  // slot becomes active later, the next pass will catch it up.
  // We never seek before HAVE_METADATA (readyState>=1) — that triggers Chromium to
  // query pixel format before decoder init and produces "Unsupported pixel format: -1".
  useEffect(() => {
    if (!fileUrl || !sourceFps) return;
    const seekIfReady = (v: HTMLVideoElement | null, t: number) => {
      if (!v) return;
      if (v.readyState >= 1 && Math.abs(v.currentTime - t) > 1e-4) {
        v.currentTime = t;
      }
    };
    for (let i = 0; i < MAX_ONION; i++) {
      const targetDisplay = currentFrame - (i + 1);
      const t = displayFrameToTime(Math.max(0, targetDisplay), sourceFps, displayFps);
      prevTargets.current[i] = t;
      if (i < s.prevN) seekIfReady(prevRefs.current[i], t);
    }
    for (let i = 0; i < MAX_ONION; i++) {
      const targetDisplay = currentFrame + (i + 1);
      const t = displayFrameToTime(targetDisplay, sourceFps, displayFps);
      nextTargets.current[i] = t;
      if (i < s.nextN) seekIfReady(nextRefs.current[i], t);
    }
  }, [currentFrame, fileUrl, sourceFps, displayFps, s.prevN, s.nextN, mountCount]);

  const slotArr = useMemo(() => Array.from({ length: mountCount }), [mountCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ToggleRow
        label="有効"
        value={s.enabled}
        onChange={(v) => setS({ ...s, enabled: v })}
      />
      <NumRow
        label="前フレーム数"
        value={s.prevN}
        min={0}
        max={5}
        onChange={(v) => setS({ ...s, prevN: v })}
      />
      <NumRow
        label="後フレーム数"
        value={s.nextN}
        min={0}
        max={5}
        onChange={(v) => setS({ ...s, nextN: v })}
      />
      <ColorRow label="前フレーム色" value={s.prevColor} onChange={(v) => setS({ ...s, prevColor: v })} />
      <ColorRow label="後フレーム色" value={s.nextColor} onChange={(v) => setS({ ...s, nextColor: v })} />
      <NumRow
        label="不透明度"
        value={s.opacityStart}
        min={0.05}
        max={1}
        step={0.05}
        onChange={(v) => setS({ ...s, opacityStart: v })}
      />
      <NumRow
        label="減衰率"
        value={s.opacityDecay}
        min={0}
        max={0.95}
        step={0.05}
        onChange={(v) => setS({ ...s, opacityDecay: v })}
      />

      {/* Hidden video elements for seeking onion frames. Always mount MAX_ONION
          once enabled so adjusting prevN/nextN never spawns or destroys decoders. */}
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        {fileUrl &&
          slotArr.map((_, i) => (
            <video
              key={`p-${i}`}
              ref={(el) => { prevRefs.current[i] = el; }}
              src={fileUrl}
              muted
              preload="auto"
              onLoadedMetadata={(e) => {
                const t = prevTargets.current[i];
                if (t !== undefined && Math.abs(e.currentTarget.currentTime - t) > 1e-4) {
                  e.currentTarget.currentTime = t;
                }
              }}
              onSeeked={() => api.requestRedraw()}
            />
          ))}
        {fileUrl &&
          slotArr.map((_, i) => (
            <video
              key={`n-${i}`}
              ref={(el) => { nextRefs.current[i] = el; }}
              src={fileUrl}
              muted
              preload="auto"
              onLoadedMetadata={(e) => {
                const t = nextTargets.current[i];
                if (t !== undefined && Math.abs(e.currentTarget.currentTime - t) > 1e-4) {
                  e.currentTarget.currentTime = t;
                }
              }}
              onSeeked={() => api.requestRedraw()}
            />
          ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: value ? 'var(--gradient-accent)' : 'var(--bg-elevated)',
          position: 'relative',
          transition: 'background 150ms ease',
          border: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 20 : 2,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: '#FFFFFF',
            transition: 'left 150ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  );
}

function NumRow({
  label, value, onChange, min, max, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        style={{ width: 80, fontSize: 12, padding: '4px 8px' }}
      />
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 44, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
      />
    </div>
  );
}
