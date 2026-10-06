'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui';
import type { TKey } from '@/i18n/core';
import { useT } from '@/i18n/client';

const TABS: { href: string; label: TKey; icon: string; match: string[] }[] = [
  { href: '/m/hoje', label: 'nav.hoje', icon: 'home', match: ['/m/hoje', '/m/atividade'] },
  { href: '/m/relatorios', label: 'nav.relatorios', icon: 'report', match: ['/m/relatorios'] },
  { href: '/m/notificacoes', label: 'nav.avisos', icon: 'bell', match: ['/m/notificacoes'] },
  { href: '/m/perfil', label: 'nav.perfil', icon: 'user', match: ['/m/perfil'] },
];

export function TabBar({ naoLidas }: { naoLidas: number }) {
  const path = usePathname();
  const t = useT();
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} className={tab.match.some((m) => path.startsWith(m)) ? 'active' : ''}>
          <Icon name={tab.icon} size={24} />
          <span>{t(tab.label)}</span>
          {tab.icon === 'bell' && naoLidas > 0 && <b>{naoLidas}</b>}
        </Link>
      ))}
    </nav>
  );
}
