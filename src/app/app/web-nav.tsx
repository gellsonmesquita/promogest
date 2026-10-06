'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useState } from 'react';
import { Icon } from '@/components/ui';
import type { Role } from '@/db/schema';
import type { TKey } from '@/i18n/core';
import { useT } from '@/i18n/client';

const NAV: { href: string; label: TKey; icon: string; roles: Role[] }[] = [
  { href: '/app/dashboard', label: 'nav.dashboard', icon: 'dashboard', roles: ['admin', 'gestor', 'supervisor'] },
  { href: '/app/escalas', label: 'nav.escalas', icon: 'calendar', roles: ['admin', 'gestor', 'supervisor'] },
  { href: '/app/relatorios', label: 'nav.relatorios', icon: 'report', roles: ['admin', 'gestor', 'supervisor'] },
  { href: '/app/servicos', label: 'nav.servicos', icon: 'campaign', roles: ['admin', 'gestor', 'supervisor'] },
  { href: '/app/merchandising', label: 'nav.merchandising', icon: 'merch', roles: ['admin', 'gestor', 'supervisor'] },
  { href: '/app/equipas', label: 'nav.equipas', icon: 'team', roles: ['admin', 'gestor', 'supervisor'] },
  { href: '/app/clientes', label: 'nav.clientes', icon: 'client', roles: ['admin', 'gestor'] },
  { href: '/app/auditoria', label: 'nav.auditoria', icon: 'audit', roles: ['admin'] },
];

const MenuCtx = createContext<() => void>(() => {});

export function WebNav({ role, pendentes, children }: { role: Role; pendentes: number; children: React.ReactNode }) {
  const t = useT();
  const path = usePathname();
  // O menu móvel fica aberto só na página onde foi aberto; navegar fecha-o.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;

  return (
    <MenuCtx.Provider value={() => setOpenAt(path)}>
      <div className={`shell${open ? ' open' : ''}`}>
        <aside className="side">
          <div className="side-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="" />
            <div>
              <div className="strong">PromoGest</div>
              <div className="small" style={{ color: '#a89a7f' }}>{t('nav.brandSub')}</div>
            </div>
          </div>
          <nav>
            {NAV.filter((n) => n.roles.includes(role)).map((n) => (
              <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? 'active' : ''}>
                <Icon name={n.icon} size={19} />
                <span>{t(n.label)}</span>
                {n.href === '/app/relatorios' && pendentes > 0 && <span className="side-count">{pendentes}</span>}
              </Link>
            ))}
          </nav>
          <div className="side-foot small">{t('nav.footer')}</div>
        </aside>
        <div className="scrim" onClick={() => setOpenAt(null)} />
        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
    </MenuCtx.Provider>
  );
}

export function MenuButton() {
  const open = useContext(MenuCtx);
  const t = useT();
  return (
    <button className="btn ghost menu-btn" onClick={open} aria-label={t('nav.openMenu')}>
      <Icon name="menu" />
    </button>
  );
}
