import { usePlayerStore } from '@/stores/playerStore';

export function TransportButtons() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const filePath = usePlayerStore((s) => s.filePath);

  const stepBack = () => usePlayerStore.getState().stepFrame(-1);
  const stepForward = () => usePlayerStore.getState().stepFrame(+1);
  const togglePlay = () => usePlayerStore.getState().setIsPlaying(!isPlaying);

  return (
    <div className="flex items-center gap-1">
      <button className="btn-icon" disabled={!filePath} onClick={stepBack} title="前のフレーム (←)">
        <StepBackIcon />
      </button>
      <button
        className="btn-icon"
        onClick={togglePlay}
        disabled={!filePath}
        title={isPlaying ? '停止 (Space)' : '再生 (Space)'}
        style={{ width: 36, height: 28 }}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button className="btn-icon" disabled={!filePath} onClick={stepForward} title="次のフレーム (→)">
        <StepForwardIcon />
      </button>
    </div>
  );
}

function PlayIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
}
function PauseIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>;
}
function StepBackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6z" />
      <path d="M20 6 10 12l10 6z" />
    </svg>
  );
}
function StepForwardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 6h2v12h-2z" />
      <path d="M4 6v12l10-6z" />
    </svg>
  );
}
