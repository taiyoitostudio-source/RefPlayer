import { usePlayerStore } from '@/stores/playerStore';

export function InOutButtons() {
  const filePath = usePlayerStore((s) => s.filePath);
  const isClipped = usePlayerStore((s) => s.isClipped);
  const inFrame = usePlayerStore((s) => s.inFrame);
  const outFrame = usePlayerStore((s) => s.outFrame);

  const canClip =
    !isClipped &&
    inFrame != null &&
    outFrame != null &&
    outFrame > inFrame;

  const onIn = () => usePlayerStore.getState().setInPoint();
  const onOut = () => usePlayerStore.getState().setOutPoint();
  const onClipToggle = () => {
    const s = usePlayerStore.getState();
    if (s.isClipped) s.undoClip();
    else s.applyClip();
  };

  const disabledInOut = !filePath || isClipped;

  return (
    <div className="flex items-center gap-1.5">
      <button
        className="btn-secondary"
        disabled={disabledInOut}
        onClick={onIn}
        title="IN点を設定 (I)"
        style={{ minWidth: 36 }}
      >
        <span style={{ color: 'var(--accent-magenta)' }}>{'{'}</span>
      </button>
      <button
        className="btn-secondary"
        disabled={disabledInOut}
        onClick={onOut}
        title="OUT点を設定 (O)"
        style={{ minWidth: 36 }}
      >
        <span style={{ color: 'var(--accent-purple)' }}>{'}'}</span>
      </button>
      <button
        className="btn-primary"
        onClick={onClipToggle}
        disabled={!filePath || (!isClipped && !canClip)}
        title={isClipped ? '元に戻す (Enter)' : '切り抜き (Enter)'}
        style={{ padding: '6px 14px', fontSize: 12 }}
      >
        {isClipped ? '元に戻す' : '切り抜き'}
      </button>
    </div>
  );
}
