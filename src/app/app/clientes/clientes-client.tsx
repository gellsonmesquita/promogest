'use client';

import { useState } from 'react';
import { guardarCliente, guardarMarca, guardarPdv } from '@/app/actions/cadastros';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/toast';
import { Icon } from '@/components/ui';
import { useT } from '@/i18n/client';

function Trigger({ edit, onClick }: { edit: boolean; onClick: () => void }) {
  const t = useT();
  return edit ? (
    <button className="btn sm" onClick={onClick}>{t('common.edit')}</button>
  ) : (
    <button className="btn primary" onClick={onClick}><Icon name="plus" size={18} /> {t('common.add')}</button>
  );
}

function Actions({ pending, onClose }: { pending: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <div className="modal-actions">
      <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
      <button type="submit" className="btn primary" disabled={pending}>{t('common.save')}</button>
    </div>
  );
}

type Cliente = { id?: string; nome: string; nif: string; responsavel: string; contacto: string; email: string; contratos: string[]; ativo: boolean };

export function ClienteBtn({ cliente }: { cliente?: Cliente }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { pending, exec } = useAction();
  const blank: Cliente = { nome: '', nif: '', responsavel: '', contacto: '', email: '', contratos: [], ativo: true };
  const [c, setC] = useState<Cliente>(cliente ?? blank);
  const [contratos, setContratos] = useState((cliente?.contratos ?? []).join('\n'));
  const close = () => setOpen(false);
  return (
    <>
      <Trigger edit={!!cliente} onClick={() => { setC(cliente ?? blank); setContratos((cliente?.contratos ?? []).join('\n')); setOpen(true); }} />
      {open && (
        <Modal title={t('clientes.cliente')} onClose={close}>
          <form onSubmit={(e) => { e.preventDefault(); exec(() => guardarCliente({ ...c, contratos: contratos.split('\n') }), close); }}>
            <div className="form-grid">
              <div className="field full"><label htmlFor="c-n">{t('clientes.fNomeEmpresa')}</label><input id="c-n" className="input" required value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} /></div>
              <div className="field"><label htmlFor="c-nif">{t('clientes.fNif')}</label><input id="c-nif" className="input" value={c.nif} onChange={(e) => setC({ ...c, nif: e.target.value })} /></div>
              <div className="field"><label htmlFor="c-r">{t('clientes.fResponsavel')}</label><input id="c-r" className="input" value={c.responsavel} onChange={(e) => setC({ ...c, responsavel: e.target.value })} /></div>
              <div className="field"><label htmlFor="c-t">{t('clientes.fContacto')}</label><input id="c-t" className="input" value={c.contacto} onChange={(e) => setC({ ...c, contacto: e.target.value })} /></div>
              <div className="field"><label htmlFor="c-e">{t('clientes.fEmail')}</label><input id="c-e" className="input" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></div>
              <div className="field full"><label htmlFor="c-k">{t('clientes.fContratos')}</label><textarea id="c-k" className="input" value={contratos} onChange={(e) => setContratos(e.target.value)} /></div>
              <label className="check full"><input type="checkbox" checked={c.ativo} onChange={(e) => setC({ ...c, ativo: e.target.checked })} /> {t('clientes.fClienteAtivo')}</label>
            </div>
            <Actions pending={pending} onClose={close} />
          </form>
        </Modal>
      )}
    </>
  );
}

type Marca = { id?: string; clienteId: string; nome: string; produtos: string[] };

export function MarcaBtn({ marca, clientes }: { marca?: Marca; clientes: { id: string; nome: string }[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { pending, exec } = useAction();
  const blank: Marca = { clienteId: clientes[0]?.id ?? '', nome: '', produtos: [] };
  const [m, setM] = useState<Marca>(marca ?? blank);
  const [produtos, setProdutos] = useState((marca?.produtos ?? []).join('\n'));
  const close = () => setOpen(false);
  return (
    <>
      <Trigger edit={!!marca} onClick={() => { setM(marca ?? blank); setProdutos((marca?.produtos ?? []).join('\n')); setOpen(true); }} />
      {open && (
        <Modal title={t('clientes.marca')} onClose={close}>
          <form onSubmit={(e) => { e.preventDefault(); exec(() => guardarMarca({ ...m, produtos: produtos.split('\n') }), close); }}>
            <div className="form-grid">
              <div className="field"><label htmlFor="m-n">{t('clientes.fNome')}</label><input id="m-n" className="input" required value={m.nome} onChange={(e) => setM({ ...m, nome: e.target.value })} /></div>
              <div className="field">
                <label htmlFor="m-c">{t('clientes.fCliente')}</label>
                <select id="m-c" className="input" required value={m.clienteId} onChange={(e) => setM({ ...m, clienteId: e.target.value })}>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="field full"><label htmlFor="m-p">{t('clientes.fProdutos')}</label><textarea id="m-p" className="input" value={produtos} onChange={(e) => setProdutos(e.target.value)} /></div>
            </div>
            <Actions pending={pending} onClose={close} />
          </form>
        </Modal>
      )}
    </>
  );
}

type Pdv = { id?: string; nome: string; endereco: string; zona: string; ativo: boolean };

export function PdvBtn({ pdv }: { pdv?: Pdv }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { pending, exec } = useAction();
  const blank: Pdv = { nome: '', endereco: '', zona: '', ativo: true };
  const [p, setP] = useState<Pdv>(pdv ?? blank);
  const close = () => setOpen(false);
  return (
    <>
      <Trigger edit={!!pdv} onClick={() => { setP(pdv ?? blank); setOpen(true); }} />
      {open && (
        <Modal title={t('clientes.pdv')} onClose={close}>
          <form onSubmit={(e) => { e.preventDefault(); exec(() => guardarPdv(p), close); }}>
            <div className="form-grid">
              <div className="field full"><label htmlFor="d-n">{t('clientes.fNome')}</label><input id="d-n" className="input" required value={p.nome} onChange={(e) => setP({ ...p, nome: e.target.value })} /></div>
              <div className="field full"><label htmlFor="d-e">{t('clientes.fEndereco')}</label><input id="d-e" className="input" value={p.endereco} onChange={(e) => setP({ ...p, endereco: e.target.value })} /></div>
              <div className="field"><label htmlFor="d-z">{t('clientes.fZona')}</label><input id="d-z" className="input" value={p.zona} onChange={(e) => setP({ ...p, zona: e.target.value })} /></div>
              <label className="check"><input type="checkbox" checked={p.ativo} onChange={(e) => setP({ ...p, ativo: e.target.checked })} /> {t('clientes.fAtivo')}</label>
            </div>
            <Actions pending={pending} onClose={close} />
          </form>
        </Modal>
      )}
    </>
  );
}
