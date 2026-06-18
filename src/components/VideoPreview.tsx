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
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const overlays = usePluginStore((s) => s.overlays);
  const overlayRevision = usePluginStore((s) => s.overlayRevision);

  useFrameAccuratePlayback(videoRef, fileUrl);

  // Sync volume/muted from store to the video element
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted, fileUrl]);

  // Resize overlay canvas to match video display area
  useEffect(() => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    const container = containerRef.current;
    if (!canvas || !video || !container) return;

    const sync = () => {
      const cr = container.getBoundingClientRect();
      const vw = video.videoWidth || videoWidth;
      const vh = video.videoHeight || videoHeight;
      if (!vw || !vh || cr.width === 0 || cr.height === 0) return;

      const containerAspect = cr.width / cr.height;
      const videoAspect = vw / vh;
      let dispW: number;
      let dispH: number;
      if (videoAspect > containerAspect) {
        dispW = cr.width;
        dispH = cr.width / videoAspect;
      } else {
        dispH = cr.height;
        dispW = cr.height * videoAspect;
      }
      const left = (cr.width - dispW) / 2;
      const top = (cr.height - dispH) / 2;

      canvas.style.left = `${left}px`;
      canvas.style.top = `${top}px`;
      canvas.style.width = `${dispW}px`;
      canvas.style.height = `${dispH}px`;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(dispW * dpr);
      canvas.height = Math.round(dispH * dpr);
    };
    sync();
    const ro = new ResizeObserver(sync);
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
  }, [currentFrame, overlays, overlayRevision]);

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
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
            preload="auto"
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
