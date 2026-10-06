import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, StatusBadge } from '@/components/ui';
import { FIELD_ROLES, requireUser } from '@/lib/auth';
import { fmtDia } from '@/lib/dates';
import { fotoUrl } from '@/lib/labels';
import { getRefs, listRelatorios } from '@/lib/queries';

export const metadata: Metadata = { title: 'Os meus relatórios' };

export default async function MeusRelatoriosPage() {
  const u = await requireUser(FIELD_ROLES);
  const [refs, rels] = await Promise.all([getRefs(), listRelatorios(u)]);
  const lista = rels.filter((r) => r.estado !== 'rascunho');
  return (
    <>
      <h1 className="m-title">Os meus relatórios</h1>
      <div className="m-body">
        <div className="small muted">Enviado → Em análise → Aprovado / Rejeitado</div>
        {lista.length === 0 && <div className="card empty">Ainda não enviou relatórios.</div>}
        {lista.map((r) => (
          <Link key={r.id} href={`/m/relatorios/${r.id}`} className="card row" style={{ color: 'var(--ink)', padding: 12, flexWrap: 'nowrap' }}>
            {r.fotoId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl(r.fotoId)} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flex: 'none' }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--gold-50)', display: 'grid', placeItems: 'center', color: 'var(--gold)', flex: 'none' }}><Icon name="image" /></div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="strong ellipsis">{refs.servicos.get(r.servicoId)?.nome}</div>
              <div className="small muted">{fmtDia(r.data, { weekday: 'short', day: '2-digit', month: '2-digit' })} · {refs.pdvs.get(r.pdvId)?.nome}</div>
              <div style={{ marginTop: 6 }}><StatusBadge value={r.estado} /></div>
            </div>
            <Icon name="chevron" style={{ color: 'var(--muted)' }} />
          </Link>
        ))}
      </div>
    </>
  );
}
