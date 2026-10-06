# PromoGest · imagem de produção (Next.js standalone)
# Mesmo padrão validado no Coolify (gcs-site): 1 serviço, build multi-stage, último stage = imagem final.
# No arranque aplica as migrações da BD e depois inicia o servidor.

# Stage 1: build
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_BUILD_CPUS=2
COPY package*.json ./
# --include=dev: o build precisa de TypeScript/Tailwind mesmo que NODE_ENV=production venha do ambiente
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
# O build não precisa de DATABASE_URL/SESSION_SECRET (a ligação à BD só é criada em runtime).
RUN npm run build

# Stage 2: run
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Servidor standalone + ficheiros estáticos
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Migrações (drizzle-orm e postgres não têm dependências próprias)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres

RUN chown -R node:node /app
USER node
EXPOSE 3000

CMD ["sh", "-c", "node scripts/migrate.mjs && exec node server.js"]
