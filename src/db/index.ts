import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// Reutiliza a ligação entre hot-reloads em desenvolvimento.
// connect_timeout: falha rápido (em vez de deixar o pedido pendurado) se a BD não responder.
const client = globalForDb.pg ?? postgres(process.env.DATABASE_URL!, { max: 10, connect_timeout: 10, idle_timeout: 30 });
if (process.env.NODE_ENV !== 'production') globalForDb.pg = client;

export const db = drizzle(client, { schema });
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
