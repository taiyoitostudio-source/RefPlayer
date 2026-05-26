import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useExportToast } from './ToastHost';

export function TopBar() {
  const filePath = usePlayerStore((s) => s.filePath);
  const isClipped = usePlayerStore((s) => s.isClipped);
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen);
  const showToast = useExportToast();

  const onOpen = async () => {
    const path = await window.refplayer.openVideoDialog();
    if (!path) return;
    try {
      const meta = await window.refplayer.probeVideo(path);
      usePlayerStore.getState().loadVideo(path, meta);
    } catch (err) {
      showToast({ kind: 'error', message: `動画情報を取得できませんでした: ${(err as Error).message}` });
    }
  };

  const onExport = async () => {
    const s = usePlayerStore.getState();
    if (!s.filePath) return;

    const baseName = s.filePath.split(/[\\/]/).pop() ?? 'output';
    const defaultName = baseName.replace(/\.[^.]+$/, '') + '_export.mp4';

    const output = await window.refplayer.saveMp4Dialog(defaultName);
    if (!output) return;

    const startFrame = s.getEffectiveStartFrame();
    const endFrame = s.getEffectiveEndFrame();
    // Convert display-domain to source-domain seconds
    const startSec = (startFrame / s.displayFps);
    const endSec = ((endFrame + 1) / s.displayFps);

    showToast({ kind: 'progress', message: '書き出し中…', percent: 0 });
    const off = window.refplayer.onExportProgress((pct) => {
      showToast({ kind: 'progress', message: '書き出し中…', percent: pct });
    });
    try {
      await window.refplayer.exportMp4({
        inputPath: s.filePath,
        outputPath: output,
        startSec,
        endSec,
        targetFps: s.displayFps,
        sourceFps: s.sourceFps,
        isClipped: s.isClipped,
      });
      showToast({ kind: 'success', message: '書き出し完了' });
    } catch (err) {
      showToast({ kind: 'error', message: `書き出し失敗: ${(err as Error).message}` });
    } finally {
      off();
    }
  };

  const toggleSidebar = () =>
    useSettingsStore.getState().update({ sidebarOpen: !sidebarOpen });

  return (
    <header
      className="flex items-center justify-between px-4"
      style={{
        height: 'var(--topbar-h)',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={onOpen} title="動画ファイルを開く">
          <FolderIcon /> フォルダを開く
        </button>
      </div>

      <div
        className="text-mono"
        style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.08em',
          background: 'var(--gradient-accent)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        RefPlayer
      </div>

      <div className="flex items-center gap-2">
        <button
          className={`btn-icon${sidebarOpen ? ' active' : ''}`}
          onClick={toggleSidebar}
          title="拡張機能パネル"
        >
          <PuzzleIcon />
        </button>
        <button className="btn-primary" onClick={onExport} disabled={!filePath} title="MP4 で書き出し">
          <DownloadIcon /> MP4書き出し
          {isClipped ? <span style={{ fontSize: 11, opacity: 0.85 }}>（切り抜き）</span> : null}
        </button>
      </div>
    </header>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
    </svg>
  );
}
function PuzzleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.4 8.4a2 2 0 1 0-3.4-2L15 7.6V5a2 2 0 0 0-2-2h-3a2 2 0 0 0-2 2v3H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-3v-.6l1.4-.6z" />
    </svg>
  );
}
