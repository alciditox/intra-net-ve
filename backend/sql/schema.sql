-- ============================================================
-- Portal Somos VEPAGOS · esquema MySQL
-- Adaptado del esquema PostgreSQL original.
-- Ejecutar en MySQL/MariaDB (phpMyAdmin localhost:8080)
-- Base de datos: intranet_vepagos
-- ============================================================

CREATE DATABASE IF NOT EXISTS intranet_vepagos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE intranet_vepagos;

-- ---------- Perfiles y permisos ----------

CREATE TABLE IF NOT EXISTS perfiles (
  `key`       VARCHAR(30)  PRIMARY KEY,
  label       VARCHAR(60)  NOT NULL,
  base_key    VARCHAR(30)  NULL,
  descripcion TEXT,
  sistema     TINYINT(1)   NOT NULL DEFAULT 1,
  orden       SMALLINT     NOT NULL DEFAULT 0,
  FOREIGN KEY (base_key) REFERENCES perfiles(`key`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permisos_catalogo (
  clave       VARCHAR(40)  PRIMARY KEY,
  grupo       VARCHAR(40)  NOT NULL,
  label       VARCHAR(80)  NOT NULL,
  descripcion TEXT         NOT NULL,
  nav         VARCHAR(30)  NULL COMMENT 'pantalla que habilita este permiso'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permisos_perfil (
  perfil_key  VARCHAR(30)  NOT NULL,
  clave       VARCHAR(40)  NOT NULL,
  PRIMARY KEY (perfil_key, clave),
  FOREIGN KEY (perfil_key) REFERENCES perfiles(`key`) ON DELETE CASCADE,
  FOREIGN KEY (clave) REFERENCES permisos_catalogo(clave) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Pantallas (menú) ----------

CREATE TABLE IF NOT EXISTS pantallas (
  id           VARCHAR(30)  PRIMARY KEY,
  titulo       VARCHAR(60)  NOT NULL,
  grupo        VARCHAR(10)  NOT NULL COMMENT 'personal|gestion|config',
  padre_id     VARCHAR(30)  NULL,
  icono        TEXT         NULL COMMENT 'SVG path del icono',
  href_externo VARCHAR(300) NULL,
  orden        SMALLINT     NOT NULL DEFAULT 0,
  FOREIGN KEY (padre_id) REFERENCES pantallas(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS perfil_pantallas (
  perfil_key   VARCHAR(30)  NOT NULL,
  pantalla_id  VARCHAR(30)  NOT NULL,
  PRIMARY KEY (perfil_key, pantalla_id),
  FOREIGN KEY (perfil_key) REFERENCES perfiles(`key`) ON DELETE CASCADE,
  FOREIGN KEY (pantalla_id) REFERENCES pantallas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Personas ----------

CREATE TABLE IF NOT EXISTS usuarios (
  id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(120) NOT NULL,
  cargo           VARCHAR(120) NOT NULL DEFAULT '',
  area            VARCHAR(60)  NOT NULL DEFAULT '',
  perfil_key      VARCHAR(30)  NOT NULL,
  supervisor_id   BIGINT       NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  cedula          VARCHAR(15)  NULL,
  password_hash   VARCHAR(255) NOT NULL,
  telefono        VARCHAR(30)  NULL,
  linkedin        VARCHAR(200) NULL,
  ciudad          VARCHAR(60)  NULL,
  cumple          CHAR(5)      NULL COMMENT 'MM-DD',
  es_ancla_equipo TINYINT(1)   NOT NULL DEFAULT 0,
  nombre_equipo   VARCHAR(80)  NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (perfil_key) REFERENCES perfiles(`key`),
  FOREIGN KEY (supervisor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_usuarios_supervisor (supervisor_id),
  INDEX idx_usuarios_perfil (perfil_key),
  INDEX idx_usuarios_activo (activo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permisos_usuario (
  usuario_id    BIGINT       NOT NULL,
  clave         VARCHAR(40)  NOT NULL,
  concedido_por BIGINT       NULL,
  concedido_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, clave),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (clave) REFERENCES permisos_catalogo(clave) ON DELETE CASCADE,
  FOREIGN KEY (concedido_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- Categorías de documento (biblioteca) ----------

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

-- ---------- Mesa de ayuda ----------

CREATE TABLE IF NOT EXISTS pasos_aprobacion (
  clave          VARCHAR(20)  PRIMARY KEY,
  titulo         VARCHAR(80)  NOT NULL,
  dinamico       TINYINT(1)   NOT NULL DEFAULT 0,
  responsable_id BIGINT       NULL
) ENGINE=InnoDB;

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

-- ---------- Inducciones ----------

CREATE TABLE IF NOT EXISTS inducciones (
  id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
  perfil_key VARCHAR(30)  NOT NULL,
  titulo     VARCHAR(120) NOT NULL,
  modulos    JSON         NOT NULL,
  FOREIGN KEY (perfil_key) REFERENCES perfiles(`key`)
) ENGINE=InnoDB;

-- ---------- Recursos ----------

CREATE TABLE IF NOT EXISTS recursos (
  id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
  tipo        VARCHAR(14)  NOT NULL COMMENT 'apps|drives|herramientas|emails',
  nombre      VARCHAR(120) NOT NULL,
  descripcion TEXT,
  link        VARCHAR(300) NULL,
  orden       SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ---------- Historial ----------

CREATE TABLE IF NOT EXISTS historial_actividad (
  id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
  usuario_id  BIGINT       NOT NULL,
  texto       VARCHAR(300) NOT NULL,
  ocurrido_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_hist_user (usuario_id, ocurrido_en)
) ENGINE=InnoDB;

-- ---------- Grupos de menú ----------

CREATE TABLE IF NOT EXISTS nav_groups (
  id    VARCHAR(10) PRIMARY KEY,
  titulo VARCHAR(60) NOT NULL,
  orden  SMALLINT    NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT IGNORE INTO nav_groups (id, titulo, orden) VALUES
  ('personal', 'Tu espacio', 1),
  ('gestion', 'Seguimiento del equipo', 2),
  ('config', 'Configuración', 3);
