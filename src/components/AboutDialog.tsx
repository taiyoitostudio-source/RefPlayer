import { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AboutDialog({ open, onClose }: Props) {
  const [version, setVersion] = useState('');

  useEffect(() => {
    if (!open) return;
    void window.refplayer.getAppVersion().then(setVersion);
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win95-raised"
        style={{
          minWidth: 320,
          padding: 0,
          background: '#C0C0C0',
        }}
      >
        <div
          style={{
            background: 'var(--bg-titlebar)',
            color: '#FFFFFF',
            padding: '4px 8px',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>RefPlayer について</span>
          <button
            onClick={onClose}
            className="titlebar-btn"
            style={{ width: 18, height: 16 }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 16, fontSize: 11, color: 'var(--text-primary)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>RefPlayer</div>
          <div style={{ marginBottom: 10 }}>バージョン {version || '...'}</div>
          <div style={{ marginBottom: 6 }}>
            アニメーション・イラスト制作のリファレンス用ローカル動画プレイヤー
          </div>
          <div style={{ marginBottom: 6 }}>
            Copyright (c) 2024-2026 Taiyo Ito
          </div>
          <div style={{ marginBottom: 12 }}>
            MIT License
          </div>
          <div style={{ textAlign: 'right' }}>
            <button onClick={onClose} style={{ fontSize: 11, padding: '4px 16px' }}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
