import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead, StatusBadge } from '@/components/ui';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { fmtDia } from '@/lib/dates';
import { PENDENTES } from '@/lib/labels';
import { getRefs, listRelatorios, type RelatorioRow } from '@/lib/queries';

export const metadata: Metadata = { title: 'Relatórios' };

const TABS = [
  { id: 'pendentes', label: 'Por validar', match: (r: RelatorioRow) => (PENDENTES as readonly string[]).includes(r.estado) },
  { id: 'rejeitado', label: 'Rejeitados', match: (r: RelatorioRow) => r.estado === 'rejeitado' },
  { id: 'aprovado', label: 'Aprovados', match: (r: RelatorioRow) => r.estado === 'aprovado' },
  { id: 'todos', label: 'Todos', match: (r: RelatorioRow) => r.estado !== 'rascunho' },
];

export default async function RelatoriosPage({ searchParams }: PageProps<'/app/relatorios'>) {
  const u = await requireUser(WEB_ROLES);
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.filtro) ?? TABS[0];
  const tipo = sp.tipo === 'promotora' || sp.tipo === 'merchandising' ? sp.tipo : '';
  const [refs, todos] = await Promise.all([getRefs(), listRelatorios(u, { tipo: tipo || undefined })]);
  const lista = todos.filter(tab.match);
  const qs = (p: Record<string, string>) => `/app/relatorios?${new URLSearchParams({ filtro: tab.id, ...(tipo ? { tipo } : {}), ...p })}`;

  return (
    <div className="page">
      <PageHead eyebrow="Fluxo de aprovação" title="Relatórios" desc="Promotora/merchandiser envia → supervisor verifica → aprova ou rejeita → gestor acompanha." />
      <div className="filters">
        <div className="tabs">
          {TABS.map((t) => (
            <Link key={t.id} href={qs({ filtro: t.id })} className={t.id === tab.id ? 'active' : ''}>
              {t.label} ({todos.filter(t.match).length})
            </Link>
          ))}
        </div>
        <div className="tabs">
          {[['', 'Todos os tipos'], ['promotora', 'Promoção'], ['merchandising', 'Merchandising']].map(([id, label]) => (
            <Link key={id} href={`/app/relatorios?${new URLSearchParams({ filtro: tab.id, ...(id ? { tipo: id } : {}) })}`} className={tipo === id ? 'active' : ''}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Autor</th>
              <th>Serviço</th>
              <th>PDV</th>
              <th>Tipo</th>
              <th>Fotos</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">Sem relatórios neste filtro.</td>
              </tr>
            )}
            {lista.map((r) => {
              const href = `/app/relatorios/${r.id}`;
              return (
                <tr key={r.id}>
                  <td><Link href={href} style={{ color: 'inherit' }}>{fmtDia(r.data, { day: '2-digit', month: '2-digit', year: 'numeric' })}</Link></td>
                  <td className="strong"><Link href={href} style={{ color: 'inherit' }}>{refs.nome(r.autorId)}</Link></td>
                  <td>{refs.servicos.get(r.servicoId)?.nome}</td>
                  <td>{refs.pdvs.get(r.pdvId)?.nome}</td>
                  <td>{r.tipo === 'merchandising' ? 'Merchandising' : 'Promoção'}</td>
                  <td>{r.nFotos}</td>
                  <td>
                    <Link href={href}><StatusBadge value={r.estado} /></Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
