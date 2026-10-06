// Aplica as migrações SQL de ./drizzle. Corre no arranque do contentor, antes do servidor.
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url || !/^postgres(ql)?:\/\//.test(url)) {
  console.error('[migrate] DATABASE_URL em falta ou inválido (esperado postgres://user:pass@host:porta/bd).');
  process.exit(1);
}
if (!process.env.SESSION_SECRET) {
  console.error('[migrate] SESSION_SECRET não definido.');
  process.exit(1);
}

const client = postgres(url, { max: 1, connect_timeout: 10, onnotice: () => {} });
for (let i = 1; ; i++) {
  try {
    await client`select 1`;
    break;
  } catch (e) {
    if (i >= 15) {
      console.error('[migrate] Base de dados indisponível:', e.message);
      process.exit(1);
    }
    console.log(`[migrate] A aguardar pela base de dados (${i}/15)…`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

await migrate(drizzle(client), { migrationsFolder: './drizzle' });
console.log('[migrate] Migrações aplicadas.');
await client.end();
