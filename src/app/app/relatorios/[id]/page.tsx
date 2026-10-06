import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon, PageHead, StatusBadge, Timeline } from '@/components/ui';
import { getT } from '@/i18n/server';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { fmtDataHora, fmtDia, fmtHora, hm } from '@/lib/dates';
import { PENDENTES } from '@/lib/labels';
import { getRefs, getRelatorio } from '@/lib/queries';
import { AutoAnalise, Decisao, Galeria } from './detalhe-client';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('rel.title') };
}

export default async function RelatorioDetalhePage({ params }: PageProps<'/app/relatorios/[id]'>) {
  const [u, t] = await Promise.all([requireUser(WEB_ROLES), getT()]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [refs, data] = await Promise.all([getRefs(), getRelatorio(u, id)]);
  if (!data) notFound();
  const { r, e, fotos, historico } = data;
  const s = refs.servicos.get(r.servicoId);
  const pdv = refs.pdvs.get(e.pdvId);
  const merch = r.tipo === 'merchandising';
  const pendente = (PENDENTES as readonly string[]).includes(r.estado);
  const okCount = r.checklist.filter((c) => c.ok).length;

  return (
    <div className="page">
      <Link href="/app/relatorios" className="row small strong mb" style={{ gap: 6 }}>
        <Icon name="back" size={16} /> {t('rel.voltar')}
      </Link>
      <PageHead
        eyebrow={merch ? t('rel.eyebrowMerch') : t('rel.eyebrowPromo')}
        title={s?.nome ?? t('rel.title')}
        desc={`${refs.nome(r.autorId)} · ${pdv?.nome} · ${fmtDia(e.data, t.intl, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`}
      >
        <StatusBadge value={r.estado} />
      </PageHead>
      {(r.estado === 'enviado' || r.estado === 'reenviado') && <AutoAnalise id={r.id} />}

      <div className="rel-layout">
        <div className="grid-auto" style={{ alignContent: 'start' }}>
          <section className="card">
            <div className="card-head"><h3>{t('rel.execucao')}</h3></div>
            <div className="kv mb">
              <div><span className="label">{t('rel.produto')}</span><b>{s?.produto || '—'}</b></div>
              <div><span className="label">{t('rel.horario')}</span><b>{hm(e.horaInicio)}–{hm(e.horaFim)}</b></div>
              <div><span className="label">{t('rel.presenca')}</span><b>{e.presencaEstado ? t(`status.${e.presencaEstado}`) : '—'} {hm(e.presencaHora)}</b></div>
              <div><span className="label">{t('rel.iniFim')}</span><b>{e.inicioAtividade ? fmtHora(e.inicioAtividade, t.intl) : '—'} / {e.fimAtividade ? fmtHora(e.fimAtividade, t.intl) : '—'}</b></div>
              <div><span className="label">{merch ? t('rel.qtdMerch') : t('rel.qtd')}</span><b>{r.quantidade}</b></div>
              <div><span className="label">{t('rel.enviadoEm')}</span><b>{fmtDataHora(r.enviadoEm, t.intl)}</b></div>
            </div>
            <Bloco label={t('rel.atividade')} v={r.atividade} />
            <Bloco label={t('rel.resultados')} v={r.resultados} />
            {r.material && <Bloco label={t('rel.material')} v={r.material} />}
            <Bloco label={t('rel.observacoes')} v={r.observacoes} />
            {r.ocorrencias && <div className="alert warn"><b>{t('rel.ocorrencias')}:</b> {r.ocorrencias}</div>}
          </section>

          <section className="card">
            <div className="card-head"><h3>{t('rel.evidencias', { n: fotos.length })}</h3></div>
            {fotos.length === 0 ? (
              <div className="alert warn">{t('rel.semFotos')}</div>
            ) : (
              <Galeria merch={merch} pdv={pdv?.nome ?? ''} fotos={fotos.map((f) => ({ id: f.id, fase: f.fase, legenda: f.legenda, autor: refs.nome(f.autorId), quando: f.capturadaEm.toISOString() }))} />
            )}
          </section>
        </div>

        <div className="grid-auto" style={{ alignContent: 'start' }}>
          <section className="card">
            <div className="card-head"><h3>{t('rel.checklist')}</h3><span className="small muted">{okCount}/{r.checklist.length}</span></div>
            <div className="list">
              {r.checklist.map((c) => (
                <div className="item" key={c.item}>
                  <Icon name={c.ok ? 'check' : 'close'} style={{ color: c.ok ? 'var(--ok)' : 'var(--bad)' }} />
                  <span>{c.item}</span>
                </div>
              ))}
              {r.checklist.length === 0 && <div className="muted small">{t('rel.semChecklist')}</div>}
            </div>
          </section>

          {pendente && <Decisao id={r.id} gestor={u.role !== 'supervisor'} />}
          {r.estado === 'rejeitado' && r.motivoRejeicao && <div className="alert bad"><b>{t('rel.motivo')}</b> {r.motivoRejeicao}</div>}
          {r.feedback && <div className="alert ok"><b>{t('rel.feedback')}</b> {r.feedback}</div>}

          <section className="card">
            <div className="card-head"><h3>{t('rel.historico')}</h3></div>
            <Timeline items={historico.map((h) => ({ ...h, quem: refs.nome(h.userId) }))} />
          </section>
        </div>
      </div>
      <style>{`
        .rel-layout { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr); gap: 16px; }
        @media (max-width: 1000px) { .rel-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function Bloco({ label, v }: { label: string; v: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span className="label">{label}</span>
      <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{v || '—'}</p>
    </div>
  );
}
