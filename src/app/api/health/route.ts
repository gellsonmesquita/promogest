import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

/** Verificação de saúde para Docker / balanceadores: 200 se a app e a BD respondem. */
export async function GET() {
  const t0 = Date.now();
  try {
    await Promise.race([db.execute(sql`select 1`), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]);
    return Response.json({ status: 'ok', db: 'ok', ms: Date.now() - t0 });
  } catch {
    return Response.json({ status: 'degraded', db: 'unreachable', ms: Date.now() - t0 }, { status: 503 });
  }
}
