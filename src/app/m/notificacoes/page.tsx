import type { Metadata } from 'next';
import { NotificacoesLista } from '@/components/notificacoes';
import { FIELD_ROLES, requireUser } from '@/lib/auth';
import { listNotificacoes } from '@/lib/queries';

export const metadata: Metadata = { title: 'Avisos' };

export default async function AvisosPage() {
  const u = await requireUser(FIELD_ROLES);
  const items = await listNotificacoes(u);
  return (
    <div style={{ padding: 'calc(20px + env(safe-area-inset-top, 0px)) 16px 20px' }}>
      <NotificacoesLista items={items.map((n) => ({ id: n.id, texto: n.texto, link: n.link, lida: n.lida, data: n.data.toISOString() }))} />
    </div>
  );
}
