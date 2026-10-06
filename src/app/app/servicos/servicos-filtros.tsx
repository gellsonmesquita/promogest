'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/client';
import { SERVICO_TIPOS } from '@/lib/labels';

const ESTADOS = ['rascunho', 'planeado', 'em_execucao', 'concluido', 'cancelado'] as const;

export function ServicosFiltros({ q, tipo, estado }: { q: string; tipo: string; estado: string }) {
  const t = useT();
  const router = useRouter();
  const [texto, setTexto] = useState(q);
  const go = (p: Record<string, string>) => {
    const s = new URLSearchParams(Object.entries({ q: texto, tipo, estado, ...p }).filter(([, v]) => v));
    router.push(`/app/servicos?${s}`);
  };
  return (
    <form className="filters" onSubmit={(e) => { e.preventDefault(); go({}); }}>
      <input className="input" placeholder={t('serv.pesquisar')} value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={() => texto !== q && go({})} />
      <select className="input" value={tipo} onChange={(e) => go({ tipo: e.target.value })}>
        <option value="">{t('serv.todosTipos')}</option>
        {SERVICO_TIPOS.map((k) => <option key={k} value={k}>{t(`servicoTipo.${k}`)}</option>)}
      </select>
      <select className="input" value={estado} onChange={(e) => go({ estado: e.target.value })}>
        <option value="">{t('serv.todosEstados')}</option>
        {ESTADOS.map((k) => <option key={k} value={k}>{t(`status.${k}`)}</option>)}
      </select>
    </form>
  );
}
