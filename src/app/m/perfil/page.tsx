import { and, eq, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import { logout } from '@/app/actions/auth';
import { Icon } from '@/components/ui';
import { db } from '@/db';
import { escalas, relatorios } from '@/db/schema';
import { FIELD_ROLES, requireUser } from '@/lib/auth';
import { iniciais, ROLE_LABEL } from '@/lib/labels';
import { getRefs } from '@/lib/queries';

export const metadata: Metadata = { title: 'Perfil' };

export default async function PerfilPage() {
  const u = await requireUser(FIELD_ROLES);
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
        <div className="muted">{ROLE_LABEL[u.role]} · {equipa?.nome ?? '—'}</div>
      </div>
      <div className="card">
        <div className="list">
          {[
            ['E-mail', u.email],
            ['Telefone', u.telefone],
            ['Zona', u.zona],
            ['Supervisor', refs.nome(equipa?.supervisorId)],
          ].map(([k, v]) => (
            <div className="item" key={k}>
              <span className="muted" style={{ width: 110 }}>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid-auto" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="kpi"><div className="kpi-label">Atividades executadas</div><div className="kpi-value">{ex.n}</div></div>
        <div className="kpi"><div className="kpi-label">Relatórios aprovados</div><div className="kpi-value">{ap.n}</div></div>
      </div>
      <form action={logout}>
        <button className="btn danger lg block"><Icon name="logout" /> Terminar sessão</button>
      </form>
    </div>
  );
}
