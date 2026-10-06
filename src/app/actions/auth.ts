'use server';

import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { auditoria, users } from '@/db/schema';
import { getT } from '@/i18n/server';
import { getCurrentUser, homeFor } from '@/lib/auth';
import { createSession, deleteSession } from '@/lib/session';

export type LoginState = { error?: string; email?: string } | undefined;

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const t = await getT();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: t('login.errMissing'), email };

  const [u] = await db.select().from(users).where(eq(sql`lower(${users.email})`, email));
  // Compara sempre (mesmo sem utilizador) para não revelar quais e-mails existem pelo tempo de resposta.
  const ok = await bcrypt.compare(password, u?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali');
  if (!u || !ok) return { error: t('login.errInvalid'), email };
  if (u.estado !== 'ativa') return { error: t('login.errInactive'), email };

  await createSession(u.id, u.role);
  await db.insert(auditoria).values({ userId: u.id, acao: 'ev.aLogin', entidade: 'ev.eSessao', detalhe: u.email });
  redirect(homeFor(u.role));
}

export async function logout(): Promise<void> {
  const u = await getCurrentUser();
  if (u) await db.insert(auditoria).values({ userId: u.id, acao: 'ev.aLogout', entidade: 'ev.eSessao', detalhe: u.email });
  await deleteSession();
  redirect('/login');
}
