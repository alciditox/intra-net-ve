# =============================================================
#  Dockerfile — Portal Somos VEPAGOS (backend + frontend)
# =============================================================

# ─── Stage 1: Install dependencies ────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app/backend

# Copiar solo package files para cachear npm install
COPY backend/package.json backend/package-lock.json ./
RUN npm ci && npm cache clean --force

# ─── Stage 2: Build TypeScript ────────────────────────────
FROM deps AS builder

WORKDIR /app/backend

COPY backend/tsconfig.json ./
COPY backend/src/ ./src/
COPY backend/seed/ ./seed/

# Compilar TypeScript a JavaScript
RUN npx tsc --project tsconfig.json

# ─── Stage 3: Production runner ──────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copiar dependencias de producción
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev && npm cache clean --force

# Copiar código compilado
COPY --from=builder /app/backend/dist ./backend/dist

# Copiar seed compilado y esquema SQL
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/sql/ ./backend/sql/

# Copiar datos de seed (JSONs)
COPY datos/ ./datos/

# Copiar frontend estático
COPY portal/ ./portal/

# Solo defaults que NO son sensibles — lo demás viene del .env
ENV NODE_ENV=production \
    PORT=3000 \
    PORTAL_PATH=/app/portal

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Script de inicio: espera a MySQL, ejecuta seed, inicia servidor
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

