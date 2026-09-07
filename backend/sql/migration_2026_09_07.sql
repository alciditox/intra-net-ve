-- =============================================================
-- MIGRACIÓN — Portal Somos VEPAGOS
-- Fecha: 2026-09-07
-- Descripción: Actualiza la BD de producción al schema actual.
-- SEGURO: Usa IF NOT EXISTS / IF EXISTS para ser idempotente.
-- =============================================================

USE intranet_vepagos;

-- ─────────────────────────────────────────────────────────────
-- 1. TABLA usuarios — columnas nuevas
-- ─────────────────────────────────────────────────────────────

-- 1.1 Tipo de sangre
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'intranet_vepagos' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'tipo_sangre');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE usuarios ADD COLUMN tipo_sangre VARCHAR(10) NULL AFTER cumple',
  'SELECT "tipo_sangre ya existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.2 Alergias
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'intranet_vepagos' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'alergias');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE usuarios ADD COLUMN alergias VARCHAR(255) NULL AFTER tipo_sangre',
  'SELECT "alergias ya existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.3 Condición médica
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'intranet_vepagos' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'condicion_medica');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE usuarios ADD COLUMN condicion_medica VARCHAR(255) NULL AFTER alergias',
  'SELECT "condicion_medica ya existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.4 Contacto de emergencia — nombre
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'intranet_vepagos' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'emerg_nombre');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE usuarios ADD COLUMN emerg_nombre VARCHAR(120) NULL AFTER condicion_medica',
  'SELECT "emerg_nombre ya existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.5 Contacto de emergencia — teléfono
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'intranet_vepagos' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'emerg_telefono');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE usuarios ADD COLUMN emerg_telefono VARCHAR(30) NULL AFTER emerg_nombre',
  'SELECT "emerg_telefono ya existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.6 updated_at
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'intranet_vepagos' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE usuarios ADD COLUMN updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER creado_en',
  'SELECT "updated_at ya existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────
-- 2. TABLA cultura_organizacional
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cultura_organizacional (
  id               INT PRIMARY KEY DEFAULT 1,
  proposito_titulo VARCHAR(255) NOT NULL DEFAULT '"Hacer crecer tu negocio."',
  proposito_desc   TEXT NOT NULL,
  mision           TEXT NOT NULL,
  vision           TEXT NOT NULL,
  valores          JSON NOT NULL,
  flywheel         JSON NOT NULL,
  perks            JSON NOT NULL,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 3. TABLA emergencias_info
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emergencias_info (
  id                   INT PRIMARY KEY DEFAULT 1,
  riesgo_telefono      VARCHAR(50) NOT NULL DEFAULT '911',
  riesgo_texto         VARCHAR(255) NOT NULL DEFAULT 'Llama de inmediato a los servicios de emergencia',
  pasos                JSON NOT NULL,
  aseguradora_empresa  VARCHAR(255) NOT NULL DEFAULT '',
  aseguradora_producto VARCHAR(255) NOT NULL DEFAULT '',
  aseguradora_poliza   VARCHAR(100) NOT NULL DEFAULT '',
  aseguradora_suma     VARCHAR(100) NOT NULL DEFAULT '',
  cobertura_items      JSON NOT NULL,
  no_cubre_items       JSON NOT NULL,
  contactos            JSON NOT NULL,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 4. TABLA categorias_documento (si no existe)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categorias_documento (
  id          VARCHAR(30)  PRIMARY KEY,
  nombre      VARCHAR(80)  NOT NULL,
  descripcion TEXT,
  es_personal TINYINT(1)   NOT NULL DEFAULT 0,
  orden       SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias_documento_perfiles (
  categoria_id VARCHAR(30) NOT NULL,
  perfil_key   VARCHAR(30) NOT NULL,
  PRIMARY KEY (categoria_id, perfil_key),
  FOREIGN KEY (categoria_id) REFERENCES categorias_documento(id) ON DELETE CASCADE,
  FOREIGN KEY (perfil_key) REFERENCES perfiles(`key`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 5. TABLA pasos_aprobacion (mesa de ayuda)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pasos_aprobacion (
  clave          VARCHAR(20)  PRIMARY KEY,
  titulo         VARCHAR(80)  NOT NULL,
  dinamico       TINYINT(1)   NOT NULL DEFAULT 0,
  responsable_id BIGINT       NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 6. TABLAS de Gestión de Solicitudes
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS solicitud_departamentos (
  id          VARCHAR(20)  PRIMARY KEY,
  nombre      VARCHAR(60)  NOT NULL,
  descripcion TEXT,
  color       CHAR(7)      NULL,
  flujo       JSON         NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitud_categorias (
  id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
  departamento_id VARCHAR(20)  NOT NULL,
  nombre          VARCHAR(80)  NOT NULL,
  orden           SMALLINT     NOT NULL DEFAULT 0,
  FOREIGN KEY (departamento_id) REFERENCES solicitud_departamentos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitud_tipos (
  id                BIGINT       AUTO_INCREMENT PRIMARY KEY,
  categoria_id      BIGINT       NOT NULL,
  nombre            VARCHAR(160) NOT NULL,
  flujo             JSON         NULL,
  pide_rango        TINYINT(1)   NOT NULL DEFAULT 0,
  genera_documento  TINYINT(1)   NOT NULL DEFAULT 0,
  perfil_prenda     VARCHAR(10)  NULL,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  FOREIGN KEY (categoria_id) REFERENCES solicitud_categorias(id),
  INDEX idx_tipos_cat (categoria_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 7. TABLAS de Inducciones (versión correcta)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inducciones_rutas (
  id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
  perfil_key  VARCHAR(30)  NOT NULL COMMENT 'Clave de perfil o _todos',
  titulo      VARCHAR(120) NOT NULL,
  modulos     JSON         NOT NULL COMMENT 'Array de módulos con lecciones y quiz',
  activa      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inducciones_progreso (
  id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
  usuario_id    BIGINT       NOT NULL,
  modulo_id     VARCHAR(60)  NOT NULL,
  aprobado      TINYINT(1)   NOT NULL DEFAULT 1,
  puntaje_pct   INT          DEFAULT 100,
  completado_el TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_mod (usuario_id, modulo_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 8. PANTALLAS nuevas (menú) — idempotente con INSERT IGNORE
-- ─────────────────────────────────────────────────────────────

-- Administración: Biblioteca, Cultura, Emergencias
INSERT IGNORE INTO pantallas (id, titulo, grupo, padre_id, icono, href_externo, orden) VALUES
  ('admindocs', 'Biblioteca', 'personal', 'adminmenu', NULL, NULL, 6),
  ('admincultura', 'Cultura organizacional', 'personal', 'adminmenu', NULL, NULL, 7),
  ('adminemergencias', 'Emergencias', 'personal', 'adminmenu', NULL, NULL, 8);

INSERT IGNORE INTO perfil_pantallas (perfil_key, pantalla_id) VALUES
  ('admin', 'admindocs'),
  ('admin', 'admincultura'),
  ('admin', 'adminemergencias');

-- Gestión de Solicitudes y submenús
INSERT IGNORE INTO pantallas (id, titulo, grupo, padre_id, icono, href_externo, orden) VALUES
  ('gestionsol', 'Gestión de solicitudes', 'gestion', NULL,
   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8M16 17H8M10 9H8"></path>',
   NULL, 7),
  ('sol_tec', 'Tecnología', 'gestion', 'gestionsol', NULL, NULL, 1),
  ('sol_th', 'Talento Humano', 'gestion', 'gestionsol', NULL, NULL, 2),
  ('sol_procura', 'Procura', 'gestion', 'gestionsol', NULL, NULL, 3),
  ('sol_servicios', 'Servicios Generales', 'gestion', 'gestionsol', NULL, NULL, 4),
  ('sol_nomina', 'Nómina', 'gestion', 'gestionsol', NULL, NULL, 5);

INSERT IGNORE INTO perfil_pantallas (perfil_key, pantalla_id) VALUES
  ('admin', 'gestionsol'),
  ('admin', 'sol_tec'),
  ('admin', 'sol_th'),
  ('admin', 'sol_procura'),
  ('admin', 'sol_servicios'),
  ('admin', 'sol_nomina'),
  ('rrhh', 'gestionsol'),
  ('rrhh', 'sol_th'),
  ('rrhh', 'sol_nomina');

-- ─────────────────────────────────────────────────────────────
-- 9. ÍNDICE en candidatos.email
-- ─────────────────────────────────────────────────────────────

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'intranet_vepagos' AND TABLE_NAME = 'candidatos' AND INDEX_NAME = 'idx_candidatos_email');
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_candidatos_email ON candidatos(email)',
  'SELECT "idx_candidatos_email ya existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────
-- 10. LIMPIEZA — eliminar tabla huérfana (si existe)
-- ─────────────────────────────────────────────────────────────

-- La tabla "inducciones" (vieja) fue reemplazada por "inducciones_rutas"
DROP TABLE IF EXISTS inducciones;

-- ─────────────────────────────────────────────────────────────
-- ¡LISTO! Verificación
-- ─────────────────────────────────────────────────────────────

SELECT '✅ Migración completada exitosamente' AS resultado;

-- Verificar columnas de usuarios:
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'intranet_vepagos' AND TABLE_NAME = 'usuarios'
ORDER BY ORDINAL_POSITION;
