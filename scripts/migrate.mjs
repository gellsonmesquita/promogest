// Aplica as migrações SQL de ./drizzle (serviço "migrate" do docker compose).
// Com SEED_DEMO=true carrega também os dados de demonstração, mas só se a BD estiver vazia.
import { spawnSync } from 'node:child_process';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não definido.');
  process.exit(1);
}

const client = postgres(url, { max: 1, connect_timeout: 10, onnotice: () => {} });
for (let i = 1; ; i++) {
  try {
    await client`select 1`;
    break;
  } catch (e) {
    if (i >= 15) {
      console.error('Base de dados indisponível:', e.message);
      process.exit(1);
    }
    console.log(`A aguardar pela base de dados (${i}/15)…`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

await migrate(drizzle(client), { migrationsFolder: './drizzle' });
console.log('Migrações aplicadas.');
await client.end();

if (process.env.SEED_DEMO === 'true') {
  // O seed recusa-se a correr se já existirem utilizadores (sem --force não apaga nada).
  const r = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/db/seed.ts'], { stdio: 'inherit' });
  if (r.error) console.error(r.error);
  process.exit(r.status ?? 1);
}
