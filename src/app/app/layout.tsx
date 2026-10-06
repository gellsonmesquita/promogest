import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { Icon, LangSwitch } from '@/components/ui';
import { getT } from '@/i18n/server';
import { requireUser, WEB_ROLES } from '@/lib/auth';
import { iniciais } from '@/lib/labels';
import { contarNaoLidas, contarPendentes } from '@/lib/queries';
import { MenuButton, WebNav } from './web-nav';

export default async function WebLayout({ children }: LayoutProps<'/app'>) {
  const [u, t] = await Promise.all([requireUser(WEB_ROLES), getT()]);
  const [naoLidas, pendentes] = await Promise.all([contarNaoLidas(u), contarPendentes(u)]);

  return (
    <WebNav role={u.role} pendentes={pendentes}>
      <header className="topbar">
        <MenuButton />
        <div className="spacer" />
        <LangSwitch />
        <Link className="btn ghost bell" href="/app/notificacoes" aria-label={t('nav.notificacoes')}>
          <Icon name="bell" />
          {naoLidas > 0 && <span className="dot">{naoLidas}</span>}
        </Link>
        <div className="row" style={{ gap: 10, paddingLeft: 6 }}>
          <span className="avatar">{iniciais(u.nome)}</span>
          <div className="me-txt">
            <div className="strong">{u.nome}</div>
            <div className="small muted">{t(`roles.${u.role}`)}</div>
          </div>
        </div>
        <form action={logout}>
          <button className="btn ghost" title={t('nav.logout')} aria-label={t('nav.logout')}>
            <Icon name="logout" />
          </button>
        </form>
      </header>
      {children}
    </WebNav>
  );
}
