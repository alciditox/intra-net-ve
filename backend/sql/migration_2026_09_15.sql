-- migration_2026_09_15.sql
-- Fix: Asegurar que el perfil admin tenga TODAS las pantallas asignadas en perfil_pantallas
-- Idempotente: se puede ejecutar múltiples veces sin romper nada (usa INSERT IGNORE)

-- Agregar al admin todas las pantallas que le falten
INSERT IGNORE INTO perfil_pantallas (perfil_key, pantalla_id)
SELECT 'admin', id FROM pantallas
WHERE id NOT IN (
  SELECT pantalla_id FROM perfil_pantallas WHERE perfil_key = 'admin'
);
