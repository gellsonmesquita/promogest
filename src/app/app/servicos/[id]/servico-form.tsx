'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { guardarServico, mudarEstadoServico } from '@/app/actions/cadastros';
import { useAction } from '@/components/toast';
import { PageHead, StatusBadge } from '@/components/ui';
import type { TKey } from '@/i18n/core';
import { useT } from '@/i18n/client';
import { ACOES_MERCH, SERVICO_TIPOS } from '@/lib/labels';

type Estado = 'rascunho' | 'planeado' | 'em_execucao' | 'concluido' | 'cancelado';
type Inicial = {
  id?: string; tipo: (typeof SERVICO_TIPOS)[number]; nome: string; clienteId: string; marcaId: string; produto: string; objetivo: string; meta: number;
  inicio: string; fim: string; zona: string; equipaId: string; supervisorId: string; pdvIds: string[]; materiais: string; observacoes: string;
  checklist: string[]; estado: Estado; acao: (typeof ACOES_MERCH)[number]; qtdPrevista: number;
};

const TRANSICOES: Record<Estado, { para: Exclude<Estado, 'rascunho'>; label: TKey }[]> = {
  rascunho: [{ para: 'planeado', label: 'serv.tPlaneado' }, { para: 'cancelado', label: 'serv.tCancelado' }],
  planeado: [{ para: 'em_execucao', label: 'serv.tExecucao' }, { para: 'cancelado', label: 'serv.tCancelado' }],
  em_execucao: [{ para: 'concluido', label: 'serv.tConcluido' }, { para: 'cancelado', label: 'serv.tCancelado' }],
  concluido: [],
  cancelado: [],
};

export function ServicoForm({
  inicial, editavel, clientes, marcas, pdvs, supervisores, equipas,
}: {
  inicial: Inicial;
  editavel: boolean;
  clientes: { id: string; nome: string }[];
  marcas: { id: string; nome: string; clienteId: string; produtos: string[] }[];
  pdvs: { id: string; nome: string; zona: string }[];
  supervisores: { id: string; nome: string; equipaId: string | null }[];
  equipas: { id: string; nome: string; area: 'promocao' | 'merchandising'; supervisorId: string | null }[];
}) {
  const t = useT();
  const router = useRouter();
  const { pending, exec } = useAction();
  const [s, setS] = useState(inicial);
  const [checklistTxt, setChecklistTxt] = useState(inicial.checklist.join('\n'));
  const set = <K extends keyof Inicial>(k: K, v: Inicial[K]) => setS((x) => ({ ...x, [k]: v }));
  const marcasDoCliente = marcas.filter((m) => m.clienteId === s.clienteId);
  const produtos = marcas.find((m) => m.id === s.marcaId)?.produtos ?? [];
  const novo = !s.id;

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    exec(
      () => guardarServico({ ...s, checklist: checklistTxt.split('\n') }),
      (r) => router.push(novo && r.data ? `/app/servicos/${r.data.id}` : '/app/servicos'),
    );
  };

  return (
    <>
      <PageHead eyebrow={novo ? t('serv.eyebrowNovo') : t(`servicoTipo.${s.tipo}`)} title={novo ? t('serv.titleNovo') : s.nome}>
        {!novo && (
          <div className="row">
            <StatusBadge value={inicial.estado} />
            {editavel &&
              TRANSICOES[inicial.estado].map((tr) => (
                <button key={tr.para} className={`btn${tr.para === 'cancelado' ? ' danger' : ''}`} disabled={pending} onClick={() => exec(() => mudarEstadoServico(s.id!, tr.para))}>
                  {t(tr.label)}
                </button>
              ))}
          </div>
        )}
      </PageHead>

      <form className="card" onSubmit={guardar}>
        <fieldset disabled={!editavel} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="tipo">{t('serv.fTipo')}</label>
              <select id="tipo" className="input" value={s.tipo} onChange={(e) => set('tipo', e.target.value as Inicial['tipo'])}>
                {SERVICO_TIPOS.map((k) => <option key={k} value={k}>{t(`servicoTipo.${k}`)}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="nome">{t('serv.fNome')}</label>
              <input id="nome" className="input" required value={s.nome} onChange={(e) => set('nome', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cliente">{t('serv.fCliente')}</label>
              <select id="cliente" className="input" required value={s.clienteId} onChange={(e) => setS({ ...s, clienteId: e.target.value, marcaId: '', produto: '' })}>
                <option value="" disabled>{t('common.select')}</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="marca">{t('serv.fMarca')}</label>
              <select id="marca" className="input" required value={s.marcaId} onChange={(e) => setS({ ...s, marcaId: e.target.value, produto: '' })}>
                <option value="" disabled>{t('common.select')}</option>
                {marcasDoCliente.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="produto">{t('serv.fProduto')}</label>
              <select id="produto" className="input" value={s.produto} onChange={(e) => set('produto', e.target.value)}>
                <option value="">—</option>
                {produtos.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="obj">{t('serv.fObjetivo')}</label>
              <textarea id="obj" className="input" value={s.objetivo} onChange={(e) => set('objetivo', e.target.value)} />
            </div>
            <div className="field"><label htmlFor="meta">{t('serv.fMeta')}</label><input id="meta" className="input" type="number" min={0} value={s.meta} onChange={(e) => set('meta', Number(e.target.value))} /></div>
            <div className="field"><label htmlFor="ini">{t('serv.fInicio')}</label><input id="ini" className="input" type="date" required value={s.inicio} onChange={(e) => set('inicio', e.target.value)} /></div>
            <div className="field"><label htmlFor="fim">{t('serv.fFim')}</label><input id="fim" className="input" type="date" required value={s.fim} min={s.inicio} onChange={(e) => set('fim', e.target.value)} /></div>
            <div className="field"><label htmlFor="zona">{t('serv.fZona')}</label><input id="zona" className="input" value={s.zona} onChange={(e) => set('zona', e.target.value)} /></div>
            {s.tipo === 'merchandising' && (
              <>
                <div className="field">
                  <label htmlFor="acao">{t('serv.fAcao')}</label>
                  <select id="acao" className="input" value={s.acao} onChange={(e) => set('acao', e.target.value as Inicial['acao'])}>
                    {ACOES_MERCH.map((k) => <option key={k} value={k}>{t(`acaoMerch.${k}`)}</option>)}
                  </select>
                </div>
                <div className="field"><label htmlFor="qtd">{t('serv.fQtd')}</label><input id="qtd" className="input" type="number" min={0} value={s.qtdPrevista} onChange={(e) => set('qtdPrevista', Number(e.target.value))} /></div>
              </>
            )}
            <div className="field">
              <label htmlFor="equipa">{t('serv.fEquipa')}</label>
              <select
                id="equipa"
                className="input"
                required
                value={s.equipaId}
                onChange={(e) => {
                  const eq = equipas.find((x) => x.id === e.target.value);
                  setS({ ...s, equipaId: e.target.value, supervisorId: eq?.supervisorId ?? s.supervisorId, tipo: eq?.area === 'merchandising' ? 'merchandising' : s.tipo });
                }}
              >
                <option value="" disabled>{t('common.select')}</option>
                {equipas.map((e) => <option key={e.id} value={e.id}>{e.nome} ({t(`area.${e.area}`)})</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sup">{t('serv.fSupervisor')}</label>
              <select id="sup" className="input" required value={s.supervisorId} onChange={(e) => set('supervisorId', e.target.value)}>
                <option value="" disabled>{t('common.select')}</option>
                {supervisores.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div className="field full">
              <span className="flabel">{t('serv.fPdvs', { n: s.pdvIds.length })}</span>
              <div className="picker">
                {pdvs.map((p) => (
                  <label className="check" key={p.id}>
                    <input type="checkbox" checked={s.pdvIds.includes(p.id)} onChange={(e) => set('pdvIds', e.target.checked ? [...s.pdvIds, p.id] : s.pdvIds.filter((x) => x !== p.id))} />
                    <span>{p.nome} <span className="small muted">· {p.zona}</span></span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field full"><label htmlFor="mat">{t('serv.fMateriais')}</label><input id="mat" className="input" value={s.materiais} onChange={(e) => set('materiais', e.target.value)} /></div>
            <div className="field full">
              <label htmlFor="chk">{t('serv.fChecklist')}</label>
              <textarea id="chk" className="input" value={checklistTxt} onChange={(e) => setChecklistTxt(e.target.value)} placeholder={t('serv.fChecklistPh')} />
            </div>
            <div className="field full"><label htmlFor="obs">{t('serv.fObs')}</label><textarea id="obs" className="input" value={s.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></div>
          </div>
        </fieldset>
        {editavel ? (
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => router.push('/app/servicos')}>{t('common.cancel')}</button>
            <button className="btn primary" type="submit" disabled={pending}>{pending ? t('common.saving') : t('common.save')}</button>
          </div>
        ) : (
          <p className="small muted mt">{t('serv.soGestao')}</p>
        )}
      </form>
    </>
  );
}
