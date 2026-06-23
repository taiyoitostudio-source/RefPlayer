import { FpsSelector } from './FpsSelector';
import { SpeedSelector } from './SpeedSelector';
import { TransportButtons } from './TransportButtons';
import { InOutButtons } from './InOutButtons';
import { RepeatToggle } from './RepeatToggle';
import { VolumeControl } from './VolumeControl';
import { FrameCounter } from './FrameCounter';
import { SettingsButton } from './SettingsButton';

export function Controls() {
  return (
    <div
      className="flex items-center justify-between px-4"
      style={{
        height: 'var(--controls-h)',
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border)',
        gap: 18,
      }}
    >
      <div className="flex items-center" style={{ flex: '0 1 auto', gap: 8 }}>
        <FpsSelector />
        <SpeedSelector />
      </div>

      <div className="flex items-center" style={{ gap: 14 }}>
        <InOutButtons />
        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
        <TransportButtons />
        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
        <RepeatToggle />
        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
        <VolumeControl />
      </div>

      <div className="flex items-center gap-3" style={{ flex: '0 1 auto' }}>
        <FrameCounter />
        <SettingsButton />
      </div>
    </div>
  );
}
