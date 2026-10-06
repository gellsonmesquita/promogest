import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead, StatusBadge } from '@/components/ui';
import type { TKey } from '@/i18n/core';
import { getT } from '@/i18n/server';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { D_CURTO, fmtDia } from '@/lib/dates';
import { PENDENTES } from '@/lib/labels';
import { getRefs, listRelatorios, type RelatorioRow } from '@/lib/queries';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('nav.relatorios') };
}

const TABS: { id: string; label: TKey; match: (r: RelatorioRow) => boolean }[] = [
  { id: 'pendentes', label: 'rel.tabPendentes', match: (r) => (PENDENTES as readonly string[]).includes(r.estado) },
  { id: 'rejeitado', label: 'rel.tabRejeitados', match: (r) => r.estado === 'rejeitado' },
  { id: 'aprovado', label: 'rel.tabAprovados', match: (r) => r.estado === 'aprovado' },
  { id: 'todos', label: 'rel.tabTodos', match: (r) => r.estado !== 'rascunho' },
];

export default async function RelatoriosPage({ searchParams }: PageProps<'/app/relatorios'>) {
  const [u, t] = await Promise.all([requireUser(WEB_ROLES), getT()]);
  const sp = await searchParams;
  const tab = TABS.find((x) => x.id === sp.filtro) ?? TABS[0];
  const tipo = sp.tipo === 'promotora' || sp.tipo === 'merchandising' ? sp.tipo : '';
  const [refs, todos] = await Promise.all([getRefs(), listRelatorios(u, { tipo: tipo || undefined })]);
  const lista = todos.filter(tab.match);
  const tipos: [string, string][] = [['', t('rel.todosTipos')], ['promotora', t('tipoRelatorio.promotora')], ['merchandising', t('tipoRelatorio.merchandising')]];

  return (
    <div className="page">
      <PageHead eyebrow={t('rel.eyebrow')} title={t('rel.title')} desc={t('rel.desc')} />
      <div className="filters">
        <div className="tabs">
          {TABS.map((x) => (
            <Link key={x.id} href={`/app/relatorios?${new URLSearchParams({ filtro: x.id, ...(tipo ? { tipo } : {}) })}`} className={x.id === tab.id ? 'active' : ''}>
              {t(x.label)} ({todos.filter(x.match).length})
            </Link>
          ))}
        </div>
        <div className="tabs">
          {tipos.map(([id, label]) => (
            <Link key={id} href={`/app/relatorios?${new URLSearchParams({ filtro: tab.id, ...(id ? { tipo: id } : {}) })}`} className={tipo === id ? 'active' : ''}>{label}</Link>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('rel.thData')}</th><th>{t('rel.thAutor')}</th><th>{t('rel.thServico')}</th><th>{t('rel.thPdv')}</th>
              <th>{t('rel.thTipo')}</th><th>{t('rel.thFotos')}</th><th>{t('rel.thEstado')}</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={7} className="empty">{t('rel.vazio')}</td></tr>
            )}
            {lista.map((r) => {
              const href = `/app/relatorios/${r.id}`;
              return (
                <tr key={r.id}>
                  <td><Link href={href} style={{ color: 'inherit' }}>{fmtDia(r.data, t.intl, D_CURTO)}</Link></td>
                  <td className="strong"><Link href={href} style={{ color: 'inherit' }}>{refs.nome(r.autorId)}</Link></td>
                  <td>{refs.servicos.get(r.servicoId)?.nome}</td>
                  <td>{refs.pdvs.get(r.pdvId)?.nome}</td>
                  <td>{t(`tipoRelatorio.${r.tipo}`)}</td>
                  <td>{r.nFotos}</td>
                  <td><Link href={href}><StatusBadge value={r.estado} /></Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
