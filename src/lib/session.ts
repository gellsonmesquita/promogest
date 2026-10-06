import 'server-only';
import { cookies } from 'next/headers';
import type { Role } from '@/db/schema';
import { encrypt, SESSION_COOKIE, SESSION_MAX_AGE } from './jwt';

export { decrypt, SESSION_COOKIE } from './jwt';

export async function createSession(userId: string, role: Role): Promise<void> {
  const token = await encrypt({ sub: userId, role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
