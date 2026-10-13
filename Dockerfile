# syntax=docker/dockerfile:1
ARG BUN_VERSION=1.4

FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app

# ── Dependencias de producción (capa cacheable) ──────────────────────────────
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ── Etapa opcional de verificación: docker build --target test . ─────────────
FROM base AS test
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run check

# ── Imagen final ─────────────────────────────────────────────────────────────
FROM base AS release
ENV NODE_ENV=production \
    PORT=3000 \
    DB_FILE_NAME=/app/data/sqlite.db

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY drizzle ./drizzle

# El usuario no-root "bun" debe poder escribir el archivo SQLite (y sus -wal/-shm).
RUN mkdir -p /app/data && chown -R bun:bun /app/data
USER bun

EXPOSE 3000
# La imagen slim no trae curl: el healthcheck usa el propio runtime de Bun.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["bun", "src/index.ts"]
