import { and, eq, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import { logout } from '@/app/actions/auth';
import { Icon, LangSwitch } from '@/components/ui';
import { db } from '@/db';
import { escalas, relatorios } from '@/db/schema';
import { getT } from '@/i18n/server';
import { FIELD_ROLES, requireUser } from '@/lib/auth';
import { iniciais } from '@/lib/labels';
import { getRefs } from '@/lib/queries';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('nav.perfil') };
}

export default async function PerfilPage() {
  const [u, t] = await Promise.all([requireUser(FIELD_ROLES), getT()]);
  const [refs, [ex], [ap]] = await Promise.all([
    getRefs(),
    db.select({ n: sql<number>`count(*)::int` }).from(escalas).where(and(eq(escalas.promotoraId, u.id), eq(escalas.estado, 'executada'))),
    db.select({ n: sql<number>`count(*)::int` }).from(relatorios).where(and(eq(relatorios.autorId, u.id), eq(relatorios.estado, 'aprovado'))),
  ]);
  const equipa = u.equipaId ? refs.equipas.get(u.equipaId) : undefined;

  return (
    <div className="m-body" style={{ paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', padding: 26 }}>
        <span className="avatar" style={{ width: 72, height: 72, fontSize: 24 }}>{iniciais(u.nome)}</span>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>{u.nome}</h2>
        <div className="muted">{t(`roles.${u.role}`)} · {equipa?.nome ?? '—'}</div>
      </div>
      <div className="card">
        <div className="list">
          {[
            [t('m.email'), u.email],
            [t('m.telefone'), u.telefone],
            [t('m.zona'), u.zona],
            [t('m.supervisor'), refs.nome(equipa?.supervisorId)],
          ].map(([k, v]) => (
            <div className="item" key={k}>
              <span className="muted" style={{ width: 110 }}>{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div className="item">
            <span className="muted" style={{ width: 110 }}>{t('lang.label')}</span>
            <LangSwitch />
          </div>
        </div>
      </div>
      <div className="grid-auto" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="kpi"><div className="kpi-label">{t('m.executadas')}</div><div className="kpi-value">{ex.n}</div></div>
        <div className="kpi"><div className="kpi-label">{t('m.aprovados')}</div><div className="kpi-value">{ap.n}</div></div>
      </div>
      <form action={logout}>
        <button className="btn danger lg block"><Icon name="logout" /> {t('nav.logout')}</button>
      </form>
    </div>
  );
}
