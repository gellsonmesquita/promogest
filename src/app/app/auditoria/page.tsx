import type { Metadata } from 'next';
import { PageHead } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDataHora } from '@/lib/dates';
import { getRefs, listAuditoria } from '@/lib/queries';

export const metadata: Metadata = { title: 'Auditoria' };

export default async function AuditoriaPage() {
  await requireUser(['admin']);
  const [refs, rows] = await Promise.all([getRefs(), listAuditoria(300)]);
  return (
    <div className="page">
      <PageHead eyebrow="Segurança" title="Registo de auditoria" desc="Ações importantes realizadas no sistema (últimas 300). Os dados históricos são arquivados, nunca apagados." />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Data/hora</th><th>Utilizador</th><th>Ação</th><th>Entidade</th><th>Detalhe</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{fmtDataHora(a.data, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="strong">{refs.nome(a.userId)}</td>
                <td>{a.acao}</td>
                <td><span className="chip">{a.entidade}</span></td>
                <td>{a.detalhe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
