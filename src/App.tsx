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
    })();

    const off = window.refplayer.onSettingsChanged((s) => {
      useSettingsStore.getState().receiveExternal(s);
    });
    return off;
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
