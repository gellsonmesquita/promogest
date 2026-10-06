'use client';

import { useState } from 'react';
import { guardarEquipa, guardarUser } from '@/app/actions/cadastros';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/toast';
import { Icon } from '@/components/ui';
import { useT } from '@/i18n/client';
import { ROLES } from '@/lib/labels';

type Role = (typeof ROLES)[number];
type Pessoa = { id?: string; nome: string; email: string; telefone: string; role: Role; equipaId: string; zona: string; estado: 'ativa' | 'inativa' | 'suspensa' };

function PessoaModal({ inicial, equipas, podeGestao, onClose }: { inicial: Pessoa; equipas: { id: string; nome: string }[]; podeGestao: boolean; onClose: () => void }) {
  const t = useT();
  const { pending, exec } = useAction();
  const [p, setP] = useState(inicial);
  const [password, setPassword] = useState('');
  const roles = ROLES.filter((r) => podeGestao || !['admin', 'gestor'].includes(r) || r === inicial.role);
  return (
    <Modal title={p.id ? t('equipas.editarPessoa', { nome: inicial.nome }) : t('equipas.novaPessoa')} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); exec(() => guardarUser({ ...p, password }), onClose); }}>
        <div className="form-grid">
          <div className="field full"><label htmlFor="p-n">{t('equipas.fNome')}</label><input id="p-n" className="input" required value={p.nome} onChange={(e) => setP({ ...p, nome: e.target.value })} /></div>
          <div className="field"><label htmlFor="p-e">{t('equipas.fEmail')}</label><input id="p-e" className="input" type="email" required value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></div>
          <div className="field"><label htmlFor="p-t">{t('equipas.fTelefone')}</label><input id="p-t" className="input" value={p.telefone} onChange={(e) => setP({ ...p, telefone: e.target.value })} /></div>
          <div className="field">
            <label htmlFor="p-r">{t('equipas.fPerfil')}</label>
            <select id="p-r" className="input" value={p.role} disabled={!!p.id && !podeGestao} onChange={(e) => setP({ ...p, role: e.target.value as Role })}>
              {roles.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-q">{t('equipas.fEquipa')}</label>
            <select id="p-q" className="input" value={p.equipaId} onChange={(e) => setP({ ...p, equipaId: e.target.value })}>
              <option value="">—</option>
              {equipas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="p-z">{t('equipas.fZona')}</label><input id="p-z" className="input" value={p.zona} onChange={(e) => setP({ ...p, zona: e.target.value })} /></div>
          <div className="field">
            <label htmlFor="p-s">{t('equipas.fEstado')}</label>
            <select id="p-s" className="input" value={p.estado} onChange={(e) => setP({ ...p, estado: e.target.value as Pessoa['estado'] })}>
              <option value="ativa">{t('status.ativa')}</option>
              <option value="inativa">{t('status.inativa')}</option>
              <option value="suspensa">{t('status.suspensa')}</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="p-pw">{p.id ? t('equipas.fPwNova') : t('equipas.fPwInicial')}</label>
            <input id="p-pw" className="input" type="password" autoComplete="new-password" minLength={8} required={!p.id} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <p className="small muted mt">{t('equipas.naoApagar')}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn primary" disabled={pending}>{pending ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
}

export function NovaPessoa({ equipas, podeGestao }: { equipas: { id: string; nome: string }[]; podeGestao: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" size={18} /> {t('equipas.novaPessoa')}</button>
      {open && <PessoaModal inicial={{ nome: '', email: '', telefone: '', role: 'promotora', equipaId: '', zona: '', estado: 'ativa' }} equipas={equipas} podeGestao={podeGestao} onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditarPessoa({ pessoa, equipas, podeGestao }: { pessoa: Pessoa; equipas: { id: string; nome: string }[]; podeGestao: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn sm" onClick={() => setOpen(true)}>{t('common.edit')}</button>
      {open && <PessoaModal inicial={pessoa} equipas={equipas} podeGestao={podeGestao} onClose={() => setOpen(false)} />}
    </>
  );
}

type EquipaF = { id?: string; nome: string; area: 'promocao' | 'merchandising'; supervisorId: string; ativa: boolean };

export function EditarEquipa({ equipa, supervisores }: { equipa?: EquipaF; supervisores: { id: string; nome: string }[] }) {
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
