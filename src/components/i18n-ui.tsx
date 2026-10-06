'use client';

import { useTransition } from 'react';
import { setLocale } from '@/app/actions/i18n';
import { LOCALES, type TKey } from '@/i18n/core';
import { useT } from '@/i18n/client';
import { fmtDataHora } from '@/lib/dates';
import { STATUS_TONE } from '@/lib/labels';

export function StatusBadge({ value }: { value: string }) {
  const t = useT();
  return <span className={`badge tone-${STATUS_TONE[value] ?? 'neutral'}`}>{t.dyn(`status.${value}`)}</span>;
}

/** Linha do tempo de eventos guardados como chave i18n + parâmetros. */
export function Timeline({ items }: { items: { id: string; texto: string; params: Record<string, string | number | null> | null; quem: string; data: Date | string }[] }) {
  const t = useT();
  return (
    <ul className="timeline">
      {items.map((h) => (
        <li key={h.id}>
          <div>{t.dyn(h.texto, h.params)}</div>
          <div className="small muted">
            {h.quem} · {fmtDataHora(h.data, t.intl)}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Texto traduzido a partir de uma chave dinâmica (para usar dentro de Server Components). */
export function T({ k, params }: { k: string; params?: Record<string, string | number | null> | null }) {
  const t = useT();
  return <>{t.dyn(k, params)}</>;
}

/** Alternar entre Português e Inglês. */
export function LangSwitch({ dark }: { dark?: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')} data-dark={dark ? '' : undefined}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className={t.locale === l ? 'active' : ''}
          aria-pressed={t.locale === l}
          title={t(`lang.${l}` as TKey)}
          disabled={pending}
          onClick={() => t.locale !== l && start(() => setLocale(l))}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
