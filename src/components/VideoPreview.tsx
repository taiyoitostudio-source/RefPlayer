import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { usePluginStore } from '@/stores/pluginStore';
import { useFrameAccuratePlayback } from '@/hooks/useFrameAccuratePlayback';

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fileUrl = usePlayerStore((s) => s.fileUrl);
  const videoWidth = usePlayerStore((s) => s.videoWidth);
  const videoHeight = usePlayerStore((s) => s.videoHeight);
  const currentFrame = usePlayerStore((s) => s.currentFrame);
  const overlays = usePluginStore((s) => s.overlays);

  useFrameAccuratePlayback(videoRef, fileUrl);

  // Resize overlay canvas to match video display area
  useEffect(() => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    const container = containerRef.current;
    if (!canvas || !video || !container) return;

    const sync = () => {
      const r = video.getBoundingClientRect();
      const cr = container.getBoundingClientRect();
      canvas.style.left = `${r.left - cr.left}px`;
      canvas.style.top = `${r.top - cr.top}px`;
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(video);
    ro.observe(container);
    return () => ro.disconnect();
  }, [fileUrl, videoWidth, videoHeight]);

  // Re-render overlays on frame change or overlay set change
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (overlays.length === 0) return;

    const s = usePlayerStore.getState();
    const state = {
      currentFrame: s.currentFrame,
      displayFps: s.displayFps,
      sourceFps: s.sourceFps,
    };
    ctx.save();
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    for (const o of overlays) {
      try {
        o.render(ctx, state);
      } catch (err) {
        console.warn('[overlay]', o.pluginId, err);
      }
    }
    ctx.restore();
  }, [currentFrame, overlays]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        flex: 1,
        background: 'var(--bg-video)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 0,
      }}
    >
      {fileUrl ? (
        <>
          <video
            ref={videoRef}
            src={fileUrl}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
            preload="auto"
            muted
          />
          <canvas
            ref={overlayRef}
            style={{
              position: 'absolute',
              pointerEvents: 'none',
            }}
          />
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        textAlign: 'center',
        color: '#9892AB',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          width: 88,
          height: 88,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 22,
          marginBottom: 14,
          background: 'linear-gradient(135deg, rgba(139,30,92,0.18), rgba(75,42,138,0.18))',
        }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#C49AD2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="14" height="12" rx="2" />
          <path d="m17 10 4-2v8l-4-2" />
        </svg>
      </div>
      <div className="text-mono" style={{ fontSize: 13, letterSpacing: '0.08em' }}>
        動画を選択してください
      </div>
    </div>
  );
}
