import type { Metadata } from 'next';
import { NotificacoesLista } from '@/components/notificacoes';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { listNotificacoes } from '@/lib/queries';

export const metadata: Metadata = { title: 'Notificações' };

export default async function NotificacoesPage() {
  const u = await requireUser(WEB_ROLES);
  const items = await listNotificacoes(u);
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <NotificacoesLista items={items.map((n) => ({ id: n.id, texto: n.texto, link: n.link, lida: n.lida, data: n.data.toISOString() }))} />
    </div>
  );
}
