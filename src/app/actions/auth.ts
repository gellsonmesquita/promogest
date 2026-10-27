'use server';

import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { auditoria, users } from '@/db/schema';
import { getT } from '@/i18n/server';
import { getCurrentUser, homeFor, PASSWORD_PAGE } from '@/lib/auth';
import { createSession, deleteSession } from '@/lib/session';

export type LoginState = { error?: string; login?: string } | undefined;

/** Login com e-mail (escritório) ou nº de funcionário (pessoal de campo). */
export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const t = await getT();
  const id = String(form.get('login') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!id || !password) return { error: t('login.errMissing'), login: id };

  const [u] = id.includes('@')
    ? await db.select().from(users).where(eq(sql`lower(${users.email})`, id.toLowerCase()))
    : await db.select().from(users).where(eq(users.numeroFuncionario, id));
  // Compara sempre (mesmo sem utilizador) para não revelar quais contas existem pelo tempo de resposta.
  const ok = await bcrypt.compare(password, u?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali');
  if (!u || !ok) return { error: t('login.errInvalid'), login: id };
  if (u.estado !== 'ativa') return { error: t('login.errInactive'), login: id };

  await createSession(u.id, u.role);
  await db.insert(auditoria).values({ userId: u.id, acao: 'ev.aLogin', entidade: 'ev.eSessao', detalhe: u.email ?? u.numeroFuncionario ?? '' });
  redirect(u.trocarPassword ? PASSWORD_PAGE : homeFor(u.role));
}

export async function logout(): Promise<void> {
  const u = await getCurrentUser();
  if (u) await db.insert(auditoria).values({ userId: u.id, acao: 'ev.aLogout', entidade: 'ev.eSessao', detalhe: u.email ?? u.numeroFuncionario ?? '' });
  await deleteSession();
  redirect('/login');
}

export type PasswordState = { error?: string } | undefined;

/** Define uma nova palavra-passe (obrigatório no 1.º acesso; também disponível a qualquer momento). */
export async function alterarPassword(_: PasswordState, form: FormData): Promise<PasswordState> {
  const t = await getT();
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  const atual = String(form.get('atual') ?? '');
  const nova = String(form.get('nova') ?? '');
  const confirmar = String(form.get('confirmar') ?? '');

  if (!(await bcrypt.compare(atual, u.passwordHash))) return { error: t('conta.atualErrada') };
  if (nova.length < 8) return { error: t('err.pwMin') };
  if (nova !== confirmar) return { error: t('conta.naoCoincidem') };
  if (nova === atual) return { error: t('conta.igual') };

  await db.update(users).set({ passwordHash: await bcrypt.hash(nova, 10), trocarPassword: false }).where(eq(users.id, u.id));
  await db.insert(auditoria).values({ userId: u.id, acao: 'ev.aPassword', entidade: 'ev.eUtilizador', detalhe: u.nome });
  redirect(homeFor(u.role));
}
