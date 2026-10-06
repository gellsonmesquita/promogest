'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SERVICO_TIPO_LABEL } from '@/lib/labels';

export function ServicosFiltros({ q, tipo, estado }: { q: string; tipo: string; estado: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState(q);
  const go = (p: Record<string, string>) => {
    const s = new URLSearchParams(Object.entries({ q: texto, tipo, estado, ...p }).filter(([, v]) => v));
    router.push(`/app/servicos?${s}`);
  };
  return (
    <form className="filters" onSubmit={(e) => { e.preventDefault(); go({}); }}>
      <input className="input" placeholder="Pesquisar serviço ou cliente…" value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={() => texto !== q && go({})} />
      <select className="input" value={tipo} onChange={(e) => go({ tipo: e.target.value })}>
        <option value="">Todos os tipos</option>
        {Object.entries(SERVICO_TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select className="input" value={estado} onChange={(e) => go({ estado: e.target.value })}>
        <option value="">Todos os estados</option>
        <option value="rascunho">Rascunho</option>
        <option value="planeado">Planeado</option>
        <option value="em_execucao">Em execução</option>
        <option value="concluido">Concluído</option>
        <option value="cancelado">Cancelado</option>
      </select>
    </form>
  );
}
