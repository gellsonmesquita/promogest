import { jwtVerify, SignJWT } from 'jose';
import type { Role } from '@/db/schema';

export const SESSION_COOKIE = 'pg_session';
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12h — um turno de trabalho

export type SessionPayload = { sub: string; role: Role };

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${SESSION_MAX_AGE}s`).sign(key());
}

export async function decrypt(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return { sub: String(payload.sub), role: payload.role as Role };
  } catch {
    return null;
  }
}
