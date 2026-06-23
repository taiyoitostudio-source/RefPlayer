import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatKeyCombo } from '@/utils/format';
import type { ActionId, KeyCombo } from '@/types';

const LABELS: Record<ActionId, string> = {
  playPause:        '再生 / 停止',
  stepBack:         '前のフレーム',
  stepForward:      '次のフレーム',
  setIn:            'IN点を設定',
  setOut:           'OUT点を設定',
  applyClipToggle:  '切り抜き / 元に戻す',
  toggleRepeat:     'リピート切替',
  openSettings:     '設定を開く',
  zoomTimelineIn:   'タイムラインをズームイン',
  zoomTimelineOut:  'タイムラインをズームアウト',
  volumeUp:         '音量を上げる',
  volumeDown:       '音量を下げる',
  muteToggle:       'ミュート切替',
  clearIn:          'IN点を解除',
  clearOut:         'OUT点を解除',
  toggleFullscreen: 'フルスクリーン切替',
  saveFrame:        '現在のフレームを保存',
};

const ORDER: ActionId[] = [
  'playPause', 'stepBack', 'stepForward',
  'setIn', 'setOut', 'clearIn', 'clearOut', 'applyClipToggle',
  'toggleRepeat', 'openSettings',
  'zoomTimelineIn', 'zoomTimelineOut',
  'volumeUp', 'volumeDown', 'muteToggle',
  'toggleFullscreen', 'saveFrame',
];

export function ShortcutEditor() {
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const [capturing, setCapturing] = useState<ActionId | null>(null);

  const startCapture = (id: ActionId) => setCapturing(id);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!capturing) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      setCapturing(null);
      return;
    }
    // Ignore standalone modifier keystrokes; wait for a real key
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    const combo: KeyCombo = {
      key: e.key,
      ctrl: e.ctrlKey || undefined,
      shift: e.shiftKey || undefined,
      alt: e.altKey || undefined,
      meta: e.metaKey || undefined,
    };
    // Check duplicate
    const dup = (Object.entries(shortcuts) as [ActionId, KeyCombo][]).find(
      ([id, c]) =>
        id !== capturing &&
        c.key.toLowerCase() === combo.key.toLowerCase() &&
        !!c.ctrl === !!combo.ctrl &&
        !!c.shift === !!combo.shift &&
        !!c.alt === !!combo.alt &&
        !!c.meta === !!combo.meta,
    );
    if (dup) {
      alert(`「${LABELS[dup[0]]}」と重複しています`);
      setCapturing(null);
      return;
    }
    void useSettingsStore.getState().updateShortcut(capturing, combo);
    setCapturing(null);
  };

  return (
    <div onKeyDown={onKeyDown} tabIndex={-1} style={{ outline: 'none' }}>
      <div className="panel" style={{ padding: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>ショートカットキー</div>
          <button
            className="btn-secondary"
            onClick={() => useSettingsStore.getState().resetShortcuts()}
            style={{ fontSize: 12 }}
          >
            初期値に戻す
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
          {ORDER.map((id) => {
            const combo = shortcuts[id];
            const isCapturing = capturing === id;
            return (
              <Row
                key={id}
                label={LABELS[id]}
                combo={combo}
                capturing={isCapturing}
                onClick={() => startCapture(id)}
              />
            );
          })}
        </div>

        <div
          style={{
            marginTop: 14,
            padding: '10px 12px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}
        >
          キーを変更するには右のボタンをクリックし、設定したいキーを押してください。Esc でキャンセル。
        </div>
      </div>
    </div>
  );
}

function Row({
  label, combo, capturing, onClick,
}: { label: string; combo: KeyCombo; capturing: boolean; onClick: () => void }) {
  return (
    <>
      <div
        style={{
          padding: '10px 4px',
          color: 'var(--text-primary)',
          fontSize: 13,
          alignSelf: 'center',
        }}
      >
        {label}
      </div>
      <button
        onClick={onClick}
        className={capturing ? 'btn-secondary active' : 'btn-secondary'}
        style={{
          minWidth: 160,
          justifyContent: 'flex-end',
          fontSize: 12,
          padding: '6px 12px',
        }}
      >
        {capturing ? <span style={{ color: 'var(--accent-magenta)' }}>キーを押してください…</span> : formatKeyCombo(combo)}
      </button>
    </>
  );
}
