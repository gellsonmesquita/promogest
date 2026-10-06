import { and, eq, inArray, ne } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead, StatusBadge } from '@/components/ui';
import { db } from '@/db';
import { escalas, fotos, relatorios, users } from '@/db/schema';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { fmtDia } from '@/lib/dates';
import { ACAO_MERCH_LABEL, fotoUrl } from '@/lib/labels';
import { getRefs, isGestao, listServicos, pdvsPorServico } from '@/lib/queries';

export const metadata: Metadata = { title: 'Merchandising' };

type EstadoPdv = 'planeado' | 'em_execucao' | 'concluido' | 'nao_executado';

export default async function MerchandisingPage() {
  const u = await requireUser(WEB_ROLES);
  const [refs, servs] = await Promise.all([getRefs(), listServicos(u)]);
  const acoes = servs.filter((s) => s.tipo === 'merchandising');
  const ids = acoes.map((s) => s.id);

  const [pdvMap, esc, rels, equipaMerch] = await Promise.all([
    pdvsPorServico(ids),
    ids.length ? db.select().from(escalas).where(inArray(escalas.servicoId, ids)) : [],
    ids.length
      ? db.select({ id: relatorios.id, servicoId: relatorios.servicoId, escalaId: relatorios.escalaId, estado: relatorios.estado, quantidade: relatorios.quantidade, autorId: relatorios.autorId, enviadoEm: relatorios.enviadoEm })
          .from(relatorios).where(and(inArray(relatorios.servicoId, ids), ne(relatorios.estado, 'rascunho')))
      : [],
    db.select({ id: users.id }).from(users).where(and(eq(users.role, 'merchandiser'), eq(users.estado, 'ativa'))),
  ]);
  const fts = rels.length
    ? await db.select({ id: fotos.id, relatorioId: fotos.relatorioId, fase: fotos.fase }).from(fotos).where(inArray(fotos.relatorioId, rels.map((r) => r.id)))
    : [];

  const resumo = acoes.map((s) => {
    const rs = rels.filter((r) => r.servicoId === s.id);
    const qtd = rs.filter((r) => r.estado === 'aprovado').reduce((n, r) => n + r.quantidade, 0);
    const linhas = (pdvMap.get(s.id) ?? []).map((pid) => {
      const escPdv = esc.filter((e) => e.servicoId === s.id && e.pdvId === pid);
      const relsPdv = rs.filter((r) => escPdv.some((e) => e.id === r.escalaId)).sort((a, b) => +(b.enviadoEm ?? 0) - +(a.enviadoEm ?? 0));
      const last = relsPdv[0];
      let estado: EstadoPdv = 'planeado';
      if (relsPdv.some((r) => r.estado === 'aprovado')) estado = 'concluido';
      else if (last) estado = 'em_execucao';
      else if (escPdv.length && escPdv.every((e) => ['falta', 'cancelada'].includes(e.estado))) estado = 'nao_executado';
      const f = last ? fts.filter((x) => x.relatorioId === last.id) : [];
      return {
        id: pid, estado, relId: last?.id,
        ultima: last ? esc.find((e) => e.id === last.escalaId)?.data : undefined,
        quem: last ? refs.nome(last.autorId) : '',
        antes: f.find((x) => x.fase === 'antes')?.id,
        depois: f.find((x) => x.fase === 'depois')?.id,
      };
    });
    return { s, qtd, linhas };
  });
  const todas = resumo.flatMap((r) => r.linhas);

  return (
    <div className="page">
      <PageHead eyebrow="Módulo operacional" title="Merchandising" desc="Ações por PDV: montagem, exposição, reposição, implementação, auditoria e manutenção, com fotos antes/durante/depois.">
        {isGestao(u) && <Link className="btn primary" href="/app/servicos/novo">Nova ação de merchandising</Link>}
      </PageHead>

      <div className="grid-auto g-kpi mb">
        <div className="kpi accent"><div className="kpi-label">Ações ativas</div><div className="kpi-value">{acoes.filter((s) => s.estado === 'em_execucao' || s.estado === 'planeado').length}</div></div>
        <div className="kpi"><div className="kpi-label">Equipa de merchandising</div><div className="kpi-value">{equipaMerch.length}</div></div>
        <div className="kpi"><div className="kpi-label">PDVs concluídos</div><div className="kpi-value">{todas.filter((p) => p.estado === 'concluido').length}</div></div>
        <div className="kpi warn"><div className="kpi-label">A aguardar validação</div><div className="kpi-value">{todas.filter((p) => p.estado === 'em_execucao').length}</div></div>
      </div>

      {resumo.length === 0 && <div className="card empty">Sem ações de merchandising visíveis.</div>}
      {resumo.map(({ s, qtd, linhas }) => (
        <section className="card mb" key={s.id}>
          <div className="card-head">
            <div>
              <h3>{s.nome}</h3>
              <div className="small muted">
                {ACAO_MERCH_LABEL[s.acao ?? 'outro']} · {refs.clientes.get(s.clienteId)?.nome} · {s.produto} · Supervisor: {refs.nome(s.supervisorId)}
              </div>
            </div>
            <StatusBadge value={s.estado} />
          </div>
          <div className="row small mb">
            <span className="chip">Material: {s.materiais || '—'}</span>
            <span className="chip">Qtd. executada (aprovada): {qtd} / {s.qtdPrevista ?? 0}</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>PDV</th><th>Zona</th><th>Última execução</th><th>Equipa</th><th>Antes / depois</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {linhas.map((p) => (
                  <tr key={p.id}>
                    <td className="strong">{refs.pdvs.get(p.id)?.nome}</td>
                    <td>{refs.pdvs.get(p.id)?.zona}</td>
                    <td>{p.ultima ? fmtDia(p.ultima, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                    <td>{p.quem || '—'}</td>
                    <td>
                      {p.antes || p.depois ? (
                        <Link href={`/app/relatorios/${p.relId}`} className="row" style={{ gap: 4 }}>
                          {/* eslint-disable @next/next/no-img-element */}
                          {p.antes && <img src={fotoUrl(p.antes)} alt="Antes" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 6 }} />}
                          {p.depois && <img src={fotoUrl(p.depois)} alt="Depois" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 6 }} />}
                          {/* eslint-enable @next/next/no-img-element */}
                        </Link>
                      ) : (
                        <span className="muted small">Sem fotos</span>
                      )}
                    </td>
                    <td><StatusBadge value={p.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
