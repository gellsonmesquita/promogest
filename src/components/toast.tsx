'use client';

import { createContext, useCallback, useContext, useRef, useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/action-types';

type Toast = { msg: string; err?: boolean } | null;
const Ctx = createContext<(msg: string, err?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((msg: string, err = false) => {
    setToast({ msg, err });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), err ? 5000 : 3200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast${toast.err ? ' err' : ''}`} role="status">
          {toast.msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

/** Executa uma Server Action mostrando estado pendente e o resultado num toast. */
export function useAction() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const exec = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, onOk?: (r: ActionResult<T> & { ok: true }) => void) =>
      start(async () => {
        const r = await fn();
        if (r.ok) {
          if (r.msg) toast(r.msg);
          onOk?.(r);
        } else toast(r.error, true);
      }),
    [toast],
  );
  return { pending, exec };
}
