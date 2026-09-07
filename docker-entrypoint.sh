#!/bin/sh
set -e

echo ""
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║      Portal Somos VEPAGOS — Iniciando...      ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo ""

# -------------------------------------------
# Esperar a que MySQL esté listo (sin interpolación insegura)
# -------------------------------------------
echo "⏳ Esperando a que MySQL ($DB_HOST:$DB_PORT) esté disponible..."

MAX_RETRIES=30
RETRY=0
until node -e "
  const net = require('net');
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306');
  const s = net.createConnection(port, host);
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
# Ejecutar seed SOLO si la BD no tiene datos
# -------------------------------------------
echo "🌱 Verificando si la base de datos necesita seed..."
cd /app/backend

NEEDS_SEED=$(node -e "
  const mysql = require('mysql2/promise');
  (async () => {
    try {
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER, password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'intranet_vepagos'
      });
      const [rows] = await conn.execute('SELECT COUNT(*) AS cnt FROM perfiles');
      await conn.end();
      process.stdout.write(rows[0].cnt > 0 ? 'no' : 'yes');
    } catch (e) {
      process.stdout.write('yes');
    }
  })();
" 2>/dev/null)

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "   Base de datos vacía, ejecutando seed..."
  node dist/seed/seed.js 2>/dev/null || npx tsx seed/seed.ts
  echo "   ✅ Seed completado."
else
  echo "   ✅ Base de datos ya tiene datos, saltando seed."
fi
echo ""

# -------------------------------------------
# Iniciar el servidor
# -------------------------------------------
echo "🚀 Iniciando servidor Express..."
exec node dist/src/index.js 2>/dev/null || exec npx tsx src/index.ts
