/* ===== Somos VEPAGOS — datos semilla (demo) ===== */
/* El desarrollador reemplazará esto por una base de datos real. */
window.SV_SEED = (function () {
  'use strict';

  // roles: admin | director | gerente | gerenteop | coordinador | rrhh | interno | ventas | candidato | reclutador | entrenador | inces
  function u(id, nombre, cargo, area, role, managerId, extra) {
    var slug = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z\s]/g, '').trim().split(/\s+/).slice(0, 2).join('.');
    return Object.assign({
      id: id, nombre: nombre, cargo: cargo, area: area, role: role, managerId: managerId,
      email: slug + '@somosvepagos.com',
      telefono: '+58 412-' + String(1000000 + id * 13577).slice(0, 7),
      linkedin: 'https://www.linkedin.com/in/' + slug.replace('.', '-'),
      ciudad: 'Caracas', activo: true,
      cumple: String((id * 7) % 12 + 1).padStart(2, '0') + '-' + String((id * 11) % 28 + 1).padStart(2, '0')
    }, extra || {});
  }

  var USERS = [
    u(1, 'Super Administrador VEPAGOS', 'Dirección General', 'Dirección', 'admin', null, { email: 'admin@somosvepagos.com' }),

    // ===== Comercial =====
    u(10, 'Antonio Palermo', 'Director Comercial', 'Comercial', 'director', 1),
    u(11, 'Aymara González', 'Gerente de Fuerza de Ventas', 'Comercial', 'gerenteop', 10),
    u(12, 'Katherine Peña', 'Coordinadora Fuerza de Venta', 'Comercial', 'reclutador', 11),
    u(13, 'Junairy Morales', 'Coordinadora Fuerza de Venta', 'Comercial', 'reclutador', 11),
    u(90, 'Roberto Quintero', 'Entrenador de Fuerza de Ventas', 'Comercial', 'entrenador', 11),
    u(14, 'Gina Sánchez', 'Analista Fuerza de Venta 1', 'Comercial', 'interno', 12),
    u(15, 'Ricardo López', 'Analista Fuerza de Venta 2', 'Comercial', 'interno', 12),
    u(16, 'Daniela Primera', 'Analista Fuerza de Venta 1', 'Comercial', 'interno', 13),
    u(17, 'Belén Montilla', 'Analista Fuerza de Venta 2', 'Comercial', 'interno', 13),
    u(18, 'Josemith Muñoz', 'Analista Fuerza de Venta 3', 'Comercial', 'interno', 13),
    u(19, 'Brendhy Betancourt', 'Fuerza de Ventas Interna', 'Comercial', 'ventas', 11),
    u(20, 'Ana Fagúndez', 'Fuerza de Ventas Interna', 'Comercial', 'ventas', 11),
    u(21, 'Carlos Balza', 'Fuerza de Ventas Interna', 'Comercial', 'ventas', 11),
    u(22, 'Luis Pérez', 'Gerente de Retención, Logística y Parámetros', 'Comercial', 'gerente', 10),
    u(23, 'Daniel Bohórquez', 'Coordinador de Parámetros', 'Comercial', 'interno', 22),
    u(24, 'Génesis Briceño', 'Coordinadora de Retención', 'Comercial', 'interno', 22),
    u(25, 'Johanlis Espinoza', 'Especialista de Retención', 'Comercial', 'interno', 24),
    u(26, 'Alejandro Vera', 'Especialista de Retención', 'Comercial', 'interno', 24),
    u(27, 'Bryant Vegas', 'Analista de Retención', 'Comercial', 'interno', 24),
    u(28, 'Estefanny Blanco', 'Analista de Retención', 'Comercial', 'interno', 24),
    u(29, 'Grelvis Hernández', 'Coordinador de Logística', 'Comercial', 'interno', 22),
    u(30, 'Otniel Dumont', 'Gerente de SAC', 'Comercial', 'gerente', 10),
    u(31, 'Vanessa González', 'Analista de SAC Solicitudes', 'Comercial', 'interno', 30),
    u(91, 'María Linares', 'Pasante INCES — SAC Solicitudes', 'Comercial', 'inces', 30),
    u(32, 'Darianny Chávez', 'Analista de SAC Solicitudes', 'Comercial', 'interno', 30),
    u(33, 'Angie Rondón', 'Analista de SAC Servicio Técnico', 'Comercial', 'interno', 30),
    u(34, 'Diego Granado', 'Analista de SAC Servicio Técnico', 'Comercial', 'interno', 30),
    u(35, 'Jesús Serrano', 'Gerente de Relaciones Bancarias', 'Comercial', 'gerente', 10),
    u(36, 'Jean Barrios', 'Gerente de Relaciones Bancarias', 'Comercial', 'gerente', 10),
    u(37, 'Leslie Lucena', 'Analista de Relaciones Bancarias 1', 'Comercial', 'interno', 35),
    u(38, 'Kleiverg Hernández', 'Analista de Relaciones Bancarias 2', 'Comercial', 'interno', 36),

    // ===== Sistemas =====
    u(50, 'Catherine Morales', 'Gerente Ejecutiva de Sistemas', 'Sistemas', 'gerente', 1),
    u(51, 'Juan Centeno', 'Coordinador de Mercadeo', 'Sistemas', 'interno', 50),
    u(52, 'Lorean Guevara', 'Diseñadora Gráfica', 'Sistemas', 'interno', 51),
    u(53, 'Layfer Martínez', 'Community Manager', 'Sistemas', 'interno', 51),
    u(54, 'Norelys González', 'Coordinadora de Tecnología e Informática', 'Sistemas', 'interno', 50),
    u(55, 'Alcides Dasilva', 'Desarrollador de Aplicaciones Internas', 'Sistemas', 'interno', 54),
    u(56, 'Thomas Jorge', 'Desarrollador Senior', 'Sistemas', 'interno', 54),
    u(57, 'Nicole Gamboa', 'Analista de Infraestructura', 'Sistemas', 'interno', 54),
    u(58, 'Glady Bogado', 'Coordinadora de Programación', 'Sistemas', 'interno', 50),
    u(59, 'Luis Dávila', 'Analista de Programación 2', 'Sistemas', 'interno', 58),
    u(60, 'Kerwin Buitriago', 'Analista de Programación 3', 'Sistemas', 'interno', 58),
    u(61, 'Jonathan Álvarez', 'Coordinador de Cobranzas', 'Sistemas', 'interno', 50),
    u(62, 'Yorgelis Márquez', 'Analista Senior de Cobranza', 'Sistemas', 'interno', 61),
    u(63, 'Anthony Rodríguez', 'Analista Senior de Cobranza', 'Sistemas', 'interno', 61),

    // ===== Administración y Finanzas =====
    u(70, 'Mayra Gruber', 'Gerente Ejecutiva de Administración y Finanzas', 'Administración', 'gerente', 1),
    u(71, 'Víctor Torrealba', 'Coordinador de Contabilidad', 'Administración', 'coordinador', 70),
    u(72, 'Krysmar Escalante', 'Analista de Contabilidad', 'Administración', 'interno', 71),
    u(73, 'Thalía Carreño', 'Analista de Contabilidad', 'Administración', 'interno', 71),
    u(74, 'César Rivas', 'Coordinador de Administración y Tesorería', 'Administración', 'interno', 70),
    u(75, 'Rosaura García', 'Analista de Administración', 'Administración', 'interno', 74),
    u(76, 'Eileen Bernal', 'Analista de Administración', 'Administración', 'interno', 74),
    u(77, 'Jesús David', 'Coordinador de Capital Humano', 'Administración', 'rrhh', 70, { email: 'rrhh@somosvepagos.com' }),
    u(78, 'Jorfre Sulbarán', 'Coordinador de Inventario y Operaciones', 'Administración', 'interno', 70),
    u(79, 'Gregory Benítez', 'Analista de Almacén', 'Administración', 'interno', 78)
  ];

  // ===== Documentos =====
  // real:true → archivo real en el proyecto. real:false → demo (se genera archivo de ejemplo al descargar)
  var FICHAS = [
    ['VEPAGOS Mini', 'Ficha-Mini-Credicard.pdf'], ['VEPAGOS Plus', 'Ficha-Plus-Credicard.pdf'], ['VEPAGOS Pro', 'Ficha-Pro-Credicard.pdf'],
    ['Q2 (Credicard)', 'Ficha-Q2-Credicard.pdf'], ['Q3 (Credicard)', 'Ficha-Q3-Credicard.pdf'], ['T1 Pro (Credicard)', 'Ficha-T1-Pro-Credicard.pdf'],
    ['A50 (Credicard)', 'Ficha-A50-Credicard.pdf'], ['9220 (Platco)', 'Ficha-9220-Platco.pdf'], ['9810 (Platco)', 'Ficha-9810-Platco.pdf'],
    ['A50 (Banesco)', 'Ficha-A50-Banesco.pdf'], ['A8900 (Banesco)', 'Ficha-A8900-Banesco.pdf']
  ];
  var DOCS = [];
  // Equipos: derivados del organigrama (ancla = coordinador/gerente del equipo)
  var TEAM_ANCHORS = {
    11: 'Fuerza de Ventas', 22: 'Retención, Logística y Parámetros', 30: 'SAC',
    51: 'Mercadeo', 54: 'Tecnología e Informática', 58: 'Programación', 61: 'Cobranzas',
    71: 'Contabilidad', 74: 'Administración y Tesorería', 77: 'Capital Humano', 78: 'Inventario y Operaciones'
  };
  USERS.forEach(function (usr) {
    var cur = usr, guard = 0;
    usr.equipo = null;
    while (cur && guard++ < 20) {
      if (TEAM_ANCHORS[cur.id]) { usr.equipo = TEAM_ANCHORS[cur.id]; break; }
      var mid = cur.managerId;
      cur = USERS.find(function (x) { return x.id === mid; });
    }
  });

  var did = 1;
  FICHAS.forEach(function (f) {
    DOCS.push({ id: did++, cat: 'fichas', nombre: 'Ficha técnica — ' + f[0], archivo: 'fichas/' + f[1], real: true, fecha: '2026-05-10', por: 'Super Administrador VEPAGOS' });
  });
  [
    ['planes', 'Plan de servicio — Estándar 2026'], ['planes', 'Plan de servicio — Alto volumen 2026'], ['planes', 'Tabla de comisiones por switch 2026'],
    ['presentaciones', 'Presentación comercial VEPAGOS 2026'], ['presentaciones', 'Pitch corto — Fuerza de ventas'], ['presentaciones', 'Presentación institucional'],
    ['oferta', 'Oferta comercial vigente — Julio 2026'], ['oferta', 'Promoción activación 72h'],
    ['contratos', 'Modelo de contrato — Afiliación de comercio'], ['contratos', 'Modelo de contrato — Fuerza de ventas independiente'], ['contratos', 'Acuerdo de confidencialidad (NDA)'],
    ['rrhh', 'Manual del empleado 2026'], ['rrhh', 'Código de ética'], ['rrhh', 'Formato de solicitud de vacaciones']
  ].forEach(function (d) {
    DOCS.push({ id: did++, cat: d[0], nombre: d[1], archivo: null, real: false, fecha: '2026-06-01', por: 'Super Administrador VEPAGOS' });
  });
  // Marca (archivos reales)
  [['Logo color (PNG)', 'assets/marca/logo-color.png'], ['Logo blanco (PNG)', 'assets/marca/logo-blanco.png'], ['Isotipo verde (PNG)', 'assets/marca/iso-verde.png']].forEach(function (m) {
    DOCS.push({ id: did++, cat: 'marca', nombre: m[0], archivo: m[1], real: true, fecha: '2026-04-15', por: 'Juan Centeno' });
  });
  // Documentos con alcance por departamento o equipo
  [
    ['planes', 'Política de comisiones — Fuerza de Ventas', { equipo: 'Fuerza de Ventas' }],
    ['planes', 'Procedimiento de cobranzas a comercios', { equipo: 'Cobranzas' }],
    ['oferta', 'Guía de despacho y logística de terminales', { equipo: 'Retención, Logística y Parámetros' }],
    ['presentaciones', 'Roadmap de sistemas 2026', { depto: 'Sistemas' }],
    ['rrhh', 'Presupuesto y cierres contables', { depto: 'Administración' }]
  ].forEach(function (d) {
    DOCS.push({ id: did++, cat: d[0], nombre: d[1], archivo: null, real: false, fecha: '2026-06-20', por: 'Super Administrador VEPAGOS', depto: d[2].depto || null, equipo: d[2].equipo || null });
  });

  var POS_CATALOGO = [
    {
      "name": "Mini",
      "tag": "Más ligero",
      "sub": "Portátil y ligero para delivery.",
      "bullets": [
        "Android 9.0 · NFC",
        "4.0\" táctil · Sin impresora",
        "222 g · Wi-Fi · 4G · 2500 mAh"
      ],
      "sw": "credicard",
      "img": "assets/productos/norm-mini-front-new.png"
    },
    {
      "name": "Plus",
      "tag": "Mostrador estable",
      "sub": "Teclado físico e impresora integrada.",
      "bullets": [
        "Android 13 · NFC",
        "Teclado + impresora 58 mm",
        "Wi-Fi 5GHz · 4G · 5200 mAh"
      ],
      "sw": "credicard",
      "img": "assets/productos/norm-plus-front-new.png"
    },
    {
      "name": "Pro",
      "tag": "Más potente",
      "sub": "Pantalla grande y alto rendimiento.",
      "bullets": [
        "Android 12 · NFC + chip",
        "Pantalla 5.5\" HD · Impresora",
        "Wi-Fi 5GHz · 4G · 5200 mAh"
      ],
      "sw": "credicard",
      "img": "assets/productos/norm-pro-front-new.png"
    },
    {
      "name": "Q2",
      "tag": "Smart POS",
      "sub": "Smart POS Android con impresora.",
      "bullets": [
        "Android 5.X · NFC",
        "5.5\" HD · Impresora",
        "415 g · Wi-Fi · 4G/3G"
      ],
      "sw": "credicard",
      "img": "assets/productos/norm-q2-front.png"
    },
    {
      "name": "Q3",
      "tag": "POS portátil",
      "sub": "POS portátil ultraligero.",
      "bullets": [
        "Snapdragon · NFC",
        "Sin impresora",
        "205 g · Wi-Fi · 4G/3G"
      ],
      "sw": "credicard",
      "img": "assets/productos/norm-q3-front.png"
    },
    {
      "name": "T1 Pro",
      "tag": "Smart POS",
      "sub": "Smart POS Android con impresora integrada.",
      "bullets": [
        "Android 7.0 · NFC",
        "Impresora integrada",
        "Wi-Fi · 4G · SIM a elección"
      ],
      "sw": "credicard",
      "img": "assets/productos/norm-t1pro-side.png"
    },
    {
      "name": "A50",
      "tag": "POS portátil",
      "sub": "POS portátil ultraligero.",
      "bullets": [
        "Android 8.1 · NFC",
        "4.5\" · Sin impresora",
        "161 g · Wi-Fi · 4G"
      ],
      "sw": "credicard",
      "img": "assets/productos/norm-a50-front.png"
    },
    {
      "name": "9220 (Platco)",
      "tag": "Smart POS",
      "sub": "Smart POS Android de gama alta.",
      "bullets": [
        "Android 12 · NFC",
        "5.5\" HD · Impresora",
        "5200 mAh · Octa-core"
      ],
      "sw": "platco",
      "img": "assets/productos/norm-9220-front.png"
    },
    {
      "name": "9810 (Platco)",
      "tag": "Smart POS",
      "sub": "Smart POS Android compacto.",
      "bullets": [
        "Android 13 · NFC",
        "Impresora integrada",
        "Wi-Fi 5G · 4G"
      ],
      "sw": "platco",
      "img": "assets/productos/norm-9810-front.png"
    },
    {
      "name": "A50 (Banesco)",
      "tag": "POS portátil",
      "sub": "POS portátil ultraligero.",
      "bullets": [
        "Android 8.1",
        "4.5\" · Sin impresora",
        "161 g · Wi-Fi · 4G"
      ],
      "sw": "banesco",
      "img": "assets/productos/norm-a50-front.png"
    },
    {
      "name": "A8900 (Banesco)",
      "tag": "POS con teclado",
      "sub": "POS tradicional con teclado e impresora.",
      "bullets": [
        "Android 12 · Teclado",
        "5.5\" HD · Impresora",
        "Wi-Fi 5GHz · 4G"
      ],
      "sw": "banesco",
      "img": "assets/productos/norm-a8900-front.png"
    }
  ];

  var DOC_CATS = [
    { id: 'fichas', nombre: 'Fichas técnicas', desc: 'PDF de todos los modelos POS', roles: ['admin', 'gerente', 'rrhh', 'interno', 'ventas', 'reclutador', 'candidato', 'entrenador', 'inces'] },
    { id: 'planes', nombre: 'Planes de servicio', desc: 'Planes, tarifas y comisiones', roles: ['admin', 'gerente', 'rrhh', 'interno', 'ventas', 'reclutador', 'entrenador'] },
    { id: 'presentaciones', nombre: 'Presentaciones', desc: 'Material para presentar a clientes', roles: ['admin', 'gerente', 'rrhh', 'interno', 'ventas', 'reclutador', 'candidato', 'entrenador', 'inces'] },
    { id: 'oferta', nombre: 'Oferta comercial', desc: 'Ofertas y promociones vigentes', roles: ['admin', 'gerente', 'rrhh', 'interno', 'ventas', 'reclutador', 'entrenador'] },
    { id: 'contratos', nombre: 'Contratos', desc: 'Modelos de contrato con clientes', roles: ['admin', 'gerente'] },
    { id: 'rrhh', nombre: 'Capital humano', desc: 'Manuales y formatos internos', roles: ['admin', 'rrhh', 'gerente', 'interno'] },
    { id: 'captaciones', nombre: 'Captaciones', desc: 'Manual de contratación, perfiles de vacantes, guías de búsqueda y piezas de difusión del proceso de reclutamiento.', roles: ['admin', 'rrhh', 'gerente', 'director'] },
    { id: 'marca', nombre: 'Marca', desc: 'Logos y recursos gráficos', roles: ['admin', 'gerente', 'rrhh', 'interno', 'ventas', 'reclutador', 'entrenador'] },
    { id: 'prompts', nombre: 'Prompts para IA', desc: 'Prompts listos para usar con asistentes de IA (ventas, soporte, redacción y más). Cópialos y pégalos.', roles: ['admin', 'gerente', 'rrhh', 'interno', 'ventas', 'reclutador', 'entrenador', 'inces'] },
    { id: 'personales', nombre: 'Mis documentos', desc: 'Documentos privados que usas a diario y que solo te corresponden a ti. Nadie más puede verlos: constancias, aprobaciones y soportes emitidos por Capital Humano.', roles: ['admin', 'gerente', 'rrhh', 'interno', 'ventas', 'reclutador', 'candidato', 'entrenador', 'inces'] }
  ];

  // ===== Onboarding por rol =====
  var ONBOARDING = {
    interno: { titulo: 'Inducción — Equipo VEPAGOS', modulos: [
      { id: 'i1', t: 'Bienvenida a VEPAGOS', d: 'Quiénes somos, nuestro propósito y las 3 plataformas con las que operamos.',
        color: '#2A6FDB', bg: 'rgba(42,111,219,.12)',
        ico: '<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"></path>',
        lesson: [
          { h: 'Quiénes somos (y qué haces tú aquí)', b: 'Estás entrando a <b>VEPAGOS</b> (Consultora Alca, C.A.), una empresa venezolana nacida en <b>2019</b> con una sola obsesión: que cobrar sea simple para los comercios del país. Entregamos puntos de venta, los mantenemos funcionando y damos soporte los <b>365 días del año</b>. ¿Qué significa para ti? Que trabajas en algo que se usa de verdad, todos los días, en miles de negocios reales: <b>tu trabajo se nota</b>.<br><br><b style="color:#2A6FDB">Para arrancar bien:</b> aprende a decir en una sola frase qué hace VEPAGOS. Te servirá con clientes, con amigos y en tu propio LinkedIn.',
            key: 'Guárdate esta frase: “En VEPAGOS hacemos que cualquier comercio cobre con tarjeta, fácil y con soporte todos los días.” Repetirla te da seguridad desde el día uno.' },
          { h: 'Nuestro propósito, tu brújula diaria', b: 'Todo lo que hacemos cabe en tres palabras: <b>hacer crecer tu negocio</b> (el del cliente). No entregamos aparatos: logramos que un comercio venda más y cobre mejor. Cuando entiendes esto, tu trabajo deja de ser una lista de tareas y gana un porqué, y eso además te vuelve mejor profesional, porque empiezas a decidir pensando en el cliente.<br><br><b style="color:#2A6FDB">Aplícalo hoy:</b> en tu próxima tarea pregúntate “¿esto ayuda al comercio a vender o cobrar mejor?”. Si la respuesta es sí, vas bien encaminado.',
            key: 'Cuando dudes qué priorizar, elige lo que hace crecer el negocio del cliente. Ese criterio te va a distinguir en cualquier equipo.' },
          { h: 'Las 3 plataformas que te vuelven valioso', b: 'Nuestros terminales procesan a través de <b>tres switches</b>, y saber esto no es dato de trivia: <b>es lo que te hace útil</b>. Quien sabe qué plataforma le conviene a cada cliente resuelve rápido y se gana la confianza.<div style="margin-top:13px;border:1px solid #E3EAF3;border-radius:11px;padding:13px 15px;background:#F5F8FD;font-size:13.5px;color:#33415C;line-height:1.9"><b style="color:var(--navy)">Credicard</b> · 12 bancos aliados<br><b style="color:var(--navy)">Platco</b> · Mercantil y BBVA Provincial<br><b style="color:var(--navy)">Banesco</b> · Banesco</div><div style="margin-top:10px">En total, un comercio puede cobrar con <b>15 bancos</b> según su terminal.</div>',
            key: 'Memoriza el mapa banco→plataforma: es la pregunta que más te van a hacer, y responderla al instante te hace ver como un experto.' },
          { h: 'VEPAGOS en números (tu respaldo)', b: '<ul><li><b>+80.000</b> clientes atendidos</li><li><b>+50.000</b> clientes activos</li><li><b>15</b> bancos aliados</li><li>Cobertura nacional, con fuerza de ventas en todo el país</li></ul>Estos números son tu respaldo: cuando hablas de VEPAGOS no vendes una promesa, hablas de una empresa probada. Y formar parte de algo que crece te deja algo valioso para tu carrera: <b>experiencia real en una fintech con volumen real</b>.<br><br><b style="color:#2A6FDB">Micro-acción:</b> quédate con el número que más te impresione y úsalo la próxima vez que presentes a VEPAGOS.<br><br>Lo que aprendas aquí sobre pagos, clientes y operación te lo llevas para toda tu carrera.',
            key: 'Cuando el negocio del cliente crece, crece Venezuela; y cuando la empresa crece, creces tú. Aprovecha cada oportunidad de aprender aquí.' }
        ],
        quiz: [
          { q: '¿Cuál es el propósito de VEPAGOS?', opts: ['Vender la mayor cantidad de equipos', 'Hacer crecer tu negocio', 'Competir con los bancos'], a: 1 },
          { q: '¿En qué año fue fundada VEPAGOS?', opts: ['2015', '2019', '2022'], a: 1 },
          { q: '¿Con cuántas plataformas de procesamiento opera VEPAGOS?', opts: ['1', '3', '5'], a: 1 },
          { q: '¿Cuántos bancos aliados tiene VEPAGOS en total?', opts: ['5', '10', '15'], a: 2 }
        ]
      },
      { id: 'i2', t: 'Manual del empleado', d: 'Vestimenta, horarios, normas de comportamiento y uso de recursos.',
        color: '#E0447B', bg: 'rgba(224,68,123,.12)',
        ico: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6M9 13h6M9 17h6"></path>',
        lesson: [
          { h: 'Tu horario es un acuerdo, no una jaula', b: 'La jornada administrativa es de <b>lunes a viernes, 8:00 a.m. a 5:00 p.m.</b>, con una hora de almuerzo. Más que un horario es un acuerdo: cuando cada quien cumple su parte, el equipo puede confiar y todo fluye sin fricción. Si un día vas a llegar tarde o faltar, <b>avisa con tiempo</b> a tu supervisor y a Capital Humano, no por control, sino porque tu parte le importa a alguien más.<br><br><b style="color:#E0447B">Tip práctico:</b> guarda hoy en tu teléfono los contactos de tu supervisor y de Capital Humano, para avisar en segundos si surge algo.',
            key: 'La puntualidad no es rigidez: es la forma más simple de que confíen en ti. Y la confianza es lo que abre las mejores oportunidades.' },
          { h: 'Cómo te vistes también habla por ti', b: 'Usamos <b>formal-casual (business casual)</b> y, cuando toca calle o eventos, la <b>franela institucional VEPAGOS</b>. La razón es sencilla: cuando un cliente te ve, te ve a ti y a la empresa al mismo tiempo. Vestir cuidado no es apariencia vacía, <b>es una herramienta: te da autoridad y abre puertas</b> antes de que digas una palabra.<br><br><b style="color:#E0447B">Aplícalo:</b> arma 2 o 3 combinaciones cómodas y correctas que sepas que siempre funcionan, para no pensarlo cada mañana.',
            key: 'Vístete para el rol que quieres, no solo para el que tienes hoy. La gente te trata según cómo te presentas.' },
          { h: 'El buen trato construye tu reputación', b: 'Aquí no hay letra chica: trato respetuoso siempre, cuidar la imagen de VEPAGOS dentro y fuera, <b>cero tolerancia al acoso y a la discriminación</b>, y resolver los roces por los canales internos. ¿Por qué te importa a ti? Porque un ambiente sano es lo que hace que quieras venir a trabajar, y tú eres parte de crearlo. Además, cómo tratas a los demás <b>construye tu reputación</b>, y esa te sigue a donde vayas.<br><br><b style="color:#E0447B">Micro-acción:</b> hoy reconoce en voz alta el buen trabajo de alguien del equipo. Cuesta cero y cambia el clima.',
            key: 'Tu forma de tratar a la gente es tu tarjeta de presentación más honesta. Cúidala como cuidas tu currículum.' },
          { h: 'Cuidar la información te vuelve de fiar', b: 'Los equipos, sistemas y datos son para uso laboral, y <b>la información de clientes y de la empresa es confidencial</b>: no sale de VEPAGOS. Esto te protege a ti tanto como a la empresa, y manejar datos sensibles con responsabilidad es una habilidad profesional muy valorada en cualquier lado. El detalle completo está en el <b>Manual del Empleado 2026</b> (Biblioteca → Capital humano).<br><br><b style="color:#E0447B">Tip:</b> ante la duda de si algo se puede compartir, la respuesta corta es no; pregunta primero.<br><br>Manejar bien la confianza que te dan es, quizá, la competencia que más rápido te hace crecer.',
            key: 'La información de un cliente es sagrada: nunca sale de VEPAGOS. Ser de fiar con los datos te vuelve indispensable.' }
        ],
        quiz: [
          { q: '¿Cuál es el horario administrativo de VEPAGOS?', opts: ['Lunes a sábado 7am–3pm', 'Lunes a viernes 8am–5pm', 'Horario libre'], a: 1 },
          { q: '¿Qué se espera del código de vestimenta?', opts: ['Ropa deportiva', 'Formal-casual y franela institucional cuando aplique', 'No hay reglas'], a: 1 },
          { q: 'La información de los clientes es…', opts: ['Pública', 'Confidencial y de uso solo laboral', 'Se puede compartir con conocidos'], a: 1 },
          { q: '¿Dónde está el detalle completo de las normas?', opts: ['Manual del Empleado 2026 en la Biblioteca', 'No existe', 'Solo lo sabe el gerente'], a: 0 }
        ]
      },
      { id: 'i3', t: 'Conoce el producto', d: 'Los POS del catálogo, qué incluye el servicio y los planes.',
        color: '#00B871', bg: 'rgba(0,184,113,.13)',
        ico: '<rect x="5" y="2" width="14" height="20" rx="2"></rect><path d="M12 18h.01"></path>',
        lesson: [
          { h: 'Vas a poder explicar qué es un POS sin dudar', b: 'Un POS (punto de venta, terminal, como prefieras llamarlo) es el equipo con el que un comercio cobra con tarjetas y pagos digitales. <b>VEPAGOS es una empresa de comercialización de POS:</b> tenemos <b>nuestros propios puntos, los UROVO</b>, y al mismo tiempo comercializamos otras marcas para ofrecerle al mercado la mayor variedad. Vas desde equipos móviles compactos hasta <b>Smart POS con pantalla táctil e impresora</b>. Al terminar este módulo <b>vas a poder explicárselo a cualquier persona con seguridad</b>, y esa seguridad es la que cierra ventas y resuelve soportes.<br><br>Y ojo: esto no es solo para el área comercial. <b>Todas las áreas debemos conocer lo que vendemos</b>, porque el producto es lo que le da trabajo a cada uno de nosotros. Entiendas de administración, soporte, RRHH o ventas, saber qué ofrecemos te hace parte del equipo que hace crecer la empresa.<br><br><b style="color:#00874f">Practícalo:</b> di en voz alta, con tus palabras, qué es un POS. Si te suena natural, ya diste el primer paso para volverte experto.',
            key: 'Un cliente confía en quien explica claro. Cuanto mejor entiendas el producto, más fácil te dirán que sí.' },
          { h: 'Por qué hay un modelo distinto para cada plataforma', b: 'Cada POS se conecta a un <b>suiche transaccional</b>: es el sistema que recibe el pago, lo enruta al banco y devuelve la aprobación en segundos. Es como el "cerebro" invisible que hace que un cobro funcione. En Venezuela hay varios suiches —<b>Credicard, Platco y Banesco</b>— y <b>cada equipo está certificado para trabajar con uno</b>. Por eso no existe un POS único: el modelo se elige según el suiche y las necesidades del comercio.<br><br>Los 11 modelos se agrupan justo por esa plataforma: <b>Credicard</b> (Q2, Q3, T1 Pro, A50…), <b>Platco</b> (9220, 9810) y <b>Banesco</b> (A50, A8900). Nuestra línea propia (los <b>UROVO</b>) se presenta como <b>Mini, Plus y Pro</b>. No necesitas memorizar cada spec: lo importante es entender que <b>tanta variedad existe para cubrir a todo tipo de comercio</b>, con el suiche y el equipo que mejor le sirva.<div style="margin-top:13px;border:1px solid #E3EAF3;border-radius:11px;padding:13px 15px;background:#F4FBF7;font-size:13.5px;color:#33415C;line-height:1.9"><b style="color:var(--navy)">Mini</b> · comercio pequeño o que empieza<br><b style="color:var(--navy)">Plus</b> · el equilibrio para la mayoría (el más recomendado)<br><b style="color:var(--navy)">Pro</b> · alto volumen y quien quiere lo mejor</div>',
            key: 'El suiche transaccional es el sistema que enruta el pago al banco y devuelve la aprobación. Por eso hay un modelo por plataforma: cada uno está certificado para su suiche.' },
          { h: 'El POS necesita un servicio, igual que un celular', b: 'Comprar el equipo es solo el primer paso. Después de adquirir un punto de venta, el cliente <b>necesita contratar un servicio</b>, tal cual como un celular necesita un plan para funcionar. Según el plan que elija, se le cobra un <b>monto diario</b> a través de <b>domiciliación de cuentas en bolívares, a la tasa legal vigente</b>.<br><br>Ese servicio no es solo "encender el equipo": incluye una serie de beneficios que lo respaldan todo el tiempo:<ul><li><b>Transacciones ilimitadas</b>, sin comisión por cada cobro</li><li><b>Conectividad 4G + Wi-Fi</b> con SIM incluida</li><li><b>Soporte 365 días</b>, con garantía y reemplazo del equipo</li><li><b>Sin cuota de instalación ni permanencia</b></li></ul>Entender esto es clave para cualquier área: el servicio es lo que mantiene al comercio funcionando día a día, y es la razón por la que el cobro es diario y no un solo pago.',
            key: 'El equipo se compra una vez; el servicio se contrata como el plan de un celular. Se cobra un monto diario por domiciliación en Bs a la tasa legal, e incluye transacciones ilimitadas, conectividad y soporte 365 días.' }
        ],
        quiz: [
          { q: '¿Cuántos modelos de POS ofrece VEPAGOS?', opts: ['3', '7', '11'], a: 2 },
          { q: '¿Cómo se llama la línea propia de VEPAGOS?', opts: ['Mini, Plus y Pro', 'Q2, Q3 y T1', 'Uno, Dos y Tres'], a: 0 },
          { q: '¿Qué incluye el servicio del POS?', opts: ['Comisión por cada transacción', 'Transacciones ilimitadas y soporte 365 días', 'Solo el equipo, sin soporte'], a: 1 },
          { q: '¿Cómo se cobra el Plan Regular?', opts: ['En efectivo mensual', 'Tarifa diaria por domiciliación en bolívares (tasa BCV)', 'Un solo pago anual'], a: 1 }
        ]
      },
      { id: 'i4', t: 'Herramientas internas', d: 'Correo, sistemas y canales que usarás a diario.',
        color: '#7C5CFC', bg: 'rgba(124,92,252,.12)',
        ico: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>',
        lesson: [
          { h: 'Tu correo: el atajo para enterarte antes que nadie', b: 'Tu cuenta <b>@somosvepagos.com</b> es tu identidad oficial: por ahí llegan anuncios, accesos y coordinaciones. Revísala a diario y será tu primer atajo, porque te enteras de todo de primera mano.<br><br><b style="color:#7C5CFC">Tip accionable:</b> configura tu firma hoy (nombre, cargo, teléfono) y activa las notificaciones en el celular. Dos minutos que te ahorran malentendidos toda la semana.',
            key: 'Una bandeja ordenada es tiempo libre. Crea una carpeta “Importante” y archiva el resto: encontrarás todo en segundos.' },
          { h: 'Eureka y SAC: resolver en minutos, no en horas', b: 'Son los dos aplicativos con los que vas a trabajar: <b>Eureka</b> (gestión comercial y afiliaciones) y <b>SAC</b> (atención al cliente y soporte). Los tienes en el menú lateral, bajo <b>Aplicativos VEPAGOS</b>. Moverte rápido en ellos <b>es la diferencia entre resolver en minutos o en horas</b>.<br><br><b style="color:#7C5CFC">Tip accionable:</b> abre Eureka y SAC hoy, aunque sea solo a mirar. Familiarizarte antes de necesitarlos te quita el estrés del primer caso real.',
            key: 'Cuando descubras un truco en Eureka o SAC, anótalo. Tu propio manual de atajos te hará el más rápido del equipo.' },
          { h: 'La intranet: casi todo ya está aquí', b: 'Esta intranet es tu centro de operaciones: Biblioteca de documentos, Organigrama, Directorio, Cultura e Inducciones. Casi todo lo que necesitas está a un clic, así que <b>no tienes que preguntar, tienes que buscar aquí primero</b>. Y ser de los que resuelven solos te hace ver muy profesional.<br><br><b style="color:#7C5CFC">Tip accionable:</b> guarda la intranet en favoritos y completa tu perfil (foto, contacto, cumpleaños) para que el equipo te ubique.',
            key: 'Antes de preguntar dónde está un documento, búscalo en la Biblioteca. El 90% de las respuestas ya están aquí.' },
          { h: 'Comunícate por el canal correcto', b: 'Coordinamos por los <b>grupos oficiales de WhatsApp</b> de cada equipo y por correo. Para atender a comercios, siempre por los <b>canales oficiales de VEPAGOS, nunca por vías personales</b>. Esto te protege: separa tu vida de tu trabajo y deja todo registrado.<br><br><b style="color:#7C5CFC">Tip accionable:</b> silencia los grupos fuera del horario laboral, pero deja fijado el de tu equipo. Presente sin vivir pegado al teléfono.<br><br>Aprender a comunicarte claro y por el canal correcto es una habilidad que te abrirá puertas toda la vida.',
            key: 'Todo lo laboral por canales oficiales. Nunca uses tu WhatsApp personal para atender a un comercio: te cuida a ti.' }
        ],
        quiz: [
          { q: '¿Cuál es tu identidad oficial de comunicación?', opts: ['Tu correo personal', 'El correo @somosvepagos.com', 'WhatsApp personal'], a: 1 },
          { q: '¿Para qué sirve Eureka?', opts: ['Gestión comercial y de afiliaciones', 'Enviar la nómina', 'Nada, es decorativo'], a: 0 },
          { q: '¿Qué es SAC?', opts: ['Un modelo de POS', 'El servicio de atención al cliente y soporte', 'Un banco aliado'], a: 1 },
          { q: '¿Dónde encuentras la Biblioteca, el Organigrama y tus inducciones?', opts: ['En el correo', 'En la intranet Somos VEPAGOS', 'En el POS'], a: 1 }
        ]
      },
      { id: 'i5', t: 'Optimiza tu LinkedIn', d: 'Herramientas reales para que tu perfil trabaje por ti: foto, titular, Acerca de y más, paso a paso.',
        color: '#0A66C2', bg: 'rgba(10,102,194,.12)',
        ico: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle>',
        lesson: [
          { h: 'Tu perfil ya habla de ti (aunque no lo toques)', b: 'Quizá tienes el LinkedIn abandonado: la foto de hace años, el Acerca de en blanco y sin saber muy bien para qué sirve. Tranquilo, es lo normal. Pero ten esto claro: <b>cuando un cliente, un aliado o un reclutador te busca, tu perfil habla por ti antes de que digas una palabra</b>. Un buen perfil te abre puertas incluso cuando no estás buscando nada: contactos, oportunidades y una marca personal que te acompaña toda la carrera. Y cuando cada uno de nosotros brilla, <b>somos, en conjunto, el mejor canal de la marca</b>.<br><br><b style="color:#0A66C2">Hazlo ahora (menos de 3 min):</b> entra a tu perfil, ponlo en <b>modo público</b> y personaliza tu URL en "Editar perfil público y URL" para que sea fácil de compartir.<div style="margin-top:13px;border:1px dashed #A9BBD4;border-radius:11px;padding:13px 15px;background:#F5F9FD"><div style="font-size:10.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#0A66C2;margin-bottom:7px">Antes → Después</div><div style="font-size:13.5px;color:#8496AE;line-height:1.7">linkedin.com/in/gina-8f3a2k9</div><div style="font-size:13.5px;color:var(--navy);font-weight:700;line-height:1.7">linkedin.com/in/gina-perez-vepagos</div></div>',
            key: 'Pega tu URL nueva en la firma del correo y en tu WhatsApp de trabajo. Un perfil que nadie encuentra no te suma nada.' },
          { h: 'Odias salir en fotos. Aun así, sin foto no existes', b: 'A casi nadie le encanta su propia foto, pero <b>los perfiles con foto reciben muchísimas más visitas y mensajes</b> que los del avatar gris. No necesitas un estudio: con el celular y luz natural basta y sobra. Una buena foto genera confianza en un segundo, y esa confianza es tuya: te la llevas a donde vayas.<br><br><b style="color:#0A66C2">Hazlo ahora (menos de 3 min):</b> ponte frente a una ventana, fondo limpio, encuadra del pecho a la cabeza (rostro ~60% del cuadro), mira a la cámara y sonríe. Toma 5 y elige la mejor. Mercadeo puede ayudarte si quieres una más pro.',
            dd: [
              { ok: true, t: 'Rostro centrado, buena luz natural, fondo neutro y una sonrisa segura.' },
              { ok: false, t: 'Selfie oscuro, lentes de sol, foto de grupo recortada o avatar gris.' }
            ],
            key: 'Usa la misma foto en LinkedIn, el correo y Slack/Teams. Que te reconozcan de un vistazo en todos lados.' },
          { h: 'El espacio más grande de tu perfil está vacío', b: 'El banner (esa franja detrás de tu foto) es lo primero que se ve, y casi todo el mundo lo deja en gris por defecto. <b>Es tu valla publicitaria gratis</b>: dice a qué te dedicas antes de que lean una sola palabra. Ponerle uno bien hecho te hace ver un paso más profesional que la mayoría de los perfiles.<br><br><b style="color:#0A66C2">Hazlo ahora (menos de 3 min):</b> descarga uno de los <b>6 headers oficiales</b> del equipo (Biblioteca → carpeta "Headers Definitivos Equipo VEPAGOS"), súbelo en 1584×396 px y deja despejado el lado donde va tu foto.',
            key: 'Antes de guardar, revisa la vista previa en celular: ahí se recorta distinto. Si tu cara tapa el texto del banner, ajústalo.' },
          { h: 'No sabes qué poner ahí, y quedó solo tu cargo', b: 'El titular es la línea bajo tu nombre, y casi siempre queda en el cargo por defecto o en un genérico tipo "Apasionado | Soñador". <b>Es el texto tuyo que más se ve</b>: aparece en búsquedas, comentarios y mensajes. Ahí se decide si generas interés o pasas desapercibido. Uno bueno te posiciona y deja claro qué valor entregas.<br><br><b style="color:#0A66C2">Hazlo ahora (menos de 3 min):</b> cambia tu titular con esta fórmula: <b>[Rol] en VEPAGOS | Ayudo a [a quién] a [resultado]</b>.<div style="margin-top:13px;border:1px dashed #A9BBD4;border-radius:11px;padding:13px 15px;background:#F5F9FD"><div style="font-size:10.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#0A66C2;margin-bottom:7px">Copia y adapta</div><div style="font-size:13.5px;color:#8496AE;line-height:1.7">Antes: Ejecutiva Comercial</div><div style="font-size:13.5px;color:var(--navy);font-weight:700;line-height:1.7">Después: Ejecutiva Comercial en VEPAGOS | Ayudo a comercios a cobrar fácil y vender más</div><div style="font-size:13px;color:#33415C;line-height:1.7;margin-top:6px">Otra: Analista de Soporte en VEPAGOS | Mantengo los pagos de tu negocio funcionando todos los días</div></div>',
            key: 'Si algún día buscas otro rumbo, no pongas "Open to Work" público: actívalo en modo privado (Preferencias → solo reclutadores) y deja tu titular brillando.' },
          { h: 'Te da pudor hablar de ti, y el Acerca de quedó vacío', b: 'A casi todos nos cuesta escribir sobre nosotros mismos, y por eso el Acerca de queda en blanco: un espacio enorme desaprovechado. No se trata de presumir, sino de <b>contar en primera persona qué haces y a quién ayudas</b>, para que quien te lea entienda tu valor en 20 segundos. Escríbelo con tu voz; la marca es el respaldo, no el protagonista.<br><br><b style="color:#0A66C2">Hazlo ahora (menos de 4 min):</b> pega esta plantilla en el Acerca de y complétala. Luego, en Experiencia, escribe <b>Vepagos</b> y selecciónalo de la lista para que enlace a la página oficial y salga el logo.<div style="margin-top:13px;border:1px dashed #A9BBD4;border-radius:11px;padding:13px 15px;background:#F5F9FD"><div style="font-size:10.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#0A66C2;margin-bottom:7px">Plantilla para copiar</div><div style="font-size:13.5px;color:#33415C;line-height:1.75">En VEPAGOS ayudo a [a quién] a [qué logras para ellos]. Me mueve [lo que te importa del trabajo]. En el último año [un logro concreto, con número si lo tienes]. Si quieres [cobrar con tarjeta / hacer crecer tu negocio], escríbeme.<br><b style="color:var(--navy)">Tu negocio vende más.</b></div></div>',
            key: 'Un logro con número vale más que diez adjetivos. Cambia "trabajo mucho" por "atendí a 120 comercios" o "reduje el tiempo de respuesta a la mitad".' },
          { h: 'No tienes tiempo ni sabes qué publicar', b: 'La buena noticia: <b>no necesitas ser influencer para sumar</b>. Con solo reaccionar y comentar las publicaciones de VEPAGOS ya multiplicas su alcance, porque el de todo el equipo junto supera de lejos al de la página. Y si un día quieres publicar algo propio, tienes 4 ideas fáciles: la historia de un comercio que creció, un tip de producto o educación financiera, algo de la cultura del equipo, o tu visión del sector.<br><br><b style="color:#0A66C2">Hazlo ahora (menos de 2 min):</b> entra a la página de VEPAGOS, reacciona y deja un comentario real en la última publicación. Cuando publiques algo tuyo, ciérralo con <b>#TuNegocioVendeMás</b>.<div style="margin-top:15px;border:1px solid #E3EAF3;border-radius:12px;padding:14px 16px;background:#F7FAFD"><div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#0A66C2;margin-bottom:9px">Lo que acabas de dejar listo</div><div style="display:flex;gap:8px;margin:6px 0;font-size:13.5px;color:#33415C;line-height:1.5"><span style="color:#00874f;font-weight:800">✓</span><span>Perfil en modo público y con URL personalizada</span></div><div style="display:flex;gap:8px;margin:6px 0;font-size:13.5px;color:#33415C;line-height:1.5"><span style="color:#00874f;font-weight:800">✓</span><span>Foto cercana, nítida y profesional</span></div><div style="display:flex;gap:8px;margin:6px 0;font-size:13.5px;color:#33415C;line-height:1.5"><span style="color:#00874f;font-weight:800">✓</span><span>Banner oficial del equipo</span></div><div style="display:flex;gap:8px;margin:6px 0;font-size:13.5px;color:#33415C;line-height:1.5"><span style="color:#00874f;font-weight:800">✓</span><span>Titular con la fórmula [Rol] en VEPAGOS | Ayudo a...</span></div><div style="display:flex;gap:8px;margin:6px 0;font-size:13.5px;color:#33415C;line-height:1.5"><span style="color:#00874f;font-weight:800">✓</span><span>Acerca de en primera persona y experiencia enlazada a Vepagos</span></div><div style="display:flex;gap:8px;margin:6px 0;font-size:13.5px;color:#33415C;line-height:1.5"><span style="color:#00874f;font-weight:800">✓</span><span>Interactuando con la marca</span></div></div>',
            key: 'Reto opcional: comparte el link de tu perfil actualizado en el canal del equipo y pide feedback. Ver crecer a los demás anima, y de paso celebramos que tú creciste.' }
        ],
        quiz: [
          { q: 'Tu perfil de LinkedIn es, ante todo…', opts: ['De la empresa y no tiene que ver contigo', 'Tuyo: te representa y te abre puertas a ti primero', 'Solo un currículum digital'], a: 1 },
          { q: '¿Qué hacer si estás explorando un cambio de trabajo?', opts: ['Activar el marco verde "Open to Work"', 'Usar el modo privado visible solo para reclutadores', 'Quejarte en tus publicaciones'], a: 1 },
          { q: '¿Cómo debe ser tu foto de perfil?', opts: ['Foto de grupo o con lentes de sol', 'Rostro centrado, nítido, bien iluminado y fondo limpio', 'Sin foto o solo el logo'], a: 1 },
          { q: '¿Cuál es la fórmula del titular VEPAGOS?', opts: ['Rol + @ VEPAGOS + beneficio concreto', 'Solo el cargo por defecto', '"Apasionado | Soñador 🚀"'], a: 0 },
          { q: 'El "Acerca de" ideal cierra con…', opts: ['"Hacemos crecer tu negocio" en mayúsculas', '"Tu negocio vende más." y está en primera persona', 'Una lista de todas tus tareas'], a: 1 },
          { q: '¿Cuál es el hashtag de marca para las publicaciones?', opts: ['#Fintech', '#TuNegocioVendeMás', '#OpenToWork'], a: 1 }
        ]
      }
    ]},
    ventas: { titulo: 'Onboarding — Fuerza de ventas', modulos: [
      { id: 'v1', t: 'Bienvenida a VEPAGOS', d: 'Quiénes somos y cómo funciona la fuerza de ventas.' },
      { id: 'v2', t: 'Catálogo de POS', d: 'Domina los 11 modelos: specs, precios y a quién le sirve cada uno.' },
      { id: 'v3', t: 'Argumentos de venta', d: '15 bancos, liquidación diaria, soporte 365. El pitch que cierra.' },
      { id: 'v4', t: 'Proceso de afiliación', d: 'Requisitos del comercio, código de afiliación y activación en 72h.' },
      { id: 'v5', t: 'Comisiones y pagos', d: 'Cómo y cuándo cobras tus comisiones y bonos.' },
      { id: 'v6', t: 'Práctica: tu primer pitch', d: 'Graba tu pitch y envíalo a tu coordinador.' }
    ]},
    candidato: { titulo: 'Ruta del candidato — Fuerza de ventas', modulos: [
      { id: 'c1', t: 'Conoce VEPAGOS', d: 'Mira la presentación institucional (Biblioteca → Presentaciones).' },
      { id: 'c2', t: 'El producto que venderás', d: 'Fichas técnicas de los POS más vendidos.' },
      { id: 'c3', t: 'Evaluación inicial', d: 'Tu reclutador agendará una entrevista corta.' },
      { id: 'c4', t: 'Entrenamiento básico de ventas', d: 'Argumentos, objeciones frecuentes y proceso de afiliación.' }
    ]},
    reclutador: { titulo: 'Onboarding — Reclutador de fuerza de ventas', modulos: [
      { id: 'r1', t: 'Bienvenida a VEPAGOS', d: 'Estructura del equipo comercial y tu rol.' },
      { id: 'r2', t: 'Perfil del vendedor ideal', d: 'Qué buscamos y qué descartamos en un candidato.' },
      { id: 'r3', t: 'Pipeline de candidatos', d: 'Cómo usar la sección Candidatos: etapas y acciones.' },
      { id: 'r4', t: 'Entrega al entrenador', d: 'Cuándo y cómo pasas el candidato al Entrenador de Fuerza de Ventas.' }
    ]},
    entrenador: { titulo: 'Onboarding — Entrenador de fuerza de ventas', modulos: [
      { id: 'e1', t: 'Bienvenida a VEPAGOS', d: 'Estructura del equipo comercial y tu rol como entrenador.' },
      { id: 'e2', t: 'Programa de entrenamiento', d: 'Módulos, materiales y evaluaciones del entrenamiento de vendedores.' },
      { id: 'e3', t: 'Pipeline de candidatos', d: 'Cómo avanzar candidatos en etapa de entrenamiento.' },
      { id: 'e4', t: 'Seguimiento de vendedores', d: 'Cómo monitorear el onboarding y desempeño de la fuerza de ventas.' }
    ]},
    inces: { titulo: 'Onboarding — Pasante INCES', modulos: [
      { id: 'p1', t: 'Bienvenida a VEPAGOS', d: 'Quiénes somos, misión y cómo funciona tu pasantía.' },
      { id: 'p2', t: 'Normas y horarios', d: 'Reglas de la casa, asistencia y tu tutor asignado.' },
      { id: 'p3', t: 'Conoce el producto', d: 'Los POS del catálogo y los servicios que ofrecemos.' },
      { id: 'p4', t: 'Tu área de trabajo', d: 'Procesos del equipo donde harás tu pasantía.' }
    ]},
    rrhh: { titulo: 'Onboarding — Capital humano', modulos: [
      { id: 'h1', t: 'Bienvenida a VEPAGOS', d: 'Estructura organizacional y las 3 gerencias ejecutivas.' },
      { id: 'h2', t: 'Procesos de RRHH', d: 'Onboardings, entrenamientos y formatos internos.' },
      { id: 'h3', t: 'Panel de seguimiento', d: 'Cómo ver y gestionar el progreso de onboarding de todos.' }
    ]},
    gerente: { titulo: 'Onboarding — Gerentes', modulos: [
      { id: 'g1', t: 'Bienvenida a VEPAGOS', d: 'Visión, metas del año y estructura organizacional.' },
      { id: 'g2', t: 'Tu equipo en la intranet', d: 'Cómo ver perfiles, adjuntar y compartir documentos.' },
      { id: 'g3', t: 'Rituales de gestión', d: '1:1s, reportes semanales y evaluación de desempeño.' }
    ]}
  };

  // ===== Candidatos demo =====
  var CANDIDATOS = [
    { id: 1, nombre: 'María Fernanda Rojas', email: 'mf.rojas@gmail.com', telefono: '+58 414-5550123', linkedin: 'https://www.linkedin.com/in/mfrojas', ciudad: 'Valencia', experiencia: '3 a 5 años', etapa: 'entrevista', fecha: '2026-07-02', nota: 'Experiencia en banca comercial.' },
    { id: 2, nombre: 'Jorge Andrade', email: 'jandrade87@gmail.com', telefono: '+58 424-5559834', linkedin: 'https://www.linkedin.com/in/jorgeandrade', ciudad: 'Maracaibo', experiencia: 'Más de 5 años', etapa: 'nuevo', fecha: '2026-07-06', nota: '' },
    { id: 3, nombre: 'Karla Mendoza', email: 'karlam.ve@gmail.com', telefono: '+58 412-5551277', linkedin: 'https://www.linkedin.com/in/karlamendoza', ciudad: 'Caracas', experiencia: '1 a 3 años', etapa: 'entrenamiento', fecha: '2026-06-24', nota: 'Aprobó entrevista. Inició entrenamiento.' }
  ];

  // ===== Campañas demo =====
  var CAMPANAS = [
    { id: 1, nombre: 'Promo activación 72h — Julio', asunto: 'Tu punto de venta activo en 72 horas', audiencia: 'Comercios prospecto', estado: 'enviada', fecha: '2026-07-01', aperturas: '38%' },
    { id: 2, nombre: 'Newsletter comercios — Junio', asunto: 'Novedades VEPAGOS: nuevos modelos y bancos', audiencia: 'Clientes activos', estado: 'enviada', fecha: '2026-06-12', aperturas: '41%' },
    { id: 3, nombre: 'Reclutamiento fuerza de ventas', asunto: 'Gana por cada POS que coloques', audiencia: 'Candidatos', estado: 'borrador', fecha: '2026-07-08', aperturas: '—' }
  ];

  var ANUNCIOS = [
    { t: 'Nuevos modelos Platco disponibles', d: 'El 9220 y 9810 ya están en el catálogo con fichas actualizadas.', fecha: '2026-07-05' },
    { t: 'Actualización de la oferta comercial', d: 'Revisa la promoción de activación 72h vigente en julio.', fecha: '2026-07-01' },
    { t: 'Bienvenidos los nuevos vendedores', d: '3 personas se sumaron a la fuerza de ventas este mes.', fecha: '2026-06-28' }
  ];

  return { USERS: USERS, DOCS: DOCS, DOC_CATS: DOC_CATS, POS_CATALOGO: POS_CATALOGO, ONBOARDING: ONBOARDING, CANDIDATOS: CANDIDATOS, CAMPANAS: CAMPANAS, ANUNCIOS: ANUNCIOS };
})();
