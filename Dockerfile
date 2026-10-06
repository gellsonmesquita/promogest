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
# DIAGNÓSTICO TEMPORÁRIO: se o build falhar, a imagem é criada na mesma e o contentor imprime o log do build
# (separador "Logs" do Coolify) em vez do servidor. Remover quando o deploy estiver estável.
RUN node --version && npm --version && (npm run build > /tmp/build.log 2>&1; status=$?; cat /tmp/build.log; \
    if [ $status -ne 0 ]; then \
      mkdir -p .next/standalone .next/static && cp /tmp/build.log .next/standalone/BUILD_FAILED.log && \
      echo "console.error('==== NEXT BUILD FALHOU ===='); console.error(require('fs').readFileSync(__dirname + '/BUILD_FAILED.log', 'utf8')); setTimeout(() => process.exit(1), 60000);" > .next/standalone/server.js; \
    fi)

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

# (diagnóstico) se o build falhou, mostra logo o log; caso contrário migrações + servidor
CMD ["sh", "-c", "if [ -f BUILD_FAILED.log ]; then exec node server.js; fi; node scripts/migrate.mjs && exec node server.js"]
