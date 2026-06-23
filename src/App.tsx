import { useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { TopBar } from './components/TopBar';
import { VideoPreview } from './components/VideoPreview';
import { Timeline } from './components/Timeline';
import { Controls } from './components/Controls';
import { PluginSidebar } from './components/PluginSidebar';
import { ToastHost } from './components/ToastHost';
import { useSettingsStore } from './stores/settingsStore';
import { usePlayerStore } from './stores/playerStore';
import { useShortcuts } from './hooks/useShortcuts';
import { initPluginHost } from './plugins/host';
import { loadUserPlugins } from './plugins/userLoader';
import { openVideoFile } from './lib/openVideoFile';

export function App() {
  useShortcuts();

  const filePath = usePlayerStore((s) => s.filePath);
  const fullscreen = usePlayerStore((s) => s.fullscreen);

  // Load settings & apply persisted values on startup
  useEffect(() => {
    (async () => {
      await useSettingsStore.getState().load();
      const s = useSettingsStore.getState();
      const p = usePlayerStore.getState();
      if (s.lastDisplayFps > 0) p.setDisplayFps(s.lastDisplayFps);
      p.setRepeat(s.repeat);
      p.setVolume(s.lastVolume ?? 1);
      p.setMuted(s.muted ?? false);

      initPluginHost();
      await loadUserPlugins();

      try {
        const pending = await window.refplayer.getPendingOpenFile();
        if (pending) await openVideoFile(pending);
      } catch (err) {
        console.warn('[App] failed to load pending open file', err);
      }
    })();

    const offSettings = window.refplayer.onSettingsChanged((s) => {
      useSettingsStore.getState().receiveExternal(s);
    });

    const offOpenFile = window.refplayer.onOpenFile((path) => {
      void openVideoFile(path);
    });

    // ESC to leave fullscreen
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && usePlayerStore.getState().fullscreen) {
        const p = usePlayerStore.getState();
        p.setFullscreen(false);
        void window.refplayer.windowControls.setFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      offSettings();
      offOpenFile();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Drag & drop a video file onto the window to open it.
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const path = window.refplayer.getFilePath(file);
    if (!path) return;
    await openVideoFile(path);
  };

  const fileName = filePath ? filePath.split(/[\\/]/).pop() : null;
  const titleText = fileName ? `${fileName} — RefPlayer` : 'RefPlayer';

  return (
    <ToastHost>
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-base)',
          overflow: 'hidden',
        }}
      >
        {!fullscreen && <TitleBar title={titleText} />}
        {!fullscreen && <TopBar />}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <VideoPreview />
          {!fullscreen && <PluginSidebar />}
        </div>
        {!fullscreen && <Timeline />}
        {!fullscreen && <Controls />}
      </div>
    </ToastHost>
  );
}
