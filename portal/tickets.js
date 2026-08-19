/* ============================================================
   Catálogo de solicitudes (mesa de ayuda) — VEPAGOS
   Departamentos → categorías → tipos de solicitud.
   Cada tipo hereda el flujo de aprobación de su departamento,
   salvo que declare su propio "flujo" (responsables configurables).
   ============================================================ */
window.SV_TICKETS = (function () {
  'use strict';

  // Pasos de aprobación disponibles (el usuario asignado a cada uno es configurable en la app)
  var STEPS = {
    supervisor: { t: 'Supervisor directo', dyn: true },
    ti:         { t: 'Coordinación de Tecnología' },
    sistemas:   { t: 'Gerencia de Sistemas' },
    rrhh:       { t: 'Capital Humano' },
    nomina:     { t: 'Nómina' },
    procura:    { t: 'Procura / Inventario' },
    servicios:  { t: 'Administración (Servicios Generales)' },
    admin:      { t: 'Dirección General' }
  };

  // t = tipo simple (string) ó objeto { n:nombre, id?, flujo?, rango?, perfil? }
  var DEPTS = [
    {
      id: 'tecnologia', nombre: 'Tecnología', color: '#2A6FDB', bg: '#EAF1FD',
      desc: 'Usuarios de sistemas, hardware, red, telefonía 3CX, VPN, desarrollo y accesos.',
      ico: '<rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path>',
      flujo: ['supervisor', 'ti'],
      cats: [
        { nombre: 'Usuarios de sistemas', tipos: [
          'Creación de usuario de dominio / red', 'Modificación de usuario de dominio', 'Baja / eliminación de usuario',
          'Creación de cuenta de correo corporativo', 'Modificación de cuenta de correo', 'Eliminación de cuenta de correo',
          'Restablecimiento de contraseña', 'Desbloqueo de cuenta',
          'Alta de usuario en sistema administrativo', 'Modificación de perfil en sistema administrativo',
          'Alta de usuario en CRM comercial', 'Baja de usuario en CRM comercial'
        ] },
        { nombre: 'Incidencias de hardware', tipos: [
          'Falla de computador de escritorio', 'Falla de laptop', 'Falla de monitor', 'Falla de teclado / mouse',
          'Falla de impresora', 'Configuración de impresora nueva', 'Instalación de equipo nuevo',
          'Reemplazo de disco / SSD', 'Ampliación de memoria RAM', 'Falla de UPS / regulador',
          'Mantenimiento preventivo de equipo', 'Traslado / reubicación de equipo'
        ] },
        { nombre: 'Incidencias de red', tipos: [
          'Sin conexión a internet', 'Internet lento', 'Falla de punto de red cableada', 'Falla de red WiFi',
          'Configuración de punto de red nuevo', 'Falla de switch / router', 'Configuración de impresora en red',
          'Acceso a carpeta compartida', 'Falla de servidor de archivos', 'Caída de servicio interno'
        ] },
        { nombre: 'Telefonía 3CX', tipos: [
          'Creación de extensión 3CX', 'Modificación de extensión 3CX', 'Eliminación de extensión 3CX',
          'Falla de llamada entrante / saliente', 'Configuración de softphone', 'Configuración de teléfono IP',
          'Buzón de voz / desvío de llamadas', 'Reporte de calidad de llamada'
        ] },
        { nombre: 'VPN y accesos remotos', tipos: [
          'Creación de acceso VPN', 'Modificación de acceso VPN', 'Eliminación de acceso VPN',
          'Falla de conexión VPN', 'Configuración de escritorio remoto', 'Acceso remoto temporal a servidor'
        ] },
        { nombre: 'Desarrollo de software', tipos: [
          { n: 'Solicitud de nuevo desarrollo / funcionalidad', flujo: ['supervisor', 'ti', 'sistemas'] },
          'Reporte de error en aplicación interna', 'Cambio / mejora en aplicación interna',
          'Generación de reporte a la medida', 'Integración con sistema externo / API',
          { n: 'Publicación / despliegue a producción', flujo: ['supervisor', 'ti', 'sistemas'] }
        ] },
        { nombre: 'Gestión de accesos', tipos: [
          { n: 'Asignación de permisos a sistema', flujo: ['supervisor', 'ti', 'sistemas'] },
          'Revocación de permisos', 'Acceso a módulo específico',
          { n: 'Acceso a base de datos', flujo: ['supervisor', 'ti', 'sistemas'] },
          'Auditoría de accesos de usuario'
        ] }
      ]
    },

    {
      id: 'talento', nombre: 'Talento Humano', color: '#1F8A5B', bg: '#E7F6EE',
      desc: 'Carnets, permisos, vacaciones, constancias y uniformes por prenda y perfil.',
      ico: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>',
      flujo: ['supervisor', 'rrhh'],
      cats: [
        { nombre: 'Documentos y carnet', tipos: [
          'Carnet institucional nuevo', 'Reposición de carnet',
          { n: 'Constancia de trabajo', id: 'constancia', genera: true }
        ] },
        { nombre: 'Permisos y vacaciones', tipos: [
          { n: 'Solicitud de permiso', id: 'permiso', rango: true },
          { n: 'Solicitud de vacaciones', id: 'vacaciones', rango: true }
        ] },
        { nombre: 'Uniformes', tipos: [
          { n: 'Uniforme — Camisa (Empleado)', perfil: 'empleado' },
          { n: 'Uniforme — Camisa (Aliado)', perfil: 'aliado' },
          { n: 'Uniforme — Chaqueta (Empleado)', perfil: 'empleado' },
          { n: 'Uniforme — Chaqueta (Aliado)', perfil: 'aliado' },
          { n: 'Uniforme — Franela (Aliado)', perfil: 'aliado' },
          { n: 'Uniforme — Gorra (Aliado)', perfil: 'aliado' }
        ] }
      ]
    },

    {
      id: 'procura', nombre: 'Procura', color: '#8A5CD1', bg: '#F1EAFB',
      desc: 'Insumos de oficina, limpieza, consumibles, logística, material P.O.P. y eventos.',
      ico: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><path d="M3 6h18M16 10a4 4 0 0 1-8 0"></path>',
      flujo: ['supervisor', 'procura'],
      cats: [
        { nombre: 'Papelería y oficina', tipos: [
          'Resma de papel carta', 'Resma de papel oficio', 'Sobres blancos', 'Sobres manila', 'Carpetas manila',
          'Carpetas de gancho', 'Carpetas colgantes', 'Ganchos para carpeta', 'Clips', 'Grapas', 'Engrapadora',
          'Perforadora', 'Tijeras', 'Pega en barra', 'Cinta adhesiva', 'Cinta de embalaje', 'Dispensador de cinta',
          'Marcadores', 'Resaltadores', 'Bolígrafos', 'Lápices', 'Borradores', 'Sacapuntas', 'Corrector líquido',
          'Cuadernos', 'Libretas', 'Blocs de notas', 'Notas adhesivas (post-it)', 'Tacos de papel',
          'Separadores de hojas', 'Protectores de hojas', 'Cartuchos de tinta', 'Tóner de impresora',
          'Tabla portapapeles', 'Calculadora', 'Regla', 'Pizarra acrílica', 'Borrador de pizarra',
          'Archivador (caja)', 'Sellos y almohadillas'
        ] },
        { nombre: 'Limpieza y cafetería', tipos: [
          'Café', 'Azúcar', 'Endulzante', 'Filtros de café', 'Vasos desechables', 'Servilletas', 'Agua embotellada',
          'Té / infusiones', 'Tazas', 'Cucharillas', 'Jabón de manos', 'Gel antibacterial', 'Papel toalla',
          'Papel higiénico', 'Bolsas de basura', 'Desinfectante', 'Cloro', 'Ambientador', 'Guantes de limpieza',
          'Escoba y coleto'
        ] },
        { nombre: 'Tecnología y consumibles', tipos: [
          'Mouse', 'Teclado', 'Pen drive / USB', 'Cable HDMI', 'Cable de red', 'Regleta / multitoma',
          'Baterías AA / AAA', 'Audífonos', 'Webcam', 'Cargador'
        ] },
        { nombre: 'Logística', tipos: [
          'Traslado de equipos', 'Envío de encomienda nacional', 'Retiro de encomienda', 'Contratación de mensajería',
          'Movilización de personal', 'Transporte de mercancía', 'Coordinación de flete',
          'Retiro de material en proveedor', 'Distribución de material a sucursales', 'Solicitud de vehículo'
        ] },
        { nombre: 'Material P.O.P.', tipos: [
          'Volantes', 'Afiches', 'Pendones / banners', 'Tarjetas de presentación', 'Brochures', 'Stickers / calcomanías',
          'Roll-up', 'Backing / photocall', 'Merchandising (bolígrafos, llaveros)', 'Señalética'
        ] },
        { nombre: 'Eventos corporativos', tipos: [
          { n: 'Solicitud de evento interno', flujo: ['supervisor', 'procura', 'admin'] },
          { n: 'Activación comercial', flujo: ['supervisor', 'procura', 'admin'] },
          'Coffee break', 'Alquiler de local / salón', 'Catering / refrigerio', 'Mobiliario para evento',
          'Sonido y audiovisuales', 'Decoración', 'Obsequios corporativos', 'Cobertura fotográfica'
        ] }
      ]
    },

    {
      id: 'servicios', nombre: 'Servicios Generales', color: '#C9772A', bg: '#FBF0E3',
      desc: 'Mantenimiento de infraestructura y mobiliario de las oficinas.',
      ico: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.1-2.1z"></path>',
      flujo: ['supervisor', 'servicios'],
      cats: [
        { nombre: 'Mantenimiento e infraestructura', tipos: [
          'Reparación de aire acondicionado', 'Mantenimiento de aire acondicionado', 'Falla eléctrica / tomacorriente',
          'Cambio de bombillos / iluminación', 'Reparación de plomería / filtración', 'Reparación de puerta / cerradura',
          'Limpieza profunda de área', 'Fumigación / control de plagas', 'Mantenimiento general de infraestructura'
        ] },
        { nombre: 'Mobiliario y equipos', tipos: [
          'Reparación de mobiliario (silla / escritorio)', 'Solicitud de mobiliario nuevo',
          'Reparación de cafetera / nevera / cocina'
        ] }
      ]
    },

    {
      id: 'nomina', nombre: 'Nómina', color: '#B23A6E', bg: '#FBE9F1',
      desc: 'Tarjetas Todoticket, gestión de personal, vacaciones, descuentos y reportes legales.',
      ico: '<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20M6 15h4"></path>',
      flujo: ['supervisor', 'nomina'],
      cats: [
        { nombre: 'Todoticket', tipos: [
          'Alta de tarjeta Todoticket', 'Reposición de tarjeta Todoticket', 'Bloqueo de tarjeta Todoticket',
          'Reclamo de recarga Todoticket'
        ] },
        { nombre: 'Gestión de personal', tipos: [
          { n: 'Alta de nuevo empleado en nómina', flujo: ['supervisor', 'rrhh', 'nomina'] },
          { n: 'Baja de empleado en nómina', flujo: ['supervisor', 'rrhh', 'nomina'] },
          'Modificación de datos bancarios',
          { n: 'Modificación de salario / cargo', flujo: ['supervisor', 'rrhh', 'nomina'] }
        ] },
        { nombre: 'Vacaciones y ausencias', tipos: [
          'Cálculo de vacaciones', 'Registro de reposo médico', 'Registro de permiso no remunerado'
        ] },
        { nombre: 'Descuentos y beneficios', tipos: [
          'Aplicación de descuento (préstamo / anticipo)', 'Solicitud de adelanto de nómina',
          'Cesta ticket / bono de alimentación'
        ] },
        { nombre: 'Reportes legales', tipos: [
          'Constancia de retención (ISLR)', 'Reporte / recibo de pago'
        ] }
      ]
    }
  ];

  // ---- Aplanar y asignar ids estables ----
  function slug(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 42);
  }
  var TIPOS = {}, usados = {};
  DEPTS.forEach(function (d) {
    d.cats.forEach(function (c) {
      c.tipos = c.tipos.map(function (t) {
        var o = (typeof t === 'string') ? { n: t } : t;
        var id = o.id || (d.id + '-' + slug(o.n));
        while (usados[id]) { id = id + 'x'; }
        usados[id] = true;
        var tipo = {
          id: id, nombre: o.n, depto: d.id, deptoNombre: d.nombre, cat: c.nombre,
          flujo: o.flujo || d.flujo.slice(),
          rango: !!o.rango, genera: !!o.genera, perfil: o.perfil || null
        };
        TIPOS[id] = tipo;
        return tipo;
      });
    });
  });

  var count = 0; Object.keys(TIPOS).forEach(function () { count++; });

  return { DEPTS: DEPTS, TIPOS: TIPOS, STEPS: STEPS, count: count };
})();
