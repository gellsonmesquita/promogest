import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon, StatusBadge, Timeline } from '@/components/ui';
import type { TKey } from '@/i18n/core';
import { getT } from '@/i18n/server';
import { FIELD_ROLES, requireUser } from '@/lib/auth';
import { fmtDia, fmtHora } from '@/lib/dates';
import { fotoUrl } from '@/lib/labels';
import { getRefs, getRelatorio } from '@/lib/queries';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('m.relatorio') };
}

const PASSOS: { estados: string[]; label: TKey }[] = [
  { estados: ['enviado', 'reenviado'], label: 'm.passoEnviado' },
  { estados: ['em_analise'], label: 'm.passoAnalise' },
  { estados: ['aprovado', 'rejeitado'], label: 'm.passoDecisao' },
];

export default async function RelatorioMobilePage({ params }: PageProps<'/m/relatorios/[id]'>) {
  const [u, t] = await Promise.all([requireUser(FIELD_ROLES), getT()]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [refs, data] = await Promise.all([getRefs(), getRelatorio(u, id)]);
  if (!data) notFound();
  const { r, e, fotos, historico } = data;
  const passo = PASSOS.findIndex((p) => p.estados.includes(r.estado));

  return (
    <>
      <header className="m-bar">
        <Link href="/m/relatorios" className="m-back" aria-label={t('common.back')}><Icon name="back" /></Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="small muted">{fmtDia(e.data, t.intl)}</div>
          <div className="strong ellipsis">{refs.servicos.get(r.servicoId)?.nome}</div>
        </div>
        <StatusBadge value={r.estado} />
      </header>
      <div className="m-body">
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          {PASSOS.map((p, i) => {
            const on = i <= passo;
            const bad = i === 2 && r.estado === 'rejeitado';
            return (
              <div key={p.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, fontSize: 12, fontWeight: 700, color: on ? 'var(--ink)' : 'var(--muted)' }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: bad ? 'var(--bad)' : on ? 'var(--gold)' : '#eee7da', color: on ? '#fff' : undefined }}>{i + 1}</span>
                <span>{i === 2 && passo === 2 ? t(`status.${r.estado}` as TKey) : t(p.label)}</span>
              </div>
            );
          })}
        </div>

        {r.estado === 'rejeitado' && (
          <>
            <div className="alert bad"><b>{t('m.motivo')}</b> {r.motivoRejeicao}</div>
            <Link className="btn primary lg block" href={`/m/atividade/${r.escalaId}`}>{t('m.corrigir')}</Link>
          </>
        )}
        {r.feedback && <div className="alert ok"><b>{t('m.supervisorDiz')}</b> {r.feedback}</div>}

        <section className="card">
          <div className="photo-grid">
            {fotos.map((f) => (
              <figure key={f.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoUrl(f.id)} alt={f.legenda} loading="lazy" />
                {f.fase !== 'geral' && <span className="fase">{t(`fase.${f.fase}`)}</span>}
                <figcaption>{f.legenda || fmtHora(f.capturadaEm, t.intl)}</figcaption>
              </figure>
            ))}
          </div>
          <dl style={{ marginTop: 14 }}>
            {[
              [t('m.atividade'), r.atividade],
              [t('m.qtd'), String(r.quantidade)],
              [t('m.resultados'), r.resultados],
              [t('m.checklist'), t('m.checklistResumo', { ok: r.checklist.filter((c) => c.ok).length, t: r.checklist.length })],
              [t('m.observacoesRel'), r.observacoes],
              ...(r.ocorrencias ? [[t('m.ocorrencias'), r.ocorrencias]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ marginTop: 10 }}>
                <dt className="label">{k}</dt>
                <dd style={{ margin: '2px 0 0' }}>{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card">
          <h3 className="strong" style={{ marginBottom: 12 }}>{t('m.historico')}</h3>
          <Timeline items={historico.map((h) => ({ ...h, quem: refs.nome(h.userId) }))} />
        </section>
      </div>
    </>
  );
}
