# PromoGest · Noble Group Distribuição

Sistema de gestão operacional (supervisores, promotoras, merchandising, campanhas, escalas, presenças, evidências fotográficas e relatórios), segundo a *Especificação Funcional v3*.

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · Drizzle ORM · PostgreSQL · Tailwind 4 · sharp (fotos).

## Arranque

Requer Node 20.9+ (`nvm use 22`).

```bash
npm install
cp .env.example .env.local   # preencher DATABASE_URL e SESSION_SECRET
npm run db:migrate           # cria as tabelas
npm run db:seed              # dados de demonstração (só se a BD estiver vazia)
npm run dev                  # http://localhost:3000
```

| Script | O que faz |
|---|---|
| `npm run db:generate` | Gera uma nova migração a partir de `src/db/schema.ts` |
| `npm run db:migrate` | Aplica as migrações pendentes |
| `npm run db:seed -- --force` | **Apaga todos os dados** e volta a gerar a demonstração |
| `npm run db:studio` | Abre o Drizzle Studio para consultar a BD |

### Contas de demonstração

Todas com a palavra-passe `Noble@2026` (definida em `src/db/seed.ts`). **Só para testes**: em produção, trocar ou inativar.

admin@noblegroup.ao · marta.fernandes@ (gestora) · carlos.domingos@ / joana.bento@ / paulo.neto@ (supervisores) · ana.lopes@, beatriz.sousa@, celeste.mateus@, diana.kiala@, esperanca.joao@ (promotoras) · gaspar.manuel@, helder.tomas@ (merchandising). Todos com o domínio `@noblegroup.ao`.

## Deploy com Docker

Mesmo padrão já validado no Coolify (gcs-site): **um serviço**, `build: .`, `expose` (sem `ports`). A imagem usa o modo `standalone` do Next.js (Node 22 Debian slim). A base de dados é **externa** e não vai na imagem.

Ao arrancar, o contentor corre `scripts/migrate.mjs` (aplica as migrações pendentes em `drizzle/`) e só depois inicia o servidor. Se faltar `DATABASE_URL` ou `SESSION_SECRET`, ou a BD não responder, o contentor termina com uma mensagem clara nos logs.

| Ficheiro | Para quê |
|---|---|
| `Dockerfile` | Build multi-stage → imagem final com o servidor + migrações |
| `docker-compose.yml` | **Coolify** (Build Pack: Docker Compose) |
| `docker-compose.local.yml` | Complemento para outro servidor: publica a porta |
| `/api/health` | Estado da app e da BD (`?strict=1` → 503 se a BD falhar) |

### Coolify

1. Recurso com Build Pack **Docker Compose**, ficheiro `docker-compose.yml`.
2. **Environment Variables:**
   - `DATABASE_URL`: se o Postgres estiver no mesmo servidor Coolify, use o URL interno da BD (mais rápido e sem expor a porta).
   - `SESSION_SECRET`: string aleatória longa (`node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`).
3. No serviço **app**, definir o domínio com a porta 3000 (ex.: `https://promogest.exemplo.ao:3000`) e fazer **Deploy**.

Dados de demonstração (opcional, a partir da sua máquina, com `DATABASE_URL` da BD no `.env.local`): `npm run db:seed`.

### Outro servidor

```bash
cp .env.example .env          # preencher DATABASE_URL e SESSION_SECRET
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

## Estrutura

```
src/
  db/schema.ts          Modelo de dados (Drizzle): pessoas, equipas, clientes, serviços, escalas, relatórios, fotos, auditoria…
  db/seed.ts            Dados de demonstração
  proxy.ts              Redireciona sem sessão / perfil errado (verificação otimista)
  lib/auth.ts           Sessão (JWT em cookie httpOnly) + requireUser/assertUser por perfil
  lib/queries.ts        Consultas filtradas por perfil (escalaScope / servicoScope)
  lib/events.ts         Histórico, notificações e auditoria (na mesma transação)
  app/actions/          Server Actions: auth, campo (promotora), supervisao, cadastros
  app/api/fotos/[id]    Serve fotografias apenas a quem tem acesso à escala
  app/app/…             Painel web: admin, gestor, supervisor
  app/m/…               App de campo (mobile): promotora, merchandising
```

## Idiomas (i18n)

Português e inglês. O seletor PT/EN está na barra superior (web), no ecrã de login, no cabeçalho "Hoje" e no Perfil (mobile). A escolha fica num cookie (`pg_lang`); na primeira visita usa o idioma do browser (`Accept-Language`) e, se não for PT nem EN, usa português.

- `src/i18n/dictionaries/pt.ts`: dicionário de referência. `en.ts` tem de ter **as mesmas chaves** (o TypeScript dá erro se faltar alguma).
- Server Components e Server Actions: `const t = await getT()` · Client Components: `const t = useT()`.
- `t('secao.chave', { param })`: as chaves são tipadas e a interpolação usa `{param}`. Datas: `fmtDia(iso, t.intl)`.
- Histórico, notificações e auditoria são guardados na BD como **chave + `params`** (ex.: `ev.nRejeitado`, `{ motivo }`) e traduzidos ao mostrar, no idioma de quem lê. O que o utilizador escreve (motivos, observações, nomes) não é traduzido.
- Para acrescentar um idioma: criar `dictionaries/xx.ts`, registá-lo em `src/i18n/core.ts` (`LOCALES`, `DICTIONARIES`, `INTL_LOCALE`).

## Segurança e permissões

- A autorização é feita **no servidor** em cada página e ação: promotora vê só as suas escalas, supervisor só as que lhe estão atribuídas, gestão vê tudo.
- Clientes, contratos e auditoria não são acessíveis a promotoras nem supervisores.
- Palavras-passe com bcrypt; sessão em JWT HS256 (`SESSION_SECRET`), cookie `httpOnly`, 12 h.
- Nada é apagado fisicamente (pessoas, clientes e PDVs são inativados). Exceção: fotos de um relatório ainda em rascunho.
- Ações importantes ficam em `auditoria`.

## Fotografias

O telemóvel comprime a foto antes de a enviar. O servidor (sharp) corrige a orientação, reduz para 1600 px, converte para JPEG e remove os metadados. Por agora as fotos ficam no Postgres (`fotos.dados`, bytea).
**Para produção:** mover para object storage compatível com S3 (ex.: Garage) e guardar só a chave na tabela; a rota `/api/fotos/[id]` mantém-se.

## Próximos passos

- Armazenamento de fotos em S3/Garage.
- PWA (instalável, offline) ou app Capacitor para câmara e notificações push.
- GPS na confirmação de presença (depende da política de privacidade).
- Fase 2: financeiro, WhatsApp/SMS/e-mail, mapas, indicadores avançados.
