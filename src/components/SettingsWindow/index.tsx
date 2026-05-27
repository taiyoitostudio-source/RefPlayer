import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
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
      <header
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-panel)',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            background: 'var(--gradient-accent)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'inline-block',
          }}
        >
          設定
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
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
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: 10,
        }}
      >
        プラグイン
      </h2>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
        プラグインフォルダにプラグインのフォルダを配置し、アプリを再起動すると追加されます。
      </p>
      <button
        className="btn-secondary"
        onClick={() => void window.refplayer.openPluginsFolder()}
        style={{ padding: '8px 14px', fontSize: 13 }}
      >
        プラグインフォルダを開く
      </button>
    </section>
  );
}
