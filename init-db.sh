#!/bin/bash
# =============================================================
#  init-db.sh — Ejecuta schema.sql y el seed en MySQL
# =============================================================
#  Lee las credenciales desde .env (mismo directorio raíz)
#  Uso:
#    chmod +x init-db.sh
#    ./init-db.sh
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Cargar .env ───────────────────────────────────────────
ENV_FILE="$SCRIPT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ No se encontró .env en $SCRIPT_DIR"
  echo "   Copia .env.example → .env y configura tus credenciales:"
  echo "   cp .env.example .env"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | grep -v '^\s*$' | xargs)

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-intranet_vepagos}"

echo ""
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║   Inicialización de BD — Somos VEPAGOS        ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo ""
echo "  Host:     $DB_HOST:$DB_PORT"
echo "  Usuario:  $DB_USER"
echo "  Base:     $DB_NAME"
echo ""

# ─── Construir comando mysql ──────────────────────────────
MYSQL_CMD="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER"
if [ -n "$DB_PASSWORD" ]; then
  MYSQL_CMD="$MYSQL_CMD -p$DB_PASSWORD"
fi

# ─── 1. Ejecutar schema.sql ───────────────────────────────
SCHEMA_FILE="$SCRIPT_DIR/backend/sql/schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
  echo "❌ No se encontró $SCHEMA_FILE"
  exit 1
fi

echo "📋 Ejecutando schema.sql..."
$MYSQL_CMD < "$SCHEMA_FILE"
echo "   ✅ Esquema creado"
echo ""

# ─── 2. Ejecutar seed (TypeScript) ────────────────────────
echo "🌱 Ejecutando seed (carga datos iniciales)..."
cd "$SCRIPT_DIR/backend"

if command -v npx &> /dev/null; then
  npx tsx seed/seed.ts
  echo "   ✅ Seed completado"
else
  echo "   ⚠️  npx no encontrado. Instala Node.js 20+ y ejecuta:"
  echo "      cd backend && npm install && npm run seed"
fi

echo ""
echo "  ✅ Base de datos lista."
echo "  📊 phpMyAdmin: http://$DB_HOST:8080/phpmyadmin"
echo ""
