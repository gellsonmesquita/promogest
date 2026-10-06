'use client';

import { useRouter } from 'next/navigation';
import { marcarLida, marcarTodasLidas } from '@/app/actions/cadastros';
import { useAction } from './toast';
import { Icon } from './ui';
import { fmtDataHora } from '@/lib/dates';

type N = { id: string; texto: string; link: string | null; lida: boolean; data: string };

export function NotificacoesLista({ items }: { items: N[] }) {
  const router = useRouter();
  const { pending, exec } = useAction();
  const naoLidas = items.filter((n) => !n.lida).length;
  return (
    <>
      <div className="page-head">
        <div><h1>Notificações</h1></div>
        {naoLidas > 0 && <button className="btn sm" disabled={pending} onClick={() => exec(marcarTodasLidas)}>Marcar todas como lidas</button>}
      </div>
      <div className="card" style={{ padding: '4px 16px' }}>
        <div className="list">
          {items.length === 0 && <div className="empty">Sem notificações.</div>}
          {items.map((n) => (
            <button
              key={n.id}
              className="item"
              style={{ width: '100%', border: 0, background: 'none', font: 'inherit', cursor: 'pointer', textAlign: 'left', color: n.lida ? 'var(--muted)' : 'var(--ink)', fontWeight: n.lida ? 400 : 600 }}
              onClick={() => {
                if (!n.lida) void marcarLida(n.id);
                if (n.link) router.push(n.link);
              }}
            >
              <Icon name="bell" size={18} style={{ color: 'var(--gold)' }} />
              <div style={{ flex: 1 }}>
                <div>{n.texto}</div>
                <div className="small muted" style={{ fontWeight: 400 }}>{fmtDataHora(n.data)}</div>
              </div>
              {!n.lida && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--gold)' }} />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
