'use client';

import { useState } from 'react';
import { guardarEquipa, guardarUser, reporPassword } from '@/app/actions/cadastros';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/toast';
import { Icon } from '@/components/ui';
import type { TKey } from '@/i18n/core';
import { useT } from '@/i18n/client';
import { D_CURTO, fmtDia } from '@/lib/dates';
import { ROLES } from '@/lib/labels';
import { AUSENCIA_TIPOS, PASSWORD_TEMP_MIN, PASSWORD_TEMPORARIA, type AusenciaTipo } from '@/lib/pessoas';

type Role = (typeof ROLES)[number];
type Opt = { id: string; nome: string };
type Pessoa = {
  id?: string; nome: string; email: string; numeroFuncionario: string; telefone: string; role: Role; equipaId: string; pdvId: string;
  zona: string; centroCusto: string; dataAdmissao: string; estado: 'ativa' | 'inativa' | 'suspensa';
  ausenciaTipo: string; ausenteAte: string; observacoes: string;
};

export function AusenciaBadge({ tipo, ate }: { tipo: string; ate: string | null }) {
  const t = useT();
  return (
    <span className="badge tone-warn" title={ate ? t('ausencia.ate', { data: fmtDia(ate, t.intl, D_CURTO) }) : t('ausencia.semData')}>
      {t(`ausencia.${tipo}` as TKey)}
      {ate ? ` · ${fmtDia(ate, t.intl, { day: '2-digit', month: '2-digit' })}` : ''}
    </span>
  );
}

function PessoaModal({ inicial, equipas, lojas, podeGestao, onClose }: { inicial: Pessoa; equipas: Opt[]; lojas: Opt[]; podeGestao: boolean; onClose: () => void }) {
  const t = useT();
  const { pending, exec } = useAction();
  const [p, setP] = useState(inicial);
  // Pessoa nova já vem com a palavra-passe temporária (troca obrigatória no 1.º acesso).
  const [password, setPassword] = useState(inicial.id ? '' : PASSWORD_TEMPORARIA);
  const set = <K extends keyof Pessoa>(k: K, v: Pessoa[K]) => setP((x) => ({ ...x, [k]: v }));
  const roles = ROLES.filter((r) => podeGestao || !['admin', 'gestor'].includes(r) || r === inicial.role);
  return (
    <Modal title={p.id ? t('equipas.editarPessoa', { nome: inicial.nome }) : t('equipas.novaPessoa')} onClose={onClose} wide>
      <form onSubmit={(e) => { e.preventDefault(); exec(() => guardarUser({ ...p, ausenciaTipo: p.ausenciaTipo as AusenciaTipo | '', password }), onClose); }}>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: 'span 2' }}><label htmlFor="p-n">{t('equipas.fNome')}</label><input id="p-n" className="input" required value={p.nome} onChange={(e) => set('nome', e.target.value)} /></div>
          <div className="field"><label htmlFor="p-num">{t('equipas.fNumero')}</label><input id="p-num" className="input" value={p.numeroFuncionario} onChange={(e) => set('numeroFuncionario', e.target.value)} /></div>
          <div className="field"><label htmlFor="p-e">{t('equipas.fEmailOpc')}</label><input id="p-e" className="input" type="email" value={p.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div className="field"><label htmlFor="p-t">{t('equipas.fTelefone')}</label><input id="p-t" className="input" value={p.telefone} onChange={(e) => set('telefone', e.target.value)} /></div>
          <div className="field">
            <label htmlFor="p-r">{t('equipas.fPerfil')}</label>
            <select id="p-r" className="input" value={p.role} disabled={!!p.id && !podeGestao} onChange={(e) => set('role', e.target.value as Role)}>
              {roles.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-q">{t('equipas.fEquipa')}</label>
            <select id="p-q" className="input" value={p.equipaId} onChange={(e) => set('equipaId', e.target.value)}>
              <option value="">—</option>
              {equipas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-l">{t('equipas.fLoja')}</label>
            <select id="p-l" className="input" value={p.pdvId} onChange={(e) => set('pdvId', e.target.value)}>
              <option value="">—</option>
              {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="p-z">{t('equipas.fZona')}</label><input id="p-z" className="input" value={p.zona} onChange={(e) => set('zona', e.target.value)} /></div>
          <div className="field"><label htmlFor="p-cc">{t('equipas.fCentroCusto')}</label><input id="p-cc" className="input" value={p.centroCusto} onChange={(e) => set('centroCusto', e.target.value)} /></div>
          <div className="field"><label htmlFor="p-da">{t('equipas.fAdmissao')}</label><input id="p-da" className="input" type="date" value={p.dataAdmissao} onChange={(e) => set('dataAdmissao', e.target.value)} /></div>
          <div className="field">
            <label htmlFor="p-s">{t('equipas.fEstado')}</label>
            <select id="p-s" className="input" value={p.estado} onChange={(e) => set('estado', e.target.value as Pessoa['estado'])}>
              <option value="ativa">{t('status.ativa')}</option>
              <option value="inativa">{t('status.inativa')}</option>
              <option value="suspensa">{t('status.suspensa')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-au">{t('equipas.fAusencia')}</label>
            <select id="p-au" className="input" value={p.ausenciaTipo} onChange={(e) => set('ausenciaTipo', e.target.value)}>
              <option value="">{t('ausencia.nenhuma')}</option>
              {AUSENCIA_TIPOS.map((a) => <option key={a} value={a}>{t(`ausencia.${a}`)}</option>)}
            </select>
          </div>
          {p.ausenciaTipo && (
            <div className="field"><label htmlFor="p-at">{t('equipas.fAusenteAte')}</label><input id="p-at" className="input" type="date" value={p.ausenteAte} onChange={(e) => set('ausenteAte', e.target.value)} /></div>
          )}
          <div className="field full"><label htmlFor="p-o">{t('equipas.fObs')}</label><textarea id="p-o" className="input" style={{ minHeight: 60 }} value={p.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></div>
          <div className="field full">
            <label htmlFor="p-pw">{p.id ? t('equipas.fPwNova') : t('equipas.fPwInicial')}</label>
            <input id="p-pw" className="input" type="text" autoComplete="new-password" minLength={PASSWORD_TEMP_MIN} required={!p.id} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <p className="small muted mt">{t('equipas.loginNota')} {t('equipas.naoApagar')}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn primary" disabled={pending}>{pending ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
}

const NOVA: Pessoa = {
  nome: '', email: '', numeroFuncionario: '', telefone: '', role: 'merchandiser', equipaId: '', pdvId: '', zona: '', centroCusto: '',
  dataAdmissao: '', estado: 'ativa', ausenciaTipo: '', ausenteAte: '', observacoes: '',
};

export function NovaPessoa({ equipas, lojas, podeGestao }: { equipas: Opt[]; lojas: Opt[]; podeGestao: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" size={18} /> {t('equipas.novaPessoa')}</button>
      {open && <PessoaModal inicial={NOVA} equipas={equipas} lojas={lojas} podeGestao={podeGestao} onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditarPessoa({ pessoa, equipas, lojas, podeGestao }: { pessoa: Pessoa; equipas: Opt[]; lojas: Opt[]; podeGestao: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn sm" onClick={() => setOpen(true)}>{t('common.edit')}</button>
      {open && <PessoaModal inicial={pessoa} equipas={equipas} lojas={lojas} podeGestao={podeGestao} onClose={() => setOpen(false)} />}
    </>
  );
}

type EquipaF = { id?: string; nome: string; area: 'promocao' | 'merchandising'; supervisorId: string; ativa: boolean };

export function EditarEquipa({ equipa, supervisores }: { equipa?: EquipaF; supervisores: Opt[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { pending, exec } = useAction();
  const [f, setF] = useState<EquipaF>(equipa ?? { nome: '', area: 'promocao', supervisorId: '', ativa: true });
  return (
    <>
      {equipa ? (
        <button className="btn sm ghost" onClick={() => setOpen(true)}>{t('common.edit')}</button>
      ) : (
        <button className="btn" onClick={() => { setF({ nome: '', area: 'promocao', supervisorId: '', ativa: true }); setOpen(true); }}>{t('equipas.novaEquipa')}</button>
      )}
      {open && (
        <Modal title={equipa ? t('equipas.equipaTitulo', { nome: equipa.nome }) : t('equipas.novaEquipa')} onClose={() => setOpen(false)}>
          <form onSubmit={(e) => { e.preventDefault(); exec(() => guardarEquipa(f), () => setOpen(false)); }}>
            <div className="form-grid">
              <div className="field full"><label htmlFor="q-n">{t('equipas.fNome')}</label><input id="q-n" className="input" required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
              <div className="field">
                <label htmlFor="q-a">{t('equipas.fArea')}</label>
                <select id="q-a" className="input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value as EquipaF['area'] })}>
                  <option value="promocao">{t('area.promocao')}</option>
                  <option value="merchandising">{t('area.merchandising')}</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="q-s">{t('equipas.fSupervisor')}</label>
                <select id="q-s" className="input" value={f.supervisorId} onChange={(e) => setF({ ...f, supervisorId: e.target.value })}>
                  <option value="">—</option>
                  {supervisores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <label className="check full"><input type="checkbox" checked={f.ativa} onChange={(e) => setF({ ...f, ativa: e.target.checked })} /> {t('equipas.fAtiva')}</label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn primary" disabled={pending}>{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/** Repõe a palavra-passe temporária (123456) com confirmação. */
export function ReporPassword({ id, nome }: { id: string; nome: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { pending, exec } = useAction();
  const pw = PASSWORD_TEMPORARIA;
  return (
    <>
      <button className="btn sm ghost" onClick={() => setOpen(true)} title={t('equipas.reporPw')}>{t('equipas.reporPw')}</button>
      {open && (
        <Modal title={t('equipas.reporPwTitulo', { nome })} onClose={() => setOpen(false)}>
          <p>{t('equipas.reporPwTexto', { nome, pw })}</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button className="btn primary" disabled={pending} onClick={() => exec(() => reporPassword(id), () => setOpen(false))}>{t('equipas.reporPwConfirmar', { pw })}</button>
          </div>
        </Modal>
      )}
    </>
  );
}