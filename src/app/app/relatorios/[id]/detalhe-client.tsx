'use client';

import { useEffect, useRef, useState } from 'react';
import { analisarRelatorio, decidirRelatorio } from '@/app/actions/supervisao';
import { useAction } from '@/components/toast';
import { Icon } from '@/components/ui';
import { fmtDataHora } from '@/lib/dates';
import { fotoUrl } from '@/lib/labels';

/** Ao abrir um relatório enviado, passa-o a "Em análise". */
export function AutoAnalise({ id }: { id: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void analisarRelatorio(id);
  }, [id]);
  return null;
}

export function Decisao({ id, gestor }: { id: string; gestor: boolean }) {
  const { pending, exec } = useAction();
  const [nota, setNota] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  return (
    <section className="card" style={{ borderColor: 'var(--gold)', boxShadow: '0 0 0 3px var(--gold-50)' }}>
      <div className="card-head"><h3>Validação</h3></div>
      <div className="field">
        <label htmlFor="nota">Observação para a promotora (opcional ao aprovar, obrigatória ao rejeitar)</label>
        <textarea id="nota" className="input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: Falta foto do material POS…" />
      </div>
      {erro && <div className="alert bad mt">{erro}</div>}
      <div className="row mt">
        <button
          className="btn danger"
          disabled={pending}
          onClick={() => {
            if (!nota.trim()) return setErro('Indique o motivo da rejeição.');
            setErro(null);
            exec(() => decidirRelatorio(id, 'rejeitar', nota), () => setNota(''));
          }}
        >
          <Icon name="close" size={18} /> Rejeitar
        </button>
        <span className="spacer" />
        <button className="btn ok" disabled={pending} onClick={() => exec(() => decidirRelatorio(id, 'aprovar', nota), () => setNota(''))}>
          <Icon name="check" size={18} /> Aprovar
        </button>
      </div>
      {gestor && <p className="small muted mt">Como gestor autorizado, pode aprovar diretamente.</p>}
    </section>
  );
}

type FotoV = { id: string; fase: string; legenda: string; autor: string; quando: string };

export function Galeria({ fotos, merch, pdv }: { fotos: FotoV[]; merch: boolean; pdv: string }) {
  const [zoom, setZoom] = useState<FotoV | null>(null);
  const grupos = merch ? (['antes', 'durante', 'depois', 'geral'] as const).map((f) => ({ fase: f, fotos: fotos.filter((x) => x.fase === f) })) : [{ fase: 'geral', fotos }];
  return (
    <>
      {grupos
        .filter((g) => g.fotos.length)
        .map((g) => (
          <div key={g.fase} className="mb">
            {merch && <div className="label" style={{ color: 'var(--gold-600)', marginBottom: 8 }}>{g.fase}</div>}
            <div className="photo-grid">
              {g.fotos.map((f) => (
                <figure key={f.id} onClick={() => setZoom(f)} style={{ cursor: 'zoom-in' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotoUrl(f.id)} alt={f.legenda} loading="lazy" />
                  <figcaption>{f.legenda || 'Sem legenda'} · {fmtDataHora(f.quando)}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      {zoom && (
        <div className="overlay" onClick={() => setZoom(null)}>
          <figure style={{ margin: 0, maxWidth: 960 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotoUrl(zoom.id)} alt={zoom.legenda} style={{ borderRadius: 12, maxHeight: '80vh', margin: '0 auto', display: 'block' }} />
            <figcaption style={{ color: '#fff', textAlign: 'center', marginTop: 8 }}>
              {zoom.legenda} · {zoom.autor} · {fmtDataHora(zoom.quando, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {pdv}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
