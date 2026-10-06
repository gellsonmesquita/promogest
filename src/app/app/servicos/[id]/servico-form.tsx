'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { guardarServico, mudarEstadoServico } from '@/app/actions/cadastros';
import { useAction } from '@/components/toast';
import { PageHead, StatusBadge } from '@/components/ui';
import { ACAO_MERCH_LABEL, SERVICO_TIPO_LABEL } from '@/lib/labels';

type Estado = 'rascunho' | 'planeado' | 'em_execucao' | 'concluido' | 'cancelado';
type Inicial = {
  id?: string; tipo: keyof typeof SERVICO_TIPO_LABEL; nome: string; clienteId: string; marcaId: string; produto: string; objetivo: string; meta: number;
  inicio: string; fim: string; zona: string; equipaId: string; supervisorId: string; pdvIds: string[]; materiais: string; observacoes: string;
  checklist: string[]; estado: Estado; acao: keyof typeof ACAO_MERCH_LABEL; qtdPrevista: number;
};

const TRANSICOES: Record<Estado, { para: Exclude<Estado, 'rascunho'>; label: string }[]> = {
  rascunho: [{ para: 'planeado', label: 'Marcar como planeado' }, { para: 'cancelado', label: 'Cancelar' }],
  planeado: [{ para: 'em_execucao', label: 'Iniciar execução' }, { para: 'cancelado', label: 'Cancelar' }],
  em_execucao: [{ para: 'concluido', label: 'Encerrar serviço' }, { para: 'cancelado', label: 'Cancelar' }],
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
  equipas: { id: string; nome: string; area: string; supervisorId: string | null }[];
}) {
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
      <PageHead eyebrow={novo ? 'Novo serviço' : SERVICO_TIPO_LABEL[s.tipo]} title={novo ? 'Criar serviço / campanha' : s.nome}>
        {!novo && (
          <div className="row">
            <StatusBadge value={inicial.estado} />
            {editavel &&
              TRANSICOES[inicial.estado].map((t) => (
                <button key={t.para} className={`btn${t.para === 'cancelado' ? ' danger' : ''}`} disabled={pending} onClick={() => exec(() => mudarEstadoServico(s.id!, t.para))}>
                  {t.label}
                </button>
              ))}
          </div>
        )}
      </PageHead>

      <form className="card" onSubmit={guardar}>
        <fieldset disabled={!editavel} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="tipo">Tipo</label>
              <select id="tipo" className="input" value={s.tipo} onChange={(e) => set('tipo', e.target.value as Inicial['tipo'])}>
                {Object.entries(SERVICO_TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="nome">Nome</label>
              <input id="nome" className="input" required value={s.nome} onChange={(e) => set('nome', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cliente">Cliente</label>
              <select id="cliente" className="input" required value={s.clienteId} onChange={(e) => setS({ ...s, clienteId: e.target.value, marcaId: '', produto: '' })}>
                <option value="" disabled>Selecione…</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="marca">Marca</label>
              <select id="marca" className="input" required value={s.marcaId} onChange={(e) => setS({ ...s, marcaId: e.target.value, produto: '' })}>
                <option value="" disabled>Selecione…</option>
                {marcasDoCliente.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="produto">Produto</label>
              <select id="produto" className="input" value={s.produto} onChange={(e) => set('produto', e.target.value)}>
                <option value="">—</option>
                {produtos.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="obj">Objetivo</label>
              <textarea id="obj" className="input" value={s.objetivo} onChange={(e) => set('objetivo', e.target.value)} />
            </div>
            <div className="field"><label htmlFor="meta">Meta (contactos/unidades)</label><input id="meta" className="input" type="number" min={0} value={s.meta} onChange={(e) => set('meta', Number(e.target.value))} /></div>
            <div className="field"><label htmlFor="ini">Início</label><input id="ini" className="input" type="date" required value={s.inicio} onChange={(e) => set('inicio', e.target.value)} /></div>
            <div className="field"><label htmlFor="fim">Fim</label><input id="fim" className="input" type="date" required value={s.fim} min={s.inicio} onChange={(e) => set('fim', e.target.value)} /></div>
            <div className="field"><label htmlFor="zona">Zona</label><input id="zona" className="input" value={s.zona} onChange={(e) => set('zona', e.target.value)} /></div>
            {s.tipo === 'merchandising' && (
              <>
                <div className="field">
                  <label htmlFor="acao">Tipo de ação</label>
                  <select id="acao" className="input" value={s.acao} onChange={(e) => set('acao', e.target.value as Inicial['acao'])}>
                    {Object.entries(ACAO_MERCH_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="field"><label htmlFor="qtd">Quantidade prevista</label><input id="qtd" className="input" type="number" min={0} value={s.qtdPrevista} onChange={(e) => set('qtdPrevista', Number(e.target.value))} /></div>
              </>
            )}
            <div className="field">
              <label htmlFor="equipa">Equipa responsável</label>
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
                <option value="" disabled>Selecione…</option>
                {equipas.map((e) => <option key={e.id} value={e.id}>{e.nome} ({e.area === 'merchandising' ? 'Merch.' : 'Promoção'})</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sup">Supervisor</label>
              <select id="sup" className="input" required value={s.supervisorId} onChange={(e) => set('supervisorId', e.target.value)}>
                <option value="" disabled>Selecione…</option>
                {supervisores.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div className="field full">
              <span className="flabel">Locais / PDVs ({s.pdvIds.length})</span>
              <div className="picker">
                {pdvs.map((p) => (
                  <label className="check" key={p.id}>
                    <input type="checkbox" checked={s.pdvIds.includes(p.id)} onChange={(e) => set('pdvIds', e.target.checked ? [...s.pdvIds, p.id] : s.pdvIds.filter((x) => x !== p.id))} />
                    <span>{p.nome} <span className="small muted">· {p.zona}</span></span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field full"><label htmlFor="mat">Materiais</label><input id="mat" className="input" value={s.materiais} onChange={(e) => set('materiais', e.target.value)} /></div>
            <div className="field full">
              <label htmlFor="chk">Checklist (um item por linha)</label>
              <textarea id="chk" className="input" value={checklistTxt} onChange={(e) => setChecklistTxt(e.target.value)} placeholder={'Bancada montada\nProduto refrigerado'} />
            </div>
            <div className="field full"><label htmlFor="obs">Observações</label><textarea id="obs" className="input" value={s.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></div>
          </div>
        </fieldset>
        {editavel ? (
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => router.push('/app/servicos')}>Cancelar</button>
            <button className="btn primary" type="submit" disabled={pending}>{pending ? 'A guardar…' : 'Guardar'}</button>
          </div>
        ) : (
          <p className="small muted mt">Só gestores e administradores podem alterar serviços, clientes e campanhas.</p>
        )}
      </form>
    </>
  );
}
