import type { Metadata } from 'next';
import { NotificacoesLista } from '@/components/notificacoes';
import { getT } from '@/i18n/server';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { listNotificacoes } from '@/lib/queries';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('notif.title') };
}

export default async function NotificacoesPage() {
  const u = await requireUser(WEB_ROLES);
  const items = await listNotificacoes(u);
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <NotificacoesLista items={items} />
    </div>
  );
}
