import { FIELD_ROLES, requireUser } from '@/lib/auth';
import { contarNaoLidas } from '@/lib/queries';
import { TabBar } from './tabbar';

/** App de campo (promotora/merchandising): pensada para uso com uma mão. */
export default async function MobileLayout({ children }: LayoutProps<'/m'>) {
  const u = await requireUser(FIELD_ROLES);
  const naoLidas = await contarNaoLidas(u);
  return (
    <div className="phone-bg">
      <div className="phone">{children}</div>
      <TabBar naoLidas={naoLidas} />
    </div>
  );
}
