import { asc, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { db } from '@/db';
import { clientes, marcas, pdvs, servicos } from '@/db/schema';
import { getT } from '@/i18n/server';
import { GESTAO, requireUser } from '@/lib/auth';
import { ClienteBtn, MarcaBtn, PdvBtn } from './clientes-client';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('nav.clientes') };
}

export default async function ClientesPage({ searchParams }: PageProps<'/app/clientes'>) {
  const [, t] = await Promise.all([requireUser(GESTAO), getT()]);
  const sp = await searchParams;
  const tab = sp.tab === 'marcas' || sp.tab === 'pdvs' ? sp.tab : 'clientes';
  const [cs, ms, ps, nServ] = await Promise.all([
    db.select().from(clientes).orderBy(asc(clientes.nome)),
    db.select().from(marcas).orderBy(asc(marcas.nome)),
    db.select().from(pdvs).orderBy(asc(pdvs.nome)),
    db.select({ clienteId: servicos.clienteId, n: sql<number>`count(*)::int` }).from(servicos).groupBy(servicos.clienteId),
  ]);
  const clientesOpt = cs.map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <div className="page">
      <PageHead eyebrow={t('clientes.eyebrow')} title={t('clientes.title')} desc={t('clientes.desc')}>
        {tab === 'clientes' && <ClienteBtn />}
        {tab === 'marcas' && <MarcaBtn clientes={clientesOpt} />}
        {tab === 'pdvs' && <PdvBtn />}
      </PageHead>
      <div className="filters">
        <div className="tabs">
          <Link href="/app/clientes" className={tab === 'clientes' ? 'active' : ''}>{t('clientes.tabClientes', { n: cs.length })}</Link>
          <Link href="/app/clientes?tab=marcas" className={tab === 'marcas' ? 'active' : ''}>{t('clientes.tabMarcas', { n: ms.length })}</Link>
          <Link href="/app/clientes?tab=pdvs" className={tab === 'pdvs' ? 'active' : ''}>{t('clientes.tabPdvs', { n: ps.length })}</Link>
        </div>
      </div>

      <div className="table-wrap">
        {tab === 'clientes' && (
          <table className="table">
            <thead>
              <tr>
                <th>{t('clientes.thCliente')}</th><th>{t('clientes.thNif')}</th><th>{t('clientes.thResponsavel')}</th><th>{t('clientes.thContacto')}</th>
                <th>{t('clientes.thContratos')}</th><th>{t('clientes.thServicos')}</th><th />
              </tr>
            </thead>
            <tbody>
              {cs.map((c) => (
                <tr key={c.id} style={c.ativo ? undefined : { opacity: 0.5 }}>
                  <td className="strong">{c.nome}</td>
                  <td>{c.nif}</td>
                  <td>{c.responsavel}</td>
                  <td><div>{c.contacto}</div><div className="small muted">{c.email}</div></td>
                  <td>{c.contratos.map((k) => <div key={k} className="small">{k}</div>)}</td>
                  <td>{nServ.find((x) => x.clienteId === c.id)?.n ?? 0}</td>
                  <td><ClienteBtn cliente={c} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'marcas' && (
          <table className="table">
            <thead><tr><th>{t('clientes.thMarca')}</th><th>{t('clientes.thCliente')}</th><th>{t('clientes.thProdutos')}</th><th /></tr></thead>
            <tbody>
              {ms.map((m) => (
                <tr key={m.id}>
                  <td className="strong">{m.nome}</td>
                  <td>{cs.find((c) => c.id === m.clienteId)?.nome}</td>
                  <td><div className="row" style={{ gap: 4 }}>{m.produtos.map((p) => <span key={p} className="chip">{p}</span>)}</div></td>
                  <td><MarcaBtn marca={m} clientes={clientesOpt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'pdvs' && (
          <table className="table">
            <thead><tr><th>{t('clientes.thPdv')}</th><th>{t('clientes.thEndereco')}</th><th>{t('clientes.thZona')}</th><th>{t('clientes.thEstado')}</th><th /></tr></thead>
            <tbody>
              {ps.map((p) => (
                <tr key={p.id} style={p.ativo ? undefined : { opacity: 0.5 }}>
                  <td className="strong">{p.nome}</td>
                  <td>{p.endereco}</td>
                  <td>{p.zona}</td>
                  <td>{p.ativo ? t('common.active') : t('common.inactive')}</td>
                  <td><PdvBtn pdv={p} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
