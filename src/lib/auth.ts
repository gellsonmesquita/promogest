import 'server-only';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/db';
import { users, type Role, type User } from '@/db/schema';
import { fail } from './action';
import { decrypt, SESSION_COOKIE } from './session';

export const WEB_ROLES: Role[] = ['admin', 'gestor', 'supervisor'];
export const FIELD_ROLES: Role[] = ['promotora', 'merchandiser'];
export const GESTAO: Role[] = ['admin', 'gestor'];

export const isField = (r: Role) => FIELD_ROLES.includes(r);
export const homeFor = (r: Role) => (isField(r) ? '/m/hoje' : '/app/dashboard');

/** Utilizador da sessão atual (validado na BD a cada pedido). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await decrypt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [u] = await db.select().from(users).where(eq(users.id, session.sub));
  if (!u || u.estado !== 'ativa') return null;
  return u;
});

/** Exige sessão e (opcionalmente) um dos perfis indicados. */
export async function requireUser(roles?: Role[]): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  if (roles && !roles.includes(u.role)) redirect(homeFor(u.role));
  return u;
}

/** Versão para Server Actions: lança erro em vez de redirecionar. */
export async function assertUser(roles?: Role[]): Promise<User> {
  const u = await getCurrentUser();
  if (!u) fail('err.sessao');
  if (roles && !roles.includes(u.role)) fail('err.permissao');
  return u;
}
