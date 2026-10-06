import { inArray, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, PageHead, StatusBadge } from '@/components/ui';
import { db } from '@/db';
import { escalas, relatorios } from '@/db/schema';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { fmtDia } from '@/lib/dates';
import { SERVICO_TIPO_LABEL } from '@/lib/labels';
import { getRefs, isGestao, listServicos, pdvsPorServico } from '@/lib/queries';
import { ServicosFiltros } from './servicos-filtros';

export const metadata: Metadata = { title: 'Serviços & Campanhas' };

export default async function ServicosPage({ searchParams }: PageProps<'/app/servicos'>) {
  const u = await requireUser(WEB_ROLES);
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.toLowerCase() : '';
  const tipo = typeof sp.tipo === 'string' ? sp.tipo : '';
  const estado = typeof sp.estado === 'string' ? sp.estado : '';

  const [refs, todos] = await Promise.all([getRefs(), listServicos(u)]);
  const lista = todos.filter(
    (s) => (!tipo || s.tipo === tipo) && (!estado || s.estado === estado) && (!q || s.nome.toLowerCase().includes(q) || (refs.clientes.get(s.clienteId)?.nome ?? '').toLowerCase().includes(q)),
  );
  const ids = lista.map((s) => s.id);
  const [pdvMap, prog, aprov] = ids.length
    ? await Promise.all([
        pdvsPorServico(ids),
        db
          .select({ servicoId: escalas.servicoId, total: sql<number>`count(*) filter (where ${escalas.estado} not in ('cancelada','substituida'))::int`, exec: sql<number>`count(*) filter (where ${escalas.estado} = 'executada')::int` })
          .from(escalas)
          .where(inArray(escalas.servicoId, ids))
          .groupBy(escalas.servicoId),
        db
          .select({ servicoId: relatorios.servicoId, n: sql<number>`count(*) filter (where ${relatorios.estado} = 'aprovado')::int` })
          .from(relatorios)
          .where(inArray(relatorios.servicoId, ids))
          .groupBy(relatorios.servicoId),
      ])
    : [new Map<string, string[]>(), [], []];

  return (
    <div className="page">
      <PageHead eyebrow="Planeamento" title="Serviços & Campanhas" desc="Uma campanha é um tipo de serviço: ativações, eventos, degustações, merchandising e outros.">
        {isGestao(u) && (
          <Link className="btn primary" href="/app/servicos/novo">
            <Icon name="plus" size={18} /> Novo serviço
          </Link>
        )}
      </PageHead>
      <ServicosFiltros q={q} tipo={tipo} estado={estado} />

      <div className="grid-auto g-3">
        {lista.length === 0 && <div className="card empty">Nenhum serviço encontrado.</div>}
        {lista.map((s) => {
          const p = prog.find((x) => x.servicoId === s.id);
          const total = p?.total ?? 0;
          const exec = p?.exec ?? 0;
          const pct = total ? Math.round((exec / total) * 100) : 0;
          return (
            <Link key={s.id} href={`/app/servicos/${s.id}`} className="card svc">
              <div className="row">
                <span className="chip">{SERVICO_TIPO_LABEL[s.tipo]}</span>
                <span className="spacer" />
                <StatusBadge value={s.estado} />
              </div>
              <h3>{s.nome}</h3>
              <div className="small muted">
                {refs.clientes.get(s.clienteId)?.nome} · {refs.marcas.get(s.marcaId)?.nome}
              </div>
              <div className="meta small">
                <span><Icon name="calendar" size={14} /> {fmtDia(s.inicio, { day: '2-digit', month: '2-digit' })} – {fmtDia(s.fim, { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                <span><Icon name="store" size={14} /> {(pdvMap.get(s.id) ?? []).length} PDV(s) · {s.zona}</span>
                <span><Icon name="user" size={14} /> {refs.nome(s.supervisorId)}</span>
              </div>
              <div className="bar"><span style={{ width: `${pct}%` }} /></div>
              <div className="small muted">
                {exec}/{total} escalas executadas · {aprov.find((x) => x.servicoId === s.id)?.n ?? 0} relatório(s) aprovado(s)
              </div>
            </Link>
          );
        })}
      </div>
      <style>{`
        .svc { display: flex; flex-direction: column; gap: 8px; color: var(--ink); transition: border-color .15s, transform .15s; }
        .svc:hover { border-color: var(--gold); transform: translateY(-1px); }
        .svc h3 { font-size: 16px; font-weight: 800; margin-top: 4px; }
        .svc .meta { display: flex; flex-direction: column; gap: 4px; color: var(--ink-2); margin: 4px 0; }
        .svc .meta span { display: flex; align-items: center; gap: 6px; }
      `}</style>
    </div>
  );
}
