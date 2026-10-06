import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { escalas, fotos, relatorios } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { escalaScope } from '@/lib/queries';

/** Serve uma evidência fotográfica apenas a quem tem acesso à escala correspondente. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const u = await getCurrentUser();
  if (!u) return new Response('Não autenticado', { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Não encontrado', { status: 404 });

  const [row] = await db
    .select({ mime: fotos.mime, dados: fotos.dados })
    .from(fotos)
    .innerJoin(relatorios, eq(relatorios.id, fotos.relatorioId))
    .innerJoin(escalas, eq(escalas.id, relatorios.escalaId))
    .where(and(eq(fotos.id, id), escalaScope(u)));
  if (!row) return new Response('Não encontrado', { status: 404 });

  return new Response(new Uint8Array(row.dados), {
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': 'private, max-age=86400, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
