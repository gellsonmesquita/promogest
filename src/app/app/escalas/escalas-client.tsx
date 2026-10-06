'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { cancelarEscala, criarEscalas, registarPresenca, substituir, validarPresenca } from '@/app/actions/supervisao';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/toast';
import { Icon, Timeline } from '@/components/ui';
import { useT } from '@/i18n/client';
import { addDays, fmtDia, overlaps } from '@/lib/dates';

type Ocupada = { promotoraId: string; data: string; hi: string; hf: string };
type Pessoa = { id: string; nome: string; equipaId: string | null; equipa: string };

export function EscalasToolbar({ vista, data, servicoId, hoje, servicos }: { vista: 'dia' | 'semana'; data: string; servicoId: string; hoje: string; servicos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const t = useT();
  const go = (p: Partial<{ vista: string; data: string; servico: string }>) => {
    const q = new URLSearchParams({ vista, data, servico: servicoId, ...p });
    if (!q.get('servico')) q.delete('servico');
    router.push(`/app/escalas?${q}`);
  };
  const passo = vista === 'dia' ? 1 : 7;
  return (
    <div className="filters">
      <div className="tabs">
        <button className={vista === 'dia' ? 'active' : ''} onClick={() => go({ vista: 'dia' })}>{t('escalas.dia')}</button>
        <button className={vista === 'semana' ? 'active' : ''} onClick={() => go({ vista: 'semana' })}>{t('escalas.semana')}</button>
      </div>
      <button className="btn" onClick={() => go({ data: addDays(data, -passo) })} aria-label={t('escalas.anterior')}>‹</button>
      <input className="input" type="date" value={data} onChange={(e) => e.target.value && go({ data: e.target.value })} />
      <button className="btn" onClick={() => go({ data: addDays(data, passo) })} aria-label={t('escalas.seguinte')}>›</button>
      <button className="btn ghost" onClick={() => go({ data: hoje })}>{t('escalas.hoje')}</button>
      <select className="input" value={servicoId} onChange={(e) => go({ servico: e.target.value })}>
        <option value="">{t('escalas.todosServicos')}</option>
        {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
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
  historico: { id: string; texto: string; params: Record<string, string | number | null> | null; quem: string; data: Date }[];
  candidatas: Pessoa[];
  ocupadas: Ocupada[];
}) {
  const t = useT();
  const { pending, exec } = useAction();
  const [modal, setModal] = useState<'subst' | 'hist' | 'cancel' | null>(null);
  const livres = candidatas.filter((c) => !ocupadas.some((o) => o.promotoraId === c.id && o.data === escala.data && overlaps(escala.hi, escala.hf, o.hi, o.hf)));
  const dia = fmtDia(escala.data, t.intl);

  return (
    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
      {escala.porValidar && (
        <button className="btn sm" disabled={pending} onClick={() => exec(() => validarPresenca(escala.id))}>{t('escalas.validar')}</button>
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
            <option value="">{t('escalas.registar')}</option>
            <option value="presente">{t('escalas.presente')}</option>
            <option value="atrasado">{t('escalas.atraso')}</option>
            <option value="falta">{t('escalas.falta')}</option>
          </select>
          <button className="btn sm" onClick={() => setModal('subst')}>{t('escalas.substituir')}</button>
          <button className="btn sm danger" onClick={() => setModal('cancel')}>{t('escalas.cancelar')}</button>
        </>
      )}
      <button className="btn sm ghost" onClick={() => setModal('hist')}>{t('escalas.historico')}</button>

      {modal === 'subst' && (
        <Modal title={t('escalas.substituirTitulo', { nome: escala.promotora })} onClose={() => setModal(null)}>
          <p className="muted">{dia} · {escala.hi}–{escala.hf} · {escala.pdv}</p>
          <div className="list">
            {livres.length === 0 && <div className="empty">{t('escalas.semDisponiveis')}</div>}
            {livres.map((c) => (
              <div className="item" key={c.id}>
                <div style={{ flex: 1 }}>
                  <div className="strong">{c.nome}</div>
                  <div className="small muted">{c.equipa}</div>
                </div>
                <button className="btn sm primary" disabled={pending} onClick={() => exec(() => substituir(escala.id, c.id), () => setModal(null))}>{t('escalas.escalar')}</button>
              </div>
            ))}
          </div>
          <div className="modal-actions"><button className="btn" onClick={() => setModal(null)}>{t('common.close')}</button></div>
        </Modal>
      )}

      {modal === 'cancel' && (
        <Modal title={t('escalas.cancelarTitulo')} onClose={() => setModal(null)}>
          <p>{t('escalas.cancelarTexto', { nome: escala.promotora, dia, hi: escala.hi, hf: escala.hf })}</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setModal(null)}>{t('common.back')}</button>
            <button className="btn danger" disabled={pending} onClick={() => exec(() => cancelarEscala(escala.id), () => setModal(null))}>{t('escalas.cancelarConfirmar')}</button>
          </div>
        </Modal>
      )}

      {modal === 'hist' && (
        <Modal title={t('escalas.historicoTitulo')} onClose={() => setModal(null)}>
          <Timeline items={historico} />
          <div className="modal-actions"><button className="btn" onClick={() => setModal(null)}>{t('common.close')}</button></div>
        </Modal>
      )}
    </div>
  );
}

type ServicoOpt = { id: string; nome: string; equipaId: string; pdvs: { id: string; nome: string }[] };

export function NovaEscala({ servicos, pessoas, dataInicial }: { servicos: ServicoOpt[]; pessoas: Pessoa[]; dataInicial: string }) {
  const t = useT();
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
        <Icon name="plus" size={18} /> {t('escalas.nova')}
      </button>
      {open && (
        <Modal title={t('escalas.nova')} onClose={() => setOpen(false)}>
          <form onSubmit={(e) => { e.preventDefault(); exec(() => criarEscalas(f), () => setOpen(false)); }}>
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="ne-s">{t('escalas.fServico')}</label>
                <select id="ne-s" className="input" required value={f.servicoId} onChange={(e) => setF({ ...f, servicoId: e.target.value, pdvId: '', promotoraIds: [] })}>
                  <option value="" disabled>{t('common.select')}</option>
                  {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className="field full">
                <label htmlFor="ne-p">{t('escalas.fPdv')}</label>
                <select id="ne-p" className="input" required value={f.pdvId} onChange={(e) => setF({ ...f, pdvId: e.target.value })} disabled={!servico}>
                  <option value="" disabled>{t('common.select')}</option>
                  {servico?.pdvs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="ne-de">{t('escalas.fDe')}</label><input id="ne-de" className="input" type="date" required value={f.de} onChange={(e) => setF({ ...f, de: e.target.value, ate: e.target.value > f.ate ? e.target.value : f.ate })} /></div>
              <div className="field"><label htmlFor="ne-ate">{t('escalas.fAte')}</label><input id="ne-ate" className="input" type="date" required value={f.ate} min={f.de} onChange={(e) => setF({ ...f, ate: e.target.value })} /></div>
              <div className="field"><label htmlFor="ne-hi">{t('escalas.fHi')}</label><input id="ne-hi" className="input" type="time" required value={f.hi} onChange={(e) => setF({ ...f, hi: e.target.value })} /></div>
              <div className="field"><label htmlFor="ne-hf">{t('escalas.fHf')}</label><input id="ne-hf" className="input" type="time" required value={f.hf} onChange={(e) => setF({ ...f, hf: e.target.value })} /></div>
              <div className="field full">
                <span className="flabel">{t('escalas.fPessoas', { n: f.promotoraIds.length })}</span>
                <div className="picker">
                  {lista.map((p) => (
                    <label className="check" key={p.id} style={servico && p.equipaId !== servico.equipaId ? { opacity: 0.6 } : undefined}>
                      <input
                        type="checkbox"
                        checked={f.promotoraIds.includes(p.id)}
                        onChange={(e) => setF({ ...f, promotoraIds: e.target.checked ? [...f.promotoraIds, p.id] : f.promotoraIds.filter((x) => x !== p.id) })}
                      />
                      <span>{p.nome} <span className="small muted">· {p.equipa}</span></span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <p className="small muted mt">{t('escalas.fNota')}</p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn primary" disabled={pending || !f.promotoraIds.length}>{pending ? t('escalas.aCriar') : t('escalas.criar')}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
