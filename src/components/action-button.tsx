'use client';

import type { ActionResult } from '@/lib/action-types';
import { useAction } from './toast';

/** Botão que executa uma Server Action já ligada aos seus argumentos (`acao.bind(null, id)`). */
export function ActionButton({ action, children, className = 'btn sm', title }: { action: () => Promise<ActionResult>; children: React.ReactNode; className?: string; title?: string }) {
  const { pending, exec } = useAction();
  return (
    <button type="button" className={className} disabled={pending} title={title} onClick={() => exec(action)}>
      {children}
    </button>
  );
}
