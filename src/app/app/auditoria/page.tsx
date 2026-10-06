import type { Metadata } from 'next';
import { PageHead } from '@/components/ui';
import { getT } from '@/i18n/server';
import { requireUser } from '@/lib/auth';
import { DH_LONGO, fmtDataHora } from '@/lib/dates';
import { getRefs, listAuditoria } from '@/lib/queries';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('nav.auditoria') };
}

export default async function AuditoriaPage() {
  const [, t] = await Promise.all([requireUser(['admin']), getT()]);
  const [refs, rows] = await Promise.all([getRefs(), listAuditoria(300)]);
  return (
    <div className="page">
      <PageHead eyebrow={t('audit.eyebrow')} title={t('audit.title')} desc={t('audit.desc')} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>{t('audit.thData')}</th><th>{t('audit.thUser')}</th><th>{t('audit.thAcao')}</th><th>{t('audit.thEntidade')}</th><th>{t('audit.thDetalhe')}</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{fmtDataHora(a.data, t.intl, DH_LONGO)}</td>
                <td className="strong">{refs.nome(a.userId)}</td>
                <td>{t.dyn(a.acao, a.params)}</td>
                <td><span className="chip">{t.dyn(a.entidade)}</span></td>
                <td>{t.dyn(a.detalhe, a.params)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
