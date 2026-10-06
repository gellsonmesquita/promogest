import { and, eq, ne, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { resolverOcorrencia } from '@/app/actions/supervisao';
import { ActionButton } from '@/components/action-button';
import { Icon, PageHead, StatusBadge } from '@/components/ui';
import { db } from '@/db';
import { equipas, relatorios, servicos, users } from '@/db/schema';
import { getT } from '@/i18n/server';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { addDays, fmtDataHora, fmtDia, hm, hoje } from '@/lib/dates';
import { fotoUrl, iniciais, PENDENTES } from '@/lib/labels';
import { equipaDeCampo, fotosRecentes, getRefs, isGestao, listEscalas, listRelatorios, listServicos, ocorrenciasAbertas } from '@/lib/queries';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('nav.dashboard') };
}

export default async function DashboardPage() {
  const [u, t] = await Promise.all([requireUser(WEB_ROLES), getT()]);
  const gestao = isGestao(u);
  const dia = hoje();
  const semanaAtras = addDays(dia, -7);

  const [refs, escalasSemana, rels, ocorr, fotos, servs, equipa] = await Promise.all([
    getRefs(),
    listEscalas(u, { de: semanaAtras, ate: addDays(dia, 14) }),
    listRelatorios(u),
    ocorrenciasAbertas(u),
    fotosRecentes(u, 8),
    listServicos(u),
    equipaDeCampo(u),
  ]);

  const deHoje = escalasSemana.filter((e) => e.data === dia && e.estado !== 'cancelada');
  const porValidar = rels.filter((r) => (PENDENTES as readonly string[]).includes(r.estado)).sort((a, b) => +(a.enviadoEm ?? 0) - +(b.enviadoEm ?? 0));
  const ativos = servs.filter((s) => s.estado === 'em_execucao' || s.estado === 'planeado');

  const k = {
    escalasHoje: deHoje.length,
    presencas: deHoje.filter((e) => e.presencaEstado === 'presente' || e.presencaEstado === 'atrasado').length,
    faltas: escalasSemana.filter((e) => e.estado === 'falta' && e.data >= semanaAtras && e.data <= dia).length,
    rejeitados: rels.filter((r) => r.estado === 'rejeitado').length,
    concluidas: rels.filter((r) => r.estado === 'aprovado').length,
    proximas: escalasSemana.filter((e) => e.data > dia && e.estado === 'planeada').length,
    fotos7d: rels.filter((r) => r.enviadoEm && r.enviadoEm >= new Date(semanaAtras)).reduce((n, r) => n + r.nFotos, 0),
  };

  let global: { promotoras: number; supervisores: number; equipas: number } | null = null;
  let porCliente: { nome: string; servicos: number; aprovados: number; meta: number; realizado: number; pct: number }[] = [];
  if (gestao) {
    const [[p], [s], [e]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, 'promotora'), eq(users.estado, 'ativa'))),
      db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, 'supervisor'), eq(users.estado, 'ativa'))),
      db.select({ n: sql<number>`count(*)::int` }).from(equipas).where(eq(equipas.ativa, true)),
    ]);
    global = { promotoras: p.n, supervisores: s.n, equipas: e.n };
    const apr = await db
      .select({
        clienteId: servicos.clienteId,
        aprovados: sql<number>`count(*)::int`,
        realizado: sql<number>`coalesce(sum(case when ${relatorios.tipo} = 'promotora' then ${relatorios.quantidade} else 0 end), 0)::int`,
      })
      .from(relatorios)
      .innerJoin(servicos, eq(servicos.id, relatorios.servicoId))
      .where(and(eq(relatorios.estado, 'aprovado'), ne(servicos.estado, 'cancelado')))
      .groupBy(servicos.clienteId);
    const vivos = servs.filter((s) => s.estado !== 'cancelado');
    porCliente = [...new Set(vivos.map((s) => s.clienteId))].map((clienteId) => {
      const doCliente = vivos.filter((s) => s.clienteId === clienteId);
      const meta = doCliente.reduce((n, s) => n + s.meta, 0);
      const r = apr.find((x) => x.clienteId === clienteId);
      const realizado = r?.realizado ?? 0;
      return { nome: refs.clientes.get(clienteId)?.nome ?? '—', servicos: doCliente.length, aprovados: r?.aprovados ?? 0, meta, realizado, pct: meta ? Math.min(100, Math.round((realizado / meta) * 100)) : 0 };
    });
  }

  return (
    <div className="page">
      <PageHead eyebrow={fmtDia(dia, t.intl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} title={gestao ? t('dash.titleGestao') : t('dash.titleSup')} desc={t('dash.hello', { nome: u.nome })}>
        <div className="row">
          <Link className="btn" href="/app/escalas">{t('dash.btnEscalas')}</Link>
          <Link className="btn primary" href="/app/relatorios">{t('dash.btnValidar', { n: porValidar.length })}</Link>
        </div>
      </PageHead>

      <div className="grid-auto g-kpi mb">
        {global ? (
          <>
            <Kpi label={t('dash.kPromotoras')} value={global.promotoras} tone="accent" />
            <Kpi label={t('dash.kSupervisores')} value={global.supervisores} />
            <Kpi label={t('dash.kEquipas')} value={global.equipas} />
            <Kpi label={t('dash.kServicos')} value={ativos.length} />
            <Kpi label={t('dash.kCampanhas')} value={ativos.filter((s) => s.tipo === 'campanha' || s.tipo === 'ativacao').length} />
            <Kpi label={t('dash.kMerch')} value={ativos.filter((s) => s.tipo === 'merchandising').length} />
          </>
        ) : (
          <>
            <Kpi label={t('dash.kMinhaEquipa')} value={equipa.length} tone="accent" />
            <Kpi label={t('dash.kProximas')} value={k.proximas} />
            <Kpi label={t('dash.kFotos')} value={k.fotos7d} />
            <Kpi label={t('dash.kConcluidas')} value={k.concluidas} />
          </>
        )}
        <Kpi label={t('dash.kEscalasHoje')} value={k.escalasHoje} />
        <Kpi label={t('dash.kPresencas')} value={k.presencas} />
        <Kpi label={t('dash.kFaltas')} value={k.faltas} tone="bad" />
        <Kpi label={t('dash.kPendentes')} value={porValidar.length} tone="warn" />
        <Kpi label={t('dash.kRejeitados')} value={k.rejeitados} tone="bad" />
        {gestao ? <Kpi label={t('dash.kExecucoes')} value={k.concluidas} /> : <Kpi label={t('dash.kOcorrencias')} value={ocorr.length} tone="warn" />}
      </div>

      <div className="grid-auto g-2">
        <section className="card">
          <div className="card-head">
            <h3>{t('dash.escalasHoje')}</h3>
            <Link href="/app/escalas" className="small strong">{t('dash.verTodas')}</Link>
          </div>
          {deHoje.length === 0 && <div className="empty">{t('dash.semEscalas')}</div>}
          <div className="list">
            {deHoje.map((e) => (
              <div className="item" key={e.id}>
                <span className="avatar">{iniciais(refs.nome(e.promotoraId))}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="strong">{refs.nome(e.promotoraId)}</div>
                  <div className="small muted">{hm(e.horaInicio)}–{hm(e.horaFim)} · {refs.pdvs.get(e.pdvId)?.nome}</div>
                </div>
                <StatusBadge value={e.presencaEstado ?? e.estado} />
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>{t('dash.porValidar')}</h3>
            <Link href="/app/relatorios" className="small strong">{t('dash.abrirFila')}</Link>
          </div>
          {porValidar.length === 0 && <div className="empty">{t('dash.semPendentes')}</div>}
          <div className="list">
            {porValidar.slice(0, 6).map((r) => (
              <Link className="item" key={r.id} href={`/app/relatorios/${r.id}`}>
                {r.fotoId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoUrl(r.fotoId)} alt="" style={{ width: 52, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="strong">{refs.nome(r.autorId)}</div>
                  <div className="small muted">{refs.servicos.get(r.servicoId)?.nome} · {t('common.photos', { n: r.nFotos })}</div>
                </div>
                <StatusBadge value={r.estado} />
              </Link>
            ))}
          </div>
        </section>

        {gestao && (
          <section className="card">
            <div className="card-head"><h3>{t('dash.porCliente')}</h3></div>
            <div className="list">
              {porCliente.map((c) => (
                <div className="item" key={c.nome} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div className="row">
                    <span className="strong">{c.nome}</span>
                    <span className="spacer" />
                    <span className="small muted">{t('dash.clienteResumo', { s: c.servicos, a: c.aprovados })}</span>
                  </div>
                  {c.meta > 0 && (
                    <>
                      <div className="bar"><span style={{ width: `${c.pct}%` }} /></div>
                      <div className="small muted">{t('dash.clienteMeta', { r: c.realizado, m: c.meta, p: c.pct })}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <div className="card-head"><h3>{t('dash.ocorrencias')}</h3></div>
          {ocorr.length === 0 && <div className="empty">{t('dash.semOcorrencias')}</div>}
          <div className="list">
            {ocorr.map((o) => (
              <div className="item" key={o.id}>
                <Icon name="warn" style={{ color: 'var(--warn)' }} />
                <div style={{ flex: 1 }}>
                  <div>{o.texto}</div>
                  <div className="small muted">{refs.nome(o.autorId)} · {fmtDataHora(o.data, t.intl)}</div>
                </div>
                <ActionButton action={resolverOcorrencia.bind(null, o.id)}>{t('dash.resolver')}</ActionButton>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h3>{t('dash.evidencias')}</h3></div>
          {fotos.length === 0 && <div className="empty">{t('dash.semFotos')}</div>}
          <div className="photo-grid">
            {fotos.map((f) => (
              <Link key={f.id} href={`/app/relatorios/${f.relatorioId}`}>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotoUrl(f.id)} alt={f.legenda} loading="lazy" />
                  {f.fase !== 'geral' && <span className="fase">{t(`fase.${f.fase}`)}</span>}
                  <figcaption>{refs.nome(f.autorId)} · {fmtDataHora(f.capturadaEm, t.intl)}</figcaption>
                </figure>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'accent' | 'bad' | 'warn' }) {
  return (
    <div className={`kpi ${tone ?? ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}
