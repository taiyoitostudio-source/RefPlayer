import { usePlayerStore } from '@/stores/playerStore';
import { displayFrameLabel } from '@/utils/frameMath';

export function FrameCounter() {
  const currentFrame = usePlayerStore((s) => s.currentFrame);
  const filePath = usePlayerStore((s) => s.filePath);
  const total = usePlayerStore((s) => s.getTotalDisplayFrames());
  const isClipped = usePlayerStore((s) => s.isClipped);
  const inFrame = usePlayerStore((s) => s.inFrame);
  const outFrame = usePlayerStore((s) => s.outFrame);

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

  const startFrame = isClipped && inFrame != null ? inFrame : 0;
  const endFrame =
    isClipped && outFrame != null ? outFrame : Math.max(0, total - 1);
  const displayCurrent = displayFrameLabel(currentFrame, startFrame);
  const displayTotal = displayFrameLabel(endFrame, startFrame);

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
        {displayCurrent}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{displayTotal}</span>
    </div>
  );
}
