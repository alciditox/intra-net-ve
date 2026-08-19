/* ============================================================
   Portal Somos VEPAGOS · contrato de datos
   Esquema de entidades + endpoints REST. Este archivo es la
   fuente de verdad del documento: la página se dibuja de aquí.
   ============================================================ */
'use strict';

/* ---------- Esquema ---------- */
const SCHEMA = [
  {
    n: 'usuarios', d: 'Toda persona que entra al portal. Un usuario tiene exactamente un perfil y un supervisor.',
    f: [
      ['id', 'bigint PK', 'Identificador interno.'],
      ['nombre', 'varchar(120)', 'Nombre completo. Obligatorio.'],
      ['cargo', 'varchar(120)', 'Cargo tal como se muestra. De aquí se deduce la ficha de cargo por patrones de texto.'],
      ['area', 'varchar(60)', 'Dirección · Comercial · Sistemas · Administración.'],
      ['perfil_key', 'varchar(30) FK → perfiles.key', 'Uno de los 8 perfiles. Obligatorio.'],
      ['supervisor_id', 'bigint FK → usuarios.id NULL', 'Null solo para la raíz del organigrama. De aquí sale el árbol, los equipos y el paso «supervisor directo» de las aprobaciones.'],
      ['email', 'varchar(160) UNIQUE', 'Correo corporativo. Es la credencial de acceso.'],
      ['cedula', 'varchar(15)', 'Documento de identidad. Se pide en el login junto al correo.'],
      ['telefono', 'varchar(30)', ''],
      ['linkedin', 'varchar(200) NULL', ''],
      ['ciudad', 'varchar(60)', ''],
      ['cumple', 'char(5)', 'Formato MM-DD. Alimenta el bloque de cumpleaños del mes en Inicio.'],
      ['activo', 'boolean default true', 'False = desincorporado. NUNCA se borra el registro.'],
      ['equipo', 'derivado — no persistir', 'Se calcula subiendo por supervisor_id hasta la primera persona con es_ancla_equipo. Ver nota de equipos.'],
      ['es_ancla_equipo', 'boolean default false', 'Marca a quien encabeza un equipo.'],
      ['nombre_equipo', 'varchar(80) NULL', 'Solo se llena en las anclas. Es el nombre que heredan sus descendientes.']
    ]
  },
  {
    n: 'perfiles', d: 'Los 8 perfiles del sistema. Define qué ve y qué puede hacer cada uno. Editable desde Configuración · Perfiles.',
    f: [
      ['key', 'varchar(30) PK', 'admin · director · gerente · gerenteop · coordinador · rrhh · interno · inces'],
      ['label', 'varchar(60)', 'Etiqueta que ve el usuario: «Gerente Ejecutivo», «Capital Humano»…'],
      ['base_key', 'varchar(30) FK → perfiles.key NULL', 'Perfil del que hereda cuando no declara lo suyo. director→gerente, gerenteop→gerente, coordinador→interno.'],
      ['menus', 'json NULL', 'Array de ids de pantalla. Si es null se usa la lista de roles declarada en cada pantalla.'],
      ['permisos', 'json', 'Objeto {clave_permiso: boolean} con los 13 permisos granulares.'],
      ['orden', 'smallint', 'Orden de presentación en la pantalla de Perfiles.']
    ]
  },
  {
    n: 'permisos_usuario', d: 'Permisos granulares concedidos a UNA persona por encima de lo que le da su perfil. Solo suman; no existe permiso negativo.',
    f: [
      ['usuario_id', 'bigint FK → usuarios.id', 'PK compuesta con clave.'],
      ['clave', 'varchar(40)', 'procuraVer · procuraCrear · procuraAprobar · procuraOrden · procuraRecibir · almacenVer · almacenMover · almacenCrear · activosGestionar · verContratos · verEmpleados · verEncuestas · notifEquipo'],
      ['concedido_por', 'bigint FK → usuarios.id', 'Auditoría: quién lo otorgó.'],
      ['concedido_en', 'timestamp', '']
    ]
  },
  {
    n: 'pantallas', d: 'Catálogo de los 35 destinos de navegación. Se puede sembrar fijo en el código, pero el backend necesita la lista para resolver menús.',
    f: [
      ['id', 'varchar(30) PK', 'inicio · metas · somos · cultura · docs · solicitudes · pendientes · onboarding · perfil · solequipo · org · directorio · ventasmenu · induccionequipo · empleados · claves · activos · asistencia · encuestas · contratos · perfiles · requerimientos · accesos · recursos + 11 subpantallas'],
      ['titulo', 'varchar(60)', ''],
      ['grupo', 'enum', 'personal · gestion · config'],
      ['padre_id', 'varchar(30) NULL', 'Para las 11 subpantallas. Un padre con hijos NO tiene vista propia: abre la primera hija.'],
      ['perfiles', 'json', 'Array de perfil_key, o "all". Se evalúa contra la CADENA del perfil, no contra el perfil directo.'],
      ['permisos_alt', 'json NULL', 'Claves de permiso que también dan acceso a esta pantalla aunque el perfil no la traiga.'],
      ['orden', 'smallint', '']
    ]
  },
  {
    n: 'categorias_documento', d: 'Las 10 categorías de la Biblioteca. Cada una tiene su propia lista de perfiles autorizados.',
    f: [
      ['id', 'varchar(30) PK', 'fichas · planes · presentaciones · oferta · contratos · rrhh · captaciones · marca · prompts · personales'],
      ['nombre', 'varchar(80)', ''],
      ['descripcion', 'text', 'Se muestra bajo el nombre en la Biblioteca.'],
      ['perfiles', 'json', 'Array de perfil_key autorizados. Se evalúa con herencia.'],
      ['es_personal', 'boolean default false', 'True solo en «personales»: cada usuario ve ÚNICAMENTE los suyos.']
    ]
  },
  {
    n: 'documentos', d: 'Archivos de la Biblioteca y documentos personales de cada empleado.',
    f: [
      ['id', 'bigint PK', ''],
      ['categoria_id', 'varchar(30) FK', ''],
      ['nombre', 'varchar(200)', ''],
      ['archivo', 'varchar(300)', 'Ruta o clave de almacenamiento. Ver pendiente sobre almacenamiento.'],
      ['usuario_id', 'bigint FK NULL', 'Solo en categoría personal: dueño del documento. Null = documento de empresa.'],
      ['subido_por', 'bigint FK → usuarios.id', ''],
      ['subido_en', 'timestamp', '']
    ]
  },
  {
    n: 'solicitud_departamentos', d: 'Los 5 departamentos de la mesa de ayuda. Cada uno define la cadena de aprobación que heredan sus tipos.',
    f: [
      ['id', 'varchar(20) PK', 'tecnologia · talento · procura · servicios · nomina'],
      ['nombre', 'varchar(60)', ''],
      ['descripcion', 'text', ''],
      ['color', 'char(7)', 'Hex del color de acento del departamento.'],
      ['flujo', 'json', 'Array ordenado de claves de paso. Ej: ["supervisor","ti"].']
    ]
  },
  {
    n: 'solicitud_categorias', d: 'Las 23 categorías. Solo agrupan tipos; no llevan flujo propio.',
    f: [
      ['id', 'bigint PK', ''],
      ['departamento_id', 'varchar(20) FK', ''],
      ['nombre', 'varchar(80)', ''],
      ['orden', 'smallint', '']
    ]
  },
  {
    n: 'solicitud_tipos', d: 'Los 198 tipos de solicitud. Hereda el flujo de su departamento salvo que declare uno propio.',
    f: [
      ['id', 'bigint PK', ''],
      ['categoria_id', 'bigint FK', ''],
      ['nombre', 'varchar(160)', ''],
      ['flujo', 'json NULL', 'Si viene, sobrescribe el flujo del departamento. Ej: ["supervisor","ti","sistemas"].'],
      ['pide_rango', 'boolean default false', 'True en permiso y vacaciones: el formulario pide fecha desde y hasta.'],
      ['genera_documento', 'boolean default false', 'True en constancia de trabajo: al aprobarse crea el PDF en documentos personales del solicitante.'],
      ['perfil_prenda', 'enum NULL', 'empleado · aliado. Solo en uniformes.'],
      ['activo', 'boolean default true', '']
    ]
  },
  {
    n: 'pasos_aprobacion', d: 'Los 8 pasos posibles y quién ocupa cada uno. «supervisor» es dinámico y no se configura.',
    f: [
      ['clave', 'varchar(20) PK', 'supervisor · ti · sistemas · rrhh · nomina · procura · servicios · admin'],
      ['titulo', 'varchar(80)', '«Supervisor directo», «Coordinación de Tecnología»…'],
      ['dinamico', 'boolean default false', 'True solo en «supervisor»: se resuelve del organigrama al crear la solicitud.'],
      ['responsable_id', 'bigint FK → usuarios.id NULL', 'La persona asignada. Null en los dinámicos.']
    ]
  },
  {
    n: 'solicitudes', d: 'El ticket. Recorre los pasos de su cadena en orden.',
    f: [
      ['id', 'bigint PK', ''],
      ['numero', 'varchar(20) UNIQUE', 'Consecutivo visible para el usuario.'],
      ['tipo_id', 'bigint FK → solicitud_tipos.id', ''],
      ['solicitante_id', 'bigint FK → usuarios.id', ''],
      ['estado', 'enum', 'abierta («En proceso») · aprobada · rechazada'],
      ['prioridad', 'enum', 'normal · intermedia · urgente'],
      ['descripcion', 'text', ''],
      ['fecha_desde', 'date NULL', 'Solo si el tipo pide rango.'],
      ['fecha_hasta', 'date NULL', ''],
      ['cadena', 'json', 'Snapshot de los pasos con su responsable resuelto al momento de crear. NO se recalcula después: si el jefe cambia, la solicitud abierta conserva su aprobador.'],
      ['paso_actual', 'smallint', 'Índice dentro de cadena. Igual a cadena.length = completada.'],
      ['creada_en', 'timestamp', ''],
      ['cerrada_en', 'timestamp NULL', '']
    ]
  },
  {
    n: 'solicitud_eventos', d: 'Historial inmutable de la solicitud. No se edita ni se borra.',
    f: [
      ['id', 'bigint PK', ''],
      ['solicitud_id', 'bigint FK', ''],
      ['tipo', 'enum', 'creada · aprobado · rechazada · cerrado'],
      ['paso', 'varchar(20) NULL', 'Clave del paso donde ocurrió.'],
      ['actor_id', 'bigint FK → usuarios.id', ''],
      ['comentario', 'text NULL', ''],
      ['ocurrido_en', 'timestamp', '']
    ]
  },
  {
    n: 'pendientes', d: 'Notificaciones personales. Cuatro tipos, cada uno con su acción.',
    f: [
      ['id', 'bigint PK', ''],
      ['usuario_id', 'bigint FK', ''],
      ['tipo', 'enum', 'horario · planilla · rrhh · acceso'],
      ['titulo', 'varchar(200)', ''],
      ['detalle', 'text', ''],
      ['resuelto', 'boolean default false', ''],
      ['creado_en', 'timestamp', '']
    ]
  },
  {
    n: 'inducciones', d: 'Rutas de inducción por perfil, con sus módulos.',
    f: [
      ['id', 'bigint PK', ''],
      ['perfil_key', 'varchar(30) FK', 'A qué perfil se le asigna esta ruta.'],
      ['titulo', 'varchar(120)', ''],
      ['modulos', 'json', 'Array de {id, titulo, descripcion, color}.']
    ]
  },
  {
    n: 'induccion_avance', d: 'Qué módulos completó cada persona.',
    f: [
      ['usuario_id', 'bigint FK', 'PK compuesta con modulo_id.'],
      ['induccion_id', 'bigint FK', ''],
      ['modulo_id', 'varchar(20)', ''],
      ['completado_en', 'timestamp', '']
    ]
  },
  {
    n: 'requerimientos_catalogo', d: 'Qué hay que entregar y tramitar al entrar o salir. Editable desde Configuración · Requerimientos.',
    f: [
      ['id', 'bigint PK', ''],
      ['fase', 'enum', 'onboarding · offboard'],
      ['perfil_key', 'varchar(30)', 'Clave del perfil o el literal "General".'],
      ['area', 'enum NULL', 'rrhh · nomina · sistemas · mercadeo · depto. Solo en onboarding.'],
      ['items', 'json', 'Array de textos.'],
      ['orden', 'smallint', '']
    ]
  },
  {
    n: 'requerimientos_empleado', d: 'El checklist real de una persona concreta, con su avance.',
    f: [
      ['id', 'bigint PK', ''],
      ['usuario_id', 'bigint FK', ''],
      ['fase', 'enum', 'onboarding · offboard'],
      ['item', 'varchar(300)', ''],
      ['area', 'varchar(20) NULL', ''],
      ['completado', 'boolean default false', ''],
      ['completado_por', 'bigint FK NULL', ''],
      ['completado_en', 'timestamp NULL', ''],
      ['soporte', 'varchar(300) NULL', 'Archivo de respaldo cuando aplica.']
    ]
  },
  {
    n: 'encuestas', d: 'Encuestas al personal. La de tipo 360 tiene estructura de respuesta distinta.',
    f: [
      ['id', 'bigint PK', ''],
      ['titulo', 'varchar(160)', ''],
      ['descripcion', 'text', ''],
      ['preguntas', 'json', 'Array de {id, texto, tipo, opciones[]}. tipo: escala | opcion | texto.'],
      ['audiencia', 'varchar(60)', '"todos" o el nombre de un área.'],
      ['cadencia', 'enum', 'unica · trimestral · semestral · anual · onboarding'],
      ['tipo', 'enum', 'normal · 360'],
      ['estado', 'enum', 'activa · cerrada'],
      ['desde', 'date', 'Inicio del primer ciclo. Los ciclos se cuentan desde aquí según la cadencia.'],
      ['creada_por', 'bigint FK', '']
    ]
  },
  {
    n: 'encuesta_respuestas', d: 'Una fila por persona por ciclo. En 360, una fila contiene la evaluación de varias personas.',
    f: [
      ['id', 'bigint PK', ''],
      ['encuesta_id', 'bigint FK', ''],
      ['usuario_id', 'bigint FK', 'Quien responde. Ver pendiente sobre anonimato.'],
      ['ciclo', 'smallint', 'Número de ciclo calculado desde desde + cadencia.'],
      ['es_360', 'boolean default false', ''],
      ['evaluados', 'json NULL', 'Solo 360: array de {usuario_id, relacion} con relacion ∈ lider|par|auto.'],
      ['respuestas', 'json', 'Objeto de respuestas. En 360 la clave incluye el id del evaluado.'],
      ['respondido_en', 'timestamp', '']
    ]
  },
  {
    n: 'asistencia', d: 'Marcaciones y horarios. Admite carga masiva.',
    f: [
      ['id', 'bigint PK', ''],
      ['usuario_id', 'bigint FK', ''],
      ['fecha', 'date', 'UNIQUE con usuario_id.'],
      ['entrada', 'time NULL', ''],
      ['salida', 'time NULL', ''],
      ['horario_esperado', 'varchar(40) NULL', ''],
      ['observacion', 'text NULL', '']
    ]
  },
  {
    n: 'contratos_laborales', d: 'Control laboral: contratos vigentes y sus vencimientos.',
    f: [
      ['id', 'bigint PK', ''],
      ['usuario_id', 'bigint FK', ''],
      ['tipo', 'varchar(60)', ''],
      ['inicio', 'date', ''],
      ['fin', 'date NULL', 'Null = indefinido.'],
      ['archivo', 'varchar(300) NULL', ''],
      ['estado', 'enum', 'vigente · por_vencer · vencido · renovado']
    ]
  },
  {
    n: 'activos_fijos', d: 'Inventario de bienes, con su ciclo de vida y asignación a personas.',
    f: [
      ['id', 'varchar(20) PK', 'Código visible, ej. AF-0001.'],
      ['categoria', 'varchar(40)', 'Computación · Climatización · Mobiliario · Electrodomésticos · Audiovisual · Herramientas · Seguridad · POS / Terminales · Otros'],
      ['descripcion', 'varchar(200)', ''],
      ['marca', 'varchar(60)', ''], ['modelo', 'varchar(60)', ''],
      ['serial', 'varchar(80)', ''],
      ['fecha_compra', 'date', ''], ['costo', 'numeric(12,2)', ''],
      ['proveedor_id', 'bigint FK NULL', ''],
      ['sede', 'varchar(60)', ''], ['area_fisica', 'varchar(60)', ''],
      ['asignado_a', 'bigint FK → usuarios.id NULL', ''],
      ['estado', 'enum', 'disponible · asignado · en_reparacion · sustituido · de_baja']
    ]
  },
  {
    n: 'almacenes · articulos · movimientos', d: 'Tres almacenes (tecnología, consumibles, mercadeo) con kardex por artículo.',
    f: [
      ['almacen.id', 'varchar(20) PK', 'tech · consumibles · mercadeo'],
      ['articulo.id', 'bigint PK', ''],
      ['articulo.almacen_id', 'varchar(20) FK', ''],
      ['articulo.nombre', 'varchar(160)', ''],
      ['articulo.unidad', 'varchar(20)', ''],
      ['articulo.stock_min', 'numeric(12,2)', 'Dispara la alerta de reposición en el panel general.'],
      ['articulo.existencia', 'derivado', 'Suma de movimientos. No persistir como columna editable.'],
      ['movimiento.tipo', 'enum', 'entrada · salida · ajuste'],
      ['movimiento.cantidad', 'numeric(12,2)', ''],
      ['movimiento.motivo', 'varchar(200)', ''],
      ['movimiento.usuario_id', 'bigint FK', 'Quién lo registró.'],
      ['movimiento.ocurrido_en', 'timestamp', '']
    ]
  },
  {
    n: 'procura', d: 'Compras de principio a fin. Crear y aprobar son permisos distintos a propósito.',
    f: [
      ['solicitud_compra.id', 'bigint PK', ''],
      ['solicitud_compra.solicitante_id', 'bigint FK', ''],
      ['solicitud_compra.items', 'json', 'Array de {articulo, cantidad, justificacion}.'],
      ['solicitud_compra.estado', 'enum', 'abierta · aprobada · rechazada · ordenada · recibida'],
      ['orden.id', 'bigint PK', ''],
      ['orden.solicitud_id', 'bigint FK', ''],
      ['orden.proveedor_id', 'bigint FK', ''],
      ['orden.total', 'numeric(12,2)', ''],
      ['orden.recibida_en', 'timestamp NULL', 'Al recibir se generan los movimientos de entrada al almacén.'],
      ['proveedor.razon', 'varchar(160)', ''],
      ['proveedor.rif', 'varchar(20)', ''],
      ['proveedor.contacto', 'varchar(160)', ''],
      ['proveedor.condiciones', 'varchar(80)', '']
    ]
  },
  {
    n: 'recursos', d: 'Registro de aplicativos, drives, herramientas y correos autorizados. Alimenta el checklist de accesos del onboarding.',
    f: [
      ['id', 'bigint PK', ''],
      ['tipo', 'enum', 'apps · drives · herramientas · emails'],
      ['nombre', 'varchar(120)', ''],
      ['descripcion', 'text', ''],
      ['link', 'varchar(300) NULL', ''],
      ['orden', 'smallint', '']
    ]
  },
  {
    n: 'historial_actividad', d: 'Bitácora por persona. Se consulta desde Mi perfil y desde el expediente en Empleados.',
    f: [
      ['id', 'bigint PK', ''],
      ['usuario_id', 'bigint FK', ''],
      ['texto', 'varchar(300)', 'Ej. «Completó la evaluación 360°: Evaluación 360°».'],
      ['ocurrido_en', 'timestamp', '']
    ]
  }
];

/* ---------- Endpoints ---------- */
const ENDPOINTS = [
  { g: 'Sesión y contexto', e: [
    ['POST', '/api/auth/login', 'Recibe cédula, correo y contraseña. Devuelve token y el usuario con su perfil resuelto.'],
    ['POST', '/api/auth/logout', 'Invalida el token.'],
    ['GET', '/api/me', 'Usuario en sesión: datos, perfil, equipo derivado, permisos efectivos y menú calculado. Es la llamada que arranca el portal.'],
    ['GET', '/api/me/menu', 'Solo el menú: array de ids de pantalla que ese usuario puede abrir, ya resuelto con los cuatro pasos.'],
    ['PATCH', '/api/me/password', 'Cambio de contraseña propia.']
  ]},
  { g: 'Personas', e: [
    ['GET', '/api/usuarios', 'Listado. Filtros: area, perfil, equipo, activo, q. El alcance depende del perfil: Capital Humano y Administradora ven todo; un supervisor ve su rama.'],
    ['GET', '/api/usuarios/:id', 'Expediente completo, con historial y requerimientos.'],
    ['POST', '/api/usuarios', 'Alta. Genera el checklist de onboarding desde requerimientos_catalogo aplicando la herencia con "General".'],
    ['PATCH', '/api/usuarios/:id', 'Edición. Cambiar supervisor_id reasigna el equipo derivado de toda su rama.'],
    ['POST', '/api/usuarios/:id/desincorporar', 'Marca activo=false. Exige el checklist de offboard completo. NO borra el registro.'],
    ['POST', '/api/usuarios/:id/reset-password', 'Restauración de claves. Solo admin y rrhh. Queda en el historial de ambos.'],
    ['GET', '/api/organigrama', 'Árbol jerárquico. El backend resuelve el árbol; el cliente solo lo dibuja.'],
    ['GET', '/api/directorio', 'Listado de contacto con búsqueda y filtros.'],
    ['GET', '/api/equipos', 'Los equipos con sus integrantes, derivados de las anclas.']
  ]},
  { g: 'Perfiles y permisos', e: [
    ['GET', '/api/perfiles', 'Los 8 perfiles con su base, menús y permisos.'],
    ['PATCH', '/api/perfiles/:key', 'Editar menús o permisos. Solo admin. Afecta en el acto a todos los usuarios con ese perfil.'],
    ['POST', '/api/perfiles', 'Crear un perfil nuevo declarando su base_key.'],
    ['GET', '/api/permisos', 'Catálogo de los 13 permisos con su grupo y descripción.'],
    ['GET', '/api/usuarios/:id/permisos', 'Permisos efectivos: los del perfil por herencia más los individuales.'],
    ['PUT', '/api/usuarios/:id/permisos', 'Concede o revoca permisos individuales. Solo admin.'],
    ['GET', '/api/pantallas', 'Catálogo de las 35 pantallas con sus perfiles autorizados.']
  ]},
  { g: 'Biblioteca', e: [
    ['GET', '/api/documentos/categorias', 'Solo las categorías que el usuario en sesión puede ver.'],
    ['GET', '/api/documentos', 'Filtro por categoria. En la categoría personal devuelve ÚNICAMENTE los del usuario en sesión, sin importar su perfil.'],
    ['POST', '/api/documentos', 'Subida. Valida que el usuario pueda escribir en esa categoría.'],
    ['GET', '/api/documentos/:id/descargar', 'Entrega el archivo. Debe re-verificar el permiso: nunca servir por URL directa y adivinable.'],
    ['DELETE', '/api/documentos/:id', '']
  ]},
  { g: 'Mesa de ayuda', e: [
    ['GET', '/api/solicitudes/catalogo', 'Árbol completo: 5 departamentos → 23 categorías → 198 tipos, con el flujo resuelto de cada tipo.'],
    ['GET', '/api/solicitudes', 'Las del usuario en sesión. Filtros: estado, prioridad, departamento.'],
    ['GET', '/api/solicitudes/por-aprobar', 'Bandeja del aprobador: solicitudes cuyo paso actual le corresponde. Ordena por prioridad.'],
    ['GET', '/api/solicitudes/equipo', 'Las del equipo que dirige o apoya. Requiere el permiso notifEquipo o tener reportes directos.'],
    ['POST', '/api/solicitudes', 'Crea el ticket. El backend resuelve la cadena y la guarda como snapshot en el campo cadena.'],
    ['GET', '/api/solicitudes/:id', 'Detalle con su cadena y su historial de eventos.'],
    ['POST', '/api/solicitudes/:id/aprobar', 'Avanza el paso actual. Si era el último, estado=aprobada. Si el tipo genera documento, lo emite aquí.'],
    ['POST', '/api/solicitudes/:id/rechazar', 'Cierra con estado=rechazada. Requiere comentario.'],
    ['GET', '/api/pasos-aprobacion', 'Los 8 pasos con su responsable asignado.'],
    ['PUT', '/api/pasos-aprobacion/:clave', 'Reasigna el responsable de un paso. Solo admin.']
  ]},
  { g: 'Notificaciones', e: [
    ['GET', '/api/pendientes', 'Pendientes propios sin resolver.'],
    ['GET', '/api/pendientes/equipo', 'Pendientes del equipo. Mismo control que solicitudes/equipo.'],
    ['POST', '/api/pendientes/:id/resolver', 'Marca resuelto y registra en el historial.']
  ]},
  { g: 'Inducciones', e: [
    ['GET', '/api/inducciones/mia', 'La ruta que corresponde al perfil del usuario, con su avance.'],
    ['POST', '/api/inducciones/modulos/:id/completar', 'Marca un módulo. Si con eso termina la ruta, dispara la encuesta de cadencia onboarding.'],
    ['GET', '/api/inducciones/equipo', 'Avance de cada persona del equipo. Solo admin y rrhh.']
  ]},
  { g: 'Requerimientos', e: [
    ['GET', '/api/requerimientos/catalogo', 'Catálogo por fase y perfil. Debe indicar explícitamente qué áreas vienen heredadas de "General".'],
    ['PUT', '/api/requerimientos/catalogo', 'Edición del catálogo. Solo admin.'],
    ['GET', '/api/usuarios/:id/requerimientos', 'Checklist de esa persona con su avance.'],
    ['POST', '/api/usuarios/:id/requerimientos/:item/completar', 'Marca un ítem, con soporte opcional.']
  ]},
  { g: 'Encuestas', e: [
    ['GET', '/api/encuestas', 'Listado con conteo de respuestas del ciclo actual. Solo admin y rrhh.'],
    ['GET', '/api/encuestas/pendientes', 'Las que el usuario en sesión debe responder en el ciclo actual.'],
    ['POST', '/api/encuestas', 'Publica una encuesta desde plantilla o desde cero.'],
    ['GET', '/api/encuestas/:id/objetivos-360', 'Solo tipo 360: a quiénes debe evaluar el usuario en sesión, con su relación.'],
    ['POST', '/api/encuestas/:id/responder', 'Guarda la respuesta del ciclo actual. Rechaza una segunda respuesta del mismo ciclo.'],
    ['GET', '/api/encuestas/:id/resultados', 'Agregados por pregunta y por ciclo. En 360, agrupados por persona evaluada.']
  ]},
  { g: 'Asistencia y contratos', e: [
    ['GET', '/api/asistencia', 'Filtros: usuario_id, desde, hasta. Sin usuario_id devuelve la del propio usuario.'],
    ['POST', '/api/asistencia/carga', 'Carga masiva de horarios desde archivo.'],
    ['GET', '/api/contratos', 'Contratos con su estado calculado por fecha de fin.'],
    ['POST', '/api/contratos', ''],
    ['PATCH', '/api/contratos/:id', '']
  ]},
  { g: 'Activos, almacenes y procura', e: [
    ['GET', '/api/activos', 'Requiere almacenVer. Filtros: categoria, estado, asignado_a, sede.'],
    ['POST', '/api/activos', 'Requiere activosGestionar.'],
    ['POST', '/api/activos/:id/asignar', 'Asigna a una persona. Requiere activosGestionar.'],
    ['POST', '/api/activos/:id/devolver', ''],
    ['POST', '/api/activos/:id/baja', ''],
    ['GET', '/api/almacenes/:id/articulos', 'Con existencia calculada y alerta de stock mínimo. Requiere almacenVer.'],
    ['POST', '/api/almacenes/:id/movimientos', 'Entrada, salida o ajuste. Requiere almacenMover.'],
    ['GET', '/api/almacenes/:id/articulos/:art/kardex', 'Movimientos del artículo en orden cronológico.'],
    ['GET', '/api/procura/solicitudes', 'Requiere procuraVer.'],
    ['POST', '/api/procura/solicitudes', 'Requiere procuraCrear.'],
    ['POST', '/api/procura/solicitudes/:id/aprobar', 'Requiere procuraAprobar. Debe rechazar si el aprobador es el mismo solicitante.'],
    ['POST', '/api/procura/ordenes', 'Requiere procuraOrden.'],
    ['POST', '/api/procura/ordenes/:id/recibir', 'Requiere procuraRecibir. Genera los movimientos de entrada.'],
    ['GET', '/api/procura/proveedores', ''],
    ['POST', '/api/procura/proveedores', 'Requiere procuraOrden.']
  ]},
  { g: 'Configuración y contenido', e: [
    ['GET', '/api/recursos', 'Aplicativos, drives, herramientas y correos. Solo admin.'],
    ['POST', '/api/recursos', ''], ['PATCH', '/api/recursos/:id', ''], ['DELETE', '/api/recursos/:id', ''],
    ['GET', '/api/metas', 'Metas del año, visión e histórico. Solo admin y gerencias.'],
    ['GET', '/api/bancos', 'Aliados bancarios con sus condiciones.'],
    ['GET', '/api/anuncios', 'Anuncios del panel de Inicio.'],
    ['GET', '/api/inicio', 'Todo lo del panel de Inicio en una llamada: anuncios, pendientes, cumpleaños del mes y, para la Administradora, los indicadores de dirección.']
  ]}
];

/* ---------- Render ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mCls = m => ({ GET: 'get', POST: 'post', PATCH: 'patch', PUT: 'put', DELETE: 'del' }[m] || 'get');

function renderSchema() {
  return SCHEMA.map(t => `
    <div class="ent">
      <div class="ent-h">
        <span class="nm">${esc(t.n)}</span>
        <span class="ds">${esc(t.d)}</span>
        <span class="chip n">${t.f.length} campos</span>
      </div>
      <table>
        <thead><tr><th style="width:250px">Campo</th><th style="width:270px">Tipo</th><th>Nota</th></tr></thead>
        <tbody>${t.f.map(([f, ty, no]) => `<tr><td class="f">${esc(f)}</td><td class="ty">${esc(ty)}</td><td class="no">${esc(no)}</td></tr>`).join('')}</tbody>
      </table>
    </div>`).join('');
}

function renderEndpoints() {
  return ENDPOINTS.map(g => `
    <h4 class="lbl">${esc(g.g)} · ${g.e.length} endpoints</h4>
    <div class="ent">
      ${g.e.map(([m, u, d]) => `<div class="ep"><div class="m ${mCls(m)}">${m}</div><div class="r"><div class="u">${esc(u)}</div>${d ? `<div class="d">${esc(d)}</div>` : ''}</div></div>`).join('')}
    </div>`).join('');
}

function totals() {
  return {
    entidades: SCHEMA.length,
    campos: SCHEMA.reduce((a, t) => a + t.f.length, 0),
    grupos: ENDPOINTS.length,
    endpoints: ENDPOINTS.reduce((a, g) => a + g.e.length, 0)
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const T = totals();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('kEnt', T.entidades); set('kCam', T.campos); set('kEnd', T.endpoints); set('kGru', T.grupos);
  const s = document.getElementById('schema'); if (s) s.innerHTML = renderSchema();
  const e = document.getElementById('endpoints'); if (e) e.innerHTML = renderEndpoints();
});
