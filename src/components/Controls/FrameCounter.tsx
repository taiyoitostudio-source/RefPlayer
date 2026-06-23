import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { clamp, displayFrameLabel } from '@/utils/frameMath';

export function FrameCounter() {
  const currentFrame = usePlayerStore((s) => s.currentFrame);
  const filePath = usePlayerStore((s) => s.filePath);
  const total = usePlayerStore((s) => s.getTotalDisplayFrames());
  const isClipped = usePlayerStore((s) => s.isClipped);
  const inFrame = usePlayerStore((s) => s.inFrame);
  const outFrame = usePlayerStore((s) => s.outFrame);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

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

  const commit = () => {
    const v = parseInt(draft, 10);
    if (Number.isFinite(v)) {
      // Input is 1-indexed within the active range. Convert back to absolute.
      const target = clamp(v - 1 + startFrame, startFrame, endFrame);
      usePlayerStore.getState().seekToFrame(target);
    }
    setEditing(false);
  };

  const startEdit = () => {
    setDraft(String(displayCurrent));
    setEditing(true);
  };

  return (
    <div
      className="text-mono flex items-baseline gap-1"
      style={{ minWidth: 90, justifyContent: 'flex-end' }}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          value={draft}
          min={1}
          max={displayTotal}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') setEditing(false);
          }}
          style={{
            width: 56,
            fontSize: 13,
            fontWeight: 700,
            textAlign: 'right',
            padding: '2px 4px',
            fontFamily: 'var(--font-mono)',
          }}
        />
      ) : (
        <span
          onClick={startEdit}
          title="クリックでフレーム番号を指定"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          {displayCurrent}
        </span>
      )}
      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>/</span>
      <span style={{ color: 'var(--text-primary)', fontSize: 11 }}>{displayTotal}</span>
    </div>
  );
}
