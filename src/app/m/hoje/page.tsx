import { and, eq, inArray } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, LangSwitch, StatusBadge } from '@/components/ui';
import { db } from '@/db';
import { relatorios } from '@/db/schema';
import type { TKey } from '@/i18n/core';
import { getT } from '@/i18n/server';
import { FIELD_ROLES, requireUser } from '@/lib/auth';
import { fmtDia, hm, hoje } from '@/lib/dates';
import { getRefs, listEscalas } from '@/lib/queries';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('nav.hoje') };
}

export default async function HojePage() {
  const [u, t] = await Promise.all([requireUser(FIELD_ROLES), getT()]);
  const dia = hoje();
  const [refs, escalas, rejeitados] = await Promise.all([
    getRefs(),
    listEscalas(u, { de: dia }),
    db.select({ id: relatorios.id }).from(relatorios).where(and(eq(relatorios.autorId, u.id), eq(relatorios.estado, 'rejeitado'))),
  ]);
  const ativas = escalas.filter((e) => e.estado !== 'cancelada' && e.estado !== 'substituida');
  const deHoje = ativas.filter((e) => e.data === dia);
  const proximas = ativas.filter((e) => e.data > dia).slice(0, 10);
  const rels = deHoje.length ? await db.select({ escalaId: relatorios.escalaId, estado: relatorios.estado }).from(relatorios).where(inArray(relatorios.escalaId, deHoje.map((e) => e.id))) : [];

  const cta = (estado: string, rel?: string): TKey => {
    if (rel === 'rejeitado') return 'm.ctaCorrigir';
    if (rel && rel !== 'rascunho') return 'm.ctaVer';
    if (estado === 'planeada') return 'm.ctaConfirmar';
    if (estado === 'falta') return 'm.ctaDetalhes';
    return 'm.ctaContinuar';
  };

  return (
    <>
      <header className="hoje-hero">
        <div className="row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="" className="hoje-logo" />
          <div className="spacer" />
          <span className="hoje-date">{fmtDia(dia, t.intl, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <LangSwitch dark />
        </div>
        <h1>{t('m.hello', { nome: u.nome.split(' ')[0] })}</h1>
        <p>{deHoje.length ? t('m.temAtividades', { n: deHoje.length }) : t('m.semAtividades')}</p>
      </header>

      <div className="m-body">
        {rejeitados.length > 0 && (
          <Link className="alert bad row" href={`/m/relatorios/${rejeitados[0].id}`}>
            <Icon name="warn" />
            <span style={{ flex: 1 }}>{t('m.rejeitados', { n: rejeitados.length })}</span>
            <Icon name="chevron" />
          </Link>
        )}

        <h2 className="hoje-sec">{t('m.hoje')}</h2>
        {deHoje.length === 0 && <div className="card empty">{t('m.diaLivre')}</div>}
        {deHoje.map((e) => {
          const s = refs.servicos.get(e.servicoId);
          const rel = rels.find((r) => r.escalaId === e.id)?.estado;
          return (
            <Link key={e.id} href={`/m/atividade/${e.id}`} className="card hoje-act">
              <div className="row">
                <span className="hoje-time">{hm(e.horaInicio)}<small>–{hm(e.horaFim)}</small></span>
                <span className="spacer" />
                <StatusBadge value={rel && rel !== 'rascunho' ? rel : e.estado} />
              </div>
              <div className="hoje-title">{s?.nome}</div>
              <div className="row" style={{ gap: 6 }}><Icon name="pin" size={16} /> {refs.pdvs.get(e.pdvId)?.nome}</div>
              <div className="row muted" style={{ gap: 6 }}><Icon name="campaign" size={16} /> {refs.marcas.get(s?.marcaId ?? '')?.nome} · {s?.produto}</div>
              <div className="hoje-cta">{t(cta(e.estado, rel))} <Icon name="chevron" size={18} /></div>
            </Link>
          );
        })}

        <h2 className="hoje-sec">{t('m.proximos')}</h2>
        <div className="card" style={{ padding: '4px 14px' }}>
          <div className="list">
            {proximas.length === 0 && <div className="empty">{t('m.semFuturas')}</div>}
            {proximas.map((e) => (
              <Link key={e.id} href={`/m/atividade/${e.id}`} className="item">
                <div className="hoje-day">
                  <b>{fmtDia(e.data, t.intl, { day: '2-digit' })}</b>
                  <span>{fmtDia(e.data, t.intl, { weekday: 'short' })}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="strong">{refs.servicos.get(e.servicoId)?.nome}</div>
                  <div className="small muted">{hm(e.horaInicio)}–{hm(e.horaFim)} · {refs.pdvs.get(e.pdvId)?.nome}</div>
                </div>
                <Icon name="chevron" size={18} style={{ color: 'var(--muted)' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .hoje-hero { background: radial-gradient(circle at 80% 0, #3a3123, #16130f 70%); color: #fff; padding: calc(18px + env(safe-area-inset-top, 0px)) 18px 26px; border-radius: 0 0 26px 26px; }
        .hoje-logo { width: 38px; height: 38px; border-radius: 10px; background: #fff; padding: 3px; object-fit: contain; }
        .hoje-date { color: #e6c779; font-weight: 700; text-transform: capitalize; }
        .hoje-hero h1 { font-size: 26px; font-weight: 800; margin-top: 18px; }
        .hoje-hero p { color: #c9bda4; margin-top: 6px; }
        .hoje-sec { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin-top: 8px; font-weight: 700; }
        .hoje-act { display: flex; flex-direction: column; gap: 6px; color: var(--ink); border-left: 4px solid var(--gold); }
        .hoje-time { font-size: 22px; font-weight: 800; }
        .hoje-time small { font-size: 14px; color: var(--muted); font-weight: 600; }
        .hoje-title { font-size: 17px; font-weight: 800; }
        .hoje-cta { margin-top: 6px; display: flex; align-items: center; justify-content: space-between; background: var(--gold); color: #fff; font-weight: 800; padding: 12px 14px; border-radius: 12px; font-size: 15px; }
        .hoje-day { width: 44px; text-align: center; display: flex; flex-direction: column; background: var(--gold-50); border-radius: 10px; padding: 4px 0; flex: none; }
        .hoje-day b { font-size: 17px; } .hoje-day span { font-size: 11px; color: var(--muted); text-transform: uppercase; }
      `}</style>
    </>
  );
}
