import { asc, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { db } from '@/db';
import { clientes, marcas, pdvs, servicos } from '@/db/schema';
import { GESTAO, requireUser } from '@/lib/auth';
import { ClienteBtn, MarcaBtn, PdvBtn } from './clientes-client';

export const metadata: Metadata = { title: 'Clientes, Marcas & PDVs' };

export default async function ClientesPage({ searchParams }: PageProps<'/app/clientes'>) {
  await requireUser(GESTAO);
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
      <PageHead eyebrow="Cadastros" title="Clientes, Marcas & PDVs" desc="Dados comerciais e contratos. Não são visíveis para promotoras.">
        {tab === 'clientes' && <ClienteBtn />}
        {tab === 'marcas' && <MarcaBtn clientes={clientesOpt} />}
        {tab === 'pdvs' && <PdvBtn />}
      </PageHead>
      <div className="filters">
        <div className="tabs">
          <Link href="/app/clientes" className={tab === 'clientes' ? 'active' : ''}>Clientes ({cs.length})</Link>
          <Link href="/app/clientes?tab=marcas" className={tab === 'marcas' ? 'active' : ''}>Marcas & produtos ({ms.length})</Link>
          <Link href="/app/clientes?tab=pdvs" className={tab === 'pdvs' ? 'active' : ''}>PDVs / locais ({ps.length})</Link>
        </div>
      </div>

      <div className="table-wrap">
        {tab === 'clientes' && (
          <table className="table">
            <thead><tr><th>Cliente</th><th>NIF</th><th>Responsável</th><th>Contacto</th><th>Contratos</th><th>Serviços</th><th /></tr></thead>
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
            <thead><tr><th>Marca</th><th>Cliente</th><th>Produtos</th><th /></tr></thead>
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
            <thead><tr><th>PDV</th><th>Endereço</th><th>Zona</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {ps.map((p) => (
                <tr key={p.id} style={p.ativo ? undefined : { opacity: 0.5 }}>
                  <td className="strong">{p.nome}</td>
                  <td>{p.endereco}</td>
                  <td>{p.zona}</td>
                  <td>{p.ativo ? 'Ativo' : 'Inativo'}</td>
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
