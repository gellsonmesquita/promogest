import { NextResponse, type NextRequest } from 'next/server';
import { decrypt, SESSION_COOKIE } from '@/lib/jwt';

const FIELD = new Set(['promotora', 'merchandiser']);

/** Verificação otimista: sem sessão → login; perfil errado → área correta. A autorização real é feita no servidor (lib/auth). */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value);
  const home = session ? (FIELD.has(session.role) ? '/m/hoje' : '/app/dashboard') : '/login';

  if (pathname === '/login') {
    return session ? NextResponse.redirect(new URL(home, req.url)) : NextResponse.next();
  }
  if (!session) return NextResponse.redirect(new URL('/login', req.url));
  if (pathname === '/') return NextResponse.redirect(new URL(home, req.url));
  if (pathname.startsWith('/app') && FIELD.has(session.role)) return NextResponse.redirect(new URL(home, req.url));
  if (pathname.startsWith('/m') && !FIELD.has(session.role)) return NextResponse.redirect(new URL(home, req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/app/:path*', '/m/:path*'],
};
