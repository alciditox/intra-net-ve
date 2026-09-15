-- migration_2026_09_15.sql
-- Fix: Eliminar bypasses hardcodeados del admin — todo gestionado por la BD
-- Idempotente: se puede ejecutar múltiples veces sin romper nada (usa INSERT IGNORE)

-- 1. Asegurar que admin tenga TODAS las pantallas asignadas
INSERT IGNORE INTO perfil_pantallas (perfil_key, pantalla_id)
SELECT 'admin', id FROM pantallas
WHERE id NOT IN (
  SELECT pantalla_id FROM perfil_pantallas WHERE perfil_key = 'admin'
);

-- 2. Asegurar que admin tenga TODOS los permisos del catálogo asignados
INSERT IGNORE INTO permisos_perfil (perfil_key, clave)
SELECT 'admin', clave FROM permisos_catalogo
WHERE clave NOT IN (
  SELECT clave FROM permisos_perfil WHERE perfil_key = 'admin'
);
