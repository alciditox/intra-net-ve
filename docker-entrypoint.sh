#!/bin/sh
set -e

echo ""
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║      Portal Somos VEPAGOS — Iniciando...      ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo ""

# -------------------------------------------
# Esperar a que MySQL esté listo
# -------------------------------------------
echo "⏳ Esperando a que MySQL ($DB_HOST:$DB_PORT) esté disponible..."

MAX_RETRIES=30
RETRY=0
until node -e "
  const net = require('net');
  const s = net.createConnection(${DB_PORT}, '${DB_HOST}');
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error', () => process.exit(1));
" 2>/dev/null; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "❌ MySQL no respondió después de $MAX_RETRIES intentos. Abortando."
    exit 1
  fi
  echo "   Intento $RETRY/$MAX_RETRIES — reintentando en 2s..."
  sleep 2
done

echo "✅ MySQL disponible."
echo ""

# -------------------------------------------
# Ejecutar seed (crea BD + pobla datos)
# -------------------------------------------
echo "🌱 Ejecutando seed de base de datos..."
cd /app/backend
npx tsx seed/seed.ts
echo ""

# -------------------------------------------
# Iniciar el servidor
# -------------------------------------------
echo "🚀 Iniciando servidor Express..."
exec npx tsx src/index.ts
