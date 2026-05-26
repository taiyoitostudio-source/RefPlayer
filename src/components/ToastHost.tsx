import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type ToastMsg =
  | { kind: 'progress'; message: string; percent: number }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'info'; message: string };

type ToastCtx = (m: ToastMsg) => void;

const Ctx = createContext<ToastCtx>(() => {});

export function useExportToast() {
  return useContext(Ctx);
}

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: ToastMsg) => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent(m);
    if (m.kind !== 'progress') {
      timer.current = setTimeout(() => setCurrent(null), 3000);
    }
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <ToastView msg={current} onClose={() => setCurrent(null)} />
    </Ctx.Provider>
  );
}

function ToastView({ msg, onClose }: { msg: ToastMsg | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-soft)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-lg)',
            minWidth: 280,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Dot kind={msg.kind} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{msg.message}</div>
            {msg.kind === 'progress' && (
              <div
                style={{
                  marginTop: 6,
                  width: '100%',
                  height: 4,
                  borderRadius: 4,
                  background: 'var(--bg-elevated)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${msg.percent}%`,
                    height: '100%',
                    background: 'var(--gradient-accent)',
                    transition: 'width 200ms ease',
                  }}
                />
              </div>
            )}
          </div>
          {msg.kind !== 'progress' && (
            <button
              onClick={onClose}
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                padding: 4,
              }}
            >
              ×
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Dot({ kind }: { kind: ToastMsg['kind'] }) {
  const color =
    kind === 'success' ? '#4B2A8A'
    : kind === 'error' ? '#B82B5F'
    : kind === 'progress' ? '#8B1E5C'
    : '#7C5BBE';
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 10,
        background: color,
        flexShrink: 0,
      }}
    />
  );
}
