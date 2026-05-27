import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePluginStore, type PanelMountFn } from '@/stores/pluginStore';
import { useSettingsStore } from '@/stores/settingsStore';

export function PluginSidebar() {
  const open = useSettingsStore((s) => s.sidebarOpen);
  const panels = usePluginStore((s) => s.panels);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'var(--sidebar-w)', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            background: 'var(--bg-panel)',
            borderLeft: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '14px 16px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            拡張機能
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 16px' }}>
            {panels.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  border: '1px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  margin: 8,
                }}
              >
                プラグインなし
              </div>
            ) : (
              panels.map((p, idx) => (
                <PanelCard key={`${p.pluginId}-${idx}`} title={p.title} defaultOpen={p.defaultOpen}>
                  {p.node}
                </PanelCard>
              ))
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function PanelCard({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode | PanelMountFn;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isMountFn = typeof children === 'function';
  return (
    <div
      className="panel"
      style={{
        marginTop: 10,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          background: open ? 'var(--gradient-accent-soft)' : 'transparent',
        }}
      >
        <span>{title}</span>
        <span style={{
          transform: open ? 'rotate(90deg)' : 'rotate(0)',
          transition: 'transform 150ms ease',
          color: 'var(--accent-magenta)',
          fontSize: 12,
        }}>▶</span>
      </button>
      {open && (
        <div style={{ padding: '10px 14px 14px' }}>
          {isMountFn ? (
            <DomPanelMount mount={children as PanelMountFn} />
          ) : (
            (children as React.ReactNode)
          )}
        </div>
      )}
    </div>
  );
}

function DomPanelMount({ mount }: { mount: PanelMountFn }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cleanup: (() => void) | undefined;
    try {
      const result = mount(root);
      if (typeof result === 'function') cleanup = result;
    } catch (err) {
      console.error('[plugin panel] mount failed', err);
    }
    return () => {
      try { cleanup?.(); } catch (err) { console.warn('[plugin panel] cleanup failed', err); }
      if (root) root.innerHTML = '';
    };
  }, [mount]);
  return <div ref={rootRef} />;
}
