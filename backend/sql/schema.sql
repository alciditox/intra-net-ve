-- ============================================================
-- Portal Somos VEPAGOS · esquema MySQL
-- Adaptado del esquema PostgreSQL original.
-- Ejecutar en MySQL/MariaDB (phpMyAdmin localhost:8080)
-- Base de datos: intranet_vepagos
-- ============================================================

CREATE DATABASE IF NOT EXISTS intranet_vepagos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER DATABASE intranet_vepagos
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

CREATE TABLE IF NOT EXISTS nav_groups (
  id      VARCHAR(20)  PRIMARY KEY,
  titulo  VARCHAR(60)  NOT NULL,
  orden   SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT IGNORE INTO nav_groups (id, titulo, orden) VALUES
  ('personal', 'Tu espacio', 1),
  ('gestion', 'Seguimiento del equipo', 2),
  ('config', 'Configuración', 3);

CREATE TABLE IF NOT EXISTS perfil_pantallas (
  perfil_key   VARCHAR(30)  NOT NULL,
  pantalla_id  VARCHAR(30)  NOT NULL,
  PRIMARY KEY (perfil_key, pantalla_id),
  FOREIGN KEY (perfil_key) REFERENCES perfiles(`key`) ON DELETE CASCADE,
  FOREIGN KEY (pantalla_id) REFERENCES pantallas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Registro de pantallas administrativas Biblioteca (admindocs), Cultura organizacional (admincultura) y Emergencias (adminemergencias)
INSERT IGNORE INTO pantallas (id, titulo, grupo, padre_id, icono, href_externo, orden) VALUES
  ('admindocs', 'Biblioteca', 'personal', 'adminmenu', NULL, NULL, 6),
  ('admincultura', 'Cultura organizacional', 'personal', 'adminmenu', NULL, NULL, 7),
  ('adminemergencias', 'Emergencias', 'personal', 'adminmenu', NULL, NULL, 8);
INSERT IGNORE INTO perfil_pantallas (perfil_key, pantalla_id) VALUES
  ('admin', 'admindocs'),
  ('admin', 'admincultura'),
  ('admin', 'adminemergencias');

-- Registro de Gestión de Solicitudes y submenús departamentales
INSERT IGNORE INTO pantallas (id, titulo, grupo, padre_id, icono, href_externo, orden) VALUES
  ('gestionsol', 'Gestión de solicitudes', 'gestion', NULL, '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8M16 17H8M10 9H8"></path>', NULL, 7),
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
  tipo_sangre     VARCHAR(10)  NULL,
  alergias        VARCHAR(255) NULL,
  condicion_medica VARCHAR(255) NULL,
  emerg_nombre    VARCHAR(120) NULL,
  emerg_telefono  VARCHAR(30)  NULL,
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

-- ---------- Información de Emergencias Institucional ----------

CREATE TABLE IF NOT EXISTS emergencias_info (
  id                   INT PRIMARY KEY DEFAULT 1,
  riesgo_telefono      VARCHAR(50) NOT NULL DEFAULT '911',
  riesgo_texto         VARCHAR(255) NOT NULL DEFAULT 'Llama de inmediato a los servicios de emergencia',
  pasos                JSON NOT NULL,
  aseguradora_empresa  VARCHAR(255) NOT NULL,
  aseguradora_producto VARCHAR(255) NOT NULL,
  aseguradora_poliza   VARCHAR(100) NOT NULL,
  aseguradora_suma     VARCHAR(100) NOT NULL,
  cobertura_items      JSON NOT NULL,
  no_cubre_items       JSON NOT NULL,
  contactos            JSON NOT NULL,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

-- ---------- Documentos (biblioteca) ----------

CREATE TABLE IF NOT EXISTS documentos (
  id           BIGINT       AUTO_INCREMENT PRIMARY KEY,
  categoria_id VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  nombre       VARCHAR(200) NOT NULL,
  archivo_url  VARCHAR(300) NULL,
  es_real      TINYINT(1)   NOT NULL DEFAULT 0,
  prompt_texto TEXT         NULL COMMENT 'Texto del prompt para cat=prompts',
  fecha        DATE         NULL,
  creado_por   VARCHAR(120) NULL,
  departamento VARCHAR(60)  NULL,
  equipo       VARCHAR(80)  NULL,
  descripcion  TEXT         NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias_documento(id),
  INDEX idx_docs_cat (categoria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Vacantes ----------

CREATE TABLE IF NOT EXISTS vacantes (
  id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
  cargo       VARCHAR(120) NOT NULL,
  manager_id  BIGINT       NULL,
  perfil_key  VARCHAR(30)  NULL,
  fecha       DATE         NULL,
  estado      VARCHAR(20)  NOT NULL DEFAULT 'abierta',
  FOREIGN KEY (manager_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (perfil_key) REFERENCES perfiles(`key`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- Candidatos ----------

CREATE TABLE IF NOT EXISTS candidatos (
  id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NULL,
  telefono    VARCHAR(30)  NULL,
  linkedin    VARCHAR(200) NULL,
  ciudad      VARCHAR(60)  NULL,
  experiencia VARCHAR(30)  NULL,
  etapa       VARCHAR(30)  NOT NULL DEFAULT 'nuevo',
  fecha       DATE         NULL,
  nota        TEXT         NULL
) ENGINE=InnoDB;

-- ---------- Activos fijos — catálogos auxiliares ----------

CREATE TABLE IF NOT EXISTS af_cat_categorias (
  id     BIGINT       AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60)  NOT NULL UNIQUE,
  orden  SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS af_cat_sedes (
  id     BIGINT       AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60)  NOT NULL UNIQUE,
  orden  SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS af_cat_areas (
  id     BIGINT       AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80)  NOT NULL UNIQUE,
  orden  SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS af_cat_departamentos (
  id     BIGINT       AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60)  NOT NULL UNIQUE,
  orden  SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS af_cat_estados (
  id     BIGINT       AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(30)  NOT NULL UNIQUE,
  orden  SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS af_cat_unidades (
  id     BIGINT       AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(30)  NOT NULL UNIQUE,
  orden  SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ---------- Activos fijos ----------

CREATE TABLE IF NOT EXISTS af_activos (
  id            VARCHAR(10)  PRIMARY KEY,
  categoria     VARCHAR(60)  NOT NULL,
  descripcion   VARCHAR(200) NOT NULL,
  marca         VARCHAR(60)  NULL,
  modelo        VARCHAR(60)  NULL,
  serial        VARCHAR(60)  NULL,
  fecha_compra  DATE         NULL,
  costo         DECIMAL(12,2) NULL,
  proveedor     VARCHAR(120) NULL,
  factura       VARCHAR(40)  NULL,
  sede          VARCHAR(60)  NULL,
  area          VARCHAR(80)  NULL,
  departamento  VARCHAR(60)  NULL,
  usuario_id    BIGINT       NULL,
  fecha_asig    DATE         NULL,
  estado        VARCHAR(20)  NOT NULL DEFAULT 'Disponible',
  estado_fisico VARCHAR(20)  NULL,
  ultimo_inv    DATE         NULL,
  creado_por    VARCHAR(120) NULL,
  obs           TEXT         NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- Consumibles (almacén) ----------

CREATE TABLE IF NOT EXISTS af_consumibles (
  id        VARCHAR(10)  PRIMARY KEY,
  nombre    VARCHAR(120) NOT NULL,
  unidad    VARCHAR(30)  NOT NULL DEFAULT 'Unidad',
  minimo    INT          NOT NULL DEFAULT 0,
  ubicacion VARCHAR(80)  NULL,
  almacen   VARCHAR(20)  NOT NULL DEFAULT 'consumibles'
) ENGINE=InnoDB;

-- ---------- Movimientos de stock ----------

CREATE TABLE IF NOT EXISTS af_movimientos (
  id           BIGINT       AUTO_INCREMENT PRIMARY KEY,
  articulo_id  VARCHAR(10)  NOT NULL,
  tipo         VARCHAR(10)  NOT NULL COMMENT 'Entrada|Salida',
  cantidad     INT          NOT NULL,
  fecha        DATE         NULL,
  referencia   VARCHAR(120) NULL,
  por          VARCHAR(120) NULL,
  departamento VARCHAR(60)  NULL,
  para         VARCHAR(120) NULL,
  FOREIGN KEY (articulo_id) REFERENCES af_consumibles(id)
) ENGINE=InnoDB;

-- ---------- Proveedores ----------

CREATE TABLE IF NOT EXISTS af_proveedores (
  id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
  razon       VARCHAR(160) NOT NULL,
  rif         VARCHAR(20)  NULL,
  contacto    VARCHAR(160) NULL,
  condiciones VARCHAR(80)  NULL
) ENGINE=InnoDB;

-- ---------- Solicitudes de compra ----------

CREATE TABLE IF NOT EXISTS af_solicitudes_compra (
  id              VARCHAR(10)  PRIMARY KEY,
  solicitante_id  BIGINT       NULL,
  departamento    VARCHAR(60)  NULL,
  items           JSON         NOT NULL,
  justificacion   TEXT         NULL,
  estado          VARCHAR(20)  NOT NULL DEFAULT 'Enviada',
  fecha           DATE         NULL,
  aprobado_por    VARCHAR(120) NULL,
  aprobado_fecha  DATE         NULL,
  FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- Metas y KPIs ----------

CREATE TABLE IF NOT EXISTS metas_config (
  id       BIGINT       AUTO_INCREMENT PRIMARY KEY,
  vision   TEXT         NOT NULL,
  norte    TEXT         NOT NULL,
  updated  VARCHAR(30)  NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS metas_objetivos (
  id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
  titulo      VARCHAR(120) NOT NULL,
  descripcion TEXT         NULL,
  metrica     VARCHAR(60)  NULL,
  plazo       VARCHAR(30)  NULL,
  orden       SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS metas_kpis (
  id        BIGINT       AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(60)  NOT NULL,
  actual    VARCHAR(30)  NULL,
  meta      VARCHAR(30)  NULL,
  direccion VARCHAR(10)  NOT NULL DEFAULT 'up',
  orden     SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS metas_historico (
  id        BIGINT       AUTO_INCREMENT PRIMARY KEY,
  area_key  VARCHAR(20)  NOT NULL,
  area      VARCHAR(60)  NOT NULL,
  color     CHAR(7)      NULL,
  bg        CHAR(9)      NULL,
  intro     TEXT         NULL,
  columnas  JSON         NOT NULL,
  filas     JSON         NOT NULL,
  orden     SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ---------- Inducciones / Onboarding ----------

CREATE TABLE IF NOT EXISTS inducciones_rutas (
  id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
  perfil_key  VARCHAR(30)  NOT NULL COMMENT 'Clave de perfil o _todos para todos',
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

-- ---------- Cultura Organizacional ----------

CREATE TABLE IF NOT EXISTS cultura_organizacional (
  id               INT          PRIMARY KEY DEFAULT 1,
  proposito_titulo VARCHAR(160) NOT NULL DEFAULT '“Hacer crecer tu negocio.”',
  proposito_desc   TEXT         NOT NULL,
  mision           TEXT         NOT NULL,
  vision           TEXT         NOT NULL,
  valores          JSON         NOT NULL,
  flywheel         JSON         NOT NULL,
  perks            JSON         NOT NULL,
  updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
