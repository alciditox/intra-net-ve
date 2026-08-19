# =============================================================
#  Dockerfile — Portal Somos VEPAGOS (backend + frontend)
# =============================================================
#  Imagen multi-stage: 
#    1) Instala dependencias de Node.js
#    2) Copia el frontend estático
#    3) Ejecuta el servidor Express que sirve todo
# =============================================================

FROM node:20-alpine AS deps

WORKDIR /app/backend

# Copiar solo package files para cachear npm install
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Instalar tsx para producción (necesario para ejecutar TypeScript)
RUN npm install tsx

# =============================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Copiar dependencias instaladas
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copiar código del backend
COPY backend/package.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY backend/src/ ./backend/src/
COPY backend/seed/ ./backend/seed/
COPY backend/sql/ ./backend/sql/

# Copiar datos de seed (JSONs)
COPY datos/ ./datos/

# Copiar frontend estático
COPY portal/ ./portal/

# Variables de entorno por defecto
ENV NODE_ENV=production \
    PORT=3000 \
    DB_HOST=db \
    DB_PORT=3306 \
    DB_USER=root \
    DB_PASSWORD=vepagos2026 \
    DB_NAME=intranet_vepagos \
    JWT_SECRET=vepagos_intranet_secret_2026 \
    PORTAL_PATH=/app/portal

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Script de inicio: espera a MySQL, ejecuta seed, inicia servidor
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
