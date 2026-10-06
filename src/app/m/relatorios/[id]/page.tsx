import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon, StatusBadge, Timeline } from '@/components/ui';
import { FIELD_ROLES, requireUser } from '@/lib/auth';
import { fmtDia, fmtHora } from '@/lib/dates';
import { fotoUrl } from '@/lib/labels';
import { getRefs, getRelatorio } from '@/lib/queries';

export const metadata: Metadata = { title: 'Relatório' };

const PASSOS = [
  { estados: ['enviado', 'reenviado'], label: 'Enviado' },
  { estados: ['em_analise'], label: 'Em análise' },
  { estados: ['aprovado', 'rejeitado'], label: 'Decisão' },
];

export default async function RelatorioMobilePage({ params }: PageProps<'/m/relatorios/[id]'>) {
  const u = await requireUser(FIELD_ROLES);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [refs, data] = await Promise.all([getRefs(), getRelatorio(u, id)]);
  if (!data) notFound();
  const { r, e, fotos, historico } = data;
  const passo = PASSOS.findIndex((p) => p.estados.includes(r.estado));

  return (
    <>
      <header className="m-bar">
        <Link href="/m/relatorios" className="m-back" aria-label="Voltar"><Icon name="back" /></Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="small muted">{fmtDia(e.data)}</div>
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
                <span>{i === 2 && passo === 2 ? (r.estado === 'aprovado' ? 'Aprovado' : 'Rejeitado') : p.label}</span>
              </div>
            );
          })}
        </div>

        {r.estado === 'rejeitado' && (
          <>
            <div className="alert bad"><b>Motivo:</b> {r.motivoRejeicao}</div>
            <Link className="btn primary lg block" href={`/m/atividade/${r.escalaId}`}>Corrigir e reenviar</Link>
          </>
        )}
        {r.feedback && <div className="alert ok"><b>Supervisor:</b> {r.feedback}</div>}

        <section className="card">
          <div className="photo-grid">
            {fotos.map((f) => (
              <figure key={f.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoUrl(f.id)} alt={f.legenda} loading="lazy" />
                {f.fase !== 'geral' && <span className="fase">{f.fase}</span>}
                <figcaption>{f.legenda || fmtHora(f.capturadaEm)}</figcaption>
              </figure>
            ))}
          </div>
          <dl style={{ marginTop: 14 }}>
            {[
              ['Atividade', r.atividade],
              ['Quantidade', String(r.quantidade)],
              ['Resultados', r.resultados],
              ['Checklist', `${r.checklist.filter((c) => c.ok).length}/${r.checklist.length} itens cumpridos`],
              ['Observações', r.observacoes],
              ...(r.ocorrencias ? [['Ocorrências', r.ocorrencias]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ marginTop: 10 }}>
                <dt className="label">{k}</dt>
                <dd style={{ margin: '2px 0 0' }}>{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card">
          <h3 className="strong" style={{ marginBottom: 12 }}>Histórico</h3>
          <Timeline items={historico} nome={refs.nome} />
        </section>
      </div>
    </>
  );
}
