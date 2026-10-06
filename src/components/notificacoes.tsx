'use client';

import { useRouter } from 'next/navigation';
import { marcarLida, marcarTodasLidas } from '@/app/actions/cadastros';
import { useT } from '@/i18n/client';
import { fmtDataHora } from '@/lib/dates';
import { useAction } from './toast';
import { Icon } from './ui';

type N = { id: string; texto: string; params: Record<string, string | number | null> | null; link: string | null; lida: boolean; data: Date };

export function NotificacoesLista({ items }: { items: N[] }) {
  const t = useT();
  const router = useRouter();
  const { pending, exec } = useAction();
  const naoLidas = items.filter((n) => !n.lida).length;
  return (
    <>
      <div className="page-head">
        <div><h1>{t('notif.title')}</h1></div>
        {naoLidas > 0 && <button className="btn sm" disabled={pending} onClick={() => exec(marcarTodasLidas)}>{t('notif.marcarTodas')}</button>}
      </div>
      <div className="card" style={{ padding: '4px 16px' }}>
        <div className="list">
          {items.length === 0 && <div className="empty">{t('notif.vazio')}</div>}
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
                <div>{t.dyn(n.texto, n.params)}</div>
                <div className="small muted" style={{ fontWeight: 400 }}>{fmtDataHora(n.data, t.intl)}</div>
              </div>
              {!n.lida && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--gold)' }} />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
