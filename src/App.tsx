import { useEffect } from 'react';
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

  // Load settings & apply persisted values on startup
  useEffect(() => {
    (async () => {
      await useSettingsStore.getState().load();
      const s = useSettingsStore.getState();
      // Apply persisted FPS/repeat to player
      const p = usePlayerStore.getState();
      if (s.lastDisplayFps > 0) p.setDisplayFps(s.lastDisplayFps);
      p.setRepeat(s.repeat);

      initPluginHost();
      await loadUserPlugins();

      // If the app was launched with a file path (Open with / double-click),
      // load it now that all stores and plugins are ready.
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

    // While the app is already running, "Open with" routes through here.
    const offOpenFile = window.refplayer.onOpenFile((path) => {
      void openVideoFile(path);
    });

    return () => {
      offSettings();
      offOpenFile();
    };
  }, []);

  return (
    <ToastHost>
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-base)',
          overflow: 'hidden',
        }}
      >
        <TopBar />
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <VideoPreview />
          <PluginSidebar />
        </div>
        <Timeline />
        <Controls />
      </div>
    </ToastHost>
  );
}
