import { useEffect, useState } from 'react';

type Props = {
  title?: string;
};

export function TitleBar({ title = 'RefPlayer' }: Props) {
  const [focused, setFocused] = useState(true);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void window.refplayer.windowControls.isMaximized().then(setMaximized);
    const offMax = window.refplayer.windowControls.onMaximizedChange(setMaximized);
    const offFocus = window.refplayer.windowControls.onFocusChange(setFocused);
    return () => {
      offMax();
      offFocus();
    };
  }, []);

  return (
    <div className={`titlebar${focused ? '' : ' inactive'}`}>
      <PixelIcon />
      <span style={{ marginLeft: 4, marginRight: 'auto', letterSpacing: 0 }}>{title}</span>

      <button
        className="titlebar-btn"
        onClick={() => void window.refplayer.windowControls.minimize()}
        title="最小化"
        aria-label="Minimize"
      >
        <span style={{ display: 'inline-block', width: 8, height: 2, background: '#000', marginTop: 6 }} />
      </button>
      <button
        className="titlebar-btn"
        onClick={() => void window.refplayer.windowControls.toggleMaximize()}
        title={maximized ? '元のサイズに戻す' : '最大化'}
        aria-label="Maximize"
      >
        {maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
      </button>
      <button
        className="titlebar-btn"
        onClick={() => void window.refplayer.windowControls.close()}
        title="閉じる"
        aria-label="Close"
        style={{ marginLeft: 2 }}
      >
        <CloseGlyph />
      </button>
    </div>
  );
}

function PixelIcon() {
  // 16x16 simple pixel art reminiscent of a Win95 media/film icon
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated', flexShrink: 0 }}>
      <rect width="16" height="16" fill="#000080" />
      <rect x="1" y="2" width="14" height="11" fill="#FFFFFF" />
      <rect x="2" y="3" width="12" height="9" fill="#000000" />
      <polygon points="6,5 6,10 11,7.5" fill="#FFFFFF" />
      <rect x="1" y="13" width="14" height="2" fill="#C0C0C0" />
    </svg>
  );
}

function MaximizeGlyph() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        border: '1px solid #000',
        borderTopWidth: 2,
        boxSizing: 'border-box',
      }}
    />
  );
}

function RestoreGlyph() {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10 }}>
      <span
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 7,
          height: 7,
          border: '1px solid #000',
          borderTopWidth: 2,
          boxSizing: 'border-box',
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 7,
          height: 7,
          border: '1px solid #000',
          borderTopWidth: 2,
          background: '#C0C0C0',
          boxSizing: 'border-box',
        }}
      />
    </span>
  );
}

function CloseGlyph() {
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'Tahoma, sans-serif',
        fontWeight: 700,
        fontSize: 10,
        lineHeight: '10px',
        marginTop: -1,
      }}
    >
      ✕
    </span>
  );
}
