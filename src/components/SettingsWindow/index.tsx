import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ExportQuality } from '@/types';
import { TitleBar } from '../TitleBar';
import { AboutDialog } from '../AboutDialog';
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
            <ExportSection />
            <PluginsSection />
            <AboutSection />
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>読み込み中…</div>
        )}
      </div>
    </div>
  );
}

function ExportSection() {
  const quality = useSettingsStore((s) => s.exportQuality);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void useSettingsStore.getState().update({ exportQuality: e.target.value as ExportQuality });
  };

  return (
    <section style={{ marginTop: 24 }}>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        書き出し
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>品質：</span>
        <select
          value={quality}
          onChange={onChange}
          style={{
            fontSize: 11,
            background: '#C0C0C0',
            color: 'var(--text-primary)',
            boxShadow: 'var(--bevel-raised)',
            border: 'none',
            padding: '2px 4px',
            cursor: 'pointer',
          }}
        >
          <option value="low">低（ファイル小さめ）</option>
          <option value="medium">中（推奨）</option>
          <option value="high">高（ファイル大きめ）</option>
        </select>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 6 }}>
        MP4 書き出し時のビットレート / 画質を切り替えます。
      </p>
    </section>
  );
}

function PluginsSection() {
  return (
    <section style={{ marginTop: 24 }}>
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

function AboutSection() {
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <section style={{ marginTop: 24, marginBottom: 16 }}>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        情報
      </h2>
      <button
        className="btn-secondary"
        onClick={() => setAboutOpen(true)}
      >
        RefPlayer について
      </button>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </section>
  );
}
