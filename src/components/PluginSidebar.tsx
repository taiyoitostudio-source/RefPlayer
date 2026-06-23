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
          initial={{ width: 'var(--sidebar-w)' }}
          animate={{ width: 'var(--sidebar-w)' }}
          exit={{ width: 0 }}
          transition={{ duration: 0 }}
          style={{
            background: 'var(--bg-panel)',
            borderLeft: '1px solid #808080',
            boxShadow: 'inset 1px 0 0 #FFFFFF',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '8px 10px 6px',
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            拡張機能
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 8px 12px' }}>
            {panels.length === 0 ? (
              <div
                className="win95-sunken"
                style={{
                  padding: 16,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  margin: 4,
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
        marginTop: 8,
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
          padding: '4px 8px',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-primary)',
          background: '#C0C0C0',
          boxShadow: 'var(--bevel-raised)',
        }}
      >
        <span>{title}</span>
        <span style={{ color: '#000000', fontSize: 10 }}>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div style={{ padding: '8px 10px 10px' }}>
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
