import type { Metadata } from 'next';
import { NotificacoesLista } from '@/components/notificacoes';
import { getT } from '@/i18n/server';
import { FIELD_ROLES, requireUser } from '@/lib/auth';
import { listNotificacoes } from '@/lib/queries';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('nav.avisos') };
}

export default async function AvisosPage() {
  const u = await requireUser(FIELD_ROLES);
  const items = await listNotificacoes(u);
  return (
    <div style={{ padding: 'calc(20px + env(safe-area-inset-top, 0px)) 16px 20px' }}>
      <NotificacoesLista items={items} />
    </div>
  );
}
