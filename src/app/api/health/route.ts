import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

/**
 * Verificação de saúde (Docker/Coolify).
 * Por defeito é de "liveness": 200 enquanto a app responde (o estado da BD vai no corpo),
 * para uma falha momentânea da BD não tirar o contentor do proxy.
 * `?strict=1` devolve 503 se a BD não responder.
 */
export async function GET(req: Request) {
  const strict = new URL(req.url).searchParams.has('strict');
  const t0 = Date.now();
  let dbOk = true;
  try {
    await Promise.race([db.execute(sql`select 1`), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]);
  } catch {
    dbOk = false;
  }
  const body = { status: dbOk ? 'ok' : 'degraded', db: dbOk ? 'ok' : 'unreachable', ms: Date.now() - t0 };
  return Response.json(body, { status: strict && !dbOk ? 503 : 200 });
}
