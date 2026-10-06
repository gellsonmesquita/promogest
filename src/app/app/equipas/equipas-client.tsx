'use client';

import { useState } from 'react';
import { guardarEquipa, guardarUser } from '@/app/actions/cadastros';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/toast';
import { Icon } from '@/components/ui';
import { ROLE_LABEL } from '@/lib/labels';

type Role = keyof typeof ROLE_LABEL;
type Pessoa = { id?: string; nome: string; email: string; telefone: string; role: Role; equipaId: string; zona: string; estado: 'ativa' | 'inativa' | 'suspensa' };

function PessoaModal({ inicial, equipas, podeGestao, onClose }: { inicial: Pessoa; equipas: { id: string; nome: string }[]; podeGestao: boolean; onClose: () => void }) {
  const { pending, exec } = useAction();
  const [p, setP] = useState(inicial);
  const [password, setPassword] = useState('');
  const roles = (Object.keys(ROLE_LABEL) as Role[]).filter((r) => podeGestao || !['admin', 'gestor'].includes(r) || r === inicial.role);
  return (
    <Modal title={p.id ? `Editar ${inicial.nome}` : 'Nova pessoa'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); exec(() => guardarUser({ ...p, password }), onClose); }}>
        <div className="form-grid">
          <div className="field full"><label htmlFor="p-n">Nome</label><input id="p-n" className="input" required value={p.nome} onChange={(e) => setP({ ...p, nome: e.target.value })} /></div>
          <div className="field"><label htmlFor="p-e">E-mail</label><input id="p-e" className="input" type="email" required value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></div>
          <div className="field"><label htmlFor="p-t">Telefone</label><input id="p-t" className="input" value={p.telefone} onChange={(e) => setP({ ...p, telefone: e.target.value })} /></div>
          <div className="field">
            <label htmlFor="p-r">Perfil</label>
            <select id="p-r" className="input" value={p.role} disabled={!!p.id && !podeGestao} onChange={(e) => setP({ ...p, role: e.target.value as Role })}>
              {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-q">Equipa</label>
            <select id="p-q" className="input" value={p.equipaId} onChange={(e) => setP({ ...p, equipaId: e.target.value })}>
              <option value="">—</option>
              {equipas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="p-z">Zona</label><input id="p-z" className="input" value={p.zona} onChange={(e) => setP({ ...p, zona: e.target.value })} /></div>
          <div className="field">
            <label htmlFor="p-s">Estado</label>
            <select id="p-s" className="input" value={p.estado} onChange={(e) => setP({ ...p, estado: e.target.value as Pessoa['estado'] })}>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
              <option value="suspensa">Suspensa</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="p-pw">{p.id ? 'Nova palavra-passe (deixe vazio para manter)' : 'Palavra-passe inicial (mín. 8 caracteres)'}</label>
            <input id="p-pw" className="input" type="password" autoComplete="new-password" minLength={8} required={!p.id} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <p className="small muted mt">Os registos não são apagados: inative ou suspenda para manter o histórico.</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={pending}>{pending ? 'A guardar…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function NovaPessoa({ equipas, podeGestao }: { equipas: { id: string; nome: string }[]; podeGestao: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" size={18} /> Nova pessoa</button>
      {open && <PessoaModal inicial={{ nome: '', email: '', telefone: '', role: 'promotora', equipaId: '', zona: '', estado: 'ativa' }} equipas={equipas} podeGestao={podeGestao} onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditarPessoa({ pessoa, equipas, podeGestao }: { pessoa: Pessoa; equipas: { id: string; nome: string }[]; podeGestao: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn sm" onClick={() => setOpen(true)}>Editar</button>
      {open && <PessoaModal inicial={pessoa} equipas={equipas} podeGestao={podeGestao} onClose={() => setOpen(false)} />}
    </>
  );
}

type EquipaF = { id?: string; nome: string; area: 'promocao' | 'merchandising'; supervisorId: string; ativa: boolean };

export function EditarEquipa({ equipa, supervisores }: { equipa?: EquipaF; supervisores: { id: string; nome: string }[] }) {
  const [open, setOpen] = useState(false);
  const { pending, exec } = useAction();
  const [f, setF] = useState<EquipaF>(equipa ?? { nome: '', area: 'promocao', supervisorId: '', ativa: true });
  return (
    <>
      {equipa ? (
        <button className="btn sm ghost" onClick={() => setOpen(true)}>Editar</button>
      ) : (
        <button className="btn" onClick={() => { setF({ nome: '', area: 'promocao', supervisorId: '', ativa: true }); setOpen(true); }}>Nova equipa</button>
      )}
      {open && (
        <Modal title={equipa ? `Equipa ${equipa.nome}` : 'Nova equipa'} onClose={() => setOpen(false)}>
          <form onSubmit={(e) => { e.preventDefault(); exec(() => guardarEquipa(f), () => setOpen(false)); }}>
            <div className="form-grid">
              <div className="field full"><label htmlFor="q-n">Nome</label><input id="q-n" className="input" required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
              <div className="field">
                <label htmlFor="q-a">Área</label>
                <select id="q-a" className="input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value as EquipaF['area'] })}>
                  <option value="promocao">Promoção</option>
                  <option value="merchandising">Merchandising</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="q-s">Supervisor</label>
                <select id="q-s" className="input" value={f.supervisorId} onChange={(e) => setF({ ...f, supervisorId: e.target.value })}>
                  <option value="">—</option>
                  {supervisores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <label className="check full"><input type="checkbox" checked={f.ativa} onChange={(e) => setF({ ...f, ativa: e.target.checked })} /> Equipa ativa</label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={pending}>Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
