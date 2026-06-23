import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { TitleBar } from '../TitleBar';
import { ShortcutEditor } from './ShortcutEditor';

export function SettingsWindow() {
  useEffect(() => {
    void useSettingsStore.getState().load();
    const off = window.refplayer.onSettingsChanged((s) => {
      useSettingsStore.getState().receiveExternal(s);
    });
    return off;
  }, []);

  const loaded = useSettingsStore((s) => s.loaded);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-base)',
      }}
    >
      <TitleBar title="設定 — RefPlayer" />
      <header
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-panel)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          設定
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          変更は即座に反映・自動保存されます
        </div>
      </header>

      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
        {loaded ? (
          <>
            <ShortcutEditor />
            <PluginsSection />
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>読み込み中…</div>
        )}
      </div>
    </div>
  );
}

function PluginsSection() {
  return (
    <section style={{ marginTop: 32 }}>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        プラグイン
      </h2>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
        プラグインフォルダにプラグインのフォルダを配置し、アプリを再起動すると追加されます。
      </p>
      <button
        className="btn-secondary"
        onClick={() => void window.refplayer.openPluginsFolder()}
      >
        プラグインフォルダを開く
      </button>
    </section>
  );
}
