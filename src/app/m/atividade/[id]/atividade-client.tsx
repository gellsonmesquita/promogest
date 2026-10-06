'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { comunicarOcorrencia, confirmarPresenca, enviarFoto, enviarRelatorio, guardarRelatorio, marcarAtividade, removerFoto, type RelatorioInput } from '@/app/actions/campo';
import { Modal } from '@/components/modal';
import { useAction, useToast } from '@/components/toast';
import { Icon, StatusBadge } from '@/components/ui';
import { fmtHora } from '@/lib/dates';
import { fotoUrl } from '@/lib/labels';

type Fase = 'antes' | 'durante' | 'depois' | 'geral';
type Foto = { id: string; fase: Fase; legenda: string; quando: string };
type Rel = {
  id: string | null; estado: string; atividade: string; quantidade: number; resultados: string; material: string; observacoes: string;
  ocorrencias: string; checklist: { item: string; ok: boolean }[]; motivoRejeicao: string | null;
};
type Esc = { id: string; estado: string; eHoje: boolean; presencaEstado: string | null; presencaHora: string; inicio: string | null; fim: string | null };

/** Reduz a imagem no telemóvel antes do envio, para poupar dados móveis. */
async function comprimir(file: File, max = 1600, quality = 0.8): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality));
}

export function Atividade({ escala, merch, relatorio, fotos }: { escala: Esc; merch: boolean; relatorio: Rel; fotos: Foto[] }) {
  const router = useRouter();
  const toast = useToast();
  const { pending, exec } = useAction();
  const [r, setR] = useState(relatorio);
  const [legendas, setLegendas] = useState<Record<string, string>>({});
  const [fase, setFase] = useState<Fase>(merch ? 'antes' : 'geral');
  const [aEnviar, setAEnviar] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [ocorr, setOcorr] = useState<string | null>(null);

  const presente = !!escala.presencaEstado && !['falta', 'cancelado', 'substituido'].includes(escala.presencaEstado);
  const editavel = relatorio.estado === 'rascunho' || relatorio.estado === 'rejeitado';
  const ativa = !['cancelada', 'substituida', 'falta'].includes(escala.estado);
  const visiveis = merch ? fotos.filter((f) => f.fase === fase) : fotos;
  const conta = (f: Fase) => fotos.filter((x) => x.fase === f).length;

  const payload = (): RelatorioInput => ({
    atividade: r.atividade, quantidade: r.quantidade, resultados: r.resultados, material: r.material,
    observacoes: r.observacoes, ocorrencias: r.ocorrencias, checklist: r.checklist, legendas,
  });

  async function addFotos(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files ?? []);
    ev.target.value = '';
    for (const file of files) {
      setAEnviar((n) => n + 1);
      try {
        const blob = await comprimir(file);
        const fd = new FormData();
        fd.set('escalaId', escala.id);
        fd.set('fase', merch ? fase : 'geral');
        fd.set('file', new File([blob], 'foto.jpg', { type: 'image/jpeg' }));
        const res = await enviarFoto(fd);
        if (!res.ok) toast(res.error, true);
      } catch {
        toast('Falha ao enviar a fotografia. Verifique a ligação.', true);
      } finally {
        setAEnviar((n) => n - 1);
      }
    }
    router.refresh();
  }

  if (!ativa && !relatorio.id) {
    return (
      <div className="card">
        <div className="row"><StatusBadge value={escala.estado} /><span className="muted">Esta escala já não está ativa.</span></div>
      </div>
    );
  }

  return (
    <>
      {/* 1. Presença */}
      <section className="card">
        <div className="step-h">
          <span className={`num${escala.presencaEstado ? ' done' : ''}`}>1</span>
          <h3>Presença</h3>
          <span className="spacer" />
          {escala.presencaEstado && <StatusBadge value={escala.presencaEstado} />}
        </div>
        {!escala.presencaEstado ? (
          escala.eHoje ? (
            <>
              <button className="btn primary lg block" disabled={pending} onClick={() => exec(() => confirmarPresenca(escala.id))}>
                <Icon name="check" /> Confirmar presença
              </button>
              <p className="small muted" style={{ textAlign: 'center', marginTop: 8 }}>A hora é registada automaticamente.</p>
            </>
          ) : (
            <p className="muted">A confirmação fica disponível no dia da escala.</p>
          )
        ) : (
          <>
            <p className="muted mb">Registada às <b>{escala.presencaHora}</b>.</p>
            {presente && editavel && escala.estado === 'confirmada' && (
              <div className="row">
                {!escala.inicio ? (
                  <button className="btn dark lg" style={{ flex: 1 }} disabled={pending} onClick={() => exec(() => marcarAtividade(escala.id, 'inicio'))}>
                    <Icon name="play" /> Iniciar atividade
                  </button>
                ) : !escala.fim ? (
                  <>
                    <span className="chip">Início {fmtHora(escala.inicio)}</span>
                    <button className="btn lg" style={{ flex: 1 }} disabled={pending} onClick={() => exec(() => marcarAtividade(escala.id, 'fim'))}>
                      <Icon name="stop" /> Terminar
                    </button>
                  </>
                ) : (
                  <span className="chip">{fmtHora(escala.inicio)} – {fmtHora(escala.fim)}</span>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {presente && (
        <>
          {relatorio.estado === 'rejeitado' && relatorio.motivoRejeicao && (
            <div className="alert bad"><b>Rejeitado pelo supervisor:</b> {relatorio.motivoRejeicao}</div>
          )}

          {!editavel && relatorio.id ? (
            <Link className="card row" href={`/m/relatorios/${relatorio.id}`} style={{ color: 'var(--ink)' }}>
              <Icon name="report" size={28} />
              <div style={{ flex: 1 }}>
                <div className="strong">Relatório enviado</div>
                <div className="small muted">Toque para ver o estado</div>
              </div>
              <StatusBadge value={relatorio.estado} />
            </Link>
          ) : (
            <>
              {/* 2. Checklist */}
              {r.checklist.length > 0 && (
                <section className="card">
                  <div className="step-h">
                    <span className="num">2</span><h3>Checklist</h3><span className="spacer" />
                    <span className="small muted">{r.checklist.filter((c) => c.ok).length}/{r.checklist.length}</span>
                  </div>
                  {r.checklist.map((c, i) => (
                    <label key={c.item} className="check" style={{ padding: '12px 4px', borderBottom: '1px solid var(--line)', fontSize: 15 }}>
                      <input type="checkbox" style={{ width: 24, height: 24 }} checked={c.ok} onChange={() => setR({ ...r, checklist: r.checklist.map((x, j) => (j === i ? { ...x, ok: !x.ok } : x)) })} />
                      {c.item}
                    </label>
                  ))}
                </section>
              )}

              {/* 3. Fotos */}
              <section className="card">
                <div className="step-h"><span className="num">3</span><h3>Fotografias</h3><span className="spacer" /><span className="small muted">{fotos.length}</span></div>
                {merch && (
                  <div className="tabs mb" style={{ width: '100%' }}>
                    {(['antes', 'durante', 'depois'] as const).map((f) => (
                      <button key={f} type="button" style={{ flex: 1, textTransform: 'capitalize' }} className={fase === f ? 'active' : ''} onClick={() => setFase(f)}>
                        {f} ({conta(f)})
                      </button>
                    ))}
                  </div>
                )}
                <div className="row">
                  <label className="btn primary lg" style={{ flex: 1.4, cursor: 'pointer' }}>
                    <Icon name="camera" /> Tirar foto
                    <input type="file" accept="image/*" capture="environment" hidden onChange={addFotos} />
                  </label>
                  <label className="btn lg" style={{ flex: 1, cursor: 'pointer' }}>
                    <Icon name="image" /> Galeria
                    <input type="file" accept="image/*" multiple hidden onChange={addFotos} />
                  </label>
                </div>
                {aEnviar > 0 && <p className="small muted mt">A enviar {aEnviar} fotografia(s)…</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {visiveis.map((f) => (
                    <div key={f.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fotoUrl(f.id)} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10 }} />
                      <button
                        type="button"
                        aria-label="Remover"
                        disabled={pending}
                        onClick={() => exec(() => removerFoto(f.id))}
                        style={{ position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: '50%', border: 0, background: 'rgba(0,0,0,.6)', color: '#fff', display: 'grid', placeItems: 'center' }}
                      >
                        <Icon name="close" size={16} />
                      </button>
                      <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 6 }}>{fmtHora(f.quando)}</span>
                      <input className="input" style={{ height: 34, fontSize: 12 }} placeholder="Legenda (opcional)" value={legendas[f.id] ?? f.legenda} onChange={(e) => setLegendas({ ...legendas, [f.id]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </section>

              {/* 4. Relatório */}
              <section className="card">
                <div className="step-h"><span className="num">4</span><h3>Relatório</h3></div>
                <div className="grid-auto" style={{ gap: 12 }}>
                  <div className="field">
                    <label htmlFor="r-at">Atividade realizada</label>
                    <textarea id="r-at" className="input" rows={2} style={{ minHeight: 70 }} value={r.atividade} onChange={(e) => setR({ ...r, atividade: e.target.value })} placeholder="Ex.: Degustação e abordagem a clientes" />
                  </div>
                  <div className="field">
                    <label htmlFor="r-q">{merch ? 'Quantidade executada' : 'Quantidade / contactos'}</label>
                    <input id="r-q" className="input" style={{ height: 46, fontSize: 15 }} type="number" inputMode="numeric" min={0} value={r.quantidade} onChange={(e) => setR({ ...r, quantidade: Number(e.target.value) })} />
                  </div>
                  <div className="field">
                    <label htmlFor="r-res">Resultados</label>
                    <input id="r-res" className="input" style={{ height: 46, fontSize: 15 }} value={r.resultados} onChange={(e) => setR({ ...r, resultados: e.target.value })} placeholder="Ex.: 45 unidades vendidas" />
                  </div>
                  {merch && (
                    <div className="field">
                      <label htmlFor="r-mat">Material implementado</label>
                      <input id="r-mat" className="input" style={{ height: 46, fontSize: 15 }} value={r.material} onChange={(e) => setR({ ...r, material: e.target.value })} />
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="r-obs">Observações</label>
                    <textarea id="r-obs" className="input" rows={3} value={r.observacoes} onChange={(e) => setR({ ...r, observacoes: e.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="r-oc">Ocorrências</label>
                    <textarea id="r-oc" className="input" rows={2} style={{ minHeight: 70 }} value={r.ocorrencias} onChange={(e) => setR({ ...r, ocorrencias: e.target.value })} placeholder="Ruptura de stock, problemas no local…" />
                  </div>
                </div>
              </section>
              {erro && <div className="alert bad">{erro}</div>}

              <footer className="m-actions">
                <button className="btn lg" disabled={pending || aEnviar > 0} onClick={() => exec(() => guardarRelatorio(escala.id, payload()))}>Guardar</button>
                <button
                  className="btn primary lg"
                  style={{ flex: 1 }}
                  disabled={pending || aEnviar > 0}
                  onClick={() => {
                    if (!fotos.length) return setErro('Adicione pelo menos uma fotografia como evidência.');
                    if (merch && (!conta('antes') || !conta('depois'))) return setErro('Merchandising: são obrigatórias fotos de antes e de depois.');
                    if (!r.atividade.trim()) return setErro('Descreva a atividade realizada.');
                    setErro(null);
                    exec(() => enviarRelatorio(escala.id, payload()), () => router.push('/m/relatorios'));
                  }}
                >
                  <Icon name="send" /> {relatorio.estado === 'rejeitado' ? 'Reenviar' : 'Enviar ao supervisor'}
                </button>
              </footer>
            </>
          )}
        </>
      )}

      {ativa && (
        <button className="btn ghost block" onClick={() => setOcorr('')}>
          <Icon name="warn" /> Comunicar ocorrência ao supervisor
        </button>
      )}

      {ocorr !== null && (
        <Modal title="Comunicar ocorrência" onClose={() => setOcorr(null)}>
          <textarea className="input" rows={4} value={ocorr} onChange={(e) => setOcorr(e.target.value)} placeholder="Descreva o que aconteceu" autoFocus />
          <div className="modal-actions">
            <button className="btn" onClick={() => setOcorr(null)}>Cancelar</button>
            <button className="btn primary" disabled={!ocorr.trim() || pending} onClick={() => exec(() => comunicarOcorrencia(escala.id, ocorr), () => setOcorr(null))}>Enviar</button>
          </div>
        </Modal>
      )}
      <style>{`
        .m-actions { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(68px + env(safe-area-inset-bottom, 0px)); width: 100%; max-width: 520px;
          display: flex; gap: 8px; padding: 10px 14px; background: linear-gradient(transparent, var(--bg) 30%); z-index: 20; }
      `}</style>
    </>
  );
}
