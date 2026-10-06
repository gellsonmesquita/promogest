import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui';
import { db } from '@/db';
import { servicos } from '@/db/schema';
import { getT } from '@/i18n/server';
import { FIELD_ROLES, requireUser } from '@/lib/auth';
import { fmtDia, hm, hoje } from '@/lib/dates';
import { getEscala, getRefs, getRelatorioDaEscala, listFotos } from '@/lib/queries';
import { Atividade } from './atividade-client';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('m.atividade') };
}

export default async function AtividadePage({ params }: PageProps<'/m/atividade/[id]'>) {
  const [u, t] = await Promise.all([requireUser(FIELD_ROLES), getT()]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = await getEscala(u, id);
  if (!e) notFound();
  const [refs, [s], rel] = await Promise.all([getRefs(), db.select().from(servicos).where(eq(servicos.id, e.servicoId)), getRelatorioDaEscala(e.id)]);
  const fotos = rel ? await listFotos(rel.id) : [];
  const pdv = refs.pdvs.get(e.pdvId);
  const merch = s.tipo === 'merchandising';

  return (
    <>
      <header className="m-bar">
        <Link href="/m/hoje" className="m-back" aria-label={t('common.back')}><Icon name="back" /></Link>
        <div style={{ minWidth: 0 }}>
          <div className="small muted">{fmtDia(e.data, t.intl)} · {hm(e.horaInicio)}–{hm(e.horaFim)}</div>
          <div className="strong ellipsis">{s.nome}</div>
        </div>
      </header>
      <div className="m-body" style={{ paddingBottom: 96 }}>
        <section className="card">
          <div className="kv" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div><span className="label">{t('m.pdv')}</span><b>{pdv?.nome}</b><small className="muted">{pdv?.endereco}</small></div>
            <div><span className="label">{t('m.clienteMarca')}</span><b>{refs.clientes.get(s.clienteId)?.nome} · {refs.marcas.get(s.marcaId)?.nome}</b></div>
            <div><span className="label">{t('m.produto')}</span><b>{s.produto || '—'}</b></div>
            {merch && <div><span className="label">{t('m.acao')}</span><b>{t('m.acaoPrev', { acao: t(`acaoMerch.${s.acao ?? 'outro'}`), q: s.qtdPrevista ?? 0 })}</b></div>}
            <div className="full"><span className="label">{t('m.objetivo')}</span><span>{s.objetivo}</span></div>
            {s.materiais && <div className="full"><span className="label">{t('m.materiais')}</span><span>{s.materiais}</span></div>}
            {s.observacoes && <div className="full"><span className="label">{t('m.observacoes')}</span><span>{s.observacoes}</span></div>}
          </div>
        </section>

        <Atividade
          escala={{
            id: e.id, estado: e.estado, eHoje: e.data === hoje(), presencaEstado: e.presencaEstado, presencaHora: hm(e.presencaHora),
            inicio: e.inicioAtividade?.toISOString() ?? null, fim: e.fimAtividade?.toISOString() ?? null,
          }}
          merch={merch}
          relatorio={
            rel
              ? { id: rel.id, estado: rel.estado, atividade: rel.atividade, quantidade: rel.quantidade, resultados: rel.resultados, material: rel.material, observacoes: rel.observacoes, ocorrencias: rel.ocorrencias, checklist: rel.checklist, motivoRejeicao: rel.motivoRejeicao }
              : { id: null, estado: 'rascunho', atividade: '', quantidade: 0, resultados: '', material: '', observacoes: '', ocorrencias: '', checklist: s.checklist.map((item) => ({ item, ok: false })), motivoRejeicao: null }
          }
          fotos={fotos.map((f) => ({ id: f.id, fase: f.fase, legenda: f.legenda, quando: f.capturadaEm.toISOString() }))}
        />
      </div>
    </>
  );
}
