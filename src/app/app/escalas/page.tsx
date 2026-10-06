import { inArray } from 'drizzle-orm';
import type { Metadata } from 'next';
import { PageHead, StatusBadge } from '@/components/ui';
import { db } from '@/db';
import { escalaHistorico } from '@/db/schema';
import { getT } from '@/i18n/server';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { addDays, fmtDia, hm, hoje } from '@/lib/dates';
import { equipaDeCampo, getRefs, listEscalas, listServicos, pdvsPorServico } from '@/lib/queries';
import { EscalaRowActions, EscalasToolbar, NovaEscala } from './escalas-client';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('nav.escalas') };
}

export default async function EscalasPage({ searchParams }: PageProps<'/app/escalas'>) {
  const [u, t] = await Promise.all([requireUser(WEB_ROLES), getT()]);
  const sp = await searchParams;
  const vista = sp.vista === 'semana' ? 'semana' : 'dia';
  const data = typeof sp.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : hoje();
  const servicoId = typeof sp.servico === 'string' ? sp.servico : '';

  const dow = (new Date(data + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const segunda = addDays(data, -dow);
  const semana = Array.from({ length: 7 }, (_, i) => addDays(segunda, i));
  const [de, ate] = vista === 'dia' ? [data, data] : [semana[0], semana[6]];

  const [refs, escalas, servs, pessoas] = await Promise.all([
    getRefs(),
    listEscalas(u, { de, ate, servicoId: servicoId || undefined }),
    listServicos(u),
    equipaDeCampo(u),
  ]);
  const ativos = servs.filter((s) => s.estado !== 'concluido' && s.estado !== 'cancelado');
  const pdvMap = await pdvsPorServico(ativos.map((s) => s.id));

  const hist = escalas.length && vista === 'dia' ? await db.select().from(escalaHistorico).where(inArray(escalaHistorico.escalaId, escalas.map((e) => e.id))) : [];
  const candidatas = pessoas.filter((p) => p.estado === 'ativa').map((p) => ({ id: p.id, nome: p.nome, equipaId: p.equipaId, equipa: refs.equipas.get(p.equipaId ?? '')?.nome ?? '' }));
  const ocupadas = escalas.filter((e) => !['cancelada', 'substituida'].includes(e.estado)).map((e) => ({ promotoraId: e.promotoraId, data: e.data, hi: hm(e.horaInicio), hf: hm(e.horaFim) }));

  return (
    <div className="page">
      <PageHead eyebrow={t('escalas.eyebrow')} title={t('escalas.title')} desc={t('escalas.desc')}>
        <NovaEscala
          servicos={ativos.map((s) => ({ id: s.id, nome: s.nome, equipaId: s.equipaId, pdvs: (pdvMap.get(s.id) ?? []).map((id) => ({ id, nome: refs.pdvs.get(id)?.nome ?? '' })) }))}
          pessoas={candidatas}
          dataInicial={addDays(hoje(), 1)}
        />
      </PageHead>

      <EscalasToolbar vista={vista} data={data} servicoId={servicoId} hoje={hoje()} servicos={servs.map((s) => ({ id: s.id, nome: s.nome }))} />

      {vista === 'dia' ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('escalas.thHorario')}</th>
                <th>{t('escalas.thPromotora')}</th>
                <th>{t('escalas.thServico')}</th>
                <th>{t('escalas.thEscala')}</th>
                <th>{t('escalas.thPresenca')}</th>
                <th style={{ textAlign: 'right' }}>{t('escalas.thAcoes')}</th>
              </tr>
            </thead>
            <tbody>
              {escalas.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">{t('escalas.semEscalasDia', { dia: fmtDia(data, t.intl) })}</td>
                </tr>
              )}
              {escalas
                .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio) || refs.nome(a.promotoraId).localeCompare(refs.nome(b.promotoraId)))
                .map((e) => (
                  <tr key={e.id}>
                    <td className="strong" style={{ whiteSpace: 'nowrap' }}>{hm(e.horaInicio)}–{hm(e.horaFim)}</td>
                    <td>
                      <div className="strong">{refs.nome(e.promotoraId)}</div>
                      {e.substitutaId && <div className="small muted">{t('escalas.substituidaPor', { nome: refs.nome(e.substitutaId) })}</div>}
                    </td>
                    <td>
                      <div>{refs.servicos.get(e.servicoId)?.nome}</div>
                      <div className="small muted">{refs.pdvs.get(e.pdvId)?.nome}</div>
                    </td>
                    <td><StatusBadge value={e.estado} /></td>
                    <td>
                      {e.presencaEstado ? (
                        <div className="row" style={{ gap: 6 }}>
                          <StatusBadge value={e.presencaEstado} />
                          <span className="small muted">{hm(e.presencaHora)}</span>
                          {e.presencaValidada && <span className="small muted" title={t('escalas.validada')}>✔</span>}
                        </div>
                      ) : (
                        <span className="small muted">{t('escalas.porConfirmar')}</span>
                      )}
                    </td>
                    <td>
                      <EscalaRowActions
                        escala={{ id: e.id, data: e.data, hi: hm(e.horaInicio), hf: hm(e.horaFim), promotoraId: e.promotoraId, promotora: refs.nome(e.promotoraId), pdv: refs.pdvs.get(e.pdvId)?.nome ?? '', ativa: e.estado === 'planeada' || e.estado === 'confirmada', porValidar: !!e.presencaEstado && !e.presencaValidada && e.presencaEstado !== 'falta' }}
                        historico={hist.filter((h) => h.escalaId === e.id).sort((a, b) => +a.data - +b.data).map((h) => ({ id: h.id, texto: h.texto, params: h.params, quem: refs.nome(h.userId), data: h.data }))}
                        candidatas={candidatas.filter((c) => c.id !== e.promotoraId)}
                        ocupadas={ocupadas}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table week">
            <thead>
              <tr>
                <th>{t('escalas.thPessoa')}</th>
                {semana.map((d) => (
                  <th key={d} className={d === hoje() ? 'today' : ''}>{fmtDia(d, t.intl, { weekday: 'short', day: '2-digit', month: '2-digit' })}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...new Set(escalas.map((e) => e.promotoraId))]
                .sort((a, b) => refs.nome(a).localeCompare(refs.nome(b)))
                .map((pid) => (
                  <tr key={pid}>
                    <td className="strong">{refs.nome(pid)}</td>
                    {semana.map((d) => (
                      <td key={d} className={d === hoje() ? 'today' : ''}>
                        {escalas
                          .filter((e) => e.promotoraId === pid && e.data === d)
                          .map((e) => (
                            <a key={e.id} className={`slot s-${e.estado}`} href={`/app/escalas?data=${d}${servicoId ? `&servico=${servicoId}` : ''}`}>
                              <b>{hm(e.horaInicio)}–{hm(e.horaFim)}</b>
                              <span>{refs.pdvs.get(e.pdvId)?.nome}</span>
                            </a>
                          ))}
                      </td>
                    ))}
                  </tr>
                ))}
              {escalas.length === 0 && (
                <tr><td colSpan={8} className="empty">{t('escalas.semEscalasSemana')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        .week td, .week th { min-width: 130px; vertical-align: top; }
        .week td:first-child { min-width: 150px; }
        .today { background: var(--gold-50) !important; }
        .slot { display: flex; flex-direction: column; gap: 1px; font-size: 11px; padding: 6px 8px; border-radius: 8px; margin-bottom: 4px;
          background: var(--info-bg); color: var(--info); border-left: 3px solid currentColor; }
        .slot span { color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
        .s-confirmada { background: var(--gold-100); color: var(--gold-600); }
        .s-executada { background: var(--ok-bg); color: var(--ok); }
        .s-falta { background: var(--bad-bg); color: var(--bad); }
        .s-substituida, .s-cancelada { background: #eee; color: var(--muted); text-decoration: line-through; }
      `}</style>
    </div>
  );
}
