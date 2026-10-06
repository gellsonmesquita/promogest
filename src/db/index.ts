import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url)) {
    throw new Error('DATABASE_URL em falta ou inválido (esperado postgres://user:pass@host:porta/bd).');
  }
  // connect_timeout: falha rápido (em vez de deixar o pedido pendurado) se a BD não responder.
  return drizzle(postgres(url, { max: 10, connect_timeout: 10, idle_timeout: 30 }), { schema });
}
type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { promogestDb?: Db };

/** Liga à BD só no primeiro uso: o `next build` não precisa de DATABASE_URL. Reutilizada entre hot-reloads. */
function getDb(): Db {
  return (globalForDb.promogestDb ??= createDb());
}

export const db = new Proxy({} as Db, {
  get(_, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
