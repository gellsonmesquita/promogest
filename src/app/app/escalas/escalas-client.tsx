'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { cancelarEscala, criarEscalas, registarPresenca, substituir, validarPresenca } from '@/app/actions/supervisao';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/toast';
import { Icon } from '@/components/ui';
import { addDays, fmtDataHora, fmtDia, overlaps } from '@/lib/dates';

type Ocupada = { promotoraId: string; data: string; hi: string; hf: string };
type Pessoa = { id: string; nome: string; equipaId: string | null; equipa: string };

export function EscalasToolbar({ vista, data, servicoId, hoje, servicos }: { vista: 'dia' | 'semana'; data: string; servicoId: string; hoje: string; servicos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const go = (p: Partial<{ vista: string; data: string; servico: string }>) => {
    const q = new URLSearchParams({ vista, data, servico: servicoId, ...p });
    if (!q.get('servico')) q.delete('servico');
    router.push(`/app/escalas?${q}`);
  };
  const passo = vista === 'dia' ? 1 : 7;
  return (
    <div className="filters">
      <div className="tabs">
        <button className={vista === 'dia' ? 'active' : ''} onClick={() => go({ vista: 'dia' })}>Dia</button>
        <button className={vista === 'semana' ? 'active' : ''} onClick={() => go({ vista: 'semana' })}>Semana</button>
      </div>
      <button className="btn" onClick={() => go({ data: addDays(data, -passo) })} aria-label="Anterior">‹</button>
      <input className="input" type="date" value={data} onChange={(e) => e.target.value && go({ data: e.target.value })} />
      <button className="btn" onClick={() => go({ data: addDays(data, passo) })} aria-label="Seguinte">›</button>
      <button className="btn ghost" onClick={() => go({ data: hoje })}>Hoje</button>
      <select className="input" value={servicoId} onChange={(e) => go({ servico: e.target.value })}>
        <option value="">Todos os serviços</option>
        {servicos.map((s) => (
          <option key={s.id} value={s.id}>{s.nome}</option>
        ))}
      </select>
    </div>
  );
}

export function EscalaRowActions({
  escala,
  historico,
  candidatas,
  ocupadas,
}: {
  escala: { id: string; data: string; hi: string; hf: string; promotoraId: string; promotora: string; pdv: string; ativa: boolean; porValidar: boolean };
  historico: { id: string; texto: string; quem: string; data: string }[];
  candidatas: Pessoa[];
  ocupadas: Ocupada[];
}) {
  const { pending, exec } = useAction();
  const [modal, setModal] = useState<'subst' | 'hist' | 'cancel' | null>(null);
  const livres = candidatas.filter((c) => !ocupadas.some((o) => o.promotoraId === c.id && o.data === escala.data && overlaps(escala.hi, escala.hf, o.hi, o.hf)));

  return (
    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
      {escala.porValidar && (
        <button className="btn sm" disabled={pending} onClick={() => exec(() => validarPresenca(escala.id))}>Validar</button>
      )}
      {escala.ativa && (
        <>
          <select
            className="input"
            style={{ height: 30, width: 'auto', fontSize: 12, padding: '0 8px' }}
            value=""
            disabled={pending}
            onChange={(e) => {
              const v = e.target.value as 'presente' | 'atrasado' | 'falta';
              if (v) exec(() => registarPresenca(escala.id, v));
            }}
          >
            <option value="">Registar…</option>
            <option value="presente">Presente</option>
            <option value="atrasado">Atraso</option>
            <option value="falta">Falta</option>
          </select>
          <button className="btn sm" onClick={() => setModal('subst')}>Substituir</button>
          <button className="btn sm danger" onClick={() => setModal('cancel')}>Cancelar</button>
        </>
      )}
      <button className="btn sm ghost" onClick={() => setModal('hist')}>Histórico</button>

      {modal === 'subst' && (
        <Modal title={`Substituir ${escala.promotora}`} onClose={() => setModal(null)}>
          <p className="muted">
            {fmtDia(escala.data)} · {escala.hi}–{escala.hf} · {escala.pdv}
          </p>
          <div className="list">
            {livres.length === 0 && <div className="empty">Nenhuma pessoa disponível sem conflito neste horário.</div>}
            {livres.map((c) => (
              <div className="item" key={c.id}>
                <div style={{ flex: 1 }}>
                  <div className="strong">{c.nome}</div>
                  <div className="small muted">{c.equipa}</div>
                </div>
                <button className="btn sm primary" disabled={pending} onClick={() => exec(() => substituir(escala.id, c.id), () => setModal(null))}>Escalar</button>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setModal(null)}>Fechar</button>
          </div>
        </Modal>
      )}

      {modal === 'cancel' && (
        <Modal title="Cancelar escala?" onClose={() => setModal(null)}>
          <p>
            A escala de <b>{escala.promotora}</b> em {fmtDia(escala.data)} ({escala.hi}–{escala.hf}) será cancelada e a promotora notificada. O registo mantém-se no histórico.
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setModal(null)}>Voltar</button>
            <button className="btn danger" disabled={pending} onClick={() => exec(() => cancelarEscala(escala.id), () => setModal(null))}>Cancelar escala</button>
          </div>
        </Modal>
      )}

      {modal === 'hist' && (
        <Modal title="Histórico da escala" onClose={() => setModal(null)}>
          <ul className="timeline">
            {historico.map((h) => (
              <li key={h.id}>
                <div>{h.texto}</div>
                <div className="small muted">
                  {h.quem} · {fmtDataHora(h.data, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </li>
            ))}
          </ul>
          <div className="modal-actions">
            <button className="btn" onClick={() => setModal(null)}>Fechar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

type ServicoOpt = { id: string; nome: string; equipaId: string; pdvs: { id: string; nome: string }[] };

export function NovaEscala({ servicos, pessoas, dataInicial }: { servicos: ServicoOpt[]; pessoas: Pessoa[]; dataInicial: string }) {
  const [open, setOpen] = useState(false);
  const { pending, exec } = useAction();
  const blank = { servicoId: '', pdvId: '', promotoraIds: [] as string[], de: dataInicial, ate: dataInicial, hi: '09:00', hf: '15:00' };
  const [f, setF] = useState(blank);
  const servico = servicos.find((s) => s.id === f.servicoId);
  const lista = useMemo(() => {
    if (!servico) return pessoas;
    return [...pessoas].sort((a, b) => Number(b.equipaId === servico.equipaId) - Number(a.equipaId === servico.equipaId) || a.nome.localeCompare(b.nome));
  }, [pessoas, servico]);

  return (
    <>
      <button className="btn primary" onClick={() => { setF(blank); setOpen(true); }}>
        <Icon name="plus" size={18} /> Nova escala
      </button>
      {open && (
        <Modal title="Nova escala" onClose={() => setOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              exec(() => criarEscalas(f), () => setOpen(false));
            }}
          >
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="ne-s">Serviço / campanha</label>
                <select id="ne-s" className="input" required value={f.servicoId} onChange={(e) => setF({ ...f, servicoId: e.target.value, pdvId: '', promotoraIds: [] })}>
                  <option value="" disabled>Selecione…</option>
                  {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className="field full">
                <label htmlFor="ne-p">Local / PDV</label>
                <select id="ne-p" className="input" required value={f.pdvId} onChange={(e) => setF({ ...f, pdvId: e.target.value })} disabled={!servico}>
                  <option value="" disabled>Selecione…</option>
                  {servico?.pdvs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="ne-de">De</label><input id="ne-de" className="input" type="date" required value={f.de} onChange={(e) => setF({ ...f, de: e.target.value, ate: e.target.value > f.ate ? e.target.value : f.ate })} /></div>
              <div className="field"><label htmlFor="ne-ate">Até</label><input id="ne-ate" className="input" type="date" required value={f.ate} min={f.de} onChange={(e) => setF({ ...f, ate: e.target.value })} /></div>
              <div className="field"><label htmlFor="ne-hi">Hora início</label><input id="ne-hi" className="input" type="time" required value={f.hi} onChange={(e) => setF({ ...f, hi: e.target.value })} /></div>
              <div className="field"><label htmlFor="ne-hf">Hora fim</label><input id="ne-hf" className="input" type="time" required value={f.hf} onChange={(e) => setF({ ...f, hf: e.target.value })} /></div>
              <div className="field full">
                <span className="flabel">Promotoras / equipa ({f.promotoraIds.length})</span>
                <div className="picker">
                  {lista.map((p) => (
                    <label className="check" key={p.id} style={servico && p.equipaId !== servico.equipaId ? { opacity: 0.6 } : undefined}>
                      <input
                        type="checkbox"
                        checked={f.promotoraIds.includes(p.id)}
                        onChange={(e) => setF({ ...f, promotoraIds: e.target.checked ? [...f.promotoraIds, p.id] : f.promotoraIds.filter((x) => x !== p.id) })}
                      />
                      <span>
                        {p.nome} <span className="small muted">· {p.equipa}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <p className="small muted mt">Escalas que entrem em conflito de horário com outra escala da mesma pessoa são ignoradas automaticamente.</p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={pending || !f.promotoraIds.length}>{pending ? 'A criar…' : 'Criar escalas'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
