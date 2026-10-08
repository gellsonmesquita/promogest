// Aplica as migrações SQL de ./drizzle. Corre no arranque do contentor, antes do servidor.
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url || !/^postgres(ql)?:\/\//.test(url)) {
  // Mostra só o início do valor recebido (nunca a password) para ajudar a perceber o que está configurado.
  const recebido = url ? `começa por "${url.slice(0, 12)}…" (${url.length} caracteres)` : 'vazio';
  console.error(`[migrate] DATABASE_URL inválido: ${recebido}. Esperado postgres://user:pass@host:porta/bd.`);
  console.error('[migrate] No Coolify, defina PROMOGEST_DATABASE_URL em Environment Variables e faça Redeploy.');
  process.exit(1);
}
if (!process.env.SESSION_SECRET) {
  console.error('[migrate] SESSION_SECRET vazio. No Coolify, defina PROMOGEST_SESSION_SECRET e faça Redeploy.');
  process.exit(1);
}
try {
  const u = new URL(url);
  console.log(`[migrate] A ligar a ${u.hostname}:${u.port || 5432}${u.pathname}…`);
} catch {
  console.error('[migrate] DATABASE_URL não é um URL válido (caracteres especiais na password têm de ser codificados, ex.: @ → %40).');
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
