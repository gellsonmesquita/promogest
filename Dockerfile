# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# PromoGest · imagem de produção (Next.js standalone)
#   docker build -t promogest .
# Alvos:
#   runner (por defeito) – servidor da aplicação, imagem leve
#   tools               – migrações e seed (drizzle-kit, tsx)
# ---------------------------------------------------------------------------
# Debian slim (glibc): binários nativos do Next/Turbopack, Tailwind (lightningcss) e sharp sem surpresas de musl.
ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- dependências ----------
FROM base AS deps
COPY package.json package-lock.json ./
# --include=dev: o build precisa de TypeScript/Tailwind mesmo que NODE_ENV=production venha do ambiente (ex.: Coolify).
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev --no-audit --no-fund

# ---------- build ----------
FROM base AS builder
# Limita os workers do build para não esgotar a memória em servidores pequenos/partilhados.
ENV NEXT_BUILD_CPUS=2 \
    NODE_OPTIONS=--max-old-space-size=3072
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- ferramentas (migrações / seed) ----------
FROM base AS tools
COPY --from=deps /app/node_modules ./node_modules
COPY package.json drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src/db ./src/db
COPY src/lib/dates.ts ./src/lib/dates.ts
CMD ["node", "scripts/migrate.mjs"]

# ---------- runtime ----------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Sem curl/wget na imagem slim: usa o fetch do Node.
HEALTHCHECK --interval=30s --timeout=8s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
