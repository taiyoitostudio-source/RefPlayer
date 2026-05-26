import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { clamp } from '@/utils/frameMath';

const HEADER_H = 18;
const MARKER_HIT = 8;

type DragMode =
  | { kind: 'none' }
  | { kind: 'seek' }
  | { kind: 'in' }
  | { kind: 'out' }
  | { kind: 'pan'; startClientX: number; startPan: number };

export function Timeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragMode>({ kind: 'none' });

  const currentFrame = usePlayerStore((s) => s.currentFrame);
  const inFrame = usePlayerStore((s) => s.inFrame);
  const outFrame = usePlayerStore((s) => s.outFrame);
  const isClipped = usePlayerStore((s) => s.isClipped);
  const zoom = usePlayerStore((s) => s.timelineZoom);
  const panFrame = usePlayerStore((s) => s.timelinePanFrame);
  const filePath = usePlayerStore((s) => s.filePath);

  // Subscribe to total frames + displayFps changes by reading them directly each render
  const sourceFps = usePlayerStore((s) => s.sourceFps);
  const displayFps = usePlayerStore((s) => s.displayFps);
  const totalSourceFrames = usePlayerStore((s) => s.totalSourceFrames);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const s = usePlayerStore.getState();
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = '#FAF7FC';
      ctx.fillRect(0, 0, w, h);

      const total = s.getTotalDisplayFrames();
      if (!total || !s.filePath) {
        // Empty hint
        ctx.fillStyle = '#C9BFD7';
        ctx.font = '11px DM Mono';
        ctx.textBaseline = 'middle';
        ctx.fillText('— タイムライン —', 12, h / 2);
        return;
      }

      const start = s.isClipped && s.inFrame != null ? s.inFrame : 0;
      const endIncl = s.isClipped && s.outFrame != null ? s.outFrame : total - 1;
      const rangeLen = Math.max(1, endIncl - start + 1);

      // Visible window: panFrame .. panFrame + rangeLen/zoom
      const visibleLen = rangeLen / s.timelineZoom;
      const viewStart = clamp(s.timelinePanFrame + start, start, endIncl - visibleLen + 1);
      const viewEnd = viewStart + visibleLen;

      const frameToX = (f: number) => ((f - viewStart) / visibleLen) * w;

      // Header strip
      ctx.fillStyle = '#F4F1F8';
      ctx.fillRect(0, 0, w, HEADER_H);
      ctx.strokeStyle = '#E7E1EE';
      ctx.beginPath();
      ctx.moveTo(0, HEADER_H + 0.5);
      ctx.lineTo(w, HEADER_H + 0.5);
      ctx.stroke();

      // Choose tick spacing
      const candidates = [1, 2, 5, 10, 30, 60, 120, 300, 600, 1800];
      const minPx = 50;
      let tickStep = candidates[candidates.length - 1];
      for (const c of candidates) {
        if ((c / visibleLen) * w >= minPx) {
          tickStep = c;
          break;
        }
      }

      const firstTick = Math.floor(viewStart / tickStep) * tickStep;
      ctx.fillStyle = '#6B5B7D';
      ctx.font = '10px DM Mono';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      for (let f = firstTick; f <= viewEnd; f += tickStep) {
        const x = frameToX(f);
        if (x < -20 || x > w + 20) continue;
        // Major tick
        ctx.strokeStyle = '#C9BFD7';
        ctx.beginPath();
        ctx.moveTo(x + 0.5, HEADER_H);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
        // Label
        ctx.fillStyle = '#6B5B7D';
        ctx.fillText(String(f), x + 3, HEADER_H / 2);

        // Minor ticks
        const minorCount = 4;
        ctx.strokeStyle = '#E7E1EE';
        for (let k = 1; k < minorCount; k++) {
          const mf = f + (k * tickStep) / minorCount;
          const mx = frameToX(mf);
          ctx.beginPath();
          ctx.moveTo(mx + 0.5, h - 10);
          ctx.lineTo(mx + 0.5, h);
          ctx.stroke();
        }
      }

      // IN/OUT range shading (when in/out set but not yet clipped)
      if (!s.isClipped && s.inFrame != null && s.outFrame != null && s.outFrame > s.inFrame) {
        const x1 = frameToX(s.inFrame);
        const x2 = frameToX(s.outFrame);
        const grad = ctx.createLinearGradient(x1, 0, x2, 0);
        grad.addColorStop(0, 'rgba(139,30,92,0.10)');
        grad.addColorStop(1, 'rgba(75,42,138,0.10)');
        ctx.fillStyle = grad;
        ctx.fillRect(x1, HEADER_H, x2 - x1, h - HEADER_H);
      }

      // IN/OUT markers (hidden when clipped)
      if (!s.isClipped) {
        if (s.inFrame != null) drawMarker(ctx, frameToX(s.inFrame), h, '#8B1E5C', '{');
        if (s.outFrame != null) drawMarker(ctx, frameToX(s.outFrame), h, '#4B2A8A', '}');
      }

      // Playhead
      const phX = frameToX(s.currentFrame);
      const phGrad = ctx.createLinearGradient(0, 0, 0, h);
      phGrad.addColorStop(0, '#8B1E5C');
      phGrad.addColorStop(1, '#4B2A8A');
      ctx.strokeStyle = phGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(phX, 0);
      ctx.lineTo(phX, h);
      ctx.stroke();
      ctx.lineWidth = 1;

      // Playhead handle
      ctx.fillStyle = '#8B1E5C';
      ctx.beginPath();
      ctx.moveTo(phX - 6, 0);
      ctx.lineTo(phX + 6, 0);
      ctx.lineTo(phX, 8);
      ctx.closePath();
      ctx.fill();
    };

    draw();

    const ro = new ResizeObserver(draw);
    ro.observe(canvas);

    const unsub = usePlayerStore.subscribe(draw);

    return () => {
      ro.disconnect();
      unsub();
    };
  }, []);

  const getViewState = () => {
    const s = usePlayerStore.getState();
    const total = s.getTotalDisplayFrames();
    const start = s.isClipped && s.inFrame != null ? s.inFrame : 0;
    const endIncl = s.isClipped && s.outFrame != null ? s.outFrame : Math.max(0, total - 1);
    const rangeLen = Math.max(1, endIncl - start + 1);
    const visibleLen = rangeLen / s.timelineZoom;
    const viewStart = clamp(s.timelinePanFrame + start, start, endIncl - visibleLen + 1);
    return { start, endIncl, rangeLen, visibleLen, viewStart };
  };

  const xToFrame = (clientX: number): number => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const w = r.width;
    const localX = clientX - r.left;
    const { visibleLen, viewStart } = getViewState();
    return Math.round(viewStart + (localX / w) * visibleLen);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!filePath) return;
    const s = usePlayerStore.getState();
    const target = xToFrame(e.clientX);

    // Hit-test for IN/OUT markers (only when not clipped)
    if (!s.isClipped) {
      if (s.inFrame != null) {
        const dx = Math.abs(target - s.inFrame);
        const { visibleLen } = getViewState();
        const r = canvasRef.current!.getBoundingClientRect();
        const pxPerFrame = r.width / visibleLen;
        if (dx * pxPerFrame <= MARKER_HIT) {
          dragRef.current = { kind: 'in' };
          return;
        }
      }
      if (s.outFrame != null) {
        const dx = Math.abs(target - s.outFrame);
        const { visibleLen } = getViewState();
        const r = canvasRef.current!.getBoundingClientRect();
        const pxPerFrame = r.width / visibleLen;
        if (dx * pxPerFrame <= MARKER_HIT) {
          dragRef.current = { kind: 'out' };
          return;
        }
      }
    }

    // Middle button or Shift+left for pan
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      dragRef.current = { kind: 'pan', startClientX: e.clientX, startPan: s.timelinePanFrame };
      return;
    }

    // Left click = seek
    if (e.button === 0) {
      dragRef.current = { kind: 'seek' };
      s.seekToFrame(target);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current;
    if (d.kind === 'none') return;
    const s = usePlayerStore.getState();
    if (d.kind === 'seek') {
      const f = xToFrame(e.clientX);
      const start = s.getEffectiveStartFrame();
      const end = s.getEffectiveEndFrame();
      s.seekToFrame(clamp(f, start, end));
    } else if (d.kind === 'in') {
      const f = xToFrame(e.clientX);
      const lo = 0;
      const hi = (s.outFrame ?? s.getTotalDisplayFrames() - 1) - 1;
      s.setInFrame(clamp(f, lo, hi));
    } else if (d.kind === 'out') {
      const f = xToFrame(e.clientX);
      const lo = (s.inFrame ?? 0) + 1;
      const hi = s.getTotalDisplayFrames() - 1;
      s.setOutFrame(clamp(f, lo, hi));
    } else if (d.kind === 'pan') {
      const r = canvasRef.current!.getBoundingClientRect();
      const { visibleLen, rangeLen } = getViewState();
      const dx = e.clientX - d.startClientX;
      const dFrames = -(dx / r.width) * visibleLen;
      const maxPan = Math.max(0, rangeLen - visibleLen);
      s.setTimelinePan(clamp(d.startPan + dFrames, 0, maxPan));
    }
  };

  const onMouseUp = () => {
    dragRef.current = { kind: 'none' };
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!filePath) return;
    e.preventDefault();
    const s = usePlayerStore.getState();
    const r = canvasRef.current!.getBoundingClientRect();
    const { visibleLen, rangeLen } = getViewState();
    const localX = e.clientX - r.left;
    const frameAtCursor = xToFrame(e.clientX);

    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    const newZoom = clamp(s.timelineZoom * factor, 1, 20);
    const newVisible = rangeLen / newZoom;
    // Keep frame under cursor fixed
    const newViewStart = frameAtCursor - (localX / r.width) * newVisible;
    const start = s.isClipped && s.inFrame != null ? s.inFrame : 0;
    const newPan = clamp(newViewStart - start, 0, Math.max(0, rangeLen - newVisible));

    s.setTimelineZoom(newZoom);
    s.setTimelinePan(newPan);
  };

  return (
    <div
      style={{
        height: 'var(--timeline-h)',
        background: 'var(--bg-timeline)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        // Prevent right-click menu for dragging affordance
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  h: number,
  color: string,
  label: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, HEADER_H);
  ctx.lineTo(x, h);
  ctx.stroke();
  ctx.lineWidth = 1;

  // Marker flag
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, HEADER_H);
  ctx.lineTo(x + 12, HEADER_H);
  ctx.lineTo(x + 12, HEADER_H + 10);
  ctx.lineTo(x + 2, HEADER_H + 14);
  ctx.lineTo(x, HEADER_H + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 10px DM Mono';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 6, HEADER_H + 6);
  ctx.textAlign = 'left';
}
