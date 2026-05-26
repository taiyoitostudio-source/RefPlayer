import { usePlayerStore } from '@/stores/playerStore';

export function FrameCounter() {
  const currentFrame = usePlayerStore((s) => s.currentFrame);
  const filePath = usePlayerStore((s) => s.filePath);
  const total = usePlayerStore((s) => s.getTotalDisplayFrames());

  if (!filePath) {
    return (
      <div
        className="text-mono"
        style={{ color: 'var(--text-disabled)', fontSize: 13, minWidth: 80, textAlign: 'right' }}
      >
        — / —
      </div>
    );
  }

  return (
    <div
      className="text-mono flex items-baseline gap-1"
      style={{ minWidth: 90, justifyContent: 'flex-end' }}
    >
      <span
        style={{
          fontSize: 18,
          fontWeight: 600,
          background: 'var(--gradient-accent)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {currentFrame}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{Math.max(0, total - 1)}</span>
    </div>
  );
}
