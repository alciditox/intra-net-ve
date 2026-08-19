-- ============================================================
-- Portal Somos VEPAGOS · esquema inicial
-- PostgreSQL 14+. Punto de partida, no definitivo: revisar contra
-- contrato/index.html (sección 03) antes de correr en producción.
--
-- Convenciones:
--   · Nadie se borra: se marca activo=false.
--   · Los campos derivados (equipo, existencia, cadena de perfiles)
--     NO existen como columna. Se calculan al leer.
--   · Las enumeraciones son cerradas: valor fuera de la lista = inválido.
-- ============================================================

BEGIN;

-- ---------- Perfiles y permisos ----------

CREATE TABLE perfiles (
  key          varchar(30)  PRIMARY KEY,
  label        varchar(60)  NOT NULL,
  base_key     varchar(30)  REFERENCES perfiles(key),  -- herencia; NULL = lista propia
  menus        jsonb,                                   -- NULL = usar pantallas.perfiles
  permisos     jsonb        NOT NULL DEFAULT '{}'::jsonb,
  orden        smallint     NOT NULL DEFAULT 0
);

INSERT INTO perfiles (key, label, base_key, orden) VALUES
  ('admin',       'Administradora',           NULL,       1),
  ('director',    'Director',                 'gerente',  2),
  ('gerente',     'Gerente Ejecutivo',        NULL,       3),
  ('gerenteop',   'Gerente Operativo',        'gerente',  4),
  ('coordinador', 'Coordinador/Supervisor',   'interno',  5),
  ('rrhh',        'Capital Humano',           NULL,       6),
  ('interno',     'Equipo interno',           NULL,       7),
  ('inces',       'Pasante INCES',            NULL,       8);

CREATE TABLE permisos_catalogo (
  clave  varchar(40) PRIMARY KEY,
  grupo  varchar(40) NOT NULL,
  label  varchar(80) NOT NULL,
  descripcion text   NOT NULL
);

INSERT INTO permisos_catalogo (clave, grupo, label, descripcion) VALUES
  ('procuraVer',       'Activos y procura', 'Ver Procura',                      'Entrar al módulo y consultar solicitudes y órdenes.'),
  ('procuraCrear',     'Activos y procura', 'Crear solicitudes de procura',     'Registrar nuevas solicitudes de compra (no puede aprobarlas).'),
  ('procuraAprobar',   'Activos y procura', 'Aprobar / rechazar solicitudes',   'Validar las solicitudes de procura.'),
  ('procuraOrden',     'Activos y procura', 'Generar órdenes y proveedores',    'Crear órdenes de compra y registrar proveedores.'),
  ('procuraRecibir',   'Activos y procura', 'Registrar recepción de órdenes',   'Recibir mercancía e ingresarla al inventario.'),
  ('almacenVer',       'Almacén y activos', 'Ver almacenes y activos',          'Consultar inventario, kardex y activos fijos (solo lectura).'),
  ('almacenMover',     'Almacén y activos', 'Registrar movimientos de almacén', 'Entradas, salidas y ajustes de consumibles.'),
  ('almacenCrear',     'Almacén y activos', 'Crear artículos y reglas',         'Alta y carga masiva de artículos; reglas y reposición.'),
  ('activosGestionar', 'Almacén y activos', 'Gestionar activos fijos',          'Alta, asignación, devolución, sustitución y baja.'),
  ('verContratos',     'Otros módulos',     'Ver Contratos',                    'Acceso al módulo de control laboral.'),
  ('verEmpleados',     'Otros módulos',     'Ver Empleados',                    'Acceso al listado y perfiles de empleados.'),
  ('verEncuestas',     'Otros módulos',     'Ver Encuestas',                    'Acceso al módulo de encuestas.'),
  ('notifEquipo',      'Otros módulos',     'Notificaciones del equipo',        'Ver pendientes y solicitudes del equipo que dirige o apoya.');

-- ---------- Personas ----------

CREATE TABLE usuarios (
  id              bigserial    PRIMARY KEY,
  nombre          varchar(120) NOT NULL,
  cargo           varchar(120) NOT NULL,
  area            varchar(60)  NOT NULL,
  perfil_key      varchar(30)  NOT NULL REFERENCES perfiles(key),
  supervisor_id   bigint       REFERENCES usuarios(id),   -- NULL solo en la raíz
  email           varchar(160) NOT NULL UNIQUE,
  cedula          varchar(15),
  password_hash   varchar(255) NOT NULL,
  telefono        varchar(30),
  linkedin        varchar(200),
  ciudad          varchar(60),
  cumple          char(5),                                -- MM-DD
  es_ancla_equipo boolean      NOT NULL DEFAULT false,
  nombre_equipo   varchar(80),                            -- solo en las anclas
  activo          boolean      NOT NULL DEFAULT true,
  creado_en       timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ancla_con_nombre CHECK (NOT es_ancla_equipo OR nombre_equipo IS NOT NULL)
);
CREATE INDEX idx_usuarios_supervisor ON usuarios(supervisor_id);
CREATE INDEX idx_usuarios_perfil     ON usuarios(perfil_key);
CREATE INDEX idx_usuarios_activo     ON usuarios(activo) WHERE activo;

CREATE TABLE permisos_usuario (
  usuario_id     bigint      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  clave          varchar(40) NOT NULL REFERENCES permisos_catalogo(clave),
  concedido_por  bigint      NOT NULL REFERENCES usuarios(id),
  concedido_en   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, clave)
);

-- Equipo derivado: sube por supervisor_id hasta la primera ancla. Tope 20 niveles.
CREATE OR REPLACE VIEW v_usuario_equipo AS
WITH RECURSIVE sube AS (
  SELECT id AS usuario_id, id AS actual, es_ancla_equipo, nombre_equipo, 0 AS nivel
    FROM usuarios
  UNION ALL
  SELECT s.usuario_id, u.supervisor_id, p.es_ancla_equipo, p.nombre_equipo, s.nivel + 1
    FROM sube s
    JOIN usuarios u ON u.id = s.actual
    LEFT JOIN usuarios p ON p.id = u.supervisor_id
   WHERE NOT s.es_ancla_equipo AND u.supervisor_id IS NOT NULL AND s.nivel < 20
)
SELECT usuario_id, nombre_equipo AS equipo
  FROM sube WHERE es_ancla_equipo
 UNION
SELECT id, NULL FROM usuarios u
 WHERE NOT EXISTS (SELECT 1 FROM sube s WHERE s.usuario_id = u.id AND s.es_ancla_equipo);

-- ---------- Pantallas ----------

CREATE TABLE pantallas (
  id           varchar(30) PRIMARY KEY,
  titulo       varchar(60) NOT NULL,
  grupo        varchar(10) NOT NULL CHECK (grupo IN ('personal','gestion','config')),
  padre_id     varchar(30) REFERENCES pantallas(id),
  perfiles     jsonb       NOT NULL,   -- array de perfil_key, o ["all"]
  permisos_alt jsonb,                  -- claves de permiso que también dan acceso
  href_externo varchar(300),           -- solo Eureka y SAC
  orden        smallint    NOT NULL DEFAULT 0
);

-- ---------- Biblioteca ----------

CREATE TABLE categorias_documento (
  id          varchar(30) PRIMARY KEY,
  nombre      varchar(80) NOT NULL,
  descripcion text,
  perfiles    jsonb       NOT NULL,
  es_personal boolean     NOT NULL DEFAULT false,
  orden       smallint    NOT NULL DEFAULT 0
);

CREATE TABLE documentos (
  id           bigserial    PRIMARY KEY,
  categoria_id varchar(30)  NOT NULL REFERENCES categorias_documento(id),
  nombre       varchar(200) NOT NULL,
  archivo      varchar(300) NOT NULL,
  usuario_id   bigint       REFERENCES usuarios(id),  -- solo en categoría personal
  subido_por   bigint       NOT NULL REFERENCES usuarios(id),
  subido_en    timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_docs_cat  ON documentos(categoria_id);
CREATE INDEX idx_docs_user ON documentos(usuario_id) WHERE usuario_id IS NOT NULL;

-- ---------- Mesa de ayuda ----------

CREATE TABLE pasos_aprobacion (
  clave          varchar(20) PRIMARY KEY,
  titulo         varchar(80) NOT NULL,
  dinamico       boolean     NOT NULL DEFAULT false,
  responsable_id bigint      REFERENCES usuarios(id),
  CONSTRAINT dinamico_sin_responsable CHECK (NOT dinamico OR responsable_id IS NULL)
);

INSERT INTO pasos_aprobacion (clave, titulo, dinamico) VALUES
  ('supervisor', 'Supervisor directo',                     true),
  ('ti',         'Coordinación de Tecnología',             false),
  ('sistemas',   'Gerencia de Sistemas',                   false),
  ('rrhh',       'Capital Humano',                         false),
  ('nomina',     'Nómina',                                 false),
  ('procura',    'Procura / Inventario',                   false),
  ('servicios',  'Administración (Servicios Generales)',   false),
  ('admin',      'Dirección General',                      false);

CREATE TABLE solicitud_departamentos (
  id          varchar(20) PRIMARY KEY,
  nombre      varchar(60) NOT NULL,
  descripcion text,
  color       char(7),
  flujo       jsonb       NOT NULL      -- array ordenado de pasos_aprobacion.clave
);

CREATE TABLE solicitud_categorias (
  id              bigserial   PRIMARY KEY,
  departamento_id varchar(20) NOT NULL REFERENCES solicitud_departamentos(id),
  nombre          varchar(80) NOT NULL,
  orden           smallint    NOT NULL DEFAULT 0
);

CREATE TABLE solicitud_tipos (
  id                bigserial    PRIMARY KEY,
  categoria_id      bigint       NOT NULL REFERENCES solicitud_categorias(id),
  nombre            varchar(160) NOT NULL,
  flujo             jsonb,                    -- si viene, sobrescribe el del departamento
  pide_rango        boolean      NOT NULL DEFAULT false,
  genera_documento  boolean      NOT NULL DEFAULT false,
  perfil_prenda     varchar(10)  CHECK (perfil_prenda IN ('empleado','aliado')),
  activo            boolean      NOT NULL DEFAULT true
);
CREATE INDEX idx_tipos_cat ON solicitud_tipos(categoria_id);

CREATE TABLE solicitudes (
  id             bigserial   PRIMARY KEY,
  numero         varchar(20) NOT NULL UNIQUE,
  tipo_id        bigint      NOT NULL REFERENCES solicitud_tipos(id),
  solicitante_id bigint      NOT NULL REFERENCES usuarios(id),
  estado         varchar(12) NOT NULL DEFAULT 'abierta'
                   CHECK (estado IN ('abierta','aprobada','rechazada')),
  prioridad      varchar(12) NOT NULL DEFAULT 'normal'
                   CHECK (prioridad IN ('normal','intermedia','urgente')),
  descripcion    text,
  fecha_desde    date,
  fecha_hasta    date,
  cadena         jsonb       NOT NULL,   -- SNAPSHOT: no recalcular en solicitudes abiertas
  paso_actual    smallint    NOT NULL DEFAULT 0,
  creada_en      timestamptz NOT NULL DEFAULT now(),
  cerrada_en     timestamptz,
  CONSTRAINT rango_coherente CHECK (fecha_hasta IS NULL OR fecha_desde IS NULL OR fecha_hasta >= fecha_desde)
);
CREATE INDEX idx_sol_solicitante ON solicitudes(solicitante_id);
CREATE INDEX idx_sol_estado      ON solicitudes(estado);

CREATE TABLE solicitud_eventos (
  id           bigserial   PRIMARY KEY,
  solicitud_id bigint      NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  tipo         varchar(12) NOT NULL CHECK (tipo IN ('creada','aprobado','rechazada','cerrado')),
  paso         varchar(20) REFERENCES pasos_aprobacion(clave),
  actor_id     bigint      NOT NULL REFERENCES usuarios(id),
  comentario   text,
  ocurrido_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sol_ev ON solicitud_eventos(solicitud_id);

-- ---------- Notificaciones ----------

CREATE TABLE pendientes (
  id         bigserial    PRIMARY KEY,
  usuario_id bigint       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo       varchar(12)  NOT NULL CHECK (tipo IN ('horario','planilla','rrhh','acceso')),
  titulo     varchar(200) NOT NULL,
  detalle    text,
  resuelto   boolean      NOT NULL DEFAULT false,
  creado_en  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_pend_user ON pendientes(usuario_id) WHERE NOT resuelto;

-- ---------- Inducciones ----------

CREATE TABLE inducciones (
  id         bigserial    PRIMARY KEY,
  perfil_key varchar(30)  NOT NULL REFERENCES perfiles(key),
  titulo     varchar(120) NOT NULL,
  modulos    jsonb        NOT NULL      -- [{id,titulo,descripcion,color}]
);

CREATE TABLE induccion_avance (
  usuario_id     bigint      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  induccion_id   bigint      NOT NULL REFERENCES inducciones(id),
  modulo_id      varchar(20) NOT NULL,
  completado_en  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, induccion_id, modulo_id)
);

-- ---------- Requerimientos de ingreso y salida ----------

CREATE TABLE requerimientos_catalogo (
  id         bigserial   PRIMARY KEY,
  fase       varchar(12) NOT NULL CHECK (fase IN ('onboarding','offboard')),
  perfil_key varchar(30) NOT NULL,   -- clave de perfil o el literal 'General'
  area       varchar(12) CHECK (area IN ('rrhh','nomina','sistemas','mercadeo','depto')),
  items      jsonb       NOT NULL,
  orden      smallint    NOT NULL DEFAULT 0,
  UNIQUE (fase, perfil_key, area)
);

CREATE TABLE requerimientos_empleado (
  id             bigserial    PRIMARY KEY,
  usuario_id     bigint       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fase           varchar(12)  NOT NULL CHECK (fase IN ('onboarding','offboard')),
  item           varchar(300) NOT NULL,
  area           varchar(12),
  completado     boolean      NOT NULL DEFAULT false,
  completado_por bigint       REFERENCES usuarios(id),
  completado_en  timestamptz,
  soporte        varchar(300)
);
CREATE INDEX idx_req_emp ON requerimientos_empleado(usuario_id, fase);

-- ---------- Encuestas ----------

CREATE TABLE encuestas (
  id          bigserial    PRIMARY KEY,
  titulo      varchar(160) NOT NULL,
  descripcion text,
  preguntas   jsonb        NOT NULL,   -- [{id,texto,tipo,opciones[]}] tipo: escala|opcion|texto
  audiencia   varchar(60)  NOT NULL DEFAULT 'todos',
  cadencia    varchar(12)  NOT NULL CHECK (cadencia IN ('unica','trimestral','semestral','anual','onboarding')),
  tipo        varchar(6)   NOT NULL DEFAULT 'normal' CHECK (tipo IN ('normal','360')),
  estado      varchar(8)   NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','cerrada')),
  desde       date         NOT NULL,
  creada_por  bigint       NOT NULL REFERENCES usuarios(id)
);

CREATE TABLE encuesta_respuestas (
  id            bigserial   PRIMARY KEY,
  encuesta_id   bigint      NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  usuario_id    bigint      NOT NULL REFERENCES usuarios(id),
  ciclo         smallint    NOT NULL DEFAULT 0,
  es_360        boolean     NOT NULL DEFAULT false,
  evaluados     jsonb,                 -- solo 360: [{usuario_id,relacion}] lider|par|auto
  respuestas    jsonb       NOT NULL,
  respondido_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (encuesta_id, usuario_id, ciclo)   -- una respuesta por persona por ciclo
);

-- ---------- Asistencia y contratos ----------

CREATE TABLE asistencia (
  id                bigserial   PRIMARY KEY,
  usuario_id        bigint      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha             date        NOT NULL,
  entrada           time,
  salida            time,
  horario_esperado  varchar(40),
  observacion       text,
  UNIQUE (usuario_id, fecha)
);

CREATE TABLE contratos_laborales (
  id         bigserial   PRIMARY KEY,
  usuario_id bigint      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo       varchar(60) NOT NULL,
  inicio     date        NOT NULL,
  fin        date,                       -- NULL = indefinido
  archivo    varchar(300),
  estado     varchar(12) NOT NULL CHECK (estado IN ('vigente','por_vencer','vencido','renovado'))
);

-- ---------- Activos, almacenes y procura ----------

CREATE TABLE proveedores (
  id          bigserial    PRIMARY KEY,
  razon       varchar(160) NOT NULL,
  rif         varchar(20)  NOT NULL,
  contacto    varchar(160),
  condiciones varchar(80)
);

CREATE TABLE activos_fijos (
  id           varchar(20)  PRIMARY KEY,      -- AF-0001
  categoria    varchar(40)  NOT NULL,
  descripcion  varchar(200) NOT NULL,
  marca        varchar(60),
  modelo       varchar(60),
  serial       varchar(80),
  fecha_compra date,
  costo        numeric(12,2),
  proveedor_id bigint       REFERENCES proveedores(id),
  sede         varchar(60),
  area_fisica  varchar(60),
  asignado_a   bigint       REFERENCES usuarios(id),
  estado       varchar(16)  NOT NULL DEFAULT 'disponible'
                 CHECK (estado IN ('disponible','asignado','en_reparacion','sustituido','de_baja'))
);
CREATE INDEX idx_activos_asig ON activos_fijos(asignado_a) WHERE asignado_a IS NOT NULL;

CREATE TABLE almacenes (
  id     varchar(20) PRIMARY KEY,           -- tech | consumibles | mercadeo
  nombre varchar(80) NOT NULL
);

CREATE TABLE articulos (
  id         bigserial    PRIMARY KEY,
  almacen_id varchar(20)  NOT NULL REFERENCES almacenes(id),
  nombre     varchar(160) NOT NULL,
  unidad     varchar(20)  NOT NULL DEFAULT 'unidad',
  stock_min  numeric(12,2) NOT NULL DEFAULT 0
  -- existencia NO se guarda: es la suma de movimientos (ver v_articulo_existencia)
);

CREATE TABLE almacen_movimientos (
  id          bigserial     PRIMARY KEY,
  articulo_id bigint        NOT NULL REFERENCES articulos(id),
  tipo        varchar(8)    NOT NULL CHECK (tipo IN ('entrada','salida','ajuste')),
  cantidad    numeric(12,2) NOT NULL,
  motivo      varchar(200),
  usuario_id  bigint        NOT NULL REFERENCES usuarios(id),
  ocurrido_en timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX idx_mov_art ON almacen_movimientos(articulo_id, ocurrido_en);

CREATE OR REPLACE VIEW v_articulo_existencia AS
SELECT a.id AS articulo_id,
       COALESCE(SUM(CASE m.tipo WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END), 0) AS existencia,
       a.stock_min,
       COALESCE(SUM(CASE m.tipo WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END), 0) < a.stock_min AS bajo_minimo
  FROM articulos a
  LEFT JOIN almacen_movimientos m ON m.articulo_id = a.id
 GROUP BY a.id, a.stock_min;

CREATE TABLE procura_solicitudes (
  id             bigserial   PRIMARY KEY,
  solicitante_id bigint      NOT NULL REFERENCES usuarios(id),
  items          jsonb       NOT NULL,   -- [{articulo,cantidad,justificacion}]
  estado         varchar(12) NOT NULL DEFAULT 'abierta'
                   CHECK (estado IN ('abierta','aprobada','rechazada','ordenada','recibida')),
  aprobado_por   bigint      REFERENCES usuarios(id),
  creada_en      timestamptz NOT NULL DEFAULT now(),
  -- quien pide no puede autorizarse
  CONSTRAINT no_autoaprobacion CHECK (aprobado_por IS NULL OR aprobado_por <> solicitante_id)
);

CREATE TABLE procura_ordenes (
  id           bigserial     PRIMARY KEY,
  solicitud_id bigint        NOT NULL REFERENCES procura_solicitudes(id),
  proveedor_id bigint        NOT NULL REFERENCES proveedores(id),
  total        numeric(12,2) NOT NULL,
  creada_en    timestamptz   NOT NULL DEFAULT now(),
  recibida_en  timestamptz
);

-- ---------- Configuración y bitácora ----------

CREATE TABLE recursos (
  id          bigserial    PRIMARY KEY,
  tipo        varchar(14)  NOT NULL CHECK (tipo IN ('apps','drives','herramientas','emails')),
  nombre      varchar(120) NOT NULL,
  descripcion text,
  link        varchar(300),
  orden       smallint     NOT NULL DEFAULT 0
);

CREATE TABLE historial_actividad (
  id          bigserial    PRIMARY KEY,
  usuario_id  bigint       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  texto       varchar(300) NOT NULL,
  ocurrido_en timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_hist_user ON historial_actividad(usuario_id, ocurrido_en DESC);

COMMIT;

-- ============================================================
-- Pendiente de decidir antes de producción (ver contrato, sección 06):
--   · Mecanismo de autenticación y política de contraseñas.
--   · Almacenamiento de archivos y control de acceso por URL.
--   · Si encuesta_respuestas.usuario_id se disocia para las anónimas.
--   · Suplencia del responsable de un paso de aprobación.
-- ============================================================
