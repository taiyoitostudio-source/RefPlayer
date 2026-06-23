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
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          exit={{ y: 10 }}
          transition={{ duration: 0 }}
          className="win95-raised"
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 12px',
            minWidth: 280,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 11,
          }}
        >
          <Dot kind={msg.kind} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>{msg.message}</div>
            {msg.kind === 'progress' && (
              <div
                className="win95-sunken"
                style={{
                  marginTop: 4,
                  width: '100%',
                  height: 12,
                  background: '#FFFFFF',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${msg.percent}%`,
                    height: '100%',
                    background: '#000080',
                  }}
                />
              </div>
            )}
          </div>
          {msg.kind !== 'progress' && (
            <button
              onClick={onClose}
              style={{
                width: 18,
                height: 16,
                fontSize: 10,
                padding: 0,
              }}
            >
              ✕
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Dot({ kind }: { kind: ToastMsg['kind'] }) {
  const glyph =
    kind === 'success' ? '✓'
    : kind === 'error' ? '✕'
    : kind === 'progress' ? '…'
    : 'i';
  const color = kind === 'error' ? '#800000' : '#000080';
  return (
    <span
      style={{
        width: 18,
        height: 18,
        background: '#FFFFFF',
        boxShadow: 'var(--bevel-input)',
        color,
        fontWeight: 700,
        fontSize: 12,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {glyph}
    </span>
  );
}
