/* ===== Somos VEPAGOS — lógica de la intranet (demo funcional) ===== */
(function () {
  'use strict';
  var DB_KEY = 'sv_db_v2', SES_KEY = 'sv_session_v2';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- estado ---------- */
  function loadDB() {
    try { var raw = localStorage.getItem(DB_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    var seed = window.SV_SEED;
    var db = {
      users: seed.USERS.map(function (x) { return Object.assign({}, x, { password: 'vepagos2026' }); }),
      docs: seed.DOCS.slice(),
      candidatos: seed.CANDIDATOS.slice(),
      campanas: seed.CAMPANAS.slice(),
      progreso: {},   // { userId: { modId: true } }
      nextUserId: 200, nextDocId: 100, nextCandId: 50, nextCampId: 50
    };
    saveDB(db); return db;
  }
  function saveDB(db) { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
  var db = loadDB();
  /* migraciones suaves */
  db.subvendedores = db.subvendedores || [];
  if (!db.nextSubId) db.nextSubId = 1;
  db.solicitudes = db.solicitudes || [];
  if (!db.nextSolId) db.nextSolId = 1;
  db.rrhhReqs = db.rrhhReqs || [];
  if (!db.nextRrhhReqId) db.nextRrhhReqId = 1;
  db.claveReqs = db.claveReqs || [];
  if (!db.nextClaveId) db.nextClaveId = 1;
  db.equipReqs = db.equipReqs || [];
  if (!db.nextEquipId) db.nextEquipId = 1;
  if (!db.promptsSeed) {
    db.promptsSeed = true;
    [
      { nombre: 'Responder a un cliente indeciso', prompt: 'Actúa como asesor comercial de VEPAGOS. Un comercio duda en contratar un punto de venta. Escribe una respuesta breve, cálida y persuasiva que resuelva su objeción sobre [OBJECIÓN], destaque el soporte 365 días y cierre invitando a agendar la activación. Máximo 120 palabras, tono venezolano profesional.' },
      { nombre: 'Explicar planes y comisiones a un prospecto', prompt: 'Eres asesor de VEPAGOS. Explica de forma simple y en lenguaje claro los planes de servicio y cómo se cobra (por domiciliación, en bolívares a tasa BCV) a un comercio que factura aproximadamente [MONTO] al mes. Recomienda el plan que más le conviene y por qué. No inventes tarifas: si no las tienes, indícalas como [tarifa vigente].' },
      { nombre: 'Redactar correo de seguimiento post-visita', prompt: 'Redacta un correo de seguimiento para un cliente que visité hoy sobre la instalación de su POS. Resume lo conversado, confirma próximos pasos y deja una fecha tentativa de activación. Tono cercano y profesional. Firma como [TU NOMBRE], Fuerza de Ventas VEPAGOS.' },
      { nombre: 'Resumir una conversación de soporte (SAC)', prompt: 'Resume el siguiente caso de soporte en 4 líneas: motivo del contacto, diagnóstico, solución aplicada y estatus. Luego sugiere una respuesta final para el cliente. Caso: [PEGA AQUÍ LA CONVERSACIÓN].' },
      { nombre: 'Crear publicación para redes sociales', prompt: 'Actúa como Community Manager de VEPAGOS. Crea 3 opciones de publicación para Instagram sobre [TEMA/PROMOCIÓN], con copy corto, 1 llamado a la acción y 3 hashtags. Mantén la identidad: cercano, confiable, "hacemos crecer tu negocio".' },
      { nombre: 'Preparar guion de llamada en frío', prompt: 'Genera un guion de llamada en frío de 45 segundos para ofrecer puntos de venta VEPAGOS a un comercio del sector [SECTOR]. Incluye apertura, propuesta de valor, una pregunta de calificación y cierre para agendar una visita.' }
    ].forEach(function (p) { db.docs.push({ id: db.nextDocId++, cat: 'prompts', nombre: p.nombre, prompt: p.prompt, archivo: null, real: false, fecha: '2026-07-15', por: 'Capital Humano', deptos: null, equipos: null }); });
  }
  if (!db.captacionesV1) {
    db.captacionesV1 = true;
    var _cap = [
      ['Manual de Contratación — Vepagos (v2.0)', 'assets/captaciones/manual-de-contratacion-vepagos.pdf', 'Guía de buenas prácticas de Capital Humano: filosofía de talento, proceso de 8 etapas, formatos y checklists. Framework "Cinturón Unicornio".'],
      ['Presentación · Reclutamiento Vepagos', 'assets/captaciones/presentacion-reclutamiento-vepagos.pdf', 'Cómo reclutamos: qué buscamos, cómo evaluamos y cómo es el proceso.'],
      ['Perfil · Asistente de Recepción Ejecutiva (PDF)', 'assets/captaciones/perfil-asistente-recepcion-ejecutiva.pdf', 'Perfil publicable de la vacante, on-brand.'],
      ['Perfil · Asistente de Recepción Ejecutiva (DOCX editable)', 'assets/captaciones/perfil-asistente-recepcion-ejecutiva.docx', 'Versión editable del perfil con la guía interna.'],
      ['Guía de búsqueda (interno) · Asistente de Recepción Ejecutiva', 'assets/captaciones/guia-de-busqueda-interno-asistente-recepcion-ejecutiva.pdf', 'USO INTERNO: perfil de búsqueda, señales, red flags, cadena booleana y fuentes.'],
      ['Difusión · Historia WhatsApp — Asistente de Recepción Ejecutiva', 'assets/captaciones/difusion-historia-whatsapp-asistente-recepcion-ejecutiva.png', 'Pieza vertical 1080×1920 lista para publicar.']
    ];
    _cap.forEach(function (d) {
      db.docs.push({ id: db.nextDocId++, cat: 'captaciones', nombre: d[0], archivo: d[1], real: true, fecha: '2026-06-15', por: 'Capital Humano', deptos: null, equipos: null });
    });
    saveDB(db);
  }
  db.reqFlujoOverrides = db.reqFlujoOverrides || {};
  if (!db.rolesTaxonomyV3) {
    db.rolesTaxonomyV3 = true;
    var _seedRoles = { 10: 'director', 11: 'gerenteop', 71: 'coordinador' };
    db.users.forEach(function (u) { if (_seedRoles[u.id]) u.role = _seedRoles[u.id]; });
    saveDB(db);
  }
  if (!db.perfiles) {
    db.perfiles = [
      { key: 'admin', label: 'Administrador', desc: 'Acceso total al portal, gestión de personas y configuración.', base: null, sistema: true },
      { key: 'director', label: 'Director', desc: 'Visión macro de toda la organización; hereda los permisos del Gerente Ejecutivo.', base: 'gerente', sistema: true },
      { key: 'gerente', label: 'Gerente Ejecutivo', desc: 'Lidera un área; ve y aprueba a todo su equipo.', base: null, sistema: true },
      { key: 'gerenteop', label: 'Gerente Operativo', desc: 'Bajo un ejecutivo; en el organigrama solo ve a su propio equipo.', base: 'gerente', sistema: true },
      { key: 'coordinador', label: 'Coordinador/Supervisor', desc: 'Apoyo del ejecutivo u operativo; ve las solicitudes del equipo.', base: 'interno', sistema: true },
      { key: 'rrhh', label: 'Capital Humano', desc: 'Gestión de personas; en Procura solo puede crear solicitudes.', base: null, sistema: true },
      { key: 'interno', label: 'Equipo interno', desc: 'Colaborador; acceso a su espacio personal.', base: null, sistema: true }
    ];
    saveDB(db);
  }
  if (!db.reqCatalogoV2) {
    db.reqCatalogoV2 = true;
    var _offG = (db.reqCatalogo && db.reqCatalogo.offboard && db.reqCatalogo.offboard['General']) ? db.reqCatalogo.offboard['General'] : [
      { key: 'accesos', label: 'Retiro de accesos a sistemas', hint: 'Eureka, SAC, drives compartidos, herramientas asignadas' },
      { key: 'correo', label: 'Desactivación de correo corporativo', hint: 'Cierre y redirección de la cuenta @somosvepagos.com' },
      { key: 'tarjeta', label: 'Devolución de tarjeta / carnet de ingreso', hint: 'Carnet institucional y accesos físicos' },
      { key: 'uniforme', label: 'Devolución de uniforme', hint: 'Franelas, chaqueta y material de imagen' },
      { key: 'activos', label: 'Devolución de activos fijos y equipos', hint: 'Laptop, POS de demo, teléfono, otros seriales' },
      { key: 'huella', label: 'Eliminación de huella / biométrico', hint: 'Retiro del control de asistencia' },
      { key: 'finiquito', label: 'Carta de egreso y finiquito', hint: 'Documento de cierre laboral firmado' }
    ];
    var _ger = ['Laptop Intel i7, 16GB RAM', 'Teléfono corporativo', 'Línea telefónica / SIM', 'Correo corporativo', 'Acceso a Eureka', 'Silla ergonómica', 'Foto profesional institucional'];
    var _base = ['Laptop Intel i5, 16GB RAM', 'Correo corporativo', 'Acceso a Eureka', 'Silla ergonómica', 'Foto profesional institucional'];
    db.reqCatalogo = {
      onboarding: {
        'General': ['Correo corporativo', 'Acceso a Eureka', 'Foto profesional institucional', 'Uniforme', 'Silla ergonómica', 'Laptop Intel i5, 16GB RAM'],
        'director': _ger.slice(),
        'gerente': _ger.slice(),
        'gerenteop': _ger.slice(),
        'coordinador': _base.slice(),
        'rrhh': ['Laptop Intel i5, 16GB RAM', 'Correo corporativo', 'Acceso a Eureka', 'Uniforme', 'Silla ergonómica', 'Foto profesional institucional'],
        'interno': _base.slice(),
        'ventas': ['Laptop Intel i5, 16GB RAM', 'Correo corporativo', 'Acceso a Eureka', 'Acceso a SAC', 'Uniforme', 'Material de afiliación', 'POS de demostración', 'Foto profesional institucional']
      },
      offboard: { 'General': _offG }
    };
    saveDB(db);
  }
  if (!db.reqCatalogo.modalidad) {
    db.reqCatalogo.modalidad = {
      'oficina': ['Silla ergonómica', 'Puesto de trabajo / escritorio asignado', 'Carnet de acceso a la sede'],
      'mantenimiento': ['Uniforme de mantenimiento', 'Kit de herramientas', 'Equipo de protección personal (EPP)'],
      'remoto': ['Laptop Intel i5, 16GB RAM', 'Línea telefónica / SIM', 'Acceso VPN / remoto'],
      'hibrido': ['Silla ergonómica', 'Laptop Intel i5, 16GB RAM', 'Carnet de acceso a la sede']
    };
    saveDB(db);
  }
  if (!db.permisosV2) {
    db.permisosV2 = true;
    db.users.forEach(function (u) {
      if (!u.permisos || Array.isArray(u.permisos)) return;
      if (u.permisos.procura) { u.permisos.procuraVer = true; u.permisos.procuraCrear = true; u.permisos.procuraAprobar = true; delete u.permisos.procura; }
      if (u.permisos.verActivos) { u.permisos.almacenVer = true; delete u.permisos.verActivos; }
    });
    saveDB(db);
  }
  if (!db.permisosSplitV1) {
    db.permisosSplitV1 = true;
    db.users.forEach(function (u) {
      // u.permisos (objeto) eran permisos de ACCESO; los permisos de asistencia son un array.
      if (u.permisos && !Array.isArray(u.permisos)) { u.accesosPermisos = u.permisos; u.permisos = []; }
      if (!u.accesosPermisos) u.accesosPermisos = {};
      if (!Array.isArray(u.permisos)) u.permisos = [];
    });
    saveDB(db);
  }
  if (!db.recursos) {
    db.recursos = {
      apps: [
        { nombre: 'Eureka', desc: 'Portal operativo de solicitudes y afiliaciones.', link: 'https://eureka.vepagos.com/login' },
        { nombre: 'Profit Plus', desc: 'Sistema administrativo y contable.', link: '' }
      ],
      drives: [
        { nombre: 'Drive Finanzas', desc: 'Documentos y reportes del área de Finanzas.', link: '' }
      ],
      herramientas: [
        { nombre: 'AnyDesk', desc: 'Soporte y acceso remoto.', link: 'https://anydesk.com' }
      ],
      emails: [
        { nombre: 'soporte@somosvepagos.com', desc: 'Buzón de atención y tickets de soporte a comercios.', link: '' }
      ]
    };
    saveDB(db);
  }
  if (!db.reqBasicosPerfilV1) {
    db.reqBasicosPerfilV1 = true;
    var _gen = (db.reqCatalogo.onboarding['General'] || []).slice();
    var _perfKeys = (db.perfiles || []).map(function (p) { return p.key; }).filter(function (k) { return k !== 'admin'; });
    ['ventas', 'reclutador', 'entrenador', 'inces'].forEach(function (k) { if (_perfKeys.indexOf(k) < 0) _perfKeys.push(k); });
    _perfKeys.forEach(function (k) { if (!(db.reqCatalogo.onboarding[k] && db.reqCatalogo.onboarding[k].length)) db.reqCatalogo.onboarding[k] = _gen.slice(); });
    saveDB(db);
  }
  if (!db.reqMatrizV1) {
    db.reqMatrizV1 = true;
    db.reqCatalogo = db.reqCatalogo || {};
    db.reqCatalogo.onboarding = {
      'General': {
        rrhh: ['Contrato firmado', 'Registro en nómina', 'Cestaticket'],
        nomina: ['Incorporación a nómina', 'Cestaticket', 'Beneficios de ley'],
        sistemas: ['Correo corporativo', 'Acceso a Eureka', 'Usuario DeskTime', 'Acceso por huella'],
        mercadeo: ['Firma de correo institucional', 'Foto profesional institucional', 'Actualización de LinkedIn'],
        depto: ['Inducción de bienvenida', 'Explicación del cargo y funciones']
      }
    };
    saveDB(db);
  }
  if (!db.reqNominaV1) {
    db.reqNominaV1 = true;
    var _g = (db.reqCatalogo.onboarding && db.reqCatalogo.onboarding['General']) || null;
    if (_g && Array.isArray(_g.rrhh) && _g.rrhh.indexOf('Nómina (empresa tercerizada)') < 0) {
      var _i = _g.rrhh.indexOf('Cestaticket'); _g.rrhh.splice(_i < 0 ? _g.rrhh.length : _i, 0, 'Nómina (empresa tercerizada)');
    }
    saveDB(db);
  }
  if (!db.reqNominaV2) {
    db.reqNominaV2 = true;
    var _g2 = (db.reqCatalogo.onboarding && db.reqCatalogo.onboarding['General']) || null;
    if (_g2) {
      if (Array.isArray(_g2.rrhh)) _g2.rrhh = _g2.rrhh.filter(function (x) { return x !== 'Nómina (empresa tercerizada)'; });
      if (!(_g2.nomina && _g2.nomina.length)) _g2.nomina = ['Incorporación a nómina', 'Cestaticket', 'Beneficios de ley'];
    }
    saveDB(db);
  }
  if (!db.dominioV3) {
    db.dominioV3 = true;
    (db.users || []).forEach(function (u) { if (u.email && /@vepagos\.com$/i.test(u.email)) u.email = u.email.replace(/@vepagos\.com$/i, '@somosvepagos.com'); });
    (db.claveReqs || []).forEach(function (r) { if (r.email && /@vepagos\.com$/i.test(r.email)) r.email = r.email.replace(/@vepagos\.com$/i, '@somosvepagos.com'); });
    saveDB(db);
  }
  if (!db.reqGuiaV3) {
    db.reqGuiaV3 = true;
    var _G = (db.reqCatalogo && db.reqCatalogo.onboarding && db.reqCatalogo.onboarding['General']) || null;
    if (_G && !Array.isArray(_G)) {
      function _push(arr, items) { items.forEach(function (t) { if (arr.indexOf(t) < 0) arr.push(t); }); }
      _G.rrhh = _G.rrhh || [];
      var _ci = _G.rrhh.indexOf('Contrato firmado'); if (_ci > -1) _G.rrhh[_ci] = 'Contrato de trabajo firmado — 2 ejemplares (LOTTT Art. 58/59)';
      _push(_G.rrhh, ['Contrato de trabajo firmado — 2 ejemplares (LOTTT Art. 58/59)', 'Notificación de riesgos laborales firmada (LOPCYMAT Art. 53/56)', 'Rutograma — ruta segura casa-trabajo (in itinere)', 'Afiliación IVSS — Forma 14-02 (primeros 3 días hábiles)', 'Carga en el sistema BANAVIH', 'Planilla de seguro Banesco (póliza colectiva)', 'Tarjeta Todoticket / cesta ticket', 'Estacionamiento corporativo — Coordinación+ (carnet de circulación y licencia)']);
      _G.sistemas = _G.sistemas || [];
      _push(_G.sistemas, ['Credenciales de red, VPN e intranet de transacciones', 'Registro de huella dactilar (biométrico)']);
      _G.mercadeo = _G.mercadeo || [];
      _push(_G.mercadeo, ['Foto y flyer de bienvenida corporativo', 'Impresión de carnet institucional']);
      _G.depto = _G.depto || [];
      _push(_G.depto, ['Asignación de primera misión clave (30 días)']);
    }
    saveDB(db);
  }
  if (!db.offGuiaV3) {
    db.offGuiaV3 = true;
    db.reqCatalogo = db.reqCatalogo || {};
    db.reqCatalogo.offboard = db.reqCatalogo.offboard || {};
    var _off = db.reqCatalogo.offboard['General'] || [];
    var _fin = _off.filter(function (x) { return x.key === 'finiquito'; })[0];
    if (_fin) { _fin.label = 'Recibo de liquidación de prestaciones (efecto liberatorio)'; _fin.hint = 'Pago máx. 5 días continuos — LOTTT Art. 142 (garantía Art. 142)'; }
    function _has(k) { return _off.some(function (x) { return x.key === k; }); }
    var _legal = [
      { key: 'carta', label: 'Carta de renuncia o Acta de mutuo acuerdo', hint: 'Recepción/validación; el acuerdo se recomienda homologar en la Inspectoría del Trabajo' },
      { key: 'vacaciones', label: 'Cuantificación de vacaciones pendientes', hint: 'Fraccionadas y vencidas acumuladas (LOTTT)' },
      { key: 'utilidades', label: 'Cálculo de utilidades fraccionadas', hint: 'Bonificación de fin de año acumulada' },
      { key: 'ivss', label: 'Egreso IVSS (Forma 14-100) y BANAVIH', hint: 'Procesamiento formal del egreso del trabajador' },
      { key: 'entrevista', label: 'Entrevista de salida confidencial', hint: 'Diagnóstico de clima y áreas de mejora' }
    ];
    // Orden: carta, vacaciones, utilidades primero; luego los operativos; ivss y entrevista al final
    var _pre = _legal.slice(0, 3).filter(function (x) { return !_has(x.key); });
    var _post = _legal.slice(3).filter(function (x) { return !_has(x.key); });
    db.reqCatalogo.offboard['General'] = _pre.concat(_off, _post);
    saveDB(db);
  }
  if (!db.orgCandV1) {
    db.orgCandV1 = true;
    db.orgCandidatos = db.orgCandidatos || [];
    db.nextOrgCandId = db.nextOrgCandId || 1;
    saveDB(db);
  }
  if (!db.reqAccesosV1) {
    db.reqAccesosV1 = true;
    db.reqCatalogo = db.reqCatalogo || {};
    if (!db.reqCatalogo.accesos) {
      db.reqCatalogo.accesos = {
        'General': { drives: [], apps: ['Eureka'], herramientas: [] }
      };
    }
    saveDB(db);
  }
  if (!db.aprobadores) {
    function firstRole(r) { var u = db.users.find(function (x) { return x.role === r && x.activo; }); return u ? u.id : 1; }
    function byMail(m) { var u = db.users.find(function (x) { return x.email === m; }); return u ? u.id : null; }
    db.aprobadores = {
      ti: 54, sistemas: 50,
      rrhh: byMail('rrhh@somosvepagos.com') || firstRole('rrhh'),
      nomina: byMail('rrhh@somosvepagos.com') || firstRole('rrhh'),
      procura: 78, servicios: 74, admin: 1
    };
    // validar que existan; si no, caer en admin
    Object.keys(db.aprobadores).forEach(function (k) { if (!db.users.some(function (u) { return u.id === db.aprobadores[k]; })) db.aprobadores[k] = 1; });
  }
  db.pendientes = db.pendientes || [];
  if (!db.nextPendId) db.nextPendId = 1;
  if (!db.vacPerfilV1) {
    db.vacPerfilV1 = true;
    (db.vacantes || []).forEach(function (v) {
      if (v.perfil) return;
      var c = (v.cargo || '').toLowerCase();
      v.perfil = /gerente/.test(c) ? 'gerente' : /coordinad|supervis/.test(c) ? 'coordinador' : /capital humano|rrhh|recursos humanos/.test(c) ? 'rrhh' : /vendedor|fuerza de venta|comercial/.test(c) ? 'ventas' : 'interno';
    });
    saveDB(db);
  }
  /* Migración: asegurar que el perfil admin tenga adminmenu en sus menús */
  if (!db._adminMenuMig) {
    db._adminMenuMig = true;
    var _ap = (db.perfiles || []).find(function (p) { return p.key === 'admin'; });
    if (_ap) {
      if (_ap.menus && _ap.menus.indexOf('adminmenu') < 0) _ap.menus.push('adminmenu');
      if (!_ap.menus) _ap.menus = null; // null = hereda todo via legacyMenuSet, que incluirá adminmenu por roles
    }
    saveDB(db);
  }
  db.comunicaciones = db.comunicaciones || [];
  if (!db.nextComId) db.nextComId = 1;
  db.encuestas = db.encuestas || [];
  if (!db.nextEncId) db.nextEncId = 1;
  if (!db._encSeed) {
    db._encSeed = true;
    var _hoy = new Date();
    function _iso(d) { return d.toISOString().slice(0, 10); }
    function _hace(meses) { var d = new Date(_hoy); d.setMonth(d.getMonth() - meses); return _iso(d); }
    var _semillas = [
      { pid: 'enps', desde: _hace(3) },
      { pid: 'clima', desde: _hace(3) },
      { pid: 'desempeno', desde: _hace(6) },
      { pid: 'onboarding', desde: _hace(1) },
      { pid: '360', desde: _hace(1) }
    ];
    // Se materializan cuando ENC_PLANTILLAS existe (al abrir la app); guardamos las semillas.
    db._encSemillas = _semillas;
  }
  if (!db.metas) {
    db.metas = {
      vision: 'Ser la fintech de pagos líder de Venezuela, reconocida por la confianza, la cercanía y la innovación en cada transacción.',
      norte: 'Llegar a 1.000.000 de comercios activos y presencia en las principales ciudades del país para 2027.',
      objetivos: [
        { id: 1, titulo: 'Crecimiento comercial', desc: 'Aumentar 40% la red de puntos de venta activos durante el año.', metrica: '+40% PDV', plazo: '2026' },
        { id: 2, titulo: 'Experiencia del cliente', desc: 'Mantener un nivel de satisfacción (NPS) por encima de 70 en atención al cliente.', metrica: 'NPS > 70', plazo: 'Trimestral' },
        { id: 3, titulo: 'Talento y cultura', desc: 'Completar el onboarding del 100% de nuevos ingresos en su primer mes.', metrica: '100% onboarding', plazo: 'Continuo' }
      ],
      nextObjId: 4
    };
  }
  if (db.metas && db.metas.planV !== 3) {
    db.metas.planV = 3;
    db.metas.updated = 'Abril 2026';
    db.metas.norte = 'Alcanzar 85.000 POS activos y 10% de market share para 2028, con un revenue de $76,5 M.';
    db.metas.objetivos = [
      { id: 1, titulo: 'Colocaciones', desc: 'Colocar 28.000 POS en 2026. A abril vamos en 8.321 (29,7%), por encima de meta.', metrica: '28.000 POS', plazo: 'Dic 2026' },
      { id: 2, titulo: 'Reducir churn', desc: 'Bajar el churn mensual de 2,8% a 1,5% al cierre de año con un plan de retención y reactivaciones.', metrica: 'Churn 1,5%', plazo: 'Dic 2026' },
      { id: 3, titulo: 'Crecer ARPU', desc: 'Subir el ARPU de $40 a $52 activando cash-out, recargas y pago de servicios.', metrica: 'ARPU $52', plazo: 'Dic 2026' },
      { id: 4, titulo: 'Efectividad de cobranza', desc: 'Elevar la cobranza de 86% a 92% y reducir la concentración en BDV (hoy 69% del recaudo).', metrica: 'Cobranza 92%', plazo: 'Dic 2026' },
      { id: 5, titulo: 'Market share', desc: 'Crecer del 6% al 8% de participación en POS conectados a Credicard.', metrica: '8% share', plazo: 'Dic 2026' }
    ];
    db.metas.nextObjId = 6;
    db.metas.kpis = [
      { k: 'POS Activos', actual: '46.000', meta: '52.000', dir: 'up' },
      { k: 'Market Share', actual: '6%', meta: '8%', dir: 'up' },
      { k: 'Revenue Anual', actual: '$26 M', meta: '$28,7 M', dir: 'up' },
      { k: 'ARPU', actual: '$40', meta: '$52', dir: 'up' },
      { k: 'Churn Mensual', actual: '2,8%', meta: '1,5%', dir: 'down' },
      { k: 'Cobranza', actual: '86%', meta: '92%', dir: 'up' },
      { k: 'Colocaciones YTD', actual: '8.321', meta: '28.000', dir: 'up' }
    ];
    db.metas.metasMensuales = [
      ['Mayo', 2300, '2,5%', 120, '87%', '$40'], ['Junio', 2750, '2,3%', 140, '88%', '$41'],
      ['Julio', 2931, '2,0%', 160, '89%', '$44'], ['Agosto', 3108, '2,0%', 170, '90%', '$47'],
      ['Septiembre', 2943, '1,8%', 180, '90%', '$47'], ['Octubre', 2789, '1,7%', 180, '91%', '$50'],
      ['Noviembre', 2881, '1,6%', 170, '91%', '$51'], ['Diciembre', 1752, '1,5%', 150, '92%', '$52']
    ];
    db.metas.proyeccion = [
      ['POS Activos (cierre)', '52.000', '68.000', '85.000'],
      ['ARPU Promedio', '$46', '$65', '$75'],
      ['Revenue Total', '$24,2 M', '$51 M', '$76,5 M']
    ];
    db.metas.historico = [
      { id: 'dash', area: 'Dashboard Ejecutivo', color: '#001F60', bg: '#E7ECF7',
        intro: 'Estado actual (abril 2026) frente a la meta de cierre de año, y la evolución de colocaciones desde 2022.',
        cols: ['Año', 'Colocados', 'Prom/mes', 'Prom/día', 'Desconex.', 'Churn %', 'Reactiv.', 'Crec. neto'],
        filas: [
          ['2022', '13.610', '1.134', '57', '—', '—', '—', '—'],
          ['2023', '11.288', '941', '45', '5.693', '—', '450', '—'],
          ['2024', '15.768', '1.281', '64', '6.115', '1,9%', '952', '+10.605'],
          ['2025', '21.180', '1.765', '83', '10.083', '1,4%', '963', '+12.060'],
          ['2026 (YTD abr)', '8.321', '2.080', '102', '5.295', '2,8%', '326', '+3.352']
        ] },
      { id: 'coloc', area: 'Colocaciones 2026', color: '#1F8A5B', bg: '#E7F6EE',
        intro: 'Meta vs. real mes a mes. El año arranca por encima de meta: 8.321 colocados a abril (29,7% de la meta anual de 28.000).',
        cols: ['Mes', 'Meta', 'Real', '% Cumpl.', 'Acumulado'],
        filas: [
          ['Enero', '1.000', '1.312', '131%', '1.312'],
          ['Febrero', '1.400', '1.681', '120%', '2.993'],
          ['Marzo', '1.956', '2.575', '132%', '5.568'],
          ['Abril', '2.190', '2.753', '126%', '8.321']
        ],
        histTitulo: 'Comparativo histórico anual',
        histCols: ['Año', 'Total colocado'],
        histFilas: [['2022', '13.610'], ['2023', '11.288'], ['2024', '15.768'], ['2025', '21.180'], ['2026 (YTD)', '8.321']] },
      { id: 'churn', area: 'Churn y Retención', color: '#B23A6E', bg: '#FBE9F0',
        intro: 'El churn de inicio de año (2,8%) está por encima de la meta máxima (2%). El plan lo lleva a 1,5% en diciembre con reactivaciones crecientes.',
        cols: ['Mes', 'Desconex.', 'Churn %', 'Meta máx.', 'Reactiv.'],
        filas: [
          ['Enero', '895', '2,0%', '2,0%', '77'],
          ['Febrero', '1.137', '2,5%', '2,0%', '96'],
          ['Marzo', '1.889', '4,0%', '2,0%', '82'],
          ['Abril', '1.374', '2,9%', '2,0%', '71']
        ],
        histTitulo: 'Desconexiones históricas (total anual)',
        histCols: ['Año', 'Desconexiones'],
        histFilas: [['2023', '5.693'], ['2024', '6.115'], ['2025', '10.083'], ['2026 (YTD)', '5.295']] },
      { id: 'arpu', area: 'ARPU y Revenue', color: '#C9922B', bg: '#FBF1DC',
        intro: 'El ARPU sube de $40 a $52 durante 2026 al activar cash-out, recargas y pago de servicios. Revenue estimado del año: $25,9 M.',
        cols: ['Concepto', '2026 (proy.)', '2027', '2028'],
        filas: [
          ['POS activos (cierre)', '52.000', '68.000', '85.000'],
          ['ARPU promedio', '$46', '$65', '$75'],
          ['Revenue POS fees', '$22 M', '$32 M', '$40 M'],
          ['Revenue cash-out', '$1,5 M', '$5 M', '$7 M'],
          ['Revenue SaaS', '—', '$8 M', '$12 M'],
          ['Revenue total', '$24,2 M', '$51 M', '$76,5 M']
        ] },
      { id: 'cobranza', area: 'Cobranza Bancaria', color: '#00B871', bg: '#E7FAF1',
        intro: 'Efectividad de cobro por banco (últimos 10 meses). El BDV concentra el 69% del recaudo — principal riesgo de concentración.',
        cols: ['Banco', 'Recaudado', 'Efectividad', '% del total', 'Riesgo'],
        filas: [
          ['BDV', '$7,91 M', '90%', '69,3%', 'Concentración'],
          ['Tesoro', '$1,59 M', '90%', '14,0%', 'Bajo'],
          ['Bancrecer', '$0,89 M', '83%', '7,8%', 'Medio'],
          ['Bicentenario', '$0,49 M', '80%', '4,3%', 'Alto'],
          ['Plaza', '$0,22 M', '88%', '1,9%', 'Bajo'],
          ['BFC', '$0,11 M', '81%', '1,0%', 'Alto']
        ],
        histTitulo: 'Tasa de cobranza — promedio anual',
        histCols: ['Año', 'Cobranza prom.'],
        histFilas: [['2022', '87%'], ['2023', '76%'], ['2024', '83%'], ['2025', '89%'], ['2026 (YTD)', '86%']] },
      { id: 'credicard', area: 'Mercado Credicard', color: '#D9463E', bg: '#FDEBEA',
        intro: 'Posición de mercado según datos Credicard (abril 2026). El mercado total es enorme: 589.301 POS y $97,9 M anuales en fees de switch.',
        cols: ['Indicador', 'Valor', 'Oportunidad'],
        filas: [
          ['POS totales Venezuela', '589.301', 'TAM enorme'],
          ['POS VEPAGOS', '35.008', '6% market share'],
          ['Market share POS', '6%', 'Meta: 10% en 2028'],
          ['% transacciones VEPAGOS', '8,3%', 'POS más productivos'],
          ['TX mensuales del mercado', '209,83 M', '—'],
          ['POS transactando', '85%', 'vs ~70% del mercado']
        ] },
      { id: 'fv', area: 'Fuerza de ventas', color: '#2A6FDB', bg: '#EAF1FD',
        intro: 'Espacio para las métricas del equipo comercial. Aún por cargar desde el plan.',
        cols: ['Indicador', 'Valor'],
        filas: [['Pendiente de carga', '—']] },
      { id: 'mkt', area: 'Mercadeo', color: '#8A5CD1', bg: '#F1EAFB',
        intro: 'Espacio para las métricas de mercadeo. Aún por cargar desde el plan.',
        cols: ['Indicador', 'Valor'],
        filas: [['Pendiente de carga', '—']] }
    ];
  }
  db.asistencia = db.asistencia || [];
  if (!db.nextAsisId) db.nextAsisId = 1;
  if (!db.vacantes) {
    db.vacantes = [
      { id: 1, cargo: 'Analista Fuerza de Venta 3', managerId: 12, fecha: '2026-06-15', estado: 'abierta' },
      { id: 2, cargo: 'Fuerza de Ventas Interna', managerId: 11, fecha: '2026-06-15', estado: 'abierta' },
      { id: 3, cargo: 'Gerente de Bancas Especializadas', managerId: 10, fecha: '2026-05-30', estado: 'abierta' },
      { id: 4, cargo: 'Analista de Logística', managerId: 29, fecha: '2026-06-20', estado: 'abierta' },
      { id: 5, cargo: 'Especialista de Recuperación', managerId: 24, fecha: '2026-06-22', estado: 'abierta' },
      { id: 6, cargo: 'SAC Televentas', managerId: 30, fecha: '2026-07-01', estado: 'abierta' }
    ];
  }
  if (!db.nextVacId) db.nextVacId = 10;
  if (!db.activos) {
    db.activos = [
      { id: 1, userId: 14, nombre: 'Laptop Lenovo ThinkPad E14', serial: 'LNV-E14-08841', fecha: '2026-03-02', por: 'Jesús David' },
      { id: 2, userId: 21, nombre: 'Terminal demo A50', serial: 'PAX-A50-D0219', fecha: '2026-04-18', por: 'Jesús David' }
    ];
  }
  if (!db.nextActId) db.nextActId = 10;
  /* ===== MÓDULO ACTIVOS FIJOS, ALMACÉN Y PROCURA ===== */
  if (!db.af) {
    db.af = {
      cat: {
        categorias: ['Computación', 'Climatización', 'Mobiliario', 'Electrodomésticos', 'Audiovisual', 'Herramientas', 'Seguridad', 'POS / Terminales', 'Otros'],
        sedes: ['Sede Principal', 'Depósito', 'Remoto / Casa del empleado'],
        areas: ['PB - Recepción', 'PB - Almacén', 'Piso 1 - Administración', 'Piso 1 - Finanzas', 'Piso 2 - Tecnología', 'Piso 2 - Comercial', 'Sala de reuniones', 'Cocina / Comedor'],
        departamentos: ['Administración', 'Finanzas', 'RRHH', 'Tecnología', 'Operaciones', 'Comercial', 'Legal'],
        estadoFisico: ['Nuevo', 'Bueno', 'Regular', 'Malo', 'Inoperativo'],
        unidades: ['Unidad', 'Resma', 'Caja', 'Paquete', 'Cartucho', 'Litro', 'Rollo']
      },
      activos: [
        { id: 'AF-0001', categoria: 'Computación', descripcion: 'Laptop 14" administración', marca: 'Dell', modelo: 'Latitude 3440', serial: 'DL-3440-4821', fechaCompra: '2025-11-12', costo: 650, proveedor: 'Distribuidora TecnoZulia', factura: 'F-00821', sede: 'Sede Principal', area: 'Piso 1 - Finanzas', departamento: 'Finanzas', userId: 74, fechaAsig: '2025-11-20', estado: 'Asignado', estadoFisico: 'Bueno', ultimoInv: '2026-07-10', creadoPor: 'Isabella M.', obs: '' },
        { id: 'AF-0002', categoria: 'Computación', descripcion: 'Laptop 15" comercial', marca: 'Lenovo', modelo: 'ThinkPad E15', serial: 'LNV-E15-1190', fechaCompra: '2025-09-03', costo: 720, proveedor: 'Distribuidora TecnoZulia', factura: 'F-00655', sede: 'Sede Principal', area: 'Piso 2 - Comercial', departamento: 'Comercial', userId: null, fechaAsig: null, estado: 'Disponible', estadoFisico: 'Bueno', ultimoInv: '2026-07-10', creadoPor: 'Isabella M.', obs: '' },
        { id: 'AF-0003', categoria: 'Climatización', descripcion: 'Aire acondicionado split 12.000 BTU', marca: 'LG', modelo: 'Dual Inverter', serial: 'LG-DI-77120', fechaCompra: '2024-05-20', costo: 480, proveedor: 'ClimaCentro C.A.', factura: 'F-00190', sede: 'Sede Principal', area: 'Sala de reuniones', departamento: 'Administración', userId: null, fechaAsig: null, estado: 'Disponible', estadoFisico: 'Regular', ultimoInv: '2026-07-10', creadoPor: 'Isabella M.', obs: 'Requiere mantenimiento anual.' },
        { id: 'AF-0004', categoria: 'POS / Terminales', descripcion: 'Terminal POS demo A50', marca: 'PAX', modelo: 'A50', serial: 'PAX-A50-0219', fechaCompra: '2026-01-15', costo: 210, proveedor: 'VEPAGOS Importaciones', factura: 'F-01002', sede: 'Depósito', area: 'PB - Almacén', departamento: 'Comercial', userId: null, fechaAsig: null, estado: 'En reparación', estadoFisico: 'Malo', ultimoInv: '2026-07-10', creadoPor: 'Isabella M.', obs: 'Pantalla con falla táctil.' },
        { id: 'AF-0005', categoria: 'Mobiliario', descripcion: 'Escritorio ejecutivo en L', marca: 'Oficenter', modelo: 'Ejecutivo L', serial: '—', fechaCompra: '2023-08-01', costo: 180, proveedor: 'Muebles Maracaibo', factura: 'F-00044', sede: 'Sede Principal', area: 'Piso 1 - Administración', departamento: 'Administración', userId: 77, fechaAsig: '2023-08-05', estado: 'Asignado', estadoFisico: 'Bueno', ultimoInv: '2026-07-10', creadoPor: 'Isabella M.', obs: '' }
      ],
      nextActivo: 6,
      movs: [],
      nextMov: 1,
      actas: [], nextActa: 1,
      consumibles: [
        { id: 'CO-001', nombre: 'Resma de papel carta', unidad: 'Resma', minimo: 10, ubicacion: 'Estante A - Nivel 2' },
        { id: 'CO-002', nombre: 'Cartucho tóner HP 26A', unidad: 'Cartucho', minimo: 4, ubicacion: 'Estante B - Nivel 1' },
        { id: 'CO-003', nombre: 'Caja de bolígrafos (12u)', unidad: 'Caja', minimo: 6, ubicacion: 'Estante A - Nivel 1' },
        { id: 'CO-004', nombre: 'Rollo papel térmico POS', unidad: 'Rollo', minimo: 20, ubicacion: 'Estante C - Nivel 3' }
      ],
      nextCons: 5,
      stock: [
        { id: 1, artId: 'CO-001', tipo: 'Entrada', cant: 25, fecha: '2026-07-01', ref: 'Inventario inicial', por: 'Isabella M.', dep: '' },
        { id: 2, artId: 'CO-002', tipo: 'Entrada', cant: 8, fecha: '2026-07-01', ref: 'Inventario inicial', por: 'Isabella M.', dep: '' },
        { id: 3, artId: 'CO-003', tipo: 'Entrada', cant: 15, fecha: '2026-07-01', ref: 'Inventario inicial', por: 'Isabella M.', dep: '' },
        { id: 4, artId: 'CO-004', tipo: 'Entrada', cant: 40, fecha: '2026-07-01', ref: 'Inventario inicial', por: 'Isabella M.', dep: '' },
        { id: 5, artId: 'CO-001', tipo: 'Salida', cant: 8, fecha: '2026-07-08', ref: 'Entrega a Finanzas', por: 'Isabella M.', dep: 'Finanzas', para: 'Rosaura García' },
        { id: 6, artId: 'CO-004', tipo: 'Salida', cant: 25, fecha: '2026-07-09', ref: 'Entrega a Comercial', por: 'Isabella M.', dep: 'Comercial', para: 'Equipo POS' }
      ],
      nextStock: 7,
      proveedores: [
        { id: 1, razon: 'Distribuidora TecnoZulia', rif: 'J-30111222-4', contacto: 'ventas@tecnozulia.com', condiciones: 'Contado / 15 días' },
        { id: 2, razon: 'ClimaCentro C.A.', rif: 'J-29888111-0', contacto: 'clima@climacentro.com', condiciones: 'Contado' },
        { id: 3, razon: 'Muebles Maracaibo', rif: 'J-31222555-9', contacto: 'info@mueblesmcbo.com', condiciones: '30 días' }
      ],
      nextProv: 4,
      solicitudes: [
        { id: 'SC-0001', solicitante: 78, departamento: 'Administración', items: [{ desc: 'Resma de papel carta', artId: 'CO-001', cant: 20 }, { desc: 'Cartucho tóner HP 26A', artId: 'CO-002', cant: 6 }], justificacion: 'Reposición de material de oficina bajo stock mínimo.', estado: 'Enviada', fecha: '2026-07-11', aprobadoPor: null, aprobadoFecha: null, ordenId: null },
        { id: 'SC-0002', solicitante: 50, departamento: 'Tecnología', items: [{ desc: 'Laptop 14" para nuevo analista (equipo de Sistemas)', artId: null, cant: 1 }], justificacion: 'Ingreso de nuevo analista de soporte. Requerimiento enviado al equipo de Sistemas.', estado: 'Aprobada', fecha: '2026-07-09', aprobadoPor: 'Administradora VEPAGOS', aprobadoFecha: '2026-07-10', ordenId: null }
      ],
      nextSol: 3,
      ordenes: [], nextOrden: 1,
      audit: [], nextAudit: 1
    };
  }
  db.af.consumibles.forEach(function (c) { if (!c.almacen) c.almacen = 'consumibles'; });
  if (!db.af.nextMerc) db.af.nextMerc = 1;
  if (db.af.cat && db.af.cat.categorias.indexOf('Mercadeo') < 0) db.af.cat.categorias.push('Mercadeo');
  if (!db.af.reglas) db.af.reglas = { factor: 2, margen: 0, autoSolicitud: false };
  if (!db.af.mercadeoSeed) {
    db.af.mercadeoSeed = true;
    [
      { nombre: 'Franela institucional VEPAGOS', unidad: 'Unidad', minimo: 20, ubicacion: 'Estante D - Nivel 1', ini: 60 },
      { nombre: 'Gorra corporativa', unidad: 'Unidad', minimo: 15, ubicacion: 'Estante D - Nivel 1', ini: 35 },
      { nombre: 'Agenda corporativa 2026', unidad: 'Unidad', minimo: 15, ubicacion: 'Estante E - Nivel 2', ini: 40 },
      { nombre: 'Lapicero con logo', unidad: 'Caja', minimo: 10, ubicacion: 'Estante E - Nivel 1', ini: 25 },
      { nombre: 'Banner roll-up POP', unidad: 'Unidad', minimo: 3, ubicacion: 'Depósito mercadeo', ini: 8 },
      { nombre: 'Volante / flyer promocional', unidad: 'Paquete', minimo: 10, ubicacion: 'Estante E - Nivel 3', ini: 18 },
      { nombre: 'Kit de regalo corporativo', unidad: 'Unidad', minimo: 8, ubicacion: 'Estante F - Nivel 1', ini: 12 },
      { nombre: 'Mesa plegable para activación', unidad: 'Unidad', minimo: 2, ubicacion: 'Depósito mercadeo', ini: 4 }
    ].forEach(function (x) {
      var id = 'MK-' + (db.af.nextMerc < 10 ? '00' + db.af.nextMerc : (db.af.nextMerc < 100 ? '0' + db.af.nextMerc : db.af.nextMerc)); db.af.nextMerc++;
      db.af.consumibles.push({ id: id, nombre: x.nombre, unidad: x.unidad, minimo: x.minimo, ubicacion: x.ubicacion, almacen: 'mercadeo' });
      if (x.ini > 0) db.af.stock.push({ id: db.af.nextStock++, artId: id, tipo: 'Entrada', cant: x.ini, fecha: '2026-07-01', ref: 'Inventario inicial', por: 'Isabella M.', dep: '' });
    });
  }
  if (!db.af.mercActSeed) {
    db.af.mercActSeed = true;
    [
      { descripcion: 'Stand modular para feria', marca: 'PopExpo', modelo: 'Modular 3x3', costo: 900 },
      { descripcion: 'Televisor 55" para punto de venta', marca: 'Samsung', modelo: 'Crystal UHD', costo: 520 },
      { descripcion: 'Counter/mostrador de activación', marca: 'BrandLab', modelo: 'Counter Pro', costo: 340 }
    ].forEach(function (x) {
      var id = afNewActivoId();
      db.af.activos.push({ id: id, categoria: 'Mercadeo', descripcion: x.descripcion, marca: x.marca, modelo: x.modelo, serial: '', fechaCompra: '2026-02-10', costo: x.costo, proveedor: 'BrandLab C.A.', factura: '', sede: 'Depósito', area: 'PB - Almacén', departamento: 'Comercial', userId: null, fechaAsig: null, estado: 'Disponible', estadoFisico: 'Bueno', ultimoInv: '2026-07-10', creadoPor: 'Isabella M.', obs: 'Activo de mercadeo (no consumible).' });
    });
  }
  if (!db.activos.some(function (a) { return a.ingreso; })) {
    db.activos.push({ id: db.nextActId++, userId: 14, nombre: 'Kit de ingreso: carnet corporativo y uniforme', serial: 'ING-2026-014', fecha: '2026-03-02', por: 'Jesús David', ingreso: true });
    db.activos.push({ id: db.nextActId++, userId: 21, nombre: 'Kit de ingreso: carnet y material de ventas', serial: 'ING-2026-021', fecha: '2026-04-18', por: 'Jesús David', ingreso: true });
  }
  (function migrate() {
    var seedU = window.SV_SEED.USERS;
    db.users.forEach(function (u) {
      if (u.equipo === undefined || u.cumple === undefined) {
        var s = seedU.find(function (x) { return x.id === u.id; });
        if (u.equipo === undefined) u.equipo = s ? s.equipo : null;
        if (u.cumple === undefined) u.cumple = s ? s.cumple : null;
      }
    });
    window.SV_SEED.DOCS.forEach(function (d) {
      if ((d.depto || d.equipo) && !db.docs.some(function (x) { return x.nombre === d.nombre; })) db.docs.push(d);
    });
    seedU.forEach(function (s) {
      if (!db.users.some(function (x) { return x.id === s.id || x.email === s.email; })) db.users.push(s);
    });
    db.docs.forEach(function (d) {
      if (d.depto && !d.deptos) d.deptos = [d.depto];
      if (d.equipo && !d.equipos) d.equipos = [d.equipo];
    });
    db.users.forEach(function (u) {
    if (!db.nextToolId) db.nextToolId = 10;
      if (!u.herramientas || !u.herramientas.length) {
        u.herramientas = [
          { id: db.nextToolId++, nombre: 'Eureka', url: 'https://eureka.vepagos.com/login', tipo: 'app' },
          { id: db.nextToolId++, nombre: 'Liveconnect', url: 'https://liveconnect.vepagos.com', tipo: 'app' },
          { id: db.nextToolId++, nombre: 'SAC — Solicitudes', url: 'https://solicitudes.vepagos.com/login', tipo: 'app' },
          { id: db.nextToolId++, nombre: 'Drive del equipo', url: 'https://drive.google.com/', tipo: 'drive' }
        ];
      }
      if (!u.herramientas.some(function (t) { return /liveconnect/i.test(t.nombre); })) u.herramientas.push({ id: db.nextToolId++, nombre: 'Liveconnect', url: 'https://liveconnect.vepagos.com', tipo: 'app' });
      u.herramientas.forEach(function (t) { if (/^SAC/i.test(t.nombre) && (!t.url || t.url === '#')) t.url = 'https://solicitudes.vepagos.com/login'; });
      if (!u.accesosFrec) u.accesosFrec = u.herramientas.slice(0, 3).map(function (t) { return t.id; });
    });
    // ----- Contratos (control laboral VZLA) -----
    if (!db.nextEvalId) db.nextEvalId = 1;
    (function seedContratos() {
      // fechas de referencia relativas a hoy para que las alarmas tengan sentido
      function iso(d) { return d.toISOString().slice(0, 10); }
      function addDays(base, n) { var d = new Date(base); d.setDate(d.getDate() + n); return d; }
      function addMonths(base, n) { var d = new Date(base); d.setMonth(d.getMonth() + n); return d; }
      var hoy = new Date();
      // Config puntual: id -> etapa y "días hasta el fin" (para provocar o no la alarma)
      var PLAN = {
        14: { etapa: 'primero', fin: 9 },     // renovación en 9 días → ALARMA
        21: { etapa: 'prueba', fin: 5 },       // prueba termina en 5 días → ALARMA
        24: { etapa: 'segundo', fin: 12 },     // renovación en 12 días → ALARMA
        29: { etapa: 'primero', fin: 40 },     // aún lejos
        30: { etapa: 'segundo', fin: -3 }      // vencido hace 3 días → ALARMA (urgente)
      };
      db.users.forEach(function (u) {
        if (u.contrato || u.role === 'candidato') return;
        var p = PLAN[u.id];
        if (p) {
          var etapa = p.etapa;
          var dur = etapa === 'prueba' ? 1 : 6; // prueba 1 mes, contratos 6 meses (aprox)
          var fin = addDays(hoy, p.fin);
          var inicio = addMonths(fin, -dur);
          u.contrato = { etapa: etapa, inicio: iso(inicio), fin: iso(fin) };
        } else {
          // por defecto: personal consolidado → indefinido
          u.contrato = { etapa: 'indefinido', inicio: '2022-01-15', fin: null };
        }
      });
    })();
    if (!db.evaluaciones) db.evaluaciones = [];
    // fecha de ingreso (antigüedad → días de vacaciones)
    db.users.forEach(function (u) {
      if (!u.ingreso) {
        var act = (db.activos || []).find(function (a) { return a.userId === u.id && a.ingreso; });
        if (act && act.fecha) { u.ingreso = act.fecha; return; }
        var y = 2019 + (u.id % 7); if (y > 2025) y = 2025;
        var mo = (u.id * 5 % 12) + 1, da = (u.id * 3 % 27) + 1;
        u.ingreso = y + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0');
      }
    });
    // pendientes / alertas de RRHH (seed una sola vez)
    if (!db._pendSeed) {
      db._pendSeed = true;
      [
        ['brendhy.betancourt@somosvepagos.com', 'horario', 'Llegadas tarde registradas', 'Registramos 3 marcaciones fuera del horario de entrada en las últimas 2 semanas. Justifica el motivo o coordina un ajuste de horario con tu supervisor.'],
        ['brendhy.betancourt@somosvepagos.com', 'planilla', 'Planilla de notificación de riesgos (LOPCYMAT)', 'Debes leer y firmar la notificación de riesgos de tu puesto. Confírmalo aquí y adjunta la planilla firmada.'],
        ['gina.sanchez@somosvepagos.com', 'rrhh', 'Firma pendiente: recibo de vacaciones 2025', 'Pasa por Capital Humano o adjunta el recibo de vacaciones 2025 firmado para cerrar tu expediente.'],
        ['gina.sanchez@somosvepagos.com', 'planilla', 'Actualización de datos personales', 'Completa la planilla de actualización de datos: dirección, contacto de emergencia y cuenta nómina.']
      ].forEach(function (p) {
        var u = db.users.find(function (x) { return x.email === p[0]; });
        if (u) db.pendientes.push({ id: db.nextPendId++, userId: u.id, tipo: p[1], titulo: p[2], detalle: p[3], estado: 'abierto', fecha: '2026-07-06', por: 'Capital Humano', respuesta: '', adjuntoNombre: null, adjunto: null });
      });
    }
    // comunicaciones internas (seed una sola vez)
    if (!db._comSeed) {
      db._comSeed = true;
      var rh = db.users.find(function (x) { return x.email === 'rrhh@somosvepagos.com'; });
      var autor = rh ? rh.nombre : 'Capital Humano';
      [
        { titulo: 'Nuevo horario de la sede a partir de agosto', fecha: '2026-07-08', cuerpo: 'A partir del <b>1 de agosto</b>, el horario de oficina será de <b>8:00 a.m. a 5:00 p.m.</b> de lunes a viernes, con una hora de almuerzo flexible entre 12:00 y 2:00 p.m.\n\nRecuerda registrar tu entrada y salida en el reloj biométrico. Cualquier ajuste por motivos personales debe coordinarse con tu supervisor directo.\n\n¡Gracias por tu compromiso!' },
        { titulo: 'Jornada de vacunación y bienestar', fecha: '2026-07-03', cuerpo: 'El próximo <b>viernes 18 de julio</b> tendremos una jornada de salud en la sede: vacunación contra la influenza, toma de tensión y orientación nutricional, totalmente gratuita para todo el equipo.\n\nCupos limitados por la mañana. Inscríbete con Capital Humano antes del miércoles.' }
      ].forEach(function (c) {
        db.comunicaciones.push({ id: db.nextComId++, titulo: c.titulo, cuerpo: c.cuerpo, por: autor, fecha: c.fecha, adjuntoNombre: null, adjunto: null, leidoPor: [] });
      });
    }
    saveDB(db);
  })();
  var me = null;
  var _apiMenuIds = null; /* cache de pantallas permitidas desde /api/menu */
  /* Restaurar sesión desde JWT si existe */
  (function _tryRestoreSession() {
    if (window.SV_API && window.SV_API.isLoggedIn()) {
      window.SV_API.getMe().then(function (data) {
        if (data && !data.error && data.id) {
          me = findOrBuildUser(data);
          /* Cargar menú desde API */
          return window.SV_API.getMenu().then(function (menuData) {
            if (menuData && menuData.groups) {
              _apiMenuIds = [];
              menuData.groups.forEach(function (g) {
                g.items.forEach(function (it) {
                  _apiMenuIds.push(it.id);
                  if (it.sub) it.sub.forEach(function (s) { _apiMenuIds.push(s.id); });
                });
              });
            }
            $('#viewLogin').style.display = 'none';
            $('#viewApp').classList.add('on');
            renderShell(); go('inicio');
          });
        }
      }).catch(function () {});
    }
  })();
  function findOrBuildUser(apiUser) {
    var existing = db.users.find(function (u) { return u.id === apiUser.id; });
    if (existing) {
      existing.role = apiUser.perfil_key || existing.role;
      existing.permisos = apiUser.permisos || existing.permisos || [];
      existing.accesosPermisos = {};
      (apiUser.permisos || []).forEach(function (p) { existing.accesosPermisos[p] = true; });
      return existing;
    }
    return {
      id: apiUser.id, nombre: apiUser.nombre, cargo: apiUser.cargo, area: apiUser.area,
      role: apiUser.perfil_key, email: apiUser.email, telefono: apiUser.telefono,
      ciudad: apiUser.ciudad, cumple: apiUser.cumple, activo: apiUser.activo,
      managerId: apiUser.supervisor_id, equipo: apiUser.nombre_equipo,
      permisos: apiUser.permisos || [], accesosPermisos: {},
      password: 'vepagos2026'
    };
  }

  var ROLE_LABEL = { admin: 'Administradora', director: 'Director', gerente: 'Gerente Ejecutivo', gerenteop: 'Gerente Operativo', coordinador: 'Coordinador/Supervisor', rrhh: 'Capital Humano', interno: 'Equipo interno', ventas: 'Fuerza de ventas', candidato: 'Candidato', reclutador: 'Reclutador FV', entrenador: 'Entrenador FV', inces: 'Pasante INCES' };
  var ONB = window.SV_SEED.ONBOARDING, CATS = window.SV_SEED.DOC_CATS, ANUNCIOS = window.SV_SEED.ANUNCIOS;

  /* ---------- helpers ---------- */
  function initials(n) { return n.split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase(); }
  function resetContent() { var old = $('#content'); var f = old.cloneNode(false); old.parentNode.replaceChild(f, old); return f; }
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('on'); }, 2600); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function byId(id) { return db.users.find(function (u) { return u.id === id; }); }
  function logHist(u, texto, por) {
    if (!u) return;
    u.historial = u.historial || [];
    u.historial.unshift({ fecha: new Date().toISOString(), texto: texto, por: por || (me ? me.nombre : 'Sistema') });
    if (u.historial.length > 200) u.historial = u.historial.slice(0, 200);
  }
  function team(gid) { return db.users.filter(function (u) { return u.managerId === gid && u.activo; }); }
  var ROLES_OCULTOS = ['ventas', 'reclutador', 'entrenador'];
  function perfilVisible(u) { return !!u && ROLES_OCULTOS.indexOf(u.role) === -1; }
  // Reportes directos visibles; los de un jefe oculto suben sus descendientes visibles
  function visibleReports(gid) {
    var out = [];
    team(gid).forEach(function (u) { if (perfilVisible(u)) out.push(u); else out = out.concat(visibleReports(u.id)); });
    return out;
  }
  function subtreeVisible(gid) { var out = []; visibleReports(gid).forEach(function (u) { out.push(u); out = out.concat(subtreeVisible(u.id)); }); return out; }
  function toolIco(tipo) {
    var p = tipo === 'drive' ? '<path d="M6 2 2 9l4 7h8l4-7-4-7z"></path><path d="M2 9h20"></path><path d="m6 2 4 7"></path>'
      : (tipo === 'ext' || tipo === 'link') ? '<circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"></path>'
      : '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect>';
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  }
  function subtree(gid) {
    var out = [], stack = [gid];
    while (stack.length) {
      var cur = stack.pop();
      team(cur).forEach(function (u) { out.push(u); stack.push(u.id); });
    }
    return out;
  }
  function myOnboardingKey() { return 'interno'; }
  function progressOf(uid, roleKey) {
    var mods = (ONB[roleKey] || ONB.interno).modulos;
    var p = db.progreso[uid] || {};
    var done = mods.filter(function (m) { return p[m.id]; }).length;
    return { done: done, total: mods.length, pct: mods.length ? Math.round(done / mods.length * 100) : 0 };
  }
  function progressOfPlan(plan, uid) {
    var mods = plan.modulos || [];
    var p = db.progreso[uid] || {};
    var done = mods.filter(function (m) { return p[m.id]; }).length;
    return { done: done, total: mods.length, pct: mods.length ? Math.round(done / mods.length * 100) : 0 };
  }
  function avatarHtml(u, size, fs) {
    size = size || 40; fs = fs || 14;
    if (u.foto) return '<img class="avatar" src="' + u.foto + '" alt="" style="width:' + size + 'px;height:' + size + 'px;object-fit:cover;border-radius:50%;flex:0 0 auto">';
    return '<div class="avatar" style="width:' + size + 'px;height:' + size + 'px;font-size:' + fs + 'px">' + initials(u.nombre) + '</div>';
  }
  function pickPhoto(cb) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas'); c.width = c.height = 220;
          var s = Math.min(img.width, img.height);
          c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 220, 220);
          cb(c.toDataURL('image/jpeg', 0.85));
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    };
    inp.click();
  }
  function photoZoom(u) {
    if (!u.foto) return;
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,15,40,.78);z-index:400;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;cursor:zoom-out;padding:24px';
    ov.innerHTML = '<img src="' + u.foto + '" alt="" style="width:min(72vw,400px);height:min(72vw,400px);object-fit:cover;border-radius:22px;box-shadow:0 40px 90px rgba(0,0,0,.55)">' +
      '<div style="text-align:center;color:#fff"><div style="font-size:23px;font-weight:800;letter-spacing:-.3px">' + esc(u.nombre) + '</div><div style="font-size:15px;color:rgba(255,255,255,.75);margin-top:3px">' + esc(u.cargo) + (u.area ? ' · ' + esc(u.area) : '') + '</div></div>' +
      '<div style="font-size:12.5px;color:rgba(255,255,255,.5)">Toca para cerrar</div>';
    ov.addEventListener('click', function () { ov.remove(); });
    document.body.appendChild(ov);
  }
  function stripHtml(h) {
    var d = document.createElement('div');
    d.innerHTML = String(h).replace(/<li>/gi, '  • ').replace(/<\/li>/gi, '\n').replace(/<\/p>|<br\s*\/?>/gi, '\n');
    return (d.textContent || '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
  }
  function lessonDownload(m) {
    var title = m.t || m.titulo || 'Inducción';
    var L = ['VEPAGOS · INDUCCIÓN', title, '========================================', ''];
    var steps = (m.lesson && Array.isArray(m.lesson) && m.lesson.length > 0) ? m.lesson : [
      { h: title, b: m.d || m.descripcion || 'Material de inducción correspondiente al módulo.', key: 'Revisa y aplica los lineamientos de tu área.' }
    ];
    steps.forEach(function (s, i) {
      L.push((i + 1) + '. ' + (s.h || '').toUpperCase());
      L.push(stripHtml(s.b || ''));
      if (s.dd) s.dd.forEach(function (d) { L.push((d.ok ? '  ✓ Así sí: ' : '  ✕ Así no: ') + stripHtml(d.t)); });
      if (s.key) L.push('  ★ Para que se te grabe: ' + stripHtml(s.key));
      L.push('');
    });
    L.push('----------------------------------------');
    L.push('Repasa esta inducción y su quiz cuando quieras en Somos VEPAGOS → Inducciones.');
    L.push('Hacemos crecer tu negocio.');
    var blob = new Blob([L.join('\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Induccion - ' + title.replace(/[^\wáéíóúñÁÉÍÓÚÑ\- ]/g, '') + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Resumen descargado.');
  }
  function demoDownload(nombre) {
    var txt = 'VEPAGOS — Documento de ejemplo\n\n' + nombre + '\n\nEste archivo es un marcador de posición del prototipo "Somos VEPAGOS".\nEn el sistema real aquí se descargará el documento verdadero.';
    var blob = new Blob([txt], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre.replace(/[^\wáéíóúñÁÉÍÓÚÑ\- ]/g, '') + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function csvDownload(rows, filename) {
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- navegación / permisos ---------- */
  var NAV = [
    { id: 'inicio', g: 'personal', t: 'Inicio', roles: 'all', ico: '<path d="M3 10.5L12 3l9 7.5"></path><path d="M5 9.5V21h14V9.5"></path>' },
    { id: 'adminmenu', g: 'personal', t: 'Administración', roles: ['admin'], ico: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>', sub: [
      { id: 'adminfrec', t: 'Accesos frecuentes' },
      { id: 'adminsomos', t: 'Somos VEPAGOS' },
      { id: 'adminenc', t: 'Encuestas' },
      { id: 'admincom', t: 'Comunicaciones' },
      { id: 'admininducciones', t: 'Inducciones' },
      { id: 'admindocs', t: 'Biblioteca' }
    ] },
    { id: 'metas', g: 'personal', t: 'Metas', roles: ['admin', 'gerente'], ico: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle>', sub: [
      { id: 'metas2026', t: 'Metas 2026' },
      { id: 'metasvision', t: 'Visión' },
      { id: 'metashist', t: 'Histórico' }
    ] },
    { id: 'somos', g: 'personal', t: 'Somos VEPAGOS', roles: 'all', ico: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8h.01"></path><path d="M11 12h1v4h1"></path>' },
    { id: 'cultura', g: 'personal', t: 'Cultura organizacional', roles: 'all', ico: '<path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"></path>' },
    { id: 'docs', g: 'personal', t: 'Biblioteca', roles: 'all', ico: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>' },
    { id: 'solicitudes', g: 'personal', t: 'Solicitudes', roles: 'all', ico: '<path d="M22 12h-6l-2 3h-4l-2-3H2"></path><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>' },
    { id: 'pendientes', g: 'personal', t: 'Notificaciones', roles: 'all', ico: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path>' },
    { id: 'solequipo', g: 'gestion', t: 'Notificaciones del equipo', roles: ['admin', 'rrhh', 'gerente'], ico: '<path d="M9 11l3 3 8-8"></path><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"></path>' },
    { id: 'org', g: 'gestion', t: 'Organigrama', roles: ['admin', 'gerente', 'rrhh'], ico: '<rect x="9" y="2" width="6" height="5" rx="1"></rect><rect x="2" y="17" width="6" height="5" rx="1"></rect><rect x="16" y="17" width="6" height="5" rx="1"></rect><path d="M12 7v5M5 17v-3h14v3"></path>' },
    { id: 'directorio', g: 'gestion', t: 'Directorio', roles: ['admin', 'gerente', 'rrhh'], ico: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>' },
    { id: 'ventasmenu', g: 'gestion', t: 'Ventas', roles: ['admin', 'gerente'], ico: '<path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path>', sub: [
      { id: 'ventasfv', t: 'Fuerza de ventas' },
      { id: 'ventasbancos', t: 'Bancos' }
    ] },
    { id: 'onboarding', g: 'personal', t: 'Inducciones', roles: 'all', ico: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="M22 4L12 14.01l-3-3"></path>' },
    { id: 'induccionequipo', g: 'gestion', t: 'Onboarding del equipo', roles: ['admin', 'rrhh', 'entrenador'], ico: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>' },
    { id: 'empleados', g: 'gestion', t: 'Empleados', roles: ['admin', 'rrhh'], ico: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h6"></path>' },
    { id: 'claves', g: 'gestion', t: 'Restauración de claves', roles: ['admin', 'rrhh'], ico: '<rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>' },
    { id: 'activos', g: 'gestion', t: 'Activos y procura', roles: ['admin', 'rrhh'], ico: '<path d="M20 7h-3V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path><path d="M9 7V4h6v3"></path>', sub: [
      { id: 'afpanel', t: 'Panel general' },
      { id: 'afactivos', t: 'Activos fijos' },
      { id: 'aftech', t: 'Almacén de tecnología' },
      { id: 'afalmacen', t: 'Almacén consumibles' },
      { id: 'afmercadeo', t: 'Almacén Mercadeo' },
      { id: 'afprocura', t: 'Procura' }
    ] },
    { id: 'asistencia', g: 'gestion', t: 'Asistencia', roles: 'all', ico: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M8 2v4M16 2v4M3 10h18"></path><path d="m9 16 2 2 4-4"></path>' },
    { id: 'encuestas', g: 'gestion', t: 'Encuestas', roles: ['admin', 'rrhh'], ico: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>' },
    { id: 'contratos', g: 'gestion', t: 'Contratos', roles: ['admin', 'rrhh', 'gerente'], ico: '<path d="M9 12h6M9 16h6M9 8h6"></path><path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path>' },
    { id: 'perfiles', g: 'config', t: 'Perfiles', roles: ['admin'], ico: '<circle cx="9" cy="7" r="4"></circle><path d="M3 21v-1a6 6 0 0 1 12 0v1"></path><path d="M16 11l2 2 4-4"></path>' },
    { id: 'requerimientos', g: 'config', t: 'Requerimientos', roles: ['admin'], ico: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>' },
    { id: 'accesos', g: 'config', t: 'Accesos y permisos', roles: ['admin'], ico: '<rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><circle cx="12" cy="16" r="1"></circle>' },
    { id: 'recursos', g: 'config', t: 'Aplicativos y drives', roles: ['admin'], ico: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect>' },
    { id: 'perfil', g: 'personal', t: 'Mi perfil', roles: 'all', ico: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a8 8 0 0 1 16 0v1"></path>' },
    { id: 'eureka', t: 'Eureka', roles: 'all', href: 'https://eureka.vepagos.com/login', ico: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect>' },
    { id: 'sac', t: 'SAC', roles: 'all', href: 'https://solicitudes.vepagos.com/login', ico: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>' }
  ];
  function esAprobador() { return !!(me && db.aprobadores && Object.keys(db.aprobadores).some(function (k) { return db.aprobadores[k] === me.id; })); }
  function tieneReportes() { return !!(me && db.users.some(function (u) { return u.managerId === me.id && u.activo; })); }
  function getPerfil(key) { return (db.perfiles || []).find(function (p) { return p.key === key; }) || null; }
  function roleLabelOf(key) { var p = getPerfil(key); return (p && p.label) || ROLE_LABEL[key] || key; }
  function baseChain(r) { var out = [r], p = getPerfil(r), g = 0; while (p && p.base && g++ < 6 && out.indexOf(p.base) < 0) { out.push(p.base); p = getPerfil(p.base); } if (out.length === 1) { if (r === 'director' || r === 'gerenteop') out.push('gerente'); else if (r === 'coordinador') out.push('interno'); } return out; }
  function roleSet() { return baseChain(me.role); }
  function esGerenteLike() { return roleSet().indexOf('gerente') > -1; }
  function assignableRoles() { var keys = (db.perfiles || []).map(function (p) { return p.key; }); ['ventas', 'reclutador', 'entrenador', 'inces'].forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); return keys.filter(function (k) { return k !== 'admin'; }); }
  function reqPerfKeys() { var keys = ['General']; (db.perfiles || []).forEach(function (p) { if (keys.indexOf(p.key) < 0) keys.push(p.key); }); ['ventas', 'reclutador', 'entrenador', 'inces'].forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); return keys; }
  function reqLabelOf(key) { return key === 'General' ? 'General' : roleLabelOf(key); }
  var REQ_AREAS = [
    { key: 'rrhh', label: 'RRHH', hint: 'Contrato, registro en nómina, cestaticket…' },
    { key: 'nomina', label: 'Nómina', hint: 'Le corresponde a Capital Humano, ejecutado con empresa tercerizada.' },
    { key: 'sistemas', label: 'Sistemas', hint: 'Correo, acceso a Eureka, DeskTime, huella…' },
    { key: 'mercadeo', label: 'Mercadeo', hint: 'Firma institucional, foto profesional, LinkedIn…' },
    { key: 'depto', label: 'Su departamento', hint: 'Inducciones, explicación del cargo y funciones…' }
  ];
  function reqOnbGroups(pk) { var c = (db.reqCatalogo.onboarding || {})[pk]; if (Array.isArray(c)) return { depto: c.slice() }; return c || {}; }
  function reqAreaList(pk, ak) { var g = reqOnbGroups(pk); if (g[ak] && g[ak].length) return g[ak].slice(); if (pk !== 'General') return (reqOnbGroups('General')[ak] || []).slice(); return []; }
  function reqAreaHereda(pk, ak) { var g = reqOnbGroups(pk); return pk !== 'General' && !(g[ak] && g[ak].length); }
  function reqOnboardFor(pk) { var out = []; REQ_AREAS.forEach(function (a) { reqAreaList(pk, a.key).forEach(function (t) { if (out.indexOf(t) < 0) out.push(t); }); }); return out; }
  function reqAccGroups(pk) { return (db.reqCatalogo.accesos || {})[pk] || {}; }
  function reqAccList(pk, bk) { var g = reqAccGroups(pk); if (g[bk] && g[bk].length) return g[bk].slice(); if (pk !== 'General') return (reqAccGroups('General')[bk] || []).slice(); return []; }
  function reqAccPerfil(pk) { var out = { drives: [], apps: [], herramientas: [] }; ['drives', 'apps', 'herramientas'].forEach(function (bk) { out[bk] = reqAccList(pk, bk); }); return out; }
  function perfilPermLabels(role) { var chain = baseChain(role), keys = {}; chain.forEach(function (k) { var p = getPerfil(k); if (p && p.permisos) Object.keys(p.permisos).forEach(function (pk) { if (p.permisos[pk]) keys[pk] = 1; }); }); return PERMISOS.filter(function (x) { return keys[x.key]; }).map(function (x) { return x.label; }); }
  function reqOffboardFor(role) { var c = db.reqCatalogo.offboard; return (role && c[role] && c[role].length) ? c[role] : (c['General'] || []); }
  function hasPerm(k) {
    if (me && me.accesosPermisos && me.accesosPermisos[k]) return true;
    if (me) { var chain = baseChain(me.role); for (var i = 0; i < chain.length; i++) { var p = getPerfil(chain[i]); if (p && p.permisos && p.permisos[k]) return true; } }
    return false;
  }
  function profileMenus(role) { var chain = baseChain(role); for (var i = 0; i < chain.length; i++) { var p = getPerfil(chain[i]); if (p && p.menus) return p.menus; } return null; }
  function legacyMenuSet(role) { var chain = baseChain(role); return NAV.filter(function (n) { return n.id && n.t; }).filter(function (n) { return n.roles === 'all' || (n.roles.some && n.roles.some(function (r) { return chain.indexOf(r) > -1; })); }).map(function (n) { return n.id; }); }
  var PERMISOS = [
    { key: 'procuraVer', grupo: 'Activos y procura', label: 'Ver Procura', desc: 'Entrar al módulo y consultar solicitudes y órdenes.', nav: 'activos' },
    { key: 'procuraCrear', grupo: 'Activos y procura', label: 'Crear solicitudes de procura', desc: 'Registrar nuevas solicitudes de compra (no puede aprobarlas).', nav: 'activos' },
    { key: 'procuraAprobar', grupo: 'Activos y procura', label: 'Aprobar / rechazar solicitudes', desc: 'Validar (aprobar o rechazar) las solicitudes de procura.', nav: 'activos' },
    { key: 'procuraOrden', grupo: 'Activos y procura', label: 'Generar órdenes y proveedores', desc: 'Crear órdenes de compra y registrar proveedores.', nav: 'activos' },
    { key: 'procuraRecibir', grupo: 'Activos y procura', label: 'Registrar recepción de órdenes', desc: 'Recibir mercancía e ingresarla al inventario.', nav: 'activos' },
    { key: 'almacenVer', grupo: 'Almacén y activos', label: 'Ver almacenes y activos', desc: 'Consultar inventario, kardex y activos fijos (solo lectura).', nav: 'activos' },
    { key: 'almacenMovimiento', grupo: 'Almacén y activos', label: 'Registrar movimientos de almacén', desc: 'Entradas, salidas y ajustes de consumibles.', nav: 'activos' },
    { key: 'almacenArticulo', grupo: 'Almacén y activos', label: 'Crear artículos y reglas', desc: 'Alta y carga masiva de artículos; reglas y reposición.', nav: 'activos' },
    { key: 'activosGestionar', grupo: 'Almacén y activos', label: 'Gestionar activos fijos', desc: 'Alta, asignación, devolución, sustitución y baja de activos.', nav: 'activos' },
    { key: 'verContratos', grupo: 'Otros módulos', label: 'Ver Contratos', desc: 'Acceso al módulo de control laboral.', nav: 'contratos' },
    { key: 'verEmpleados', grupo: 'Otros módulos', label: 'Ver Empleados', desc: 'Acceso al listado y perfiles de empleados.', nav: 'empleados' },
    { key: 'verEncuestas', grupo: 'Otros módulos', label: 'Ver Encuestas', desc: 'Acceso al módulo de encuestas.', nav: 'encuestas' },
    { key: 'verEquipo', grupo: 'Otros módulos', label: 'Notificaciones del equipo', desc: 'Ver pendientes y solicitudes del equipo que dirige o apoya.', nav: 'solequipo' }
  ];
  var PERM_NAV = {}; PERMISOS.forEach(function (p) { if (p.nav) { (PERM_NAV[p.nav] = PERM_NAV[p.nav] || []).push(p.key); } });
  /* Permiso efectivo para una acción de Activos/Procura: admin todo; Capital Humano puede crear solicitudes por defecto */
  function afCan(k) {
    if (me.role === 'admin') return true;
    if (hasPerm(k)) return true;
    if (me.role === 'rrhh' && (k === 'procuraCrear' || k === 'procuraVer')) return true;
    return false;
  }
  var MODALIDADES = [
    { key: 'oficina', label: 'Presencial · escritorio en oficina', desc: 'Se sienta en un puesto dentro de la oficina.' },
    { key: 'mantenimiento', label: 'Mantenimiento / campo', desc: 'Personal de mantenimiento o trabajo físico.' },
    { key: 'remoto', label: 'Fuera de la oficina / remoto', desc: 'Trabaja fuera de la sede la mayor parte del tiempo.' },
    { key: 'hibrido', label: 'Híbrido', desc: 'Combina oficina y trabajo remoto.' }
  ];
  function modalidadLabel(k) { var m = MODALIDADES.find(function (x) { return x.key === k; }); return m ? m.label : k; }
  function reqModalidadFor(k) { var c = db.reqCatalogo.modalidad || {}; return (k && c[k]) ? c[k].slice() : []; }
  function reqAllOnboardItems() { var set = [], seen = {}; (REQ_CATALOG || []).forEach(function (x) { if (!seen[x]) { seen[x] = 1; set.push(x); } }); Object.keys(db.reqCatalogo.onboarding).forEach(function (d) { var g = reqOnbGroups(d); Object.keys(g).forEach(function (ak) { (g[ak] || []).forEach(function (x) { if (!seen[x]) { seen[x] = 1; set.push(x); } }); }); }); return set; }
  function esComercialLead() { return me.role === 'admin' || (esGerenteLike() && (/comercial|ventas/i.test(me.area || '') || /director.*comercial|comercial|fuerza de venta/i.test(me.cargo || ''))); }
  function canSee(item) {
    /* Si tenemos menú del API, usarlo como fuente de verdad */
    if (_apiMenuIds) {
      if (item.id === 'inicio' || item.id === 'perfil') return true;
      return _apiMenuIds.indexOf(item.id) > -1;
    }
    /* Fallback: lógica local (offline / sin API) */
    if (me.role === 'admin') return true;
    var menus = profileMenus(me.role);
    if (menus) {
      if (item.id === 'inicio' || item.id === 'perfil') return true;
      if (menus.indexOf(item.id) > -1) return true;
      if (PERM_NAV[item.id] && PERM_NAV[item.id].some(hasPerm)) return true;
      return false;
    }
    if (item.id === 'ventasmenu' || item.id === 'ventasfv' || item.id === 'ventasbancos') return esComercialLead();
    if (item.id === 'solequipo') return me.role === 'admin' || me.role === 'rrhh' || esGerenteLike() || me.role === 'coordinador' || hasPerm('verEquipo') || esAprobador() || tieneReportes();
    if (PERM_NAV[item.id] && PERM_NAV[item.id].some(hasPerm)) return true;
    var mine = roleSet();
    return item.roles === 'all' || item.roles.some(function (r) { return mine.indexOf(r) > -1; });
  }
  var NAV_GROUPS = [
    { id: 'personal', t: 'Tu espacio' },
    { id: 'gestion', t: 'Seguimiento del equipo' },
    { id: 'config', t: 'Configuración' }
  ];
  function asisVeEquipo() { return me.role === 'admin' || me.role === 'rrhh' || esGerenteLike(); }
  function navGroup(n) {
    // El equipo de trabajo (que solo se ve a sí mismo) tiene Asistencia dentro de "Tu espacio", no en gestión.
    if (n.id === 'asistencia' && !asisVeEquipo()) return 'personal';
    return n.g || 'personal';
  }
  function catAllowed(cat) { var mine = roleSet(); return cat.roles.some(function (r) { return mine.indexOf(r) > -1; }); }
  function canUploadDocs() { return me.role === 'admin' || esGerenteLike() || me.role === 'rrhh'; }
  function canDeleteDocs() { return me.role === 'admin'; }
  function visibleDoc(d) {
    if (me.role === 'admin') return true;
    if (d.userId != null) return d.userId === me.id || me.role === 'rrhh';
    var ds = d.deptos || [], es = d.equipos || [];
    if (!ds.length && !es.length) return true;
    if (ds.indexOf(me.area) > -1) return true;
    if (es.indexOf(me.equipo) > -1) return true;
    return false;
  }

  /* ---------- login ---------- */
  var DEMO = [
    ['Administradora', 'admin@somosvepagos.com', '10000001'], ['Director', 'antonio.palermo@somosvepagos.com', '10000010'], ['Gerente Ejecutivo', 'mayra.gruber@somosvepagos.com', '10000070'], ['Gerente Operativo', 'aymara.gonzalez@somosvepagos.com', '10000011'], ['Coordinador/Supervisor', 'victor.torrealba@somosvepagos.com', '10000071'], ['Capital Humano', 'rrhh@somosvepagos.com', '10000077'],
    ['Equipo interno', 'gina.sanchez@somosvepagos.com', '10000014'],
    ['Pasante INCES', 'maria.linares@somosvepagos.com', '10000091']
  ];
  function renderLoginChips() {
    $('#lgRoles').innerHTML = DEMO.map(function (d) { return '<button type="button" class="lg-role" data-mail="' + d[1] + '" data-ci="' + (d[2] || '') + '">' + d[0] + '</button>'; }).join('');
  }
  function doLogin(user) {
    me = user;
    $('#viewLogin').style.display = 'none';
    $('#viewApp').classList.add('on');
    renderShell(); go('inicio');
  }
  $('#lgRoles') && $('#lgRoles').addEventListener('click', function (e) {
    var b = e.target.closest('.lg-role'); if (!b) return;
    $('#lgEmail').value = b.getAttribute('data-mail'); $('#lgPass').value = 'vepagos2026'; if ($('#lgCedula')) $('#lgCedula').value = b.getAttribute('data-ci') || '00000000';
  });
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var em = $('#lgEmail').value.trim().toLowerCase(), pw = $('#lgPass').value, ci = ($('#lgCedula') ? $('#lgCedula').value : '').replace(/[^0-9kK]/g, '');
    if (!ci) { var lec = $('#lgErr'); lec.textContent = 'Ingresa tu cédula.'; lec.style.display = 'block'; return; }
    /* ===== Backend login ===== */
    window.SV_API.login(em, pw, ci).then(function (result) {
      if (result.error) {
        var le = $('#lgErr');
        le.textContent = result.error;
        le.style.display = 'block';
        return;
      }
      /* Obtener datos completos del usuario */
      return window.SV_API.getMe().then(function (userData) {
        if (userData && !userData.error) {
          var u = findOrBuildUser(userData);
          /* Fallback: buscar en db local para que todas las pantallas funcionen */
          var local = db.users.find(function (x) { return x.email.toLowerCase() === em; });
          if (local) {
            Object.assign(local, { role: u.role, accesosPermisos: u.accesosPermisos, permisos: u.permisos });
            u = local;
          }
          /* Cargar menú desde API */
          return window.SV_API.getMenu().then(function (menuData) {
            if (menuData && menuData.groups) {
              _apiMenuIds = [];
              menuData.groups.forEach(function (g) {
                g.items.forEach(function (it) {
                  _apiMenuIds.push(it.id);
                  if (it.sub) it.sub.forEach(function (s) { _apiMenuIds.push(s.id); });
                });
              });
            }
            $('#lgErr').style.display = 'none';
            doLogin(u);
          });
        }
      });
    }).catch(function (err) {
      var le = $('#lgErr');
      le.textContent = 'Error de conexión con el servidor.';
      le.style.display = 'block';
    });
  });
  $('#goApply').addEventListener('click', function (e) { e.preventDefault(); $('#loginCard').classList.add('hidden'); $('#applyCard').classList.remove('hidden'); });
  var lgForgot = $('#lgForgot');
  if (lgForgot) lgForgot.addEventListener('click', function (e) {
    e.preventDefault();
    modal('<button class="mod-x">✕</button><h3>Restaurar contraseña</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 10px">Ingresa tu correo corporativo. Capital Humano recibirá una alerta y restaurará tu clave.</p>' +
      '<div class="fld"><label>Correo</label><input id="fgEmail" type="email" placeholder="tucorreo@somosvepagos.com"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="fgOk">Solicitar restauración</button></div>');
    $('#fgOk').addEventListener('click', function () {
      var em = ($('#fgEmail').value || '').trim().toLowerCase();
      if (!em) { toast('Ingresa tu correo.'); return; }
      var u = db.users.find(function (x) { return x.email.toLowerCase() === em; });
      if (!u) { toast('No encontramos una cuenta con ese correo. Verifica o contacta a Capital Humano.'); return; }
      var ya = db.claveReqs.some(function (r) { return r.userId === u.id && r.estado === 'pendiente'; });
      if (ya) { closeModal(); toast('Ya tienes una solicitud de restauración en curso. Capital Humano la atenderá pronto.'); return; }
      db.claveReqs.push({ id: db.nextClaveId++, userId: u.id, nombre: u.nombre, email: u.email, fecha: reqToday(), creadoEl: nowStamp(), estado: 'pendiente' });
      logHist(u, 'Solicitó restauración de contraseña', u.nombre);
      saveDB(db); closeModal(); toast('Solicitud enviada. Capital Humano restaurará tu clave y te la hará llegar.');
    });
  });
  $('#goLogin').addEventListener('click', function (e) { e.preventDefault(); $('#applyCard').classList.add('hidden'); $('#loginCard').classList.remove('hidden'); });
  $('#applyForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var nombre = $('#apNombre').value.trim() + ' ' + $('#apApellido').value.trim();
    var email = $('#apEmail').value.trim().toLowerCase();
    if (db.users.some(function (u) { return u.email.toLowerCase() === email; })) { toast('Ya existe una cuenta con ese correo.'); return; }
    var user = {
      id: db.nextUserId++, nombre: nombre, cargo: 'Candidato — Fuerza de ventas', area: 'Comercial', role: 'candidato',
      managerId: 12, email: email, telefono: $('#apTel').value.trim(), linkedin: $('#apLinkedin').value.trim(),
      ciudad: $('#apCiudad').value.trim(), activo: true, password: $('#apPass').value
    };
    db.users.push(user);
    db.candidatos.push({ id: db.nextCandId++, nombre: nombre, email: email, telefono: user.telefono, linkedin: user.linkedin, ciudad: user.ciudad, experiencia: $('#apExp').value, etapa: 'nuevo', fecha: new Date().toISOString().slice(0, 10), nota: '' });
    saveDB(db);
    toast('¡Postulación creada! Bienvenido/a.');
    doLogin(user);
  });
  $('#btnLogout').addEventListener('click', function () {
    if (window.SV_API) window.SV_API.logout();
    localStorage.removeItem(SES_KEY); me = null;
    $('#viewApp').classList.remove('on'); $('#viewLogin').style.display = 'grid';
  });
  $('#burgerApp').addEventListener('click', function () { $('#sidebar').classList.toggle('open'); });

  /* ---------- shell ---------- */
  function navLabel(n) { return (n.id === 'equipo' && me && me.role === 'admin') ? 'Fuerza de ventas' : n.t; }
  var current = 'inicio';
  var sbExpand = {};
  function renderShell() {
    var av = $('#meAvatar');
    if (me.foto) av.innerHTML = '<img src="' + me.foto + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    else av.textContent = initials(me.nombre);
    $('#meNombre').textContent = me.nombre.split(' ').slice(0, 2).join(' ');
    $('#meRol').textContent = roleLabelOf(me.role);
    $('#pillRol').textContent = roleLabelOf(me.role);
    var internal = NAV.filter(canSee).filter(function (n) { return !n.href; });
    var apps = NAV.filter(canSee).filter(function (n) { return n.href; });
    function ico(n) { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + n.ico + '</svg>'; }
    var extIco = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;opacity:.6"><path d="M7 17L17 7M8 7h9v9"></path></svg>';
    function linkHtml(n) {
      if (n.sub) {
        var childActive = n.sub.some(function (c) { return c.id === current; });
        var open = sbExpand[n.id] !== undefined ? sbExpand[n.id] : childActive;
        var chev = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;opacity:.7;transition:transform .2s;transform:rotate(' + (open ? '180' : '0') + 'deg)"><path d="M6 9l6 6 6-6"></path></svg>';
        var head = '<a href="#" data-navtoggle="' + n.id + '"' + (childActive ? ' class="on"' : '') + '>' + ico(n) + navLabel(n) + chev + '</a>';
        var kids = open ? '<div class="sb-sub">' + n.sub.map(function (c) {
          return '<a href="#" data-go="' + c.id + '"' + (c.id === current ? ' class="on"' : '') + '><span class="sb-dot"></span>' + esc(c.t) + '</a>';
        }).join('') + '</div>' : '';
        return head + kids;
      }
      var badge = '';
      if (n.id === 'pendientes') { var pp = pendMisBadge(); if (pp) badge = '<span style="margin-left:auto;background:#FF9F45;color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center">' + pp + '</span>'; }
      if (n.id === 'solequipo') { var pe = pendEquipoBadge(); if (pe) badge = '<span style="margin-left:auto;background:#FF9F45;color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center">' + pe + '</span>'; }
      if (n.id === 'claves') { var pc = (db.claveReqs || []).filter(function (r) { return r.estado === 'pendiente'; }).length; if (pc) badge = '<span style="margin-left:auto;background:#FF9F45;color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center">' + pc + '</span>'; }
      if (n.id === 'activos' && db.af) { var af1 = db.af.solicitudes.filter(function (s) { return s.estado === 'Enviada'; }).length; var af2 = db.af.consumibles.filter(function (c) { return afStock(c.id) <= c.minimo; }).length; var afN = af1 + af2; if (afN) badge = '<span style="margin-left:auto;background:#FF9F45;color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center">' + afN + '</span>'; }
      if (n.id === 'accesos') { var pac = accSolicPendientes().length; if (pac) badge = '<span style="margin-left:auto;background:#FF9F45;color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center">' + pac + '</span>'; }
      return '<a href="#" data-go="' + n.id + '">' + ico(n) + navLabel(n) + badge + '</a>';
    }
    var groups = NAV_GROUPS.map(function (g) { return { g: g, items: internal.filter(function (n) { return navGroup(n) === g.id; }) }; }).filter(function (x) { return x.items.length; });
    var showHeaders = groups.length > 1;
    var html = groups.map(function (x) {
      return (showHeaders ? '<div style="font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.5);padding:16px 12px 6px">' + x.g.t + '</div>' : '') +
        x.items.map(linkHtml).join('');
    }).join('');
    var favTools = (me.accesosFrec || []).map(function (id) { return (me.herramientas || []).find(function (t) { return t.id === id; }); }).filter(Boolean);
    if (favTools.length) {
      html += '<div class="sb-apps"><div class="sb-apps-t">Accesos frecuentes</div>' +
        favTools.map(function (t) {
          var openable = t.url && t.url !== '#';
          return '<a href="' + esc(openable ? t.url : '#') + '"' + (openable ? ' target="_blank" rel="noopener"' : '') + ' data-ext="fav">' + toolIco(t.tipo) + esc(t.nombre) + extIco + '</a>';
        }).join('') + '</div>';
    }
    $('#sbNav').innerHTML = html;
  }
  $('#sbNav').addEventListener('click', function (e) {
    var tg = e.target.closest('a[data-navtoggle]');
    if (tg) { e.preventDefault(); var k = tg.getAttribute('data-navtoggle'); var cur = sbExpand[k] !== undefined ? sbExpand[k] : NAV.some(function (n) { return n.id === k && n.sub && n.sub.some(function (c) { return c.id === current; }); }); sbExpand[k] = !cur; renderShell(); return; }
    var ext = e.target.closest('a[data-ext]');
    if (ext) {
      if (ext.getAttribute('href') === '#') { e.preventDefault(); toast('Este acceso aún no tiene enlace configurado.'); }
      $('#sidebar').classList.remove('open');
      return;
    }
    var a = e.target.closest('a[data-go]'); if (!a) return;
    e.preventDefault(); perfilTarget = null; go(a.getAttribute('data-go'));
    $('#sidebar').classList.remove('open');
  });
  function go(id) {
    current = id;
    if (id === 'asistencia') asisPersona = null;
    if (id === 'solequipo') solHistVista = false;
    $$('#sbNav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-go') === id); });
    var item = null;
    NAV.forEach(function (n) { if (n.id === id) item = n; if (n.sub) n.sub.forEach(function (c) { if (c.id === id) item = c; }); });
    $('#pageTitle').textContent = item ? (id === 'adminfrec' || id === 'adminsomos' || id === 'adminenc' || id === 'admincom' || id === 'admininducciones' || id === 'admindocs' ? 'Administración · ' + item.t : (item.t === 'Metas 2026' || item.t === 'Visión' || item.t === 'Histórico' ? 'Metas · ' + item.t : ((id === 'afpanel' || id === 'afactivos' || id === 'aftech' || id === 'afalmacen' || id === 'afmercadeo' || id === 'afprocura') ? 'Activos y procura · ' + item.t : ((id === 'ventasfv' || id === 'ventasbancos') ? 'Ventas · ' + item.t : navLabel(item))))) : '';
    var R = { inicio: rInicio, adminmenu: rAdminFrec, adminfrec: rAdminFrec, adminsomos: rAdminSomos, adminenc: rEncuestas, admincom: rAdminCom, admininducciones: rAdminInducciones, admindocs: rAdminDocs, metas: rMetas, metas2026: rMetas, metasvision: rMetas, metashist: rMetas, somos: rSomos, cultura: rCultura, docs: rDocs, solicitudes: rSolicitudes, solequipo: rSolEquipo, claves: rClaves, activos: rAfPanel, afpanel: rAfPanel, afactivos: rAfActivos, aftech: rAfTech, afalmacen: rAfAlmacen, afmercadeo: rAfMercadeo, afprocura: rAfProcura, ventasmenu: rEquipo, ventasfv: rEquipo, ventasbancos: rBancos, org: rOrg, directorio: rDirectorio, equipo: rEquipo, onboarding: rOnboarding, induccionequipo: rOnboarding, pendientes: rPendientes, candidatos: rCandidatos, empleados: rEmpleados, asistencia: rAsistencia, encuestas: rEncuestas, contratos: rContratos, marketing: rMarketing, perfil: rPerfil, perfiles: rPerfiles, requerimientos: rRequerimientos, accesos: rAccesos, recursos: rRecursos };
    (R[id] || rInicio)();
    window.scrollTo(0, 0);
  }
  function refreshNav() { renderShell(); $$('#sbNav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-go') === current); }); }

  /* ---------- modal ---------- */
  function modal(html, cls) {
    $('#modalHost').innerHTML = '<div class="mod" id="modBg"><div class="mod-c' + (cls ? ' ' + cls : '') + '">' + html + '</div></div>';
    $('#modBg').addEventListener('click', function (e) { if (e.target.id === 'modBg') closeModal(); });
    $$('.mod-x').forEach(function (x) { x.addEventListener('click', closeModal); });
  }
  function closeModal() { $('#modalHost').innerHTML = ''; }
  function nowStamp() { return new Date().toISOString(); }
  function fmtStamp(iso) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d.getTime())) return String(iso); var MM = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']; var h = d.getHours(), m = d.getMinutes(); var ap = h < 12 ? 'a.m.' : 'p.m.'; var h12 = h % 12; if (h12 === 0) h12 = 12; return d.getDate() + ' ' + MM[d.getMonth()] + ' ' + d.getFullYear() + ', ' + h12 + ':' + (m < 10 ? '0' + m : m) + ' ' + ap; }
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function cumpleTxt(c) { if (!c) return null; var p = c.split('-'); return (+p[1]) + ' de ' + MESES[+p[0] - 1]; }

  /* ---------- ficha de cargo ---------- */
  function roleInfoAuto(u) {
    var c = (u.cargo || '').toLowerCase();
    function R(desc, imp, fly, pr) { return { desc: desc, imp: imp, fly: fly, pr: pr }; }
    var T = [
      [/president|administrador/, R('Lidera la visión, la estrategia y las alianzas clave de VEPAGOS.', 'Toma las decisiones que definen el rumbo de toda la empresa y aprueba inversiones, alianzas y estructura.', 'Alinea todas las etapas del ciclo: que afiliar, activar, transaccionar y retener funcionen como un solo motor.', ['Comité de dirección y revisión de indicadores', 'Aprobación de ofertas, contratos y alianzas', 'Decisiones de estructura y talento'])],
      [/director comercial/, R('Dirige el motor de crecimiento: fuerza de ventas, relaciones bancarias, retención y SAC.', 'De su gestión depende cuántos comercios se afilian y cuántos se quedan.', 'Empuja la primera vuelta del flywheel: más comercios afiliados y activos.', ['Seguimiento de metas comerciales', 'Coordinación entre gerencias', 'Revisión de pipeline y cierres'])],
      [/gerente de fuerza de ventas/, R('Lidera y estructura la fuerza de ventas en todo el país.', 'Convierte la estrategia comercial en afiliaciones reales; administra coordinadores, cargas y almacenes.', 'Acelera la etapa "afiliar": más vendedores efectivos = más comercios nuevos.', ['Asignación de cargas, coordinadores y almacenes', 'Seguimiento diario de afiliaciones', 'Autorización de subvendedores'])],
      [/coordinador.*fuerza de venta|coordinadora.*fuerza de venta/, R('Coordina a los analistas y vendedores de su célula, y gestiona sus cargas.', 'Es el puente entre la gerencia y la calle: sin coordinación no hay activaciones a tiempo.', 'Mantiene girando "afiliar → activar": cada carga bien gestionada es un POS operativo antes.', ['Gestión de cargas y documentos de afiliación', 'Soporte a vendedores en campo', 'Reporte de avance a gerencia'])],
      [/analista.*fuerza de venta/, R('Procesa afiliaciones, valida recaudos y hace seguimiento a las solicitudes de los vendedores.', 'La velocidad y calidad de su análisis define cuánto tarda un comercio en cobrar.', 'Reduce la fricción en "activar": expedientes limpios avanzan sin devoluciones.', ['Revisión de recaudos y expedientes', 'Carga de solicitudes en los sistemas de los switches', 'Seguimiento de estatus con bancos'])],
      [/fuerza de ventas/, R('Afilia comercios, entrega terminales y acompaña al cliente en sus primeros cobros.', 'Es la cara de VEPAGOS frente al comercio: cada afiliación nace de su gestión.', 'Es quien empuja la primera vuelta: sin afiliaciones no hay flywheel.', ['Prospección y visitas a comercios', 'Recolección de recaudos y firma', 'Entrega y activación del POS'])],
      [/relaciones bancarias/, R('Gestiona la relación operativa con los bancos aliados y los códigos de afiliación.', 'Sus gestiones definen la velocidad de aprobación bancaria de cada comercio.', 'Destranca la etapa "activar": banco que responde rápido, comercio que cobra antes.', ['Envío y seguimiento de solicitudes a bancos', 'Resolución de rechazos y excepciones', 'Actualización de requisitos por banco'])],
      [/retención|recuperación/, R('Atiende comercios en riesgo de irse y recupera terminales inactivos.', 'Retener un comercio cuesta menos que afiliar uno nuevo; protege el ingreso recurrente.', 'Cierra el ciclo "retener → recomendar": un comercio satisfecho trae al siguiente.', ['Contacto con comercios inactivos', 'Ofertas de retención y reactivación', 'Análisis de causas de churn'])],
      [/parámetro/, R('Configura y corrige los parámetros técnicos de los terminales en los switches.', 'Un POS mal parametrizado no cobra: su trabajo es la diferencia entre un equipo instalado y uno operativo.', 'Garantiza que "transaccionar" fluya sin errores técnicos.', ['Parametrización de terminales nuevos', 'Corrección de fallas de configuración', 'Coordinación con switches'])],
      [/logística/, R('Coordina el despacho, traslado y recuperación física de los terminales.', 'Sin logística no hay equipos en la calle ni reposición a tiempo.', 'Conecta "afiliar" con "activar": el POS tiene que llegar para poder cobrar.', ['Despachos y guías de envío', 'Control de inventario en tránsito', 'Recuperación de equipos'])],
      [/sac solicitudes/, R('Atiende y resuelve las solicitudes operativas de los comercios afiliados.', 'Es la primera línea de soporte: su respuesta define la percepción de servicio.', 'Sostiene "retener": cada caso resuelto rápido es un comercio que se queda.', ['Atención de tickets y solicitudes', 'Seguimiento con bancos y switches', 'Comunicación de estatus al comercio'])],
      [/servicio técnico/, R('Diagnostica y resuelve fallas técnicas de los terminales en uso.', 'Cada hora de POS caído es venta perdida para el comercio; su rapidez protege la confianza.', 'Mantiene "transaccionar" sin interrupciones.', ['Diagnóstico remoto y en sitio', 'Gestión de repuestos y garantías', 'Escalamiento a proveedores'])],
      [/supervisor de calidad|sac/, R('Supervisa la calidad y los tiempos de respuesta del servicio de atención.', 'Convierte el soporte en ventaja competitiva midiendo y mejorando cada interacción.', 'Refuerza "retener → recomendar" con un servicio consistente.', ['Monitoreo de tiempos de respuesta', 'Auditoría de casos', 'Mejora de procesos de atención'])],
      [/televentas/, R('Vende y afilia comercios por canales remotos (teléfono y WhatsApp).', 'Amplía el alcance comercial sin necesidad de presencia en calle.', 'Suma volumen a "afiliar" con bajo costo de adquisición.', ['Gestión de leads entrantes', 'Cierre remoto de afiliaciones', 'Seguimiento de prospectos'])],
      [/mercadeo|diseñ|community/, R('Construye la marca, el contenido y las campañas que generan demanda.', 'Hace que los comercios lleguen solos: el mejor vendedor es una marca confiable.', 'Alimenta "recomendar → afiliar": visibilidad que se convierte en leads.', ['Campañas y contenido para redes', 'Material comercial y de marca', 'Medición de resultados'])],
      [/tecnología|infraestructura|desarrollador/, R('Desarrolla y mantiene las plataformas y sistemas internos de VEPAGOS.', 'La operación entera corre sobre sus sistemas: estabilidad = negocio funcionando.', 'Hace escalable todo el flywheel: más volumen sin más fricción.', ['Desarrollo y mantenimiento de aplicaciones', 'Soporte a usuarios internos', 'Seguridad y respaldos'])],
      [/programación/, R('Programa y certifica los terminales antes de salir a la calle.', 'Cada POS despachado pasa por sus manos: cero errores en origen.', 'Prepara "activar": terminal que sale listo, comercio que cobra el mismo día.', ['Carga de aplicaciones y llaves', 'Certificación con switches', 'Control de calidad de equipos'])],
      [/cobranza/, R('Gestiona la cobranza de cuotas y servicios a los comercios afiliados.', 'Protege el flujo de caja que sostiene toda la operación.', 'Convierte "transaccionar" en ingresos sanos y predecibles.', ['Conciliación y cobro de cuotas', 'Gestión de morosidad', 'Reportes de recaudación'])],
      [/contabilidad/, R('Lleva los registros contables y los cierres financieros de la empresa.', 'Da la foto real del negocio para decidir con datos y cumplir con el fisco.', 'Mide la salud del flywheel: qué tan rentable gira cada vuelta.', ['Registros y conciliaciones', 'Cierres mensuales', 'Declaraciones e impuestos'])],
      [/tesorería|administración y tesorer/, R('Administra pagos, bancos y el flujo de caja diario.', 'Que haya fondos donde y cuando se necesitan: proveedores, nómina y operaciones.', 'Lubrica todo el ciclo: sin caja no hay inventario ni crecimiento.', ['Pagos a proveedores y nómina', 'Conciliación bancaria', 'Proyección de flujo de caja'])],
      [/capital humano/, R('Gestiona el ingreso, desarrollo y bienestar del equipo VEPAGOS.', 'El flywheel lo giran personas: contratar y desarrollar bien multiplica todo lo demás.', 'Asegura que cada etapa tenga el talento correcto.', ['Onboarding y entrenamientos', 'Nómina y beneficios', 'Clima y desarrollo del equipo'])],
      [/inventario|almacén|operaciones/, R('Controla el inventario de terminales y los almacenes de la empresa.', 'Cada POS es capital invertido: su control evita pérdidas y garantiza disponibilidad.', 'Abastece "afiliar → activar": siempre hay equipo disponible para el próximo comercio.', ['Control de entradas y salidas', 'Auditoría de almacenes', 'Asignación de equipos a vendedores'])],
      [/entrenador/, R('Entrena y da seguimiento a toda la fuerza de ventas: desde el candidato en formación hasta el vendedor activo.', 'Un vendedor bien entrenado afilia más y mejor; su trabajo multiplica el resultado de todo el equipo comercial.', 'Acelera "afiliar": convierte candidatos en vendedores efectivos más rápido.', ['Entrenamiento de candidatos y nuevos vendedores', 'Seguimiento de desempeño y refuerzos', 'Actualización del programa de entrenamiento'])],
      [/pasante|inces/, R('Apoya los procesos de su área mientras completa su formación INCES.', 'Los pasantes son la cantera de talento de VEPAGOS: hoy aprenden, mañana pueden sumarse al equipo.', 'Aprende cómo gira el flywheel apoyando una de sus etapas.', ['Apoyo operativo al equipo asignado', 'Formación y acompañamiento con su tutor', 'Registro de actividades de pasantía'])],
      [/reclutador/, R('Recluta, filtra y acompaña a los nuevos integrantes de la fuerza de ventas.', 'La fuerza de ventas crece a la velocidad de su reclutamiento.', 'Escala "afiliar": más vendedores bien entrenados, más comercios nuevos.', ['Publicación y filtrado de candidatos', 'Entrevistas y onboarding FV', 'Seguimiento de nuevos vendedores'])]
    ];
    for (var i = 0; i < T.length; i++) { if (T[i][0].test(c)) return T[i][1]; }
    return R('Contribuye a la operación diaria de VEPAGOS desde su área.', 'Cada rol del equipo sostiene una parte del servicio que reciben los comercios.', 'Aporta a que el flywheel gire sin fricción en su etapa.', null);
  }
  function roleInfo(u) {
    var base = roleInfoAuto(u);
    var o = u.cargoInfo || {};
    return {
      desc: o.desc != null && o.desc !== '' ? o.desc : base.desc,
      imp: o.imp != null && o.imp !== '' ? o.imp : base.imp,
      fly: o.fly != null && o.fly !== '' ? o.fly : base.fly,
      pr: (o.pr && o.pr.length) ? o.pr : base.pr,
      editado: !!(o.desc || o.imp || o.fly || (o.pr && o.pr.length))
    };
  }
  function canEditCargo() { return me && (me.role === 'admin' || me.role === 'rrhh' || isSysManager(me)); }
  function roleInfoHtml(u, editable) {
    var r = roleInfo(u);
    function sec(t, b) { return '<div style="margin-top:10px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">' + t + '</div><div style="font-size:13.5px;color:#33415C;line-height:1.55;margin-top:3px">' + b + '</div></div>'; }
    return '<div style="border-top:1px solid #EEF3F9;margin-top:12px;padding-top:2px">' +
      '<div style="display:flex;align-items:center;gap:8px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);flex:1">Ficha del cargo' + (r.editado ? ' · <span style="color:#00874f">personalizada</span>' : '') + '</div>' +
      (editable && canEditCargo() ? '<button class="btn-s" data-editcargo="' + u.id + '" style="font-size:12px;padding:5px 10px">Editar</button>' : '') + '</div>' +
      sec('Descripción del cargo', esc(r.desc)) +
      sec('Importancia en la empresa', esc(r.imp)) +
      sec('Su rol en el flywheel', esc(r.fly)) +
      (r.pr ? sec('Procesos del día a día', '<ul style="margin:4px 0 0;padding-left:18px">' + r.pr.map(function (x) { return '<li style="margin-bottom:2px">' + esc(x) + '</li>'; }).join('') + '</ul>') : '') +
    '</div>';
  }
  function editCargoModal(u) {
    var r = roleInfo(u);
    modal('<button class="mod-x">✕</button><h3>Editar ficha del cargo — ' + esc(u.nombre) + '</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:4px 0 10px">Cargo: <b>' + esc(u.cargo) + '</b>. Deja un campo vacío para volver al texto automático de ese cargo.</p>' +
      '<div class="fld"><label>Descripción del cargo</label><textarea id="ecDesc" rows="3" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical">' + esc(r.desc) + '</textarea></div>' +
      '<div class="fld"><label>Importancia en la empresa</label><textarea id="ecImp" rows="3" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical">' + esc(r.imp) + '</textarea></div>' +
      '<div class="fld"><label>Su rol en el flywheel</label><textarea id="ecFly" rows="3" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical">' + esc(r.fly) + '</textarea></div>' +
      '<div class="fld"><label>Procesos del día a día (uno por línea)</label><textarea id="ecPr" rows="4" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical">' + esc((r.pr || []).join('\n')) + '</textarea></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="ecSave">Guardar ficha</button></div>');
    $('#ecSave').addEventListener('click', function () {
      var pr = $('#ecPr').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      u.cargoInfo = { desc: $('#ecDesc').value.trim(), imp: $('#ecImp').value.trim(), fly: $('#ecFly').value.trim(), pr: pr };
      logHist(u, 'Ficha de cargo actualizada por ' + me.nombre);
      saveDB(db); closeModal();
      if (current === 'perfil' && u.id === me.id) rPerfil(); else if (typeof profileModal === 'function' && u.id !== me.id) profileModal(u, true); else go(current);
      toast('Ficha del cargo actualizada.');
    });
  }

  var REQ_CATALOG = ['Laptop Intel i5, 16GB RAM', 'Laptop Intel i7, 16GB RAM', 'Computadora física de escritorio', 'Monitor adicional', 'Audífonos con micrófono', 'Teléfono corporativo', 'Línea telefónica / SIM', 'Correo corporativo', 'Acceso a Eureka', 'Acceso a SAC', 'Uniforme', 'Foto profesional institucional', 'POS de demostración', 'Material de afiliación', 'Silla ergonómica', 'Teclado ergonómico y mouse', 'Base para laptop / soporte de pantalla', 'Cargador y candado Kensington', 'Kit de papelería (tijeras, engrapadora, clips, bolígrafos)', 'Libreta corporativa y post-its'];
  function reqChecklistHtml(idp, selected, catalog) {
    selected = selected || [];
    var CAT = (catalog && catalog.length) ? catalog : reqAllOnboardItems();
    var extras = selected.filter(function (s) { return CAT.indexOf(s) === -1; });
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-top:4px">' +
      CAT.map(function (it) {
        var on = selected.indexOf(it) > -1;
        return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#33415C;cursor:pointer;padding:4px 0"><input type="checkbox" data-reqchk="' + idp + '" value="' + esc(it) + '"' + (on ? ' checked' : '') + ' style="accent-color:#00CE7C;width:16px;height:16px;margin:0;flex:0 0 auto">' + esc(it) + '</label>';
      }).join('') +
      '</div><div class="fld" style="margin-top:8px"><label style="font-size:12px">Otros (uno por línea)</label><textarea id="' + idp + 'Otros" rows="2" placeholder="Requerimiento personalizado" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-family:inherit;font-size:13px;resize:vertical">' + esc(extras.join('\n')) + '</textarea></div>';
  }
  function readReqChecklist(idp) {
    var out = [];
    document.querySelectorAll('[data-reqchk="' + idp + '"]:checked').forEach(function (cb) { out.push(cb.value); });
    var otros = document.getElementById(idp + 'Otros');
    if (otros) otros.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) { if (out.indexOf(s) === -1) out.push(s); });
    return out;
  }
  /* Clasificación y disponibilidad de requerimientos de equipamiento */
  function afReqClase(texto) {
    var t = String(texto).toLowerCase();
    if (/laptop|computador|monitor|aud[ií]fono|tel[eé]fono corporativo|\bpos\b|terminal/.test(t)) return 'tech';
    if (/correo|eureka|\bsac\b|l[ií]nea|sim|acceso|credencial|\bvpn\b|intranet|huella|biom[eé]tric/.test(t)) return 'acceso';
    return 'fisico';
  }
  function afReqEsSistemas(texto) { var c = afReqClase(texto); return c === 'tech' || c === 'acceso'; }
  /* Área responsable de cada requerimiento */
  function afReqArea(texto) {
    var r = afReqResolve(texto);
    if (r.tipo === 'consumible') return r.almacen === 'mercadeo' ? 'mercadeo' : 'administracion';
    if (r.tipo === 'activo') return AF_TECH.indexOf(r.cat) > -1 ? 'sistemas' : (r.cat === 'Mercadeo' ? 'mercadeo' : 'administracion');
    var t = String(texto).toLowerCase();
    if (/foto|fotograf|uniforme|franela|material de afiliaci|\bpop\b|regalo|agenda|lapicero|banner|volante|flyer|carnet/.test(t)) return 'mercadeo';
    if (/laptop|computador|monitor|aud[ií]fono|tel[eé]fono|\bpos\b|terminal|correo|eureka|\bsac\b|l[ií]nea|sim|acceso|credencial|\bvpn\b|intranet|huella|biom[eé]tric/.test(t)) return 'sistemas';
    return 'administracion';
  }
  var AF_AREA_LBL = { sistemas: 'Sistemas', mercadeo: 'Mercadeo', administracion: 'Administración' };
  /* Cruza el texto del requerimiento con el catálogo real: consumible por nombre o categoría de activo fijo */
  function afReqResolve(texto) {
    var t = String(texto).toLowerCase().trim(); if (!t || !db.af) return { tipo: 'ninguno' };
    var cons = (db.af.consumibles || []).find(function (c) { var n = (c.nombre || '').toLowerCase(); return n && (n === t || t.indexOf(n) > -1 || n.indexOf(t) > -1); });
    if (cons) return { tipo: 'consumible', ref: cons, almacen: cons.almacen || 'consumibles' };
    var cat = (db.af.cat ? db.af.cat.categorias : []).find(function (c) { var n = c.toLowerCase(); return t === n || t.indexOf(n) > -1; });
    if (cat) return { tipo: 'activo', cat: cat };
    return { tipo: 'ninguno' };
  }
  function afReqKeyword(texto) {
    var t = String(texto).toLowerCase();
    if (/uniforme|franela/.test(t)) return 'franela';
    if (/laptop/.test(t)) return 'laptop';
    if (/computador/.test(t)) return 'computad';
    if (/monitor/.test(t)) return 'monitor';
    if (/aud[ií]fono/.test(t)) return 'aud';
    if (/tel[eé]fono/.test(t)) return 'tel';
    if (/\bpos\b|terminal/.test(t)) return 'pos';
    if (/silla/.test(t)) return 'silla';
    if (/material de afiliaci/.test(t)) return 'afiliaci';
    return null;
  }
  /* Devuelve {estado:'disp'|'sin'|'na', detalle} */
  function afReqDisponibilidad(texto) {
    var r = afReqResolve(texto);
    if (r.tipo === 'consumible') { var stc = afStock(r.ref.id); return { estado: stc > 0 ? 'disp' : 'sin', detalle: stc > 0 ? stc + ' ' + (r.ref.unidad || 'u') + ' en almacén' : 'Sin stock', consId: r.ref.id }; }
    if (r.tipo === 'activo') { var dispA = (db.af.activos || []).filter(function (a) { return a.categoria === r.cat && a.estado === 'Disponible'; }); return { estado: dispA.length ? 'disp' : 'sin', detalle: dispA.length ? dispA.length + ' disponible(s) · ' + r.cat : 'Sin equipos disponibles en ' + r.cat, activoId: dispA[0] && dispA[0].id, cat: r.cat }; }
    var t = String(texto).toLowerCase();
    if (/foto|fotograf/.test(t)) return { estado: 'na', detalle: 'Sesión con Mercadeo' };
    if (afReqClase(texto) === 'acceso') return { estado: 'na', detalle: 'Gestión de Sistemas' };
    var kw = afReqKeyword(texto);
    if (!kw) return { estado: 'na', detalle: afReqArea(texto) === 'mercadeo' ? 'Gestión de Mercadeo' : 'Sin control de inventario' };
    if (kw === 'franela') { var c = (db.af.consumibles || []).find(function (x) { return /franela|uniforme/i.test(x.nombre); }); var st = c ? afStock(c.id) : 0; return { estado: st > 0 ? 'disp' : 'sin', detalle: st > 0 ? st + ' en almacén' : 'Sin stock' }; }
    var actDisp = (db.af.activos || []).filter(function (a) { return a.estado === 'Disponible' && (a.descripcion + ' ' + a.categoria).toLowerCase().indexOf(kw) > -1; });
    if (actDisp.length) return { estado: 'disp', detalle: actDisp.length + ' disponible(s)', activoId: actDisp[0].id };
    var cons = (db.af.consumibles || []).filter(function (x) { return x.nombre.toLowerCase().indexOf(kw) > -1 && afStock(x.id) > 0; });
    if (cons.length) return { estado: 'disp', detalle: 'en almacén' };
    return { estado: 'sin', detalle: 'No disponible' };
  }
  function afSistemasResp() { var id = db.aprobadores && (db.aprobadores.ti || db.aprobadores.sistemas); return id ? byId(id) : null; }
  function afSistemasMgr() { var id = db.aprobadores && db.aprobadores.sistemas; var m = id ? byId(id) : null; if (m && m.role === 'gerente') return m; var r = afSistemasResp(); return r && r.managerId ? byId(r.managerId) : null; }
  function afMercadeoResp() { return db.users.find(function (u) { return u.activo && /coordinad.* de mercadeo/i.test(u.cargo || ''); }) || null; }
  function afAdminResp() { return db.users.find(function (u) { return u.activo && /coordinad.* de inventario|coordinad.* de operaciones/i.test(u.cargo || ''); }) || null; }
  /* Responsable + gerente según el área del requerimiento */
  function afAreaRecipient(area) {
    var resp = null;
    if (area === 'sistemas') resp = afSistemasResp();
    else if (area === 'mercadeo') resp = afMercadeoResp();
    else resp = afAdminResp();
    if (!resp) resp = afSistemasResp();
    var mgr = resp && resp.managerId ? byId(resp.managerId) : null;
    return { resp: resp, mgr: mgr };
  }
  /* Requerimientos por defecto por rol, si el cargo no los tiene preasignados */
  function afDefaultReqs(role) {
    var base = ['Correo corporativo', 'Acceso a Eureka', 'Foto profesional institucional'];
    if (role === 'ventas' || role === 'reclutador' || role === 'entrenador') return ['Laptop Intel i5, 16GB RAM'].concat(base).concat(['Acceso a SAC', 'Uniforme', 'Material de afiliación', 'POS de demostración']);
    if (role === 'gerente') return ['Laptop Intel i7, 16GB RAM', 'Teléfono corporativo', 'Línea telefónica / SIM'].concat(base).concat(['Acceso a SAC', 'Uniforme', 'Silla ergonómica']);
    if (role === 'rrhh') return ['Laptop Intel i5, 16GB RAM'].concat(base).concat(['Uniforme', 'Silla ergonómica']);
    return ['Laptop Intel i5, 16GB RAM'].concat(base).concat(['Uniforme', 'Silla ergonómica']);
  }

  var EXPEDIENTE_DOCS = [
    'Currículo Vitae actualizado y firmado',
    'Dos (2) fotocopias de la Cédula de Identidad (ampliada, centrada, vigente)',
    'Dos (2) fotocopias del RIF actualizado y vigente',
    'Una (1) foto reciente tamaño carnet, fondo blanco',
    'Fotocopia de constancias de sus tres (3) últimos empleos',
    'Fotocopia del último título académico obtenido',
    'Constancia de tramitación de título o de estudios en curso',
    'Fotocopia de certificados/diplomas de últimos cursos',
    'Registro de Alistamiento para la Defensa Integral (Registro Militar)',
    'Soporte de cuenta bancaria personal anterior (si aplica)',
    'Dos (2) referencias personales con copia de cédula de los emisores',
    'Carnet de Circulación y Licencia de Conducir (solo Coordinación+ para estacionamiento)'
  ];
  var CUENTA_NOMINA_DOCS = [
    'Una (1) copia de la Cédula de Identidad (ampliada, centrada, vigente)',
    'Una (1) copia del RIF actualizado y firmado por el titular',
    'Una (1) referencia personal firmada + copia de cédula del emisor',
    'Constancia de Trabajo original de Vepagos (indicando fin de apertura)'
  ];
  function docChecklistCard(u, titulo, subt, storeKey, docs, canEd) {
    var st = u[storeKey] || {};
    var done = docs.filter(function (_, i) { return st[i]; }).length;
    var rows = docs.map(function (d, i) {
      var on = !!st[i];
      return '<label style="display:flex;align-items:flex-start;gap:11px;padding:9px 0;border-bottom:1px solid #EEF3F9;' + (canEd ? 'cursor:pointer' : '') + '">' +
        '<input type="checkbox" data-doc="' + storeKey + ':' + i + '"' + (on ? ' checked' : '') + (canEd ? '' : ' disabled') + ' style="accent-color:#00CE7C;width:17px;height:17px;margin:2px 0 0;flex:0 0 auto">' +
        '<span style="flex:1;font-size:13.5px;color:var(--navy);font-weight:600;line-height:1.45">' + esc(d) + '</span>' +
        (on ? '' : '<span class="chip y" style="font-size:10px">Pendiente</span>') + '</label>';
    }).join('');
    return '<div class="card" style="max-width:640px;margin-top:16px" data-doccard="' + storeKey + '"><div class="toolrow"><h3 style="margin:0">' + titulo + '</h3><span class="sp"></span><span class="chip ' + (done === docs.length ? 'g' : 'y') + '">' + done + ' de ' + docs.length + '</span></div>' +
      '<div class="note" style="margin:2px 0 8px">' + subt + '</div>' + rows + '</div>';
  }
  function expedienteCardsHtml(u, canEd) {
    return docChecklistCard(u, 'Expediente de personal', 'Documentos formales del expediente (Checklist A · Capital Humano).', 'expediente', EXPEDIENTE_DOCS, canEd) +
      docChecklistCard(u, 'Apertura de cuenta nómina', 'Recaudos para la apertura de la cuenta nómina (Checklist B).', 'cuentaNomina', CUENTA_NOMINA_DOCS, canEd);
  }

  function reqCardHtml(u, editable) {
    var reqs = u.requerimientos || [];
    var canEd = editable && canEditProfile(u) === true ? true : (editable && (me.role === 'admin' || me.role === 'rrhh'));
    var pend = reqs.filter(function (r) { return !r.entregado; }).length;
    var rows = reqs.length
      ? reqs.map(function (r) {
          return '<div style="display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid #EEF3F9">' +
            '<span style="width:22px;height:22px;border-radius:6px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:' + (r.entregado ? '#00CE7C' : '#EEF3F9') + ';color:' + (r.entregado ? '#fff' : '#8A99AE') + '">' + (r.entregado ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>' : '•') + '</span>' +
            '<div style="flex:1;min-width:0;font-size:13.5px;color:var(--navy);font-weight:600">' + esc(r.texto) + '</div>' +
            (canEd ? '<button class="btn-s" data-reqtgl="' + r.id + '" style="font-size:12px;padding:5px 10px">' + (r.entregado ? 'Marcar pendiente' : 'Marcar entregado') + '</button><button class="btn-s btn-danger" data-reqdel="' + r.id + '" style="font-size:12px;padding:5px 9px">Quitar</button>' : '<span class="chip ' + (r.entregado ? 'g' : 'y') + '">' + (r.entregado ? 'Entregado' : 'Pendiente') + '</span>') +
          '</div>';
        }).join('')
      : '<div class="empty" style="padding:12px 0">No se registraron requerimientos de equipo para este cargo.</div>';
    var addForm = canEd
      ? '<div style="display:flex;gap:8px;margin-top:10px"><input id="reqNew" type="text" placeholder="Agregar requerimiento (ej: Laptop Intel i5)" style="flex:1;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-size:13px;font-family:inherit"><button class="btn-g" id="reqAdd" style="font-size:13px;padding:8px 14px">Agregar</button></div>'
      : '';
    return '<div class="card" style="max-width:640px;margin-top:16px" data-reqcard="' + u.id + '"><div class="toolrow"><h3 style="margin:0">Requerimientos para trabajar</h3><span class="sp"></span>' + (reqs.length ? '<span class="chip ' + (pend ? 'y' : 'g') + '">' + (pend ? pend + ' pendiente' + (pend > 1 ? 's' : '') : 'Todo entregado') + '</span>' : '') + '</div>' +
      '<div class="note" style="margin:2px 0 8px">Equipo y recursos que ' + (u.id === me.id ? 'necesitas' : 'necesita esta persona') + ' para trabajar según su cargo.</div>' + rows + addForm + '</div>';
  }

  var ACC_TIPOS = [['Aplicativo', 'app'], ['Drive', 'drive'], ['Herramienta', 'herramienta'], ['Permiso', 'permiso']];
  var ACC_TLBL = { app: 'Aplicativo', drive: 'Drive', herramienta: 'Herramienta', permiso: 'Permiso' };
  function accOptionsFor(tipo) { var c = acCatalog(); if (tipo === 'app') return c.apps; if (tipo === 'drive') return c.drives; if (tipo === 'herramienta') return c.herramientas; if (tipo === 'permiso') return PERMISOS.map(function (p) { return p.label; }); return []; }
  var _accRowSeq = 0;
  function accRowHtml() {
    var rid = 'accdl' + (++_accRowSeq); var t0 = ACC_TIPOS[0][1];
    return '<div class="acc-row" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap">' +
      '<select data-acct style="width:130px;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 10px;font-family:inherit;font-size:13px;font-weight:600;color:var(--navy)">' + ACC_TIPOS.map(function (t) { return '<option value="' + t[1] + '">' + t[0] + '</option>'; }).join('') + '</select>' +
      '<input data-accn list="' + rid + '" type="text" placeholder="Acceso / herramienta" style="flex:1;min-width:140px;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-family:inherit;font-size:13.5px">' +
      '<datalist data-accdl id="' + rid + '">' + accOptionsFor(t0).map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>' +
      '<input data-accj type="text" placeholder="¿Por qué lo necesita para el cargo?" style="flex:2;min-width:190px;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-family:inherit;font-size:13.5px">' +
      '<button type="button" class="btn-s btn-danger" data-accdel style="padding:8px 10px">✕</button></div>';
  }
  function wireAccTipo(scope) {
    (scope || document).querySelectorAll('.acc-row').forEach(function (row) {
      var sel = row.querySelector('[data-acct]'), dl = row.querySelector('[data-accdl]');
      if (!sel || !dl || sel._wiredTipo) return; sel._wiredTipo = true;
      sel.addEventListener('change', function () { dl.innerHTML = accOptionsFor(sel.value).map(function (o) { return '<option value="' + esc(o) + '">'; }).join(''); });
    });
  }
  function accEstadoChip(e) { return e === 'aprobado' ? '<span class="chip g">Aprobado</span>' : e === 'rechazado' ? '<span class="chip r">Rechazado</span>' : '<span class="chip y">Pendiente</span>'; }
  function accSolicPendientes() { var out = []; (db.users || []).forEach(function (u) { (u.accesosSolicitados || []).forEach(function (a) { if (a.estado === 'pendiente') out.push({ u: u, a: a }); }); }); return out; }
  function accesosCardHtml(u) {
    var sol = u.accesosSolicitados || [];
    var rows = sol.length
      ? sol.map(function (a) {
          return '<div style="display:flex;align-items:flex-start;gap:11px;padding:9px 0;border-bottom:1px solid #EEF3F9">' +
            '<div style="flex:1;min-width:0"><div style="font-size:13.5px;color:var(--navy);font-weight:700">' + esc(a.nombre) + ' <span class="chip n" style="font-size:10px">' + esc(ACC_TLBL[a.tipo] || a.tipo) + '</span></div>' +
            '<div style="font-size:12.5px;color:var(--muted);margin-top:2px">' + esc(a.justificacion || '') + '</div></div>' + accEstadoChip(a.estado) + '</div>';
        }).join('')
      : '<div class="empty" style="padding:12px 0">Sin accesos adicionales solicitados.</div>';
    return '<div class="card" style="max-width:640px;margin-top:16px" data-acccard="' + u.id + '">' +
      '<div class="toolrow"><h3 style="margin:0">Accesos y permisos adicionales</h3><span class="sp"></span>' + (sol.length ? '<span class="chip n">' + sol.length + '</span>' : '') + '</div>' +
      '<div class="note" style="margin:2px 0 10px">Solicita a la <b>gerente de Sistemas</b> o al <b>administrador</b> accesos que <b>correspondan al cargo</b>. Cada solicitud necesita una justificación y queda pendiente de aprobación.</div>' +
      rows +
      '<div id="accRows' + u.id + '" style="margin-top:10px"></div>' +
      '<div style="display:flex;gap:8px;margin-top:6px"><button class="btn-s" data-accadd="' + u.id + '">+ Solicitar acceso</button><button class="btn-g" data-accsave="' + u.id + '" style="display:none">Enviar solicitud</button></div></div>';
  }

  function activosHtml(uid) {
    var acts = db.activos.filter(function (a) { return a.userId === uid; });
    if (!acts.length) return '<div class="empty" style="padding:14px 0">Sin activos fijos asignados.</div>';
    return acts.map(function (a) {
      return '<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #EEF3F9;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:180px"><div style="font-weight:700;color:var(--navy);font-size:14px">' + esc(a.nombre) + '</div><div style="font-size:12.5px;color:var(--muted)">Serial: ' + esc(a.serial) + ' · ' + a.fecha + '</div></div>' +
        (a.ingreso ? '<span class="chip b">Entrega de ingreso</span>' : '<span class="chip g">Asignado</span>') + '</div>';
    }).join('');
  }

  function isSysManager(u) { return u && u.role === 'gerente' && /sistema/i.test(u.cargo || ''); }
  function canEditProfile(target) {
    if (!me || !target || target.id === me.id) return false;
    if (me.role === 'admin') return true;
    if (isSysManager(me)) return target.role !== 'admin';
    if (me.role === 'rrhh') return target.role !== 'admin' && target.role !== 'gerente';
    if (me.role === 'gerente') {
      var ids = subtree(me.id).map(function (u) { return u.id; });
      return ids.indexOf(target.id) > -1;
    }
    return false;
  }
  function adminEsViewer() { return me && me.role === 'admin'; }
  function horaFmt(hm) {
    if (!hm) return '';
    var p = String(hm).split(':'), h = +p[0], m = p[1] || '00';
    var ap = h >= 12 ? 'p.m.' : 'a.m.', h12 = h % 12 || 12;
    return h12 + ':' + m + ' ' + ap;
  }
  function horarioDe(u) {
    return { entrada: u.horaEntrada || '08:00', salida: u.horaSalida || '17:00', custom: !!(u.horaEntrada || u.horaSalida) };
  }
  function horarioTxt(u) { var h = horarioDe(u); return horaFmt(h.entrada) + ' – ' + horaFmt(h.salida); }
  var PERMISO_TIPOS = {
    lactancia: 'Permiso de lactancia',
    clases: 'Permiso de estudios / clases',
    medico: 'Cita médica recurrente',
    otro: 'Permiso especial'
  };
  function permisosActivos(u, fecha) {
    fecha = fecha || reqToday();
    return (u.permisos || []).filter(function (p) {
      if (p.desde && p.desde > fecha) return false;
      if (p.hasta && p.hasta < fecha) return false;
      return true;
    });
  }
  function permisoTxt(p) {
    var nom = p.nota || PERMISO_TIPOS[p.tipo] || 'Permiso';
    var dir = p.dir === 'entrada' ? 'entra' : 'sale';
    if (p.horaInicio && p.horaFin) return nom + ' · ' + horaFmt(p.horaInicio) + ' a ' + horaFmt(p.horaFin);
    if (p.hora) return nom + ' · ' + dir + ' ' + horaFmt(p.hora);
    return nom;
  }

  function profileModal(u, full) {
    var g = u.managerId ? byId(u.managerId) : null;
    var canTools = canEditProfile(u);
    var priv = me.role === 'admin' || me.role === 'gerente' || me.role === 'rrhh' || canTools;
    var heroAva = u.foto ? '<img class="pf-ava" style="width:60px;height:60px;font-size:22px" src="' + esc(u.foto) + '" alt="">' : '<div class="pf-ava" style="width:60px;height:60px;font-size:22px">' + initials(u.nombre) + '</div>';
    var hero = '<div class="pf-hero" style="border-radius:16px;padding:18px 20px;margin:-2px 0 14px;gap:15px">' +
      '<div class="pf-avawrap">' + heroAva + '</div>' +
      '<div class="pf-id" style="min-width:160px"><div class="pf-name" style="font-size:20px">' + esc(u.nombre) + '</div><div class="pf-role">' + esc(u.cargo || '') + '</div>' +
        '<div class="pf-badges"><span class="pf-badge">' + esc(roleLabelOf(u.role)) + '</span>' + (u.area ? '<span class="pf-badge">' + esc(u.area) + '</span>' : '') + '</div></div>' +
    '</div>';
    function toolsMgmtHtml(x) {
      var list = x.herramientas || [];
      return '<div style="margin-top:12px;border-top:1px solid #EEF3F9;padding-top:10px">' +
        '<div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin-bottom:6px">Herramientas asignadas</div>' +
        (list.length ? list.map(function (t) {
          return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #F2F6FB">' +
            '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:13.5px">' + esc(t.nombre) + '</div><div style="font-size:12px;color:var(--muted);word-break:break-all">' + esc(t.url) + '</div></div>' +
            '<button class="btn-s btn-danger" data-tdel="' + t.id + '" style="font-size:12px;padding:5px 10px">Quitar</button></div>';
        }).join('') : '<div class="empty" style="padding:8px 0">Sin herramientas asignadas.</div>') +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">' +
          '<input id="thN" type="text" placeholder="Nombre (ej: Drive Comercial)" style="flex:1;min-width:150px;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-size:13px;font-family:inherit">' +
          '<input id="thU" type="url" placeholder="https://…" style="flex:1;min-width:150px;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-size:13px;font-family:inherit">' +
          '<select id="thT" style="border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-size:13px;font-family:inherit"><option value="app">Aplicativo interno</option><option value="ext">Aplicativo externo</option><option value="drive">Drive autorizado</option></select>' +
          '<button class="btn-g" id="thAdd" style="font-size:13px;padding:8px 14px">Agregar</button>' +
        '</div></div>';
    }
    if (!full) {
      function cRow(ico, label, val) {
        return '<div style="display:flex;align-items:center;gap:13px;padding:12px 2px;border-bottom:1px solid #F2F6FB">' +
          '<span style="width:36px;height:36px;border-radius:10px;background:#EEF3FB;color:#2A6FDB;display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span>' +
          '<div style="min-width:0"><div style="font-size:10.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">' + label + '</div><div style="font-weight:700;color:var(--navy);font-size:14.5px;word-break:break-word">' + val + '</div></div>' +
        '</div>';
      }
      var body = cRow('<rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-10 6L2 7"></path>', 'Correo', '<a href="mailto:' + esc(u.email) + '" style="color:var(--navy)">' + esc(u.email) + '</a>') +
        cRow('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"></path>', 'Teléfono', esc(u.telefono || '—')) +
        cRow('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>', 'Ciudad', esc(u.ciudad || '—')) +
        (g ? cRow('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>', 'Reporta a', esc(g.nombre) + ' <span style="color:var(--muted);font-weight:500">· ' + esc(g.cargo) + '</span>') : '');
      modal(
        '<button class="mod-x"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg></button>' +
        hero + body +
        '<div style="display:flex;align-items:center;gap:10px;margin-top:18px">' +
          '<a class="btn-s" href="mailto:' + esc(u.email) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-10 6L2 7"></path></svg>Escribir</a>' +
          '<span style="flex:1"></span>' +
          (priv ? '<button class="btn-g" id="pmMore"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>Más información</button>' : '<button class="btn-g mod-x">Cerrar</button>') +
        '</div>'
      );
      var mb = $('#pmMore'); if (mb) mb.addEventListener('click', function () {
        if (u.id !== me.id && (me.role === 'admin' || me.role === 'rrhh' || canTools)) { closeModal(); profileModal(u, true); return; }
        closeModal(); perfilTarget = u; perfilTab = 'resumen'; go('perfil');
      });
      var avEl0 = document.querySelector('#modalHost .pf-ava');
      if (u.foto && avEl0) { avEl0.style.cursor = 'zoom-in'; avEl0.title = 'Ver foto en grande'; avEl0.addEventListener('click', function () { photoZoom(u); }); }
      return;
    }
    var histU = (u.historial || []).slice(0, 8);
    function htime(iso) { var d = new Date(iso), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
    var histHtml = '<div style="margin-top:14px;border-top:1px solid #EEF3F9;padding-top:10px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin-bottom:8px">Historial</div>' +
      (histU.length ? histU.map(function (h) { return '<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #F4F6FA"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);margin-top:6px;flex:0 0 auto"></span><div style="flex:1"><div style="font-size:13.5px;color:var(--navy);font-weight:600;line-height:1.4">' + esc(h.texto) + '</div><div style="font-size:12px;color:var(--muted2)">' + htime(h.fecha) + ' · ' + esc(h.por) + '</div></div></div>'; }).join('') : '<div class="empty" style="padding:8px 0">Sin movimientos registrados.</div>') + '</div>';
    modal(
      '<button class="mod-x"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg></button>' +
      hero +
      '<div class="prow"><span class="k">Rol</span><span>' + roleLabelOf(u.role) + '</span></div>' +
      '<div class="prow"><span class="k">Correo</span><a href="mailto:' + esc(u.email) + '">' + esc(u.email) + '</a></div>' +
      '<div class="prow"><span class="k">Teléfono</span><span>' + esc(u.telefono) + '</span></div>' +
      '<div class="prow"><span class="k">LinkedIn</span><a href="' + esc(u.linkedin) + '" target="_blank" rel="noopener">Ver perfil</a></div>' +
      '<div class="prow"><span class="k">Ciudad</span><span>' + esc(u.ciudad) + '</span></div>' +
      (u.cumple ? '<div class="prow"><span class="k">Cumpleaños</span><span>' + cumpleTxt(u.cumple) + '</span></div>' : '') +
      (g ? '<div class="prow"><span class="k">Reporta a</span><span>' + esc(g.nombre) + '</span></div>' : '') +
      (u.emergNombre || u.emergTelefono ? '<div style="margin-top:12px;border-top:1px solid #EEF3F9;padding-top:8px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin-bottom:4px">Contacto de emergencia</div>' +
        (u.emergNombre ? '<div class="prow"><span class="k">Persona</span><span>' + esc(u.emergNombre) + '</span></div>' : '') +
        (u.emergTelefono ? '<div class="prow"><span class="k">Teléfono</span><span>' + esc(u.emergTelefono) + '</span></div>' : '') + '</div>' : '') +
      '<div style="margin-top:12px;border-top:1px solid #EEF3F9;padding-top:8px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Activos fijos y entrega de ingreso</div>' + activosHtml(u.id) + '</div>' +
      ((me.role === 'admin' || me.role === 'rrhh' || canEditProfile(u) === true) ? reqCardHtml(u, true) : ((u.requerimientos && u.requerimientos.length) ? reqCardHtml(u, false) : '')) +
      ((me.role === 'admin' || me.role === 'rrhh' || canEditProfile(u) === true) ? accesosCardHtml(u) : '') +
      ((me.role === 'admin' || me.role === 'rrhh') ? expedienteCardsHtml(u, me.role === 'admin' || me.role === 'rrhh') : '') +
      (canTools ? toolsMgmtHtml(u) : '') +
      roleInfoHtml(u, true) +
      histHtml +
      (((me.role === 'admin' || me.role === 'rrhh') && u.id !== me.id) || canTools ? '<div class="mod-actions" style="justify-content:flex-start;flex-wrap:wrap">' + (canTools ? '<button class="btn-s" id="pmFoto">Cambiar foto</button>' : '') + (((me.role === 'admin' || me.role === 'rrhh') && u.id !== me.id) ? '<button class="btn-s" id="pmResetPass"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Restaurar contraseña</button>' : '') + '</div>' : '')
    );
    var pr = $('#pmResetPass');
    if (pr) pr.addEventListener('click', function () {
      var temp = 'VP' + Math.floor(1000 + Math.random() * 9000);
      modal('<button class="mod-x">✕</button><h3>Restaurar contraseña — ' + esc(u.nombre) + '</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Se asignará una contraseña temporal que ' + esc(u.nombre.split(' ')[0]) + ' deberá cambiar al ingresar. Puedes editarla antes de confirmar.</p>' +
        '<div class="fld"><label>Contraseña temporal</label><input id="mrPw" type="text" value="' + temp + '"></div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="mrOk">Restaurar</button></div>');
      $('#mrOk').addEventListener('click', function () {
        var pw = $('#mrPw').value.trim(); if (!pw) { toast('Escribe una contraseña temporal.'); return; }
        u.password = pw; u.mustChangePass = true;
        db.claveReqs = db.claveReqs || [];
        (db.claveReqs || []).forEach(function (r) { if (r.userId === u.id && r.estado === 'pendiente') { r.estado = 'resuelta'; r.resueltoEl = nowStamp(); r.resueltoPor = me.nombre; r.tempPass = pw; } });
        db.claveReqs.push({ id: db.nextClaveId++, userId: u.id, nombre: u.nombre, email: u.email, fecha: reqToday(), creadoEl: nowStamp(), estado: 'resuelta', resueltoEl: nowStamp(), resueltoPor: me.nombre, tempPass: pw, manual: true });
        logHist(u, 'Capital Humano restauró su contraseña (clave temporal asignada)', me.nombre);
        logHist(me, 'Restauró la contraseña de ' + u.nombre + ' (clave temporal asignada)');
        saveDB(db); closeModal(); refreshNav(); if (current === 'empleados') rEmpleados(); toast('Clave restaurada. Comparte la contraseña temporal con ' + esc(u.nombre.split(' ')[0]) + ': ' + pw);
      });
    });
    var pf = $('#pmFoto');
    var ecBtn = $('#modalHost [data-editcargo]');
    if (ecBtn) ecBtn.addEventListener('click', function () { editCargoModal(u); });
    (function wireReq() {
      var card = $('#modalHost [data-reqcard]'); if (!card) return;
      u.requerimientos = u.requerimientos || [];
      if (!u.nextReqId) u.nextReqId = (u.requerimientos.reduce(function (m, r) { return Math.max(m, r.id || 0); }, 0) + 1);
      card.querySelectorAll('[data-reqtgl]').forEach(function (b) {
        b.addEventListener('click', function () {
          var r = u.requerimientos.find(function (x) { return x.id === +b.getAttribute('data-reqtgl'); });
          if (r) { r.entregado = !r.entregado; logHist(u, (r.entregado ? 'Requerimiento entregado: ' : 'Requerimiento marcado pendiente: ') + r.texto); saveDB(db); closeModal(); profileModal(u, true); }
        });
      });
      card.querySelectorAll('[data-reqdel]').forEach(function (b) {
        b.addEventListener('click', function () {
          var r = u.requerimientos.find(function (x) { return x.id === +b.getAttribute('data-reqdel'); });
          u.requerimientos = u.requerimientos.filter(function (x) { return x.id !== +b.getAttribute('data-reqdel'); });
          logHist(u, 'Requerimiento eliminado: ' + (r ? r.texto : '')); saveDB(db); closeModal(); profileModal(u, true);
        });
      });
      var addBtn = card.querySelector('#reqAdd');
      if (addBtn) addBtn.addEventListener('click', function () {
        var val = card.querySelector('#reqNew').value.trim(); if (!val) return;
        u.requerimientos.push({ id: u.nextReqId++, texto: val, entregado: false });
        logHist(u, 'Requerimiento agregado: ' + val); saveDB(db); closeModal(); profileModal(u, true);
      });
    })();
    (function wireDocs() {
      if (!(me.role === 'admin' || me.role === 'rrhh')) return;
      document.querySelectorAll('#modalHost [data-doc]').forEach(function (cb) {
        cb.addEventListener('change', function () {
          var parts = cb.getAttribute('data-doc').split(':'), key = parts[0], i = +parts[1];
          u[key] = u[key] || {}; u[key][i] = cb.checked;
          var lbl = (key === 'expediente' ? EXPEDIENTE_DOCS : CUENTA_NOMINA_DOCS)[i];
          logHist(u, (cb.checked ? 'Documento recibido' : 'Documento marcado pendiente') + ' (' + (key === 'expediente' ? 'expediente' : 'cuenta nómina') + '): ' + lbl, me.nombre);
          saveDB(db); closeModal(); profileModal(u, true);
        });
      });
    })();
    (function wireAccesos() {
      var card = $('#modalHost [data-acccard]'); if (!card) return;
      var rowsBox = card.querySelector('#accRows' + u.id);
      var saveBtn = card.querySelector('[data-accsave="' + u.id + '"]');
      var addBtn = card.querySelector('[data-accadd="' + u.id + '"]');
      function refreshSave() { if (saveBtn) saveBtn.style.display = rowsBox.querySelector('.acc-row') ? '' : 'none'; }
      function wireDel() { rowsBox.querySelectorAll('[data-accdel]').forEach(function (b) { b.onclick = function () { b.closest('.acc-row').remove(); refreshSave(); }; }); }
      if (addBtn) addBtn.addEventListener('click', function () { rowsBox.insertAdjacentHTML('beforeend', accRowHtml()); wireDel(); wireAccTipo(rowsBox); refreshSave(); });
      if (saveBtn) saveBtn.addEventListener('click', function () {
        var nuevas = Array.prototype.map.call(rowsBox.querySelectorAll('.acc-row'), function (row) {
          return { tipo: row.querySelector('[data-acct]').value, nombre: row.querySelector('[data-accn]').value.trim(), justificacion: row.querySelector('[data-accj]').value.trim() };
        }).filter(function (a) { return a.nombre && a.justificacion; });
        if (!nuevas.length) { toast('Indica el acceso y la justificación.'); return; }
        u.accesosSolicitados = u.accesosSolicitados || [];
        var baseId = u.accesosSolicitados.reduce(function (m, a) { return Math.max(m, a.id || 0); }, 0);
        var apId = (db.aprobadores && (db.aprobadores.sistemas || db.aprobadores.ti)) || 1;
        nuevas.forEach(function (a) {
          baseId++;
          u.accesosSolicitados.push({ id: baseId, tipo: a.tipo, nombre: a.nombre, justificacion: a.justificacion, estado: 'pendiente', fecha: reqToday() });
          db.pendientes.push({ id: db.nextPendId++, userId: apId, tipo: 'acceso', titulo: 'Acceso solicitado: ' + a.nombre + ' — ' + u.nombre + ' (' + u.cargo + ')', detalle: (ACC_TLBL[a.tipo] || a.tipo) + ' para ' + u.nombre + ', ' + u.cargo + '. Justificación: ' + a.justificacion, estado: 'abierto', fecha: reqToday(), por: me.nombre, respuesta: '' });
        });
        logHist(u, me.nombre + ' solicitó ' + nuevas.length + ' acceso(s) adicional(es) a Sistemas: ' + nuevas.map(function (a) { return a.nombre; }).join(', '), me.nombre);
        saveDB(db); closeModal(); profileModal(u, true); toast(nuevas.length + ' acceso(s) enviados a Sistemas para aprobación.');
      });
    })();
    if (pf) pf.addEventListener('click', function () {
      pickPhoto(function (dataUrl) {
        u.foto = dataUrl; logHist(u, 'Foto de perfil actualizada'); saveDB(db); closeModal(); toast('Foto actualizada para ' + u.nombre + '.');
        if (u.id === me.id) renderShell();
        go(current);
      });
    });
    if (canTools) {
      var thAdd = $('#thAdd');
      if (thAdd) thAdd.addEventListener('click', function () {
        var n = $('#thN').value.trim(), url = $('#thU').value.trim(), tp = $('#thT').value;
        if (!n || !url) { toast('Indica nombre y enlace de la herramienta.'); return; }
        u.herramientas = u.herramientas || [];
        u.herramientas.push({ id: db.nextToolId++, nombre: n, url: url, tipo: tp });
        logHist(u, 'Herramienta asignada: ' + n);
        saveDB(db); closeModal(); profileModal(u, true); toast('Herramienta asignada a ' + u.nombre + '.');
        if (u.id === me.id && current === 'perfil') { /* refreshed on reopen */ }
      });
      document.querySelectorAll('#modalHost [data-tdel]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var quitada = (u.herramientas || []).find(function (t) { return t.id === +btn.getAttribute('data-tdel'); });
          u.herramientas = (u.herramientas || []).filter(function (t) { return t.id !== +btn.getAttribute('data-tdel'); });
          logHist(u, 'Herramienta retirada: ' + (quitada ? quitada.nombre : ''));
          saveDB(db); closeModal(); profileModal(u, true); toast('Herramienta retirada.');
        });
      });
    }
    var avEl = document.querySelector('#modalHost .pf-ava');
    if (u.foto && avEl) {
      avEl.style.cursor = 'zoom-in';
      avEl.title = 'Ver foto en grande';
      avEl.addEventListener('click', function () { photoZoom(u); });
    }
  }

  /* ---------- INICIO ---------- */
  function rInicio() {
    resetContent();
    if (me.role === 'admin') { rInicioAdmin(); return; }
    var pr = progressOf(me.id, myOnboardingKey());
    var kpis = '';
    if (me.role === 'admin' || me.role === 'rrhh') {
      var esAdmin = me.role === 'admin';
      kpis = kpi(db.users.filter(function (u) { return u.activo && u.role !== 'candidato' && perfilVisible(u); }).length, esAdmin ? 'Empleados activos' : 'Equipo interno activo') +
             kpi(db.docs.length, 'Documentos') +
             (esAdmin ? kpi(db.candidatos.filter(function (c) { return c.etapa !== 'activo' && c.etapa !== 'rechazado'; }).length, 'Candidatos en proceso') : '') +
             kpi(db.campanas.length, 'Campañas de email');
    } else if (me.role === 'gerente' || me.role === 'reclutador') {
      kpis = kpi(subtree(me.id).length, 'Personas en tu equipo') + kpi(visibleDocsCount(), 'Documentos disponibles') + kpi(pr.pct + '%', 'Inducciones');
    } else {
      kpis = kpi(visibleDocsCount(), 'Documentos disponibles') + kpi(pr.pct + '%', 'Inducciones') + kpi('365', 'Días de soporte');
    }
    var mesN = new Date().getMonth() + 1;
    var hoyD = new Date().getDate();
    var cumps = db.users.filter(function (u) { return u.activo && u.role !== 'candidato' && perfilVisible(u) && u.cumple && +u.cumple.split('-')[0] === mesN; })
      .sort(function (a, b) { return +a.cumple.split('-')[1] - +b.cumple.split('-')[1]; });
    var GIFT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"></path><path d="M12 8S9.5 3 7 4.5 9 8 12 8zm0 0s2.5-5 5-3.5S15 8 12 8z"></path></svg>';
    var cumpsCard = '<div class="card" style="padding:0;overflow:hidden">' +
      '<div style="display:flex;align-items:center;gap:9px;padding:16px 18px;background:linear-gradient(120deg,#FFF4E5,#FFE9D4);border-bottom:1px solid #F3E2CE">' +
        '<span style="width:30px;height:30px;border-radius:9px;background:#FF9F45;color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto">' + GIFT + '</span>' +
        '<div><div style="font-weight:800;color:#7a4a12;font-size:15px;line-height:1.1">Cumpleaños de ' + MESES[mesN - 1] + '</div><div style="font-size:12px;color:#a9793f">' + cumps.length + ' del equipo</div></div>' +
      '</div>' +
      '<div style="padding:6px 18px 12px">' +
      (cumps.length ? cumps.map(function (u) {
        var hoy = hoyD === +u.cumple.split('-')[1];
        return '<div style="display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid #F4F6FA">' + avatarHtml(u, 34, 12) +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:14px">' + esc(u.nombre) + '</div><div style="font-size:12px;color:var(--muted2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(u.cargo) + '</div></div>' +
          (hoy ? '<span style="font-size:11.5px;font-weight:800;padding:5px 11px;border-radius:999px;background:#FF9F45;color:#fff;flex:0 0 auto">¡Hoy! 🎉</span>' : '<span style="font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;background:#FFF4E5;color:#b06a1e;flex:0 0 auto">' + (+u.cumple.split('-')[1]) + ' ' + MESES[mesN - 1].slice(0, 3) + '</span>') + '</div>';
      }).join('') : '<div class="empty" style="padding:18px 0">Nadie cumple años este mes.</div>') +
      '</div></div>';
    var MEGA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>';
    var _coms = (db.comunicaciones || []).filter(canSeeCom).sort(function (a, b) { return (a.fecha < b.fecha ? 1 : -1) || (b.id - a.id); });
    var _nn = comNoLeidas().length;
    var anunciosCard = '<div class="card" style="padding:0;overflow:hidden">' +
      '<div style="display:flex;align-items:center;gap:9px;padding:16px 18px;background:linear-gradient(120deg,#E7FAF1,#D6F5E6);border-bottom:1px solid #C7EED9">' +
        '<span style="width:30px;height:30px;border-radius:9px;background:#00B871;color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto">' + MEGA + '</span>' +
        '<div style="flex:1"><div style="font-weight:800;color:#0a5c3a;font-size:15px;line-height:1.1">Anuncios y actualizaciones</div><div style="font-size:12px;color:#3f9970">Comunicaciones internas del equipo</div></div>' +
        (_nn ? '<span class="chip y">' + _nn + ' nuevas</span>' : '') +
      '</div>' +
      '<div style="padding:4px 18px 8px">' + (_coms.length ? _coms.slice(0, 4).map(function (c, i) {
        var unread = (c.leidoPor || []).indexOf(me.id) === -1;
        var prev = String(c.cuerpo || '').replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').slice(0, 90);
        return '<div data-hcom="' + c.id + '" style="display:flex;gap:12px;padding:12px 0;cursor:pointer' + (i < Math.min(_coms.length, 4) - 1 ? ';border-bottom:1px solid #F4F6FA' : '') + '">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:' + (unread ? '#FF9F45' : '#00CE7C') + ';margin-top:6px;flex:0 0 auto;box-shadow:0 0 0 4px ' + (unread ? 'rgba(255,159,69,.16)' : 'rgba(0,206,124,.14)') + '"></span>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:14.5px">' + esc(c.titulo) + (unread ? ' <span class="chip y" style="vertical-align:1px">Nueva</span>' : '') + '</div><div style="font-size:13px;color:var(--muted);margin-top:2px;line-height:1.5">' + esc(prev) + '…</div><div style="font-size:11.5px;color:var(--muted2);margin-top:4px">' + esc(c.por) + ' · ' + fechaCorta(c.fecha) + '</div></div>' +
        '</div>';
      }).join('') + (_coms.length > 4 ? '<div style="padding:10px 0 4px"><a href="#" data-hcomall style="font-weight:700;font-size:13px">Ver todas en Notificaciones →</a></div>' : '') : '<div class="empty" style="margin:8px 0">Aún no hay comunicaciones.</div>') + '</div></div>';
    $('#content').innerHTML =
      '<div class="card" style="position:relative;overflow:hidden;background:linear-gradient(135deg,#001F60 0%,#023180 55%,#003b8f 100%);border:none;margin-bottom:16px;padding:26px 28px">' +
        '<div style="position:absolute;right:-40px;top:-40px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(0,206,124,.22),transparent 70%);pointer-events:none"></div>' +
        '<div style="position:relative">' +
        '<div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#00E58C;margin-bottom:8px"><span style="width:8px;height:8px;border-radius:50%;background:#00CE7C"></span>Hola, ' + esc(me.nombre.split(' ')[0]) + '</div>' +
        '<div style="font-size:clamp(20px,2.4vw,27px);font-weight:800;color:#fff;line-height:1.25;letter-spacing:-.3px;max-width:720px">Hacer crecer <span style="color:#00E58C">tu negocio</span>.</div>' +
        '<div style="font-size:14px;color:rgba(255,255,255,.75);margin-top:8px;max-width:680px;line-height:1.6">Nuestra promesa hacia nuestros clientes. Ese es el trabajo de todos los que formamos parte de VEPAGOS.</div>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-bottom:16px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;background:linear-gradient(120deg,#F4F8FF,#EAF1FC);border-color:#DCE7F6">' +
        '<div style="flex:1;min-width:220px">' +
          '<div style="font-size:11.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#00874f;margin-bottom:4px">Inducciones</div>' +
          '<div style="font-weight:800;color:var(--navy);font-size:18px">Tu proceso de formación</div>' +
          '<div class="note" style="margin-top:2px">' + pr.done + ' de ' + pr.total + ' módulos completados.</div>' +
          '<div class="progress" style="margin-top:10px;max-width:340px"><i style="width:' + pr.pct + '%"></i></div>' +
        '</div>' +
        '<button class="btn-g" data-go2="onboarding" style="font-size:15px;padding:12px 22px">' + (pr.pct > 0 ? 'Continuar' : 'Comenzar') + ' <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></button>' +
      '</div>' +
      '<div class="grid g2">' + anunciosCard + cumpsCard + '</div>';
    var sacB = $('#sacBtn');
    if (sacB) sacB.addEventListener('click', function (e) { e.preventDefault(); window.open('https://solicitudes.vepagos.com/login', '_blank', 'noopener'); });
    $('#content').addEventListener('click', function (e) {
      if (e.target.closest('[data-hcomall]')) { e.preventDefault(); go('pendientes'); return; }
      var hc = e.target.closest('[data-hcom]');
      if (hc) { var c = db.comunicaciones.find(function (x) { return x.id === +hc.getAttribute('data-hcom'); }); if (c) comView(c); }
    });
    $('#content').addEventListener('click', goBtnHandler);
  }
  function goBtnHandler(e) { var b = e.target.closest('[data-go2]'); if (b) go(b.getAttribute('data-go2')); }

  /* ---------- PANEL DE DIRECCIÓN (admin) ---------- */
  function rInicioAdmin() {
    var users = db.users.filter(function (u) { return u.activo && u.role !== 'candidato' && perfilVisible(u); });
    var ticketsAbiertos = db.rrhhReqs.filter(function (r) { return r.estado === 'abierta'; });
    var porAprobar = db.rrhhReqs.filter(puedoActuar).sort(function (a, b) { return a.id - b.id; });
    var alertas = db.pendientes.filter(function (p) { return p.estado !== 'resuelto'; });
    var alarmas = db.users.filter(contratoAlarma).sort(function (a, b) { return (contratoAlarma(a).dias) - (contratoAlarma(b).dias); });
    var vacantes = db.vacantes.filter(function (v) { return v.estado === 'abierta'; });
    var candProc = db.candidatos.filter(function (c) { return c.etapa !== 'activo' && c.etapa !== 'rechazado'; });
    var coms = (db.comunicaciones || []).slice().sort(function (a, b) { return (a.fecha < b.fecha ? 1 : -1) || (b.id - a.id); });
    var mesN = new Date().getMonth() + 1, hoyD = new Date().getDate();
    var cumps = users.filter(function (u) { return u.cumple && +u.cumple.split('-')[0] === mesN; }).sort(function (a, b) { return +a.cumple.split('-')[1] - +b.cumple.split('-')[1]; });

    function kpiGo(n, l, go, col, ico, hot) {
      var numCol = (hot && n > 0) ? col : 'var(--navy)';
      return '<div class="dash-kpi" data-go2="' + go + '"' + (hot && n > 0 ? ' style="border-color:' + col + '55"' : '') + '>' +
        '<span class="dash-kpi-ic" style="background:' + col + '18;color:' + col + '"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span>' +
        '<div><div class="dash-kpi-n" style="color:' + numCol + '">' + n + '</div><div class="dash-kpi-l">' + l + '</div></div>' +
      '</div>';
    }
    function panel(title, ico, col, bodyHtml, goId, action) {
      return '<div class="pf-card" style="padding:0;overflow:hidden">' +
        '<div class="pf-ch" style="padding:16px 18px 12px;margin:0;border-bottom:1px solid #F2F6FB"><span class="ic" style="background:' + col + '18;color:' + col + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span><h3>' + title + '</h3><span class="sp"></span>' + (action ? '<button class="btn-s" data-go2="' + goId + '" style="font-size:12px;padding:6px 12px">' + action + '</button>' : '') + '</div>' +
        '<div style="padding:10px 18px 16px">' + bodyHtml + '</div>' +
      '</div>';
    }
    function lineItem(main, sub, right, go) {
      return '<div ' + (go ? 'data-open="' + go + '" style="cursor:pointer;' : 'style="') + 'display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid #F4F6FA">' +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:13.8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + main + '</div><div style="font-size:12px;color:var(--muted2)">' + sub + '</div></div>' + (right || '') + '</div>';
    }

    // --- Solicitudes ---
    var solBody = '<div style="display:flex;gap:18px;margin-bottom:6px"><div><div style="font-size:24px;font-weight:800;color:#C77700;line-height:1">' + porAprobar.length + '</div><div style="font-size:12px;color:var(--muted);font-weight:600">Por aprobar</div></div>' +
      '<div><div style="font-size:24px;font-weight:800;color:var(--navy);line-height:1">' + ticketsAbiertos.length + '</div><div style="font-size:12px;color:var(--muted);font-weight:600">En proceso</div></div></div>' +
      (porAprobar.length || ticketsAbiertos.length ?
        (porAprobar.length ? porAprobar : ticketsAbiertos).slice(0, 4).map(function (r) {
          var tp = reqTipo(r.tipo), pr2 = PRIOR[r.prioridad] || PRIOR.normal, u = byId(r.userId);
          return lineItem(esc(r.titulo || tp.nombre), reqFolio(r) + ' · ' + esc(u ? u.nombre.split(' ').slice(0, 2).join(' ') : '—'), '<span class="chip ' + pr2.chip + '">' + pr2.t + '</span>', 'req:' + r.id);
        }).join('')
        : '<div class="empty" style="padding:14px">Sin solicitudes pendientes. ¡Todo al día!</div>');

    // --- Contratos ---
    var contBody = alarmas.length ? alarmas.slice(0, 5).map(function (u) {
      var al = contratoAlarma(u);
      var chip = al.dias < 0 ? '<span class="chip r">Vencido ' + Math.abs(al.dias) + 'd</span>' : '<span class="chip y">' + al.dias + 'd</span>';
      return lineItem(esc(u.nombre), esc(u.cargo), chip, null);
    }).join('') : '<div class="empty" style="padding:14px">Sin renovaciones próximas.</div>';

    // --- Asistencia ---
    var conReg = {}; (db.asistencia || []).forEach(function (r) { if (r.userId) conReg[r.userId] = 1; });
    var asisBody = '<div style="display:flex;gap:18px"><div><div style="font-size:24px;font-weight:800;color:var(--navy);line-height:1">' + (db.asistencia || []).length + '</div><div style="font-size:12px;color:var(--muted);font-weight:600">Registros</div></div>' +
      '<div><div style="font-size:24px;font-weight:800;color:var(--navy);line-height:1">' + Object.keys(conReg).length + '</div><div style="font-size:12px;color:var(--muted);font-weight:600">Empleados</div></div></div>' +
      '<div class="note" style="margin-top:8px">Sube el Excel de horarios de entrada y salida con observaciones.</div>';

    // --- Candidatos pipeline ---
    var etapas = [['nuevo', 'Nuevos'], ['entrevista', 'Entrevista'], ['entrenamiento', 'Entrenamiento']];
    var candBody = candProc.length ? '<div style="display:flex;gap:16px;flex-wrap:wrap">' + etapas.map(function (e) {
      var n = candProc.filter(function (c) { return c.etapa === e[0]; }).length;
      return '<div><div style="font-size:22px;font-weight:800;color:var(--navy);line-height:1">' + n + '</div><div style="font-size:12px;color:var(--muted);font-weight:600">' + e[1] + '</div></div>';
    }).join('') + '</div>' : '<div class="empty" style="padding:14px">No hay candidatos en proceso.</div>';

    // --- Comunicaciones ---
    var comBody = coms.length ? coms.slice(0, 4).map(function (c) {
      var unread = (c.leidoPor || []).indexOf(me.id) === -1;
      return lineItem(esc(c.titulo) + (unread ? ' <span class="chip y" style="vertical-align:1px">Nueva</span>' : ''), esc(c.por) + ' · ' + fechaCorta(c.fecha), '', 'com:' + c.id);
    }).join('') : '<div class="empty" style="padding:14px">Aún no hay comunicaciones.</div>';

    // --- Cumpleaños ---
    var cumpBody = cumps.length ? cumps.slice(0, 5).map(function (u) {
      var hoy = hoyD === +u.cumple.split('-')[1];
      return '<div style="display:flex;align-items:center;gap:11px;padding:8px 0;border-bottom:1px solid #F4F6FA">' + avatarHtml(u, 32, 12) + '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:13.8px">' + esc(u.nombre) + '</div></div>' + (hoy ? '<span class="chip y">¡Hoy! 🎉</span>' : '<span class="chip n">' + (+u.cumple.split('-')[1]) + ' ' + MESES[mesN - 1].slice(0, 3) + '</span>') + '</div>';
    }).join('') : '<div class="empty" style="padding:14px">Nadie cumple años este mes.</div>';

    // --- Headcount por área ---
    var areas = {}; users.forEach(function (u) { areas[u.area || '—'] = (areas[u.area || '—'] || 0) + 1; });
    var areaArr = Object.keys(areas).map(function (k) { return [k, areas[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var maxA = areaArr.length ? areaArr[0][1] : 1;
    var headBody = '<div style="display:flex;flex-direction:column;gap:9px">' + areaArr.map(function (a) {
      return '<div style="display:flex;align-items:center;gap:12px"><div style="width:150px;flex:0 0 auto;font-size:13px;font-weight:600;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(a[0]) + '</div>' +
        '<div style="flex:1;height:10px;background:#EEF3F9;border-radius:999px;overflow:hidden"><div style="height:100%;width:' + Math.round(a[1] / maxA * 100) + '%;background:linear-gradient(90deg,#001F60,#2A6FDB);border-radius:999px"></div></div>' +
        '<div style="width:28px;text-align:right;font-weight:800;color:var(--navy);font-size:13px">' + a[1] + '</div></div>';
    }).join('') + '</div>';

    var html =
      '<div class="pf-hero" style="margin-bottom:18px">' +
        '<div class="pf-id" style="min-width:auto"><div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#00E58C;margin-bottom:6px"><span style="width:8px;height:8px;border-radius:50%;background:#00CE7C"></span>Panel de dirección</div>' +
        '<div class="pf-name">Hola, ' + esc(me.nombre.split(' ')[0]) + '</div>' +
        '<div class="pf-role">Vista general de VEPAGOS — todo lo que está pasando en tu empresa, en un solo lugar.</div></div>' +
      '</div>';

    html += '<div class="dash-kpis">' +
      kpiGo(users.length, 'Empleados activos', 'empleados', '#2A6FDB', '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>') +
      kpiGo(porAprobar.length, 'Solicitudes por aprobar', 'solequipo', '#C77700', '<path d="M9 11l3 3 8-8"></path><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"></path>', true) +
      kpiGo(alertas.length, 'Alertas de RRHH', 'solequipo', '#B23A6E', '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path>', true) +
      kpiGo(alarmas.length, 'Contratos por renovar', 'contratos', '#D9463E', '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6M9 15l2 2 4-4"></path>', true) +
      kpiGo(vacantes.length, 'Vacantes abiertas', 'org', '#1F8A5B', '<circle cx="9" cy="7" r="4"></circle><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M19 8v6M22 11h-6"></path>') +
    '</div>';

    html += '<div class="dash-main">' +
      '<div class="dash-col">' +
        panel('Solicitudes del equipo', '<path d="M9 11l3 3 8-8"></path><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"></path>', '#C77700', solBody, 'solequipo', 'Ver todas') +
        panel('Renovaciones de contrato', '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path>', '#D9463E', contBody, 'contratos', 'Gestionar') +
        panel('Personas por área', '<rect x="9" y="2" width="6" height="5" rx="1"></rect><rect x="2" y="17" width="6" height="5" rx="1"></rect><rect x="16" y="17" width="6" height="5" rx="1"></rect><path d="M12 7v5M5 17v-2h14v2"></path>', '#001F60', headBody, 'org', 'Organigrama') +
      '</div>' +
      '<div class="dash-col">' +
        panel('Asistencia', '<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M8 2v4M16 2v4M3 10h18"></path>', '#2A6FDB', asisBody, 'asistencia', 'Carga masiva') +
        panel('Comunicaciones internas', '<path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>', '#00B871', comBody, 'pendientes', 'Ver todas') +
        panel('Cumpleaños de ' + MESES[mesN - 1], '<rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"></path><path d="M12 8S9.5 3 7 4.5 9 8 12 8zm0 0s2.5-5 5-3.5S15 8 12 8z"></path>', '#FF9F45', cumpBody, 'directorio', 'Directorio') +
      '</div>' +
    '</div>';

    $('#content').innerHTML = html;
    $('#content').addEventListener('click', function (e) {
      var g = e.target.closest('[data-go2]'); if (g) { go(g.getAttribute('data-go2')); return; }
      var op = e.target.closest('[data-open]'); if (op) {
        var v = op.getAttribute('data-open');
        if (v.indexOf('req:') === 0) { var r = db.rrhhReqs.find(function (x) { return x.id === +v.slice(4); }); if (r) reqView(r); }
        else if (v.indexOf('com:') === 0) { var c = db.comunicaciones.find(function (x) { return x.id === +v.slice(4); }); if (c) comView(c); }
      }
    });
  }

  /* ---------- CULTURA ORGANIZACIONAL ---------- */
  function rCultura() {
    resetContent();
    var nombre = esc((me.nombre || '').split(' ')[0] || '');
    var anios = new Date().getFullYear() - 2019;
    function kicker(t, col) { col = col || '#00E58C'; return '<div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:' + col + ';margin-bottom:12px"><span style="width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 0 4px ' + col + '22"></span>' + t + '</div>'; }
    function head(t) { return '<div style="font-size:clamp(19px,2.2vw,25px);font-weight:800;color:var(--navy);letter-spacing:-.5px;margin-bottom:4px">' + t + '</div>'; }

    var VALORES = [
      ['Cliente primero', 'Cada decisión se mide por cómo ayuda al comercio a vender más.', '#E0447B', 'rgba(224,68,123,.1)', '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"></path>'],
      ['Compromiso', 'Respondemos de verdad: soporte los 365 días del año y seguimiento real.', '#00B871', 'rgba(0,184,113,.1)', '<path d="M9 12l2 2 4-4"></path><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"></path>'],
      ['Cercanía', 'Atención local y humana: en la calle, en sitio y por WhatsApp.', '#2AB0C4', 'rgba(42,176,196,.1)', '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>'],
      ['Excelencia', 'Hacemos las cosas bien desde el primer intento, sin sorpresas.', '#FF9F45', 'rgba(255,159,69,.12)', '<path d="M12 2l2.9 6.3 6.8.9-5 4.7 1.3 6.8L12 17.8 5.9 20.7l1.3-6.8-5-4.7 6.8-.9z"></path>'],
      ['Trabajo en equipo', 'El flywheel lo giramos entre todos: ventas, operaciones, SAC y soporte.', '#2A6FDB', 'rgba(42,111,219,.1)', '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>'],
      ['Integridad', 'Transparencia total: sin costos ocultos ni promesas que no cumplimos.', '#7C5CFC', 'rgba(124,92,252,.1)', '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>']
    ];
    function valorCard(v) {
      return '<div class="cx-val" style="background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;transition:transform .2s,box-shadow .2s,border-color .2s;cursor:default">' +
        '<span style="display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:' + v[3] + ';color:' + v[2] + ';margin-bottom:16px"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + v[4] + '</svg></span>' +
        '<div style="font-weight:800;color:var(--navy);font-size:16.5px;margin-bottom:5px;letter-spacing:-.2px">' + v[0] + '</div>' +
        '<div style="font-size:13.5px;color:var(--muted);line-height:1.6">' + v[1] + '</div></div>';
    }

    var FLY = [
      ['Afiliar', 'Sumamos nuevos comercios a VEPAGOS.', '#2A6FDB'],
      ['Activar', 'Los ponemos a cobrar desde el primer día.', '#2AB0C4'],
      ['Transaccionar', 'Cada venta que pasa por el POS.', '#00B871'],
      ['Retener', 'Soporte 365 días para que se queden.', '#FF9F45'],
      ['Recomendar', 'Un cliente feliz nos trae al siguiente.', '#E0447B']
    ];
    function flyStep(s, i) {
      return '<div style="flex:1;min-width:150px;position:relative;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:18px 16px">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px"><span style="width:30px;height:30px;border-radius:9px;background:' + s[2] + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex:0 0 auto">' + (i + 1) + '</span>' +
        '<span style="font-weight:800;color:#fff;font-size:15px">' + s[0] + '</span></div>' +
        '<div style="font-size:12.5px;color:rgba(255,255,255,.62);line-height:1.5">' + s[1] + '</div></div>';
    }

    var PERKS = [
      ['Creces con nosotros', 'Onboarding real, formación continua y camino de desarrollo. Aquí no te dejan solo: aprendes haciendo y con acompañamiento.', '#00B871', 'rgba(0,184,113,.1)', '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>'],
      ['Un equipo que responde', 'Soporte los 365 días del año no es solo para el cliente: es la forma en que trabajamos entre nosotros. Nadie se queda atascado.', '#2A6FDB', 'rgba(42,111,219,.1)', '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"></path>'],
      ['Tu trabajo se nota', 'Más de 80.000 comercios han cobrado gracias a este equipo. Lo que haces mueve negocios reales en toda Venezuela.', '#E0447B', 'rgba(224,68,123,.1)', '<path d="M13 2L3 14h9l-1 8 10-12h-9z"></path>'],
      ['Cercanía de verdad', 'Somos un equipo unido, sin corbatas ni jerarquías eternas. Se trabaja con confianza, buena onda y las puertas abiertas.', '#7C5CFC', 'rgba(124,92,252,.1)', '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>']
    ];
    function perkCard(p) {
      return '<div class="cx-val" style="background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;display:flex;gap:16px;transition:transform .2s,box-shadow .2s,border-color .2s">' +
        '<span style="display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:13px;background:' + p[3] + ';color:' + p[2] + ';flex:0 0 auto"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p[4] + '</svg></span>' +
        '<div><div style="font-weight:800;color:var(--navy);font-size:16px;margin-bottom:5px;letter-spacing:-.2px">' + p[0] + '</div>' +
        '<div style="font-size:13.5px;color:var(--muted);line-height:1.6">' + p[1] + '</div></div></div>';
    }

    var STATS = [['2019', 'nacimos'], ['+80.000', 'comercios'], ['365', 'días de soporte'], [anios + ' años', 'creciendo']];

    $('#content').innerHTML =
      '<style>' +
        '@keyframes cxFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(14px,-18px)}}' +
        '@keyframes cxFloat2{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,14px)}}' +
        '.cx-val:hover{transform:translateY(-4px);box-shadow:0 14px 34px -18px rgba(0,31,96,.32);border-color:#D4DEEC}' +
        '.cx-cta:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 20px 38px -14px rgba(0,0,0,.55)}' +
        '.cx-glass:hover{transform:translateY(-3px);background:rgba(255,255,255,.22)}' +
      '</style>' +
      '<div style="position:relative;background:linear-gradient(120deg,#E7FAF1,#F4F9FF);border:1px solid #D5EEE1;border-radius:22px;padding:clamp(26px,3.5vw,42px);margin-bottom:20px;overflow:hidden">' +
        '<svg viewBox="0 0 24 24" width="120" height="120" fill="none" stroke="#00CE7C" stroke-width="1.4" style="position:absolute;right:24px;top:22px;opacity:.16"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>' +
        '<div style="position:relative;max-width:720px">' + kicker('Nuestro propósito', '#00874f') +
          '<div style="font-size:clamp(24px,3.4vw,36px);font-weight:800;color:var(--navy);letter-spacing:-.7px;line-height:1.15">“Hacer crecer tu negocio.”</div>' +
          '<div style="font-size:15px;color:#33415C;margin-top:12px;line-height:1.7">No es un eslogan pegado en la pared. Es la vara con la que medimos cada decisión: si ayuda a que un comercio venda más, vamos por ahí. Es la promesa que le hacemos al cliente y el trabajo de todos los que formamos VEPAGOS.</div>' +
        '</div>' +
      '</div>' +

      '<div class="grid g2" style="margin-bottom:22px">' +
        '<div class="card" style="border-radius:18px;padding:24px;border-left:4px solid #2A6FDB">' + kicker('Misión', '#2A6FDB') +
          '<div style="font-size:16px;color:var(--navy);font-weight:700;line-height:1.55">Facilitar el cobro electrónico a cada comercio de Venezuela con tecnología confiable y soporte cercano.</div>' +
        '</div>' +
        '<div class="card" style="border-radius:18px;padding:24px;border-left:4px solid #00CE7C">' + kicker('Visión', '#00874f') +
          '<div style="font-size:16px;color:var(--navy);font-weight:700;line-height:1.55">Ser el aliado de pagos preferido del comercio venezolano.</div>' +
        '</div>' +
      '</div>' +

      '<div style="margin-bottom:14px">' + kicker('Nuestros valores', '#00874f') + head('Lo que nos define, en el día a día') + '</div>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr));margin-bottom:26px">' + VALORES.map(valorCard).join('') + '</div>' +

      '<div style="position:relative;overflow:hidden;background:linear-gradient(135deg,#012A7C,#001A54);border-radius:24px;padding:clamp(26px,3.5vw,42px);margin-bottom:26px">' +
        '<div style="position:absolute;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(0,229,140,.22),transparent 70%);bottom:-120px;right:-40px;animation:cxFloat2 12s ease-in-out infinite;pointer-events:none"></div>' +
        '<div style="position:relative">' + kicker('Cómo trabajamos') +
          '<div style="font-size:clamp(20px,2.6vw,28px);font-weight:800;color:#fff;letter-spacing:-.5px;line-height:1.2;max-width:620px">Giramos un mismo motor. Cada rol impulsa una etapa.</div>' +
          '<div style="font-size:14.5px;color:rgba(255,255,255,.72);margin-top:10px;line-height:1.65;max-width:640px">Es un <b style="color:#00E58C">flywheel</b>: cuando cada quien hace bien su parte, el motor gira más rápido y más comercios crecen con nosotros. Tú también empujas una parte de esta rueda.</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:24px">' + FLY.map(flyStep).join('') + '</div>' +
        '</div>' +
      '</div>' +

      '<div style="margin-bottom:14px">' + kicker('Lo que es trabajar aquí', '#00874f') + head('Razones para emocionarte cada mañana') + '</div>' +
      '<div class="grid g2" style="margin-bottom:26px">' + PERKS.map(perkCard).join('') + '</div>' +

      '<div style="position:relative;overflow:hidden;background:linear-gradient(135deg,#00693e 0%,#00874f 45%,#00B871 100%);border-radius:26px;padding:clamp(30px,3.8vw,50px);text-align:center;box-shadow:0 30px 70px -34px rgba(0,135,79,.7)">' +
        '<div style="position:absolute;inset:0;background:radial-gradient(120% 90% at 50% -10%,rgba(255,255,255,.22),transparent 55%);pointer-events:none"></div>' +
        '<div style="position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(0,229,140,.5),transparent 68%);top:-150px;right:-70px;animation:cxFloat 12s ease-in-out infinite;pointer-events:none"></div>' +
        '<div style="position:absolute;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.14),transparent 70%);bottom:-150px;left:-50px;animation:cxFloat2 14s ease-in-out infinite;pointer-events:none"></div>' +
        '<div style="position:relative;max-width:600px;margin:0 auto">' +
          '<span style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:18px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;margin-bottom:18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)"><svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z"></path></svg></span>' +
          '<div style="font-size:clamp(23px,3.1vw,32px);font-weight:800;color:#fff;letter-spacing:-.6px;line-height:1.15">Bienvenido a VEPAGOS' + (nombre ? ', ' + nombre : '') + '.</div>' +
          '<div style="font-size:15.5px;color:rgba(255,255,255,.92);margin-top:13px;line-height:1.65">Ya conoces quiénes somos y cómo trabajamos. El siguiente paso es tuyo: arranca tu formación y empieza a mover la rueda.</div>' +
          '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:26px">' +
            '<button class="cx-cta" data-go2="onboarding" style="position:relative;display:inline-flex;align-items:center;gap:9px;background:#fff;color:#00693e;border:none;border-radius:14px;padding:15px 28px;font-family:inherit;font-size:15.5px;font-weight:800;cursor:pointer;box-shadow:0 14px 30px -12px rgba(0,0,0,.5);transition:transform .18s,box-shadow .18s">Ir a mi onboarding<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></button>' +
            '<button class="cx-glass" data-go2="somos" style="display:inline-flex;align-items:center;gap:9px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.34);color:#fff;border-radius:14px;padding:15px 26px;font-family:inherit;font-size:15.5px;font-weight:700;cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:transform .18s,background .18s">Conocer VEPAGOS</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    $('#content').addEventListener('click', goBtnHandler);
  }

  /* ---------- SOMOS VEPAGOS ---------- */
  function rSomos() {
    resetContent();
    var cfg = getSomosConfig();
    var anios = new Date().getFullYear() - 2019;
    function sec(t, ico, col, bg) {
      col = col || '#00874f'; bg = bg || 'rgba(0,206,124,.12)';
      var icon = ico ? '<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;background:' + bg + ';color:' + col + ';flex:0 0 auto"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span>' : '<span style="width:8px;height:8px;border-radius:50%;background:#00CE7C"></span>';
      return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' + icon + '<span style="font-size:15.5px;font-weight:800;color:var(--navy);letter-spacing:-.2px">' + t + '</span></div>';
    }
    var CHK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00B871" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto;margin-top:2px"><path d="M20 6L9 17l-5-5"></path></svg>';
    function li(t) { return '<div style="display:flex;gap:9px;padding:6px 0;font-size:14px;color:#33415C;line-height:1.5">' + CHK + '<span>' + t + '</span></div>'; }
    function chipG(t) { return '<span class="chip g" style="font-size:13px;padding:6px 12px">' + t + '</span>'; }
    $('#content').innerHTML =
      '<div class="card" style="background:linear-gradient(135deg,#001F60 0%,#023180 100%);border:none;margin-bottom:16px;padding:28px">' +
        '<div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#00E58C;margin-bottom:8px"><span style="width:8px;height:8px;border-radius:50%;background:#00CE7C"></span>Quiénes somos</div>' +
        '<div style="font-size:clamp(22px,2.8vw,30px);font-weight:800;color:#fff;letter-spacing:-.4px">Somos VEPAGOS</div>' +
        '<div style="font-size:14.5px;color:rgba(255,255,255,.78);margin-top:8px;max-width:700px;line-height:1.65">' + esc(cfg.intro) + '</div>' +
        '<div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:12px;max-width:700px;line-height:1.6;border-top:1px solid rgba(255,255,255,.16);padding-top:12px">' + esc(cfg.juridico) + '</div>' +
      '</div>' +
      (function () {
        var STAT_ICONS = [
          ['<path d="M8 2v4M16 2v4M3 10h18"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect>', '#2A6FDB', 'rgba(42,111,219,.12)'],
          ['<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"></path><path d="M12 6v6l4 2"></path>', '#7C5CFC', 'rgba(124,92,252,.12)'],
          ['<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>', '#00B871', 'rgba(0,184,113,.13)'],
          ['<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="M22 4L12 14.01l-3-3"></path>', '#2AB0C4', 'rgba(42,176,196,.13)'],
          ['<rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M3 8l9-5 9 5M7 12h.01M12 12h.01M17 12h.01"></path>', '#FF9F45', 'rgba(255,159,69,.14)']
        ];
        return '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:16px">' + cfg.stats.map(function (s, i) {
          var si = STAT_ICONS[i] || STAT_ICONS[0];
          return '<div style="position:relative;overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 18px">' +
            '<div style="position:absolute;right:-24px;top:-24px;width:96px;height:96px;border-radius:50%;background:' + si[2] + ';pointer-events:none"></div>' +
            '<span style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;background:' + si[2] + ';color:' + si[1] + ';margin-bottom:14px"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + si[0] + '</svg></span>' +
            '<div style="position:relative;font-size:30px;font-weight:800;color:var(--navy);letter-spacing:-.6px;line-height:1">' + esc(s.valor) + '</div>' +
            '<div style="position:relative;font-size:13px;color:var(--muted);font-weight:600;margin-top:5px">' + esc(s.label) + '</div>' +
          '</div>';
        }).join('') + '</div>';
      })() +
      '<div class="grid g2" style="margin-bottom:16px">' +
        '<div class="card">' + sec('Qué incluye el servicio del POS', '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>', '#00B871', 'rgba(0,184,113,.12)') +
          cfg.servicios.map(function (s) { return li(esc(s)); }).join('') +
        '</div>' +
        '<div class="card">' + sec('Beneficios para el cliente', '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"></path>', '#E0447B', 'rgba(224,68,123,.12)') +
          cfg.beneficios.map(function (s) { return li(esc(s)); }).join('') +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-bottom:16px">' + sec('Modelos disponibles para la venta', '<rect x="5" y="2" width="14" height="20" rx="2"></rect><path d="M12 18h.01"></path>', '#2A6FDB', 'rgba(42,111,219,.12)') +
        (function () {
          var _POS = db.somosPOS || window.SV_SEED.POS_CATALOGO || [];
          var cAll = _POS.length;
          var cCC = _POS.filter(function (p) { return p.sw === 'credicard'; }).length;
          var cPL = _POS.filter(function (p) { return p.sw === 'platco'; }).length;
          var cBA = _POS.filter(function (p) { return p.sw === 'banesco'; }).length;
          return '<div id="svPosFilters" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
            '<button class="btn-s sv-pf" data-sw="all">Todos (' + cAll + ')</button>' +
            '<button class="btn-s sv-pf" data-sw="credicard">Credicard (' + cCC + ')</button>' +
            '<button class="btn-s sv-pf" data-sw="platco">Platco (' + cPL + ')</button>' +
            '<button class="btn-s sv-pf" data-sw="banesco">Banesco (' + cBA + ')</button>' +
          '</div>';
        })() +
        '<div id="svPosGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px"></div>' +
        '<div class="note" style="margin-top:12px">' + (db.somosPOS || window.SV_SEED.POS_CATALOGO || []).length + ' opciones en total · 3 plataformas de procesamiento. Las fichas técnicas están en la <a href="#" data-go2="docs" style="color:#00874f;font-weight:700">Biblioteca</a>.</div>' +
      '</div>' +
      '<div class="card" style="margin-bottom:16px">' + sec('Nuestros 15 bancos aliados', '<rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M3 8l9-5 9 5M7 12h.01M12 12h.01M17 12h.01"></path>', '#FF9F45', 'rgba(255,159,69,.14)') +
        '<div class="note" style="margin:0 0 14px">Los bancos con los que un comercio puede cobrar, según la plataforma de su terminal.</div>' +
        (function () {
          var BANCOS = [
            ['bdv', 'Banco de Venezuela'], ['tesoro', 'Banco del Tesoro'], ['bancaribe', 'Bancaribe'], ['banplus', 'Banplus'],
            ['bfc', 'BFC Banco Fondo Común'], ['activo', 'Banco Activo'], ['cien', '100% Banco'], ['bancrecer', 'Bancrecer'],
            ['plaza', 'Banco Plaza'], ['delsur', 'Banco del Sur'], ['r4', 'R4 Mi Banco'], ['bdt', 'Banco Digital de los Trabajadores'],
            ['mercantil', 'Mercantil'], ['provincial', 'BBVA Provincial'], ['banesco', 'Banesco']
          ];
          var GRUPOS = [
            ['Credicard (12 bancos)', ['bdv', 'tesoro', 'bancaribe', 'banplus', 'bfc', 'activo', 'cien', 'bancrecer', 'plaza', 'delsur', 'r4', 'bdt']],
            ['Platco (2 bancos)', ['mercantil', 'provincial']],
            ['Banesco (1 banco)', ['banesco']]
          ];
          function nom(id) { var b = BANCOS.find(function (x) { return x[0] === id; }); return b ? b[1] : id; }
          var PLAT = {
            'Credicard': ['#2A6FDB', 'rgba(42,111,219,.1)'],
            'Platco': ['#7C5CFC', 'rgba(124,92,252,.1)'],
            'Banesco': ['#00874f', 'rgba(0,206,124,.12)']
          };
          return '<div style="display:flex;flex-direction:column;gap:16px">' + GRUPOS.map(function (g) {
            var plataforma = g[0].split(' (')[0];
            var col = (PLAT[plataforma] || ['#2A6FDB', 'rgba(42,111,219,.1)']);
            return '<div style="border:1px solid #EAF0F7;border-radius:16px;overflow:hidden">' +
              '<div style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:' + col[1] + ';border-bottom:1px solid #EAF0F7">' +
                '<span style="width:9px;height:9px;border-radius:3px;background:' + col[0] + ';flex:0 0 auto"></span>' +
                '<span style="font-size:14px;font-weight:800;color:var(--navy)">' + plataforma + '</span>' +
                '<span style="margin-left:auto;font-size:11.5px;font-weight:700;color:' + col[0] + ';background:#fff;border-radius:999px;padding:3px 10px">' + g[1].length + ' banco' + (g[1].length > 1 ? 's' : '') + '</span>' +
              '</div>' +
              '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;padding:14px">' +
              g[1].map(function (id) {
                return '<div style="display:flex;align-items:center;gap:10px;border:1px solid #EEF3F9;border-radius:12px;padding:9px 11px;background:#fff">' +
                  '<span style="width:36px;height:36px;border-radius:9px;background:#F6F9FD;display:flex;align-items:center;justify-content:center;flex:0 0 auto"><img src="assets/bancos/' + id + '.png" alt="" style="width:26px;height:26px;object-fit:contain"></span>' +
                  '<span style="font-size:12.5px;font-weight:700;color:#33415C;line-height:1.25">' + nom(id) + '</span></div>';
              }).join('') + '</div></div>';
          }).join('') + '</div>';
        })() +
      '</div>' +
      '<div class="grid g2">' +
        '<div class="card">' + sec('Tarifa y Plan Regular', '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>', '#00874f', 'rgba(0,206,124,.12)') +
          '<div style="font-size:14.5px;color:#33415C;line-height:1.65"><b style="color:var(--navy)">' + esc(cfg.tarifa) + '</b></div>' +
          cfg.tarifaItems.map(function (s) { return li(esc(s)); }).join('') +
          '<div class="note" style="margin-top:8px">La tarifa vigente por modelo está en la <a href="#" data-go2="docs" style="color:#00874f;font-weight:700">Biblioteca → Planes de servicio</a>.</div>' +
        '</div>' +
        '<div class="card">' + sec('Nuestros hitos', '<path d="M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z"></path><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"></path>', '#7C5CFC', 'rgba(124,92,252,.12)') +
          cfg.hitos.map(function (s) { return li(esc(s)); }).join('') +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px">' + sec('Nuestras redes sociales', '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"></path>', '#2AB0C4', 'rgba(42,176,196,.13)') +
        '<div class="note" style="margin:0 0 12px">Síguelas y compártelas con tus clientes.</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">' +
        (function () {
          var RED_STYLES = {
            'Instagram': { bg: 'linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)', svg: '<path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.39A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.72 1.48 1.39 2.13a5.9 5.9 0 0 0 2.13 1.39c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.39 5.9 5.9 0 0 0 1.39-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.39-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm7.85-10.4a1.44 1.44 0 1 1-1.44-1.44 1.44 1.44 0 0 1 1.44 1.44z"></path>' },
            'Facebook': { bg: '#1877F2', svg: '<path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"></path>' },
            'LinkedIn': { bg: '#0A66C2', svg: '<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z"></path>' },
            'Google Reviews': { bg: '#fff;border:1px solid #E6ECF4', svg: '<path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"></path><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"></path><path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"></path><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"></path>', fill: true },
            'Página web': { bg: 'var(--navy)', svg: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"></path>', stroke: true }
          };
          return cfg.redes.map(function (r) {
            var st = RED_STYLES[r.nombre] || { bg: 'var(--navy)', svg: '<circle cx="12" cy="12" r="9"></circle>', stroke: true };
            var svgAttr = st.fill ? ' fill="#fff"' : (st.stroke ? ' fill="none" stroke="#00CE7C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' : ' fill="#fff"');
            return '<a href="' + esc(r.url) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:11px;border:1px solid #E6ECF4;border-radius:14px;padding:12px 14px;background:#fff;text-decoration:none">' +
              '<span style="width:38px;height:38px;border-radius:11px;background:' + st.bg + ';display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="20" height="20" viewBox="0 0 24 24"' + svgAttr + '>' + st.svg + '</svg></span>' +
              '<span><span style="display:block;font-weight:800;color:var(--navy);font-size:14.5px">' + esc(r.nombre) + '</span><span style="display:block;font-size:12px;color:var(--muted2)">' + esc(r.handle) + '</span></span></a>';
          }).join('');
        })() +
        '</div>' +
      '</div>';
    $('#content').addEventListener('click', goBtnHandler);
    var POS = db.somosPOS || window.SV_SEED.POS_CATALOGO || [];
    var SWL = { credicard: 'Credicard', platco: 'Platco', banesco: 'Banesco' };
    function pfStyle(b, on) {
      b.style.borderRadius = '999px';
      b.style.background = on ? 'var(--navy)' : '';
      b.style.color = on ? '#fff' : '';
      b.style.borderColor = on ? 'var(--navy)' : '';
    }
    function renderPos(sw) {
      $('#svPosGrid').innerHTML = POS.filter(function (t) { return sw === 'all' || t.sw === sw; }).map(function (t) {
        return '<div style="background:#fff;border:1px solid #E6ECF4;border-radius:14px;overflow:hidden">' +
          '<div style="height:150px;background:#fff url(\'' + t.img + '\') center/contain no-repeat;background-size:auto 88%;border-bottom:1px solid #EEF3F9;position:relative">' +
            '<span style="position:absolute;top:8px;right:8px;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:#E7FAF1;color:#00874f;border:1px solid #b8ecd4">' + SWL[t.sw] + '</span>' +
            '<span style="position:absolute;top:8px;left:8px;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--navy);color:#fff">' + esc(t.tag) + '</span>' +
          '</div>' +
          '<div style="padding:11px 13px">' +
            '<div style="font-weight:800;color:var(--navy);font-size:14.5px">' + esc(t.name) + '</div>' +
            '<div style="font-size:12px;color:var(--muted2);margin-top:1px">' + esc(t.sub) + '</div>' +
            '<div style="font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.5">' + t.bullets.map(esc).join(' · ') + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    var pfs = $('#svPosFilters');
    pfs.querySelectorAll('.sv-pf').forEach(function (b) { pfStyle(b, b.getAttribute('data-sw') === 'all'); });
    renderPos('all');
    pfs.addEventListener('click', function (e) {
      var b = e.target.closest('.sv-pf'); if (!b) return;
      pfs.querySelectorAll('.sv-pf').forEach(function (x) { pfStyle(x, x === b); });
      renderPos(b.getAttribute('data-sw'));
    });
  }
  function kpi(n, l) { return '<div class="card kpi"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; }
  function visibleDocsCount() {
    var cats = CATS.filter(catAllowed).map(function (c) { return c.id; });
    return db.docs.filter(function (d) { return cats.indexOf(d.cat) > -1 && visibleDoc(d); }).length;
  }

  /* ---------- BIBLIOTECA (CONSULTA GENERAL) ---------- */
  var docCat = 'fichas';
  function rDocs() {
    resetContent();
    var cats = CATS.filter(catAllowed);
    if (!cats.some(function (c) { return c.id === docCat; })) docCat = cats[0].id;
    var cat = cats.find(function (c) { return c.id === docCat; });
    var docs = db.docs.filter(function (d) { return (d.cat === docCat || d.categoria_id === docCat) && visibleDoc(d); });
    var esPrompts = docCat === 'prompts';
    $('#content').innerHTML =
      '<div class="doccat">' + cats.map(function (c) { return '<button data-cat="' + c.id + '" class="' + (c.id === docCat ? 'on' : '') + '">' + c.nombre + '</button>'; }).join('') + '</div>' +
      '<div class="card">' +
        '<div class="toolrow"><div><h3 style="margin:0">' + cat.nombre + '</h3><div class="note" style="margin-top:2px">' + cat.desc + '</div></div><span class="sp"></span></div>' +
        (docs.length ? (esPrompts ? docs.map(promptRow).join('') : docs.map(docRow).join('')) : '<div class="empty">No hay ' + (esPrompts ? 'prompts' : 'documentos') + ' en esta categoría.</div>') +
      '</div>' +
      (esPrompts ? '<div class="note">Copia el prompt y reemplaza los campos entre [corchetes] con tu información antes de usarlo en tu asistente de IA.</div>' : '<div class="note">Los documentos marcados <span class="chip n">demo</span> son marcadores de posición del prototipo. Solo ves los documentos generales y los de tu departamento o equipo' + (me.role === 'admin' ? ' (como administradora ves el 100%)' : '') + '.</div>');
    $('#content').querySelector('.doccat').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]'); if (!b) return; docCat = b.getAttribute('data-cat'); rDocs();
    });
    $('#content').addEventListener('click', function (e) {
      var dl = e.target.closest('[data-dl]');
      if (dl) {
        var d = db.docs.find(function (x) { return x.id === +dl.getAttribute('data-dl'); });
        if (d && (d.real || d.es_real)) { var a = document.createElement('a'); a.href = d.archivo || d.archivo_url; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); }
        else if (d) demoDownload(d.nombre);
        logHist(me, 'Descargó el documento: ' + (d ? d.nombre : ''));
        saveDB(db);
        return;
      }
      var cp = e.target.closest('[data-copyprompt]');
      if (cp) {
        var pd = db.docs.find(function (x) { return x.id === +cp.getAttribute('data-copyprompt'); });
        if (pd) {
          var txt = pd.prompt || pd.prompt_texto || '';
          function ok() { toast('Prompt copiado. ¡Pégalo en tu asistente de IA!'); }
          if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(ok, function () { ok(); }); }
          else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (er) {} ta.remove(); ok(); }
        }
        return;
      }
    });
  }
  function promptRow(d) {
    return '<div style="border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="width:30px;height:30px;border-radius:9px;background:#EAF1FD;color:#2A6FDB;display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5c0 1.5.5 2.5 1.5 3.5S10 12.5 10 14h4c0-1.5.5-2.5 1.5-3.5S17 8.5 17 7a5 5 0 0 0-5-5z"></path><path d="M9 18h6M10 22h4"></path></svg></span><div style="flex:1;min-width:0"><div class="dn">' + esc(d.nombre) + '</div><div class="dm">Por ' + esc(d.por || d.creado_por || 'Capital Humano') + ' · ' + esc(d.fecha || '') + '</div></div>' +
        '<button class="btn-s" data-copyprompt="' + d.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copiar</button></div>' +
      '<div style="background:#F8FAFD;border:1px solid #EEF3F9;border-radius:10px;padding:12px 14px;font-size:13.5px;line-height:1.6;color:#33415C;white-space:pre-wrap">' + esc(d.prompt || d.prompt_texto || '') + '</div>' +
    '</div>';
  }
  function docRow(d) {
    return '<div class="docrow">' +
      '<div class="docic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg></div>' +
      '<div><div class="dn">' + esc(d.nombre) + ((d.real || d.es_real) ? '' : ' <span class="chip n">demo</span>') + (d.deptos || []).map(function (x) { return ' <span class="chip y">Depto: ' + esc(x) + '</span>'; }).join('') + (d.equipos || []).map(function (x) { return ' <span class="chip y">Equipo: ' + esc(x) + '</span>'; }).join('') + (!(d.deptos && d.deptos.length) && !(d.equipos && d.equipos.length) ? (d.userId != null ? ' <span class="chip b">Personal</span>' : ' <span class="chip g">General</span>') : '') + '</div><div class="dm">Subido por ' + esc(d.por || d.creado_por || 'Administración') + ' · ' + (d.fecha || '') + '</div></div>' +
      '<span class="sp"></span>' +
      '<button class="btn-s" data-dl="' + d.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg>Descargar</button>' +
    '</div>';
  }

  /* ---------- ADMINISTRACIÓN · BIBLIOTECA ---------- */
  var adminDocCat = 'fichas';
  function rAdminDocs() {
    resetContent();
    $('#content').innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">Cargando biblioteca...</div>';
    
    Promise.all([
      window.SV_API.getDocumentos(),
      window.SV_API.getCategoriasDocumento()
    ]).then(function (res) {
      var apiDocs = (res[0] && !res[0].error && Array.isArray(res[0])) ? res[0] : null;
      if (apiDocs && apiDocs.length) {
        apiDocs.forEach(function (ad) {
          var exists = db.docs.find(function (x) { return x.id === ad.id; });
          if (!exists) {
            db.docs.push({
              id: ad.id,
              cat: ad.categoria_id,
              categoria_id: ad.categoria_id,
              nombre: ad.nombre,
              archivo: ad.archivo_url,
              archivo_url: ad.archivo_url,
              real: !!ad.es_real,
              es_real: !!ad.es_real,
              prompt: ad.prompt_texto,
              prompt_texto: ad.prompt_texto,
              fecha: ad.fecha ? String(ad.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10),
              por: ad.creado_por || 'Administradora VEPAGOS',
              creado_por: ad.creado_por || 'Administradora VEPAGOS',
              deptos: ad.departamento ? ad.departamento.split(',').map(function (s) { return s.trim(); }) : null,
              equipos: ad.equipo ? ad.equipo.split(',').map(function (s) { return s.trim(); }) : null
            });
          }
        });
        saveDB(db);
      }

      var cats = CATS;
      if (!cats.some(function (c) { return c.id === adminDocCat; })) adminDocCat = cats[0].id;
      var cat = cats.find(function (c) { return c.id === adminDocCat; });
      var docs = db.docs.filter(function (d) { return (d.cat === adminDocCat || d.categoria_id === adminDocCat); });
      var esPrompts = adminDocCat === 'prompts';
      
      var totalDocs = db.docs.length;
      var totalPrompts = db.docs.filter(function (d) { return (d.cat === 'prompts' || d.categoria_id === 'prompts'); }).length;
      var totalReales = db.docs.filter(function (d) { return d.real || d.es_real || d.archivo || d.archivo_url; }).length;

      var html = '<div class="toolrow" style="margin-bottom:16px">' +
        '<div><div style="font-size:14px;color:var(--muted);max-width:620px;line-height:1.55">Gestiona los <b>documentos y recursos</b> de la biblioteca corporativa. Agrega nuevos materiales o elimina los obsoletos con control total por base de datos.</div></div>' +
        '<span class="sp"></span>' +
        '<button class="btn-g" id="btnAdminAddDoc"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>' + (esPrompts ? 'Agregar prompt' : 'Agregar documento') + '</button>' +
      '</div>';

      html += '<div class="dash-kpis" style="margin-bottom:16px">' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#2A6FDB18;color:#2A6FDB"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg></span><div><div class="dash-kpi-n">' + totalDocs + '</div><div class="dash-kpi-l">Documentos totales</div></div></div>' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#00B87118;color:#00B871"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg></span><div><div class="dash-kpi-n">' + totalReales + '</div><div class="dash-kpi-l">Archivos reales</div></div></div>' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#8A5CD118;color:#8A5CD1"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5c0 1.5.5 2.5 1.5 3.5S10 12.5 10 14h4c0-1.5.5-2.5 1.5-3.5S17 8.5 17 7a5 5 0 0 0-5-5z"></path><path d="M9 18h6M10 22h4"></path></svg></span><div><div class="dash-kpi-n">' + totalPrompts + '</div><div class="dash-kpi-l">Prompts de IA</div></div></div>' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#FF7A1A18;color:#FF7A1A"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg></span><div><div class="dash-kpi-n">' + cats.length + '</div><div class="dash-kpi-l">Categorías</div></div></div>' +
      '</div>';

      html += '<div class="doccat">' + cats.map(function (c) { return '<button data-admincat="' + c.id + '" class="' + (c.id === adminDocCat ? 'on' : '') + '">' + c.nombre + '</button>'; }).join('') + '</div>';

      html += '<div class="card">' +
        '<div class="toolrow" style="margin-bottom:12px"><div><h3 style="margin:0">' + cat.nombre + '</h3><div class="note" style="margin-top:2px">' + cat.desc + ' · <b style="color:var(--navy)">' + docs.length + ' elementos</b></div></div><span class="sp"></span></div>' +
        (docs.length ? (esPrompts ? docs.map(adminPromptRow).join('') : docs.map(adminDocRow).join('')) : '<div class="empty">No hay ' + (esPrompts ? 'prompts' : 'documentos') + ' en esta categoría. Agrega uno con el botón superior.</div>') +
      '</div>';

      $('#content').innerHTML = html;

      $('#content').querySelector('.doccat').addEventListener('click', function (e) {
        var b = e.target.closest('[data-admincat]'); if (!b) return;
        adminDocCat = b.getAttribute('data-admincat');
        rAdminDocs();
      });

      var addBtn = $('#btnAdminAddDoc');
      if (addBtn && esPrompts) {
        addBtn.addEventListener('click', function () {
          modal('<button class="mod-x">✕</button><h3>Agregar prompt para IA</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Se guardará en la base de datos y estará disponible para todo el equipo.</p>' +
            '<div class="fld"><label>Título del prompt *</label><input id="anpTit" type="text" placeholder="Ej: Responder a un cliente indeciso"></div>' +
            '<div class="fld"><label>Contenido del prompt *</label><textarea id="anpTxt" style="min-height:130px" placeholder="Escribe el texto del prompt. Usa [corchetes] para los campos variables."></textarea></div>' +
            '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="anpOk">Guardar en base de datos</button></div>', 'wide');
          $('#anpOk').addEventListener('click', function () {
            var n = $('#anpTit').value.trim(), p = $('#anpTxt').value.trim();
            if (!n || !p) { toast('Por favor completa el título y el prompt.'); return; }
            var fechaHoy = new Date().toISOString().slice(0, 10);
            window.SV_API.createDocumento({
              categoria_id: 'prompts',
              nombre: n,
              prompt_texto: p,
              es_real: 0,
              fecha: fechaHoy,
              creado_por: me.nombre
            }).then(function (res) {
              var newId = (res && res.id) ? res.id : db.nextDocId++;
              db.docs.push({ id: newId, cat: 'prompts', categoria_id: 'prompts', nombre: n, prompt: p, prompt_texto: p, archivo: null, real: false, es_real: false, fecha: fechaHoy, por: me.nombre, creado_por: me.nombre, deptos: null, equipos: null });
              saveDB(db); closeModal(); rAdminDocs(); toast('Prompt guardado exitosamente en base de datos.');
            }).catch(function (err) {
              var newId = db.nextDocId++;
              db.docs.push({ id: newId, cat: 'prompts', categoria_id: 'prompts', nombre: n, prompt: p, prompt_texto: p, archivo: null, real: false, es_real: false, fecha: fechaHoy, por: me.nombre, creado_por: me.nombre, deptos: null, equipos: null });
              saveDB(db); closeModal(); rAdminDocs(); toast('Prompt guardado.');
            });
          });
        });
      } else if (addBtn) {
        addBtn.addEventListener('click', function () {
          var areas = []; db.users.forEach(function (u) { if (u.area && areas.indexOf(u.area) === -1) areas.push(u.area); });
          var equipos = []; db.users.forEach(function (u) { if (u.equipo && equipos.indexOf(u.equipo) === -1) equipos.push(u.equipo); });
          function cb(a) { return '<label style="display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:#33415C;background:#fff;border:1.5px solid #D9E2EF;border-radius:999px;padding:7px 14px;cursor:pointer;white-space:nowrap;user-select:none;transition:all .15s"><input type="checkbox" value="' + esc(a) + '" style="accent-color:#00CE7C;width:15px;height:15px;margin:0;flex:0 0 auto">' + esc(a) + '</label>'; }
          modal('<button class="mod-x">✕</button><h3>Agregar documento</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Se guardará en la categoría <b>' + esc(cat.nombre) + '</b> en la base de datos.</p>' +
            '<div class="fld"><label>Nombre del documento *</label><input id="andNombre" type="text" placeholder="Ej: Manual de Políticas 2026"></div>' +
            '<div class="fld"><label>Ruta o enlace del archivo (opcional)</label><input id="andUrl" type="text" placeholder="Ej: assets/manuales/politicas-2026.pdf"></div>' +
            '<div class="fld"><label>Visibilidad</label><select id="andVis"><option value="">General — toda la empresa</option><option value="p">Personalizada — por departamentos y/o equipos</option></select></div>' +
            '<div id="andScope" style="display:none">' +
              '<div class="fld"><label>Departamentos (elige uno o varios)</label><div id="andD" style="display:flex;flex-wrap:wrap;gap:8px">' + areas.map(cb).join('') + '</div></div>' +
              '<div class="fld"><label>Equipos (elige uno o varios)</label><div id="andE" style="display:flex;flex-wrap:wrap;gap:8px">' + equipos.map(cb).join('') + '</div></div>' +
            '</div>' +
            '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="andOk">Guardar documento</button></div>');
          
          $('#andVis').addEventListener('change', function () {
            $('#andScope').style.display = this.value === 'p' ? '' : 'none';
          });
          ['andD', 'andE'].forEach(function (id) {
            var el = $('#' + id);
            if (el) el.addEventListener('change', function (e) {
              var l = e.target.closest('label'); if (!l) return;
              if (e.target.checked) { l.style.borderColor = '#00CE7C'; l.style.background = '#F1FCF7'; l.style.color = '#001F60'; }
              else { l.style.borderColor = '#D9E2EF'; l.style.background = '#fff'; l.style.color = '#33415C'; }
            });
          });
          $('#andOk').addEventListener('click', function () {
            var n = $('#andNombre').value.trim(); if (!n) { toast('El nombre del documento es obligatorio.'); return; }
            var url = $('#andUrl').value.trim();
            var deptos = [], equipos2 = [];
            if ($('#andVis').value === 'p') {
              $('#andD').querySelectorAll('input:checked').forEach(function (i) { deptos.push(i.value); });
              $('#andE').querySelectorAll('input:checked').forEach(function (i) { equipos2.push(i.value); });
              if (!deptos.length && !equipos2.length) { toast('Elige al menos un departamento o equipo, o selecciona visibilidad General.'); return; }
            }
            var fechaHoy = new Date().toISOString().slice(0, 10);
            window.SV_API.createDocumento({
              categoria_id: adminDocCat,
              nombre: n,
              archivo_url: url || null,
              es_real: url ? 1 : 0,
              fecha: fechaHoy,
              creado_por: me.nombre,
              departamento: deptos.length ? deptos.join(', ') : null,
              equipo: equipos2.length ? equipos2.join(', ') : null
            }).then(function (res) {
              var newId = (res && res.id) ? res.id : db.nextDocId++;
              db.docs.push({ id: newId, cat: adminDocCat, categoria_id: adminDocCat, nombre: n, archivo: url || null, archivo_url: url || null, real: !!url, es_real: !!url, fecha: fechaHoy, por: me.nombre, creado_por: me.nombre, deptos: deptos.length ? deptos : null, equipos: equipos2.length ? equipos2 : null });
              saveDB(db); closeModal(); rAdminDocs(); toast('Documento guardado en base de datos.');
            }).catch(function (err) {
              var newId = db.nextDocId++;
              db.docs.push({ id: newId, cat: adminDocCat, categoria_id: adminDocCat, nombre: n, archivo: url || null, archivo_url: url || null, real: !!url, es_real: !!url, fecha: fechaHoy, por: me.nombre, creado_por: me.nombre, deptos: deptos.length ? deptos : null, equipos: equipos2.length ? equipos2 : null });
              saveDB(db); closeModal(); rAdminDocs(); toast('Documento guardado.');
            });
          });
        });
      }

      $('#content').addEventListener('click', function (e) {
        var dl = e.target.closest('[data-dl]');
        if (dl) {
          var d = db.docs.find(function (x) { return x.id === +dl.getAttribute('data-dl'); });
          if (d && (d.real || d.es_real)) { var a = document.createElement('a'); a.href = d.archivo || d.archivo_url; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); }
          else if (d) demoDownload(d.nombre);
          logHist(me, 'Descargó el documento: ' + (d ? d.nombre : ''));
          saveDB(db);
          return;
        }
        var cp = e.target.closest('[data-copyprompt]');
        if (cp) {
          var pd = db.docs.find(function (x) { return x.id === +cp.getAttribute('data-copyprompt'); });
          if (pd) {
            var txt = pd.prompt || pd.prompt_texto || '';
            function ok() { toast('Prompt copiado. ¡Pégalo en tu asistente de IA!'); }
            if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(ok, function () { ok(); }); }
            else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (er) {} ta.remove(); ok(); }
          }
          return;
        }
        var del = e.target.closest('[data-admindel]');
        if (del) {
          var docId = +del.getAttribute('data-admindel');
          var targetDoc = db.docs.find(function (x) { return x.id === docId; });
          var docTitle = targetDoc ? targetDoc.nombre : 'este documento';
          modal('<button class="mod-x">✕</button><h3>Eliminar de la biblioteca</h3>' +
            '<p style="color:#33415C;font-size:14px;margin:8px 0 16px">¿Estás seguro de que deseas eliminar permanentemente <b>' + esc(docTitle) + '</b> de la base de datos?</p>' +
            '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-s" id="btnConfirmAdminDel" style="color:#fff;background:#E0447B;border-color:#E0447B">Sí, eliminar</button></div>');
          $('#btnConfirmAdminDel').addEventListener('click', function () {
            window.SV_API.deleteDocumento(docId).then(function (res) {
              db.docs = db.docs.filter(function (x) { return x.id !== docId; });
              saveDB(db); closeModal(); rAdminDocs(); toast('Documento eliminado de la base de datos.');
            }).catch(function (err) {
              db.docs = db.docs.filter(function (x) { return x.id !== docId; });
              saveDB(db); closeModal(); rAdminDocs(); toast('Documento eliminado.');
            });
          });
        }
      });
    });
  }

  function adminPromptRow(d) {
    return '<div style="border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<span style="width:30px;height:30px;border-radius:9px;background:#EAF1FD;color:#2A6FDB;display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5c0 1.5.5 2.5 1.5 3.5S10 12.5 10 14h4c0-1.5.5-2.5 1.5-3.5S17 8.5 17 7a5 5 0 0 0-5-5z"></path><path d="M9 18h6M10 22h4"></path></svg></span>' +
        '<div style="flex:1;min-width:0"><div class="dn">' + esc(d.nombre) + '</div><div class="dm">Por ' + esc(d.por || d.creado_por || 'Capital Humano') + ' · ' + esc(d.fecha || '') + '</div></div>' +
        '<button class="btn-s" data-copyprompt="' + d.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copiar</button>' +
        '<button class="btn-s btn-danger" data-admindel="' + d.id + '" style="margin-left:6px">Eliminar</button>' +
      '</div>' +
      '<div style="background:#F8FAFD;border:1px solid #EEF3F9;border-radius:10px;padding:12px 14px;font-size:13.5px;line-height:1.6;color:#33415C;white-space:pre-wrap">' + esc(d.prompt || d.prompt_texto || '') + '</div>' +
    '</div>';
  }

  function adminDocRow(d) {
    return '<div class="docrow">' +
      '<div class="docic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg></div>' +
      '<div><div class="dn">' + esc(d.nombre) + ((d.real || d.es_real) ? '' : ' <span class="chip n">demo</span>') + (d.deptos || []).map(function (x) { return ' <span class="chip y">Depto: ' + esc(x) + '</span>'; }).join('') + (d.equipos || []).map(function (x) { return ' <span class="chip y">Equipo: ' + esc(x) + '</span>'; }).join('') + (!(d.deptos && d.deptos.length) && !(d.equipos && d.equipos.length) ? (d.userId != null ? ' <span class="chip b">Personal</span>' : ' <span class="chip g">General</span>') : '') + '</div><div class="dm">Subido por ' + esc(d.por || d.creado_por || 'Administración') + ' · ' + (d.fecha || '') + '</div></div>' +
      '<span class="sp"></span>' +
      '<button class="btn-s" data-dl="' + d.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg>Descargar</button>' +
      '<button class="btn-s btn-danger" data-admindel="' + d.id + '" style="margin-left:6px">Eliminar</button>' +
    '</div>';
  }

  /* ---------- SOLICITUDES (RRHH / administrativo) ---------- */
  var TIC = window.SV_TICKETS;
  var PRIOR = {
    normal: { t: 'Normal', chip: 'n', col: '#5B6B85' },
    intermedia: { t: 'Intermedia', chip: 'y', col: '#9A6B00' },
    urgente: { t: 'Urgente', chip: 'r', col: '#C0392B' }
  };
  var PRIOR_VAC = {
    urgente: { t: 'Urgente', chip: 'r', desc: 'Cubrir cuanto antes.' },
    normal: { t: 'Normal', chip: 'y', desc: 'Reclutamiento en el flujo habitual.' },
    pausa: { t: 'En pausa', chip: 'n', desc: 'Planificada para más adelante; aún no se recluta.' }
  };
  var PEND_TIPOS = {
    horario: { t: 'Horario / puntualidad', chip: 'r', accion: 'Justificar', ico: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>' },
    planilla: { t: 'Planilla por llenar', chip: 'y', accion: 'Llenar planilla', ico: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h4"></path>' },
    rrhh: { t: 'Pendiente con Capital Humano', chip: 'b', accion: 'Atender', ico: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a8 8 0 0 1 16 0v1"></path>' },
    acceso: { t: 'Acceso / permiso por aprobar', chip: 'b', accion: 'Revisar acceso', ico: '<rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>' }
  };
  var REQ_ESTADO = {
    abierta: { t: 'En proceso', chip: 'y' },
    aprobada: { t: 'Aprobada', chip: 'g' },
    rechazada: { t: 'Rechazada', chip: 'r' }
  };
  var EV_LABEL = { creada: 'Ticket creado', aprobado: 'Aprobado', rechazada: 'Ticket rechazado', cerrado: 'Ticket resuelto' };
  function reqTipo(id) { return TIC.TIPOS[id] || { id: id, nombre: id, deptoNombre: '—', depto: null, cat: '', flujo: ['supervisor', 'rrhh'], rango: false, genera: false }; }
  function reqDepto(id) { return TIC.DEPTS.find(function (d) { return d.id === id; }) || { id: id, nombre: '—', color: '#5B6B85', bg: '#EEF1F6', ico: '' }; }
  function reqIco(p) { return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
  function reqToday() { return new Date().toISOString().slice(0, 10); }
  function reqDias(a, b) { if (!a) return 0; var d1 = new Date(a), d2 = new Date(b || a); return Math.round((d2 - d1) / 86400000) + 1; }
  function reqFolio(r) { return 'TK-' + String(r.id).padStart(4, '0'); }
  function flujoDeTipo(tid) { return (db.reqFlujoOverrides && db.reqFlujoOverrides[tid]) || reqTipo(tid).flujo || ['supervisor', 'rrhh']; }
  function flujoDe(r) { return (r.flujo && r.flujo.length) ? r.flujo : flujoDeTipo(r.tipo); }
  function stepLabel(key) { return (TIC.STEPS[key] || { t: key }).t; }
  function stepAprobador(r, key) {
    if (key === 'supervisor') { var u = byId(r.userId); return (u && u.managerId) ? byId(u.managerId) : null; }
    var uid = (db.aprobadores || {})[key]; return uid ? byId(uid) : null;
  }
  function puedoActuar(r) {
    if (!me || r.estado !== 'abierta' || r.userId === me.id) return false;
    var steps = flujoDe(r), key = steps[r.paso || 0]; if (!key) return false;
    if (me.role === 'admin') return true;
    if (key === 'supervisor') { var u = byId(r.userId); return !!(u && u.managerId === me.id); }
    var uid = (db.aprobadores || {})[key]; if (uid && uid === me.id) return true;
    if (key === 'rrhh' || key === 'nomina') return me.role === 'rrhh';
    return false;
  }
  function antiguedadAnios(u) { if (!u.ingreso) return 0; return Math.max(0, Math.floor((Date.now() - new Date(u.ingreso).getTime()) / (365.25 * 86400000))); }
  function antiguedadTxt(u) {
    if (!u.ingreso) return '—';
    var ms = Date.now() - new Date(u.ingreso).getTime();
    var a = Math.floor(ms / (365.25 * 86400000));
    var m = Math.floor((ms - a * 365.25 * 86400000) / (30.44 * 86400000));
    var p = []; if (a) p.push(a + (a === 1 ? ' año' : ' años')); p.push(m + (m === 1 ? ' mes' : ' meses'));
    return p.join(' y ');
  }
  function vacInfo(u) {
    var anios = antiguedadAnios(u);
    var asignados = Math.min(15 + Math.max(0, anios - 1), 30);
    var mine = db.rrhhReqs.filter(function (r) { return r.userId === u.id && r.tipo === 'vacaciones'; });
    var tomados = mine.filter(function (r) { return r.estado === 'aprobada'; }).reduce(function (s, r) { return s + reqDias(r.desde, r.hasta); }, 0);
    var enTramite = mine.filter(function (r) { return r.estado === 'abierta'; }).reduce(function (s, r) { return s + reqDias(r.desde, r.hasta); }, 0);
    return { anios: anios, asignados: asignados, tomados: tomados, enTramite: enTramite, disponibles: Math.max(0, asignados - tomados - enTramite) };
  }
  function ausenciaJustificada(uid, fecha) {
    if (!uid || !fecha) return false;
    return db.rrhhReqs.some(function (r) {
      return r.userId === uid && (r.tipo === 'permiso' || r.tipo === 'reposo') && r.estado === 'aprobada' &&
        r.desde && r.desde <= fecha && (r.hasta || r.desde) >= fecha;
    });
  }
  function pendAbiertos(uid) { return db.pendientes.filter(function (p) { return p.userId === uid && p.estado === 'abierto'; }); }
  function enVacaciones(uid, fecha) {
    if (!uid || !fecha) return false;
    return db.rrhhReqs.some(function (r) {
      return r.userId === uid && r.tipo === 'vacaciones' && r.estado === 'aprobada' &&
        r.desde && r.desde <= fecha && (r.hasta || r.desde) >= fecha;
    });
  }
  function canSeeCom(c) {
    if (!c.perfilDestino || c.perfilDestino === '_todos') return true;
    return c.perfilDestino === me.role;
  }
  function comNoLeidas() { return (db.comunicaciones || []).filter(function (c) { return canSeeCom(c) && (c.leidoPor || []).indexOf(me.id) === -1; }); }
  var CADENCIAS = { unica: { t: 'Única vez', meses: 0 }, mensual: { t: 'Mensual', meses: 1 }, trimestral: { t: 'Trimestral', meses: 3 }, semestral: { t: 'Semestral', meses: 6 }, anual: { t: 'Anual', meses: 12 }, onboarding: { t: 'Al completar onboarding', meses: 0 } };
  function cadLabel(c) { return (CADENCIAS[c] || CADENCIAS.unica).t; }
  function audLabel(a) {
    a = a || 'todos';
    if (a === 'todos') return 'Toda la empresa';
    if (a === 'nuevoIngreso') return 'Nuevos ingresos';
    if (a.indexOf('area:') === 0) return 'Área: ' + a.slice(5);
    if (a.indexOf('rol:') === 0) return 'Rol: ' + roleLabelOf(a.slice(4));
    if (a.indexOf('persona:') === 0) { var u = byId(+a.slice(8)); return u ? u.nombre : 'Una persona'; }
    return 'Toda la empresa';
  }
  function onboardingCompleto(u) { return progressOf(u.id, ONB[u.role] ? u.role : 'interno').pct === 100; }
  function enAudiencia(e, u) {
    if (!u.activo || u.role === 'candidato' || !perfilVisible(u)) return false;
    var a = e.audiencia || 'todos';
    if (a === 'todos') return true;
    if (a === 'nuevoIngreso') return onboardingCompleto(u);
    if (a.indexOf('area:') === 0) return (u.area || '') === a.slice(5);
    if (a.indexOf('rol:') === 0) return u.role === a.slice(4);
    if (a.indexOf('persona:') === 0) return u.id === +a.slice(8);
    return true;
  }
  function encCicloActual(e) {
    var m = (CADENCIAS[e.cadencia] || CADENCIAS.unica).meses;
    if (!m) return 0;
    var start = new Date(e.desde || e.fecha), now = new Date();
    var diff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(0, Math.floor(diff / m));
  }
  function encRespondio(e, uid) { var c = encCicloActual(e); return (e.respuestas || []).some(function (r) { return r.userId === uid && (r.ciclo || 0) === c; }); }
  function _diasDesde(iso) { if (!iso) return 0; var d = new Date(iso), now = new Date(); return Math.floor((now - d) / 86400000); }
  function encExpirada(e) { return e.vigenciaDias && e.vigenciaDias > 0 && _diasDesde(e.fechaCreacion || e.desde || e.fecha) > e.vigenciaDias; }
  function comExpirada(c) { return c.vigenciaDias && c.vigenciaDias > 0 && _diasDesde(c.fecha) > c.vigenciaDias; }
  function encActivasPara(uid) {
    var u = byId(uid); if (!u) return [];
    return (db.encuestas || []).filter(function (e) { return e.estado !== 'cerrada' && enAudiencia(e, u) && !encExpirada(e); });
  }
  function encPendientes(uid) { return encActivasPara(uid).filter(function (e) { return !encRespondio(e, uid); }); }
  function pendMisActivos() { return db.pendientes.filter(function (p) { return p.userId === me.id && p.estado !== 'resuelto'; }); }
  function miEquipoIds() { return subtree(me.id).map(function (u) { return u.id; }); }
  function pendGestiono() {
    if (me.role === 'rrhh' || me.role === 'admin') return db.pendientes.filter(function (p) { return p.estado !== 'resuelto'; });
    if (me.role === 'gerente') { var ids = miEquipoIds(); return db.pendientes.filter(function (p) { return p.estado !== 'resuelto' && ids.indexOf(p.userId) > -1; }); }
    return [];
  }
  function pendientesParaMi() {
    if (!me) return 0;
    return (db.rrhhReqs || []).filter(puedoActuar).length + pendAbiertos(me.id).length;
  }
  function pendMisBadge() { return me ? (pendAbiertos(me.id).length + comNoLeidas().length + encPendientes(me.id).length + (db.equipReqs || []).filter(function (r) { return r.estado === 'pendiente' && r.asignadoA === me.id; }).length) : 0; }
  function pendEquipoBadge() {
    if (!me) return 0;
    var reqs = (db.rrhhReqs || []).filter(puedoActuar).length;
    var pend = (me.role === 'rrhh' || me.role === 'admin') ? db.pendientes.filter(function (p) { return p.estado === 'atendido'; }).length : 0;
    var eq = (db.equipReqs || []).filter(function (r) { return r.estado === 'pendiente' && (me.role === 'admin' || r.asignadoA === me.id || r.mgrId === me.id); }).length;
    return reqs + pend + eq;
  }
  function reRenderSol() { if (current === 'solequipo') rSolEquipo(); else if (current === 'pendientes') rPendientes(); else rSolicitudes(); }
  var reqFilter = 'todas', segDept = 'todos';
  function reqSeguimiento() {
    if (me.role === 'admin' || me.role === 'rrhh') return db.rrhhReqs.filter(function (r) { return r.userId !== me.id; });
    if (me.role === 'gerente') { var ids = subtree(me.id).map(function (u) { return u.id; }); return db.rrhhReqs.filter(function (r) { return ids.indexOf(r.userId) > -1 && r.userId !== me.id; }); }
    return [];
  }
  function reqMatchFilter(r) {
    if (reqFilter === 'pendientes') return r.estado === 'abierta';
    if (reqFilter === 'aprobadas') return r.estado === 'aprobada';
    if (reqFilter === 'rechazadas') return r.estado === 'rechazada';
    return true;
  }

  var solTab = 'mis', solDept = 'tecnologia';
  function rSolicitudes() {
    resetContent();
    var mias = db.rrhhReqs.filter(function (r) { return r.userId === me.id; }).sort(function (a, b) { return b.id - a.id; });

    var html =
      '<div class="toolrow" style="margin-bottom:18px">' +
        '<div style="display:inline-flex;background:#EEF2F8;border-radius:12px;padding:4px;gap:2px">' +
          '<button data-soltab="mis" style="border:none;cursor:pointer;font-weight:700;font-size:13.5px;padding:9px 16px;border-radius:9px;' + (solTab === 'mis' ? 'background:#fff;color:var(--navy);box-shadow:0 1px 3px rgba(2,12,38,.12)' : 'background:transparent;color:var(--muted)') + '">Mis solicitudes</button>' +
          '<button data-soltab="crear" style="border:none;cursor:pointer;font-weight:700;font-size:13.5px;padding:9px 16px;border-radius:9px;' + (solTab === 'crear' ? 'background:#fff;color:var(--navy);box-shadow:0 1px 3px rgba(2,12,38,.12)' : 'background:transparent;color:var(--muted)') + '">Crear ticket</button>' +
        '</div>' +
        '<span class="sp"></span>' +
        '<button class="btn-g" id="btnQuickReq"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Crear ticket</button>' +
      '</div>';

    html += (solTab === 'crear') ? solCrearView() : solMisView(mias);

    $('#content').innerHTML = html;
    $('#content').addEventListener('click', function (e) {
      var tb = e.target.closest('[data-soltab]');
      if (tb) { solTab = tb.getAttribute('data-soltab'); rSolicitudes(); return; }
      if (e.target.closest('#btnQuickReq')) { openReqModal(); return; }
      var ff = e.target.closest('[data-reqfilter]');
      if (ff) { reqFilter = ff.getAttribute('data-reqfilter'); rSolicitudes(); return; }
      var dc = e.target.closest('[data-soldept]');
      if (dc) { solDept = dc.getAttribute('data-soldept'); rSolicitudes(); return; }
      var cd = e.target.closest('[data-cfgdept]');
      if (cd) { openConfigModal('flujo', null, cd.getAttribute('data-cfgdept')); return; }
      var tt = e.target.closest('[data-tipo]');
      if (tt) { openReqModal(tt.getAttribute('data-tipo')); return; }
      var rv = e.target.closest('[data-reqview]'); if (!rv) rv = e.target.closest('[data-req]');
      if (rv) { var r = db.rrhhReqs.find(function (x) { return x.id === +(rv.getAttribute('data-reqview') || rv.getAttribute('data-req')); }); if (r) reqView(r); }
    });
    var si = $('#solSearch');
    if (si) si.addEventListener('input', function () {
      var q = si.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      var hay = 0;
      $$('#solTipos [data-tipo]').forEach(function (b) {
        var m = b.getAttribute('data-search').indexOf(q) > -1;
        b.style.display = m ? '' : 'none'; if (m) hay++;
      });
      $$('#solTipos [data-catgroup]').forEach(function (g) {
        var vis = g.querySelectorAll('[data-tipo]:not([style*="display: none"])').length;
        g.style.display = vis ? '' : 'none';
      });
      var ne = $('#solNoRes'); if (ne) ne.style.display = hay ? 'none' : '';
    });
  }

  function solMisView(mias) {
    var v = vacInfo(me);
    function stat(n, l, col) { return '<div style="flex:1;min-width:96px"><div style="font-size:26px;font-weight:800;color:' + (col || 'var(--navy)') + ';letter-spacing:-.5px;line-height:1">' + n + '</div><div style="font-size:12.5px;color:var(--muted);font-weight:600;margin-top:3px">' + l + '</div></div>'; }
    var html = '<div class="card" style="margin-bottom:16px">' +
      '<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">' +
        '<div style="flex:0 0 auto;min-width:180px">' +
          '<div style="font-size:11.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#00874f;margin-bottom:6px">Vacaciones</div>' +
          '<div style="display:flex;align-items:baseline;gap:8px"><div style="font-size:44px;font-weight:800;color:var(--navy);letter-spacing:-1px;line-height:1">' + v.disponibles + '</div><div style="font-size:14px;color:var(--muted);font-weight:600">días disponibles</div></div>' +
        '</div>' +
        '<div style="flex:1;min-width:240px;display:flex;gap:8px;flex-wrap:wrap;border-left:1px solid var(--line);padding-left:16px">' +
          stat(v.asignados, 'Asignados / período') + stat(v.tomados, 'Tomados', '#00874f') + stat(v.enTramite, 'En trámite', '#9A6B00') +
        '</div>' +
      '</div></div>';

    var FILTROS = [['todas', 'Todas'], ['pendientes', 'En proceso'], ['aprobadas', 'Aprobadas'], ['rechazadas', 'Rechazadas']];
    var lista = mias.filter(reqMatchFilter);
    html += '<div class="card"><h3>Mis solicitudes <span class="chip n">' + mias.length + '</span></h3>' +
      '<div class="doccat" style="margin:-2px 0 12px">' + FILTROS.map(function (f) { return '<button data-reqfilter="' + f[0] + '" class="' + (reqFilter === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      (lista.length ? lista.map(function (r) { return reqRow(r, false); }).join('') : '<div class="empty">' + (mias.length ? 'No hay tickets con este filtro.' : 'Aún no has creado tickets. Usa “Crear ticket” para empezar.') + '</div>') +
    '</div>';
    return html;
  }

  function solCrearView() {
    var d = reqDepto(solDept);
    var html = '<div class="note" style="margin:0 0 14px">Elige el departamento, luego el tipo de solicitud. Verás el flujo de aprobación antes de enviar.</div>';
    // Selector de departamento
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px">' +
      TIC.DEPTS.map(function (dp) {
        var on = dp.id === solDept, n = 0; dp.cats.forEach(function (c) { n += c.tipos.length; });
        return '<button data-soldept="' + dp.id + '" style="text-align:left;cursor:pointer;border:1.5px solid ' + (on ? dp.color : 'var(--line)') + ';background:' + (on ? dp.bg : '#fff') + ';border-radius:14px;padding:13px 14px;transition:.15s">' +
          '<span style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:' + dp.bg + ';color:' + dp.color + ';margin-bottom:9px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + dp.ico + '</svg></span>' +
          '<div style="font-weight:800;color:var(--navy);font-size:14px;line-height:1.2">' + esc(dp.nombre) + '</div>' +
          '<div style="font-size:12px;color:var(--muted);margin-top:2px">' + n + ' tipos</div>' +
        '</button>';
      }).join('') +
    '</div>';

    // Encabezado del dpto + buscador
    html += '<div class="card">' +
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:4px">' +
        '<span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:11px;background:' + d.bg + ';color:' + d.color + ';flex:0 0 auto"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d.ico + '</svg></span>' +
        '<div style="flex:1;min-width:180px"><div style="font-weight:800;color:var(--navy);font-size:17px">' + esc(d.nombre) + '</div><div class="note" style="margin:0">' + esc(d.desc) + '</div></div>' +
        (adminReq() ? '<button class="btn-s" data-cfgdept="' + d.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>Configurar aprobaciones</button>' : '') +
      '</div>' +
      '<div style="position:relative;margin:14px 0 6px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" style="position:absolute;left:13px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>' +
        '<input id="solSearch" type="text" placeholder="Buscar tipo de solicitud en ' + esc(d.nombre) + '…" style="width:100%;box-sizing:border-box;padding:11px 14px 11px 38px;border:1.5px solid var(--line);border-radius:11px;font-size:14px;font-family:inherit"></div>' +
      '<div id="solTipos" style="margin-top:8px">' +
        d.cats.map(function (c) {
          return '<div data-catgroup style="margin-top:14px">' +
            '<div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:' + d.color + ';margin-bottom:8px">' + esc(c.nombre) + '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px">' +
            c.tipos.map(function (t) {
              var search = (t.nombre + ' ' + c.nombre).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              return '<button data-tipo="' + t.id + '" data-search="' + esc(search) + '" style="display:flex;align-items:center;gap:9px;text-align:left;cursor:pointer;border:1px solid var(--line);background:#fff;border-radius:11px;padding:11px 12px;font-size:13.5px;color:var(--navy);font-weight:600;transition:.12s">' +
                '<span style="width:7px;height:7px;border-radius:50%;background:' + d.color + ';flex:0 0 auto"></span>' +
                '<span style="flex:1;min-width:0;line-height:1.3">' + esc(t.nombre) + '</span>' +
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto"><path d="M9 18l6-6-6-6"></path></svg>' +
              '</button>';
            }).join('') +
            '</div></div>';
        }).join('') +
        '<div id="solNoRes" class="empty" style="display:none">Sin resultados para tu búsqueda.</div>' +
      '</div>' +
    '</div>';
    return html;
  }

  function adminReq() { return me.role === 'admin' || me.role === 'rrhh'; }

  function rPendientes() {
    resetContent();
    var abiertos = db.pendientes.filter(function (p) { return p.userId === me.id && p.estado === 'abierto'; }).sort(function (a, b) { return b.id - a.id; });
    var enRevision = db.pendientes.filter(function (p) { return p.userId === me.id && p.estado === 'atendido'; }).sort(function (a, b) { return b.id - a.id; });
    var resueltos = db.pendientes.filter(function (p) { return p.userId === me.id && p.estado === 'resuelto'; }).sort(function (a, b) { return b.id - a.id; });

    var html =
      '<div class="toolrow" style="margin-bottom:16px">' +
        '<div style="font-size:14px;color:var(--muted);max-width:640px;line-height:1.55">Tus <b>pendientes</b> con Capital Humano y las <b>comunicaciones internas</b> del equipo. Marca cada una como leída para que deje de notificarte.</div>' +
      '</div>';

    html += '<div class="card" style="margin-bottom:16px' + (abiertos.length ? ';border-color:#F3D48A;background:linear-gradient(180deg,#FFFBF0,#fff)' : '') + '">' +
      '<h3 style="display:flex;align-items:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C77700" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path></svg>Por atender' + (abiertos.length ? ' <span class="chip y">' + abiertos.length + '</span>' : '') + '</h3>' +
      (abiertos.length ? abiertos.map(function (p) { return pendRow(p, false); }).join('') : '<div class="empty">No tienes pendientes por atender. ¡Todo al día! 🎉</div>') +
    '</div>';

    // --- Requerimientos de equipamiento asignados a mí (Sistemas) ---
    var misEquip = (db.equipReqs || []).filter(function (r) { return r.estado === 'pendiente' && r.asignadoA === me.id; });
    if (misEquip.length) {
      var byE = {}; misEquip.forEach(function (r) { (byE[r.empId] = byE[r.empId] || []).push(r); });
      html += '<div class="card" style="margin-bottom:16px;border-left:4px solid #2A6FDB">' +
        '<h3 style="display:flex;align-items:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A6FDB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>Equipamiento de nuevos ingresos <span class="chip y">' + misEquip.length + '</span></h3>' +
        '<div class="note" style="margin:-4px 0 10px">Capital Humano solicitó estos equipos/accesos para nuevos ingresos. Prepáralos y márcalos como entregados.</div>' +
        Object.keys(byE).map(function (eid) { var arr = byE[eid], u = byId(+eid); return '<div style="padding:9px 0;border-bottom:1px solid #EEF3F9"><div style="font-weight:700;color:var(--navy);margin-bottom:5px">' + esc(u ? u.nombre : arr[0].empNombre) + '</div>' + arr.map(function (r) { return '<div style="display:flex;align-items:center;gap:10px;padding:4px 0"><div style="flex:1;min-width:0;font-size:13.5px;color:var(--navy)">' + esc(r.texto) + '</div>' + (r.disponible ? '<span class="chip g">En inventario</span>' : '<span class="chip y">Por adquirir</span>') + '<button class="btn-s" data-eqdone="' + r.id + '" style="font-size:12px;padding:6px 11px">Marcar entregado</button></div>'; }).join('') + '</div>'; }).join('') +
      '</div>';
    }

    if (enRevision.length) {
      html += '<div class="card" style="margin-bottom:16px">' +
        '<h3 style="display:flex;align-items:center;gap:8px">En revisión de Capital Humano <span class="chip b">' + enRevision.length + '</span></h3>' +
        '<div class="note" style="margin:-4px 0 10px">Ya respondiste; Capital Humano lo está revisando.</div>' +
        enRevision.map(function (p) { return pendRow(p, false); }).join('') +
      '</div>';
    }

    if (resueltos.length) {
      html += '<div class="card" style="margin-bottom:16px"><h3>Resueltos</h3>' +
        resueltos.map(function (p) { return pendRow(p, false); }).join('') +
      '</div>';
    }

    // --- Encuestas pendientes ---
    var misEnc = encPendientes(me.id).sort(function (a, b) { return b.id - a.id; });
    if (misEnc.length) {
      html += '<div class="card" style="margin-bottom:16px;border-color:#B9D3F5;background:linear-gradient(180deg,#F2F8FF,#fff)">' +
        '<h3 style="display:flex;align-items:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A6FDB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>Encuestas por responder <span class="chip b">' + misEnc.length + '</span></h3>' +
        '<div class="note" style="margin:-4px 0 10px">Tu opinión cuenta. Responde estas encuestas del equipo.</div>' +
        misEnc.map(function (e) {
          return '<div class="docrow" data-encr="' + e.id + '" style="cursor:pointer"><div class="docic" style="background:#EAF1FD;color:#2A6FDB"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></div><div style="flex:1;min-width:0"><div class="dn">' + esc(e.titulo) + '</div><div class="dm">' + (e.preguntas || []).length + ' preguntas · ' + esc(e.por) + '</div></div><span class="sp"></span><button class="btn-g" data-encr="' + e.id + '" style="padding:8px 14px">Responder</button></div>';
        }).join('') +
      '</div>';
    }

    // --- Comunicaciones internas ---
    var coms = (db.comunicaciones || []).filter(function (c) { return !comExpirada(c) && canSeeCom(c); }).sort(function (a, b) { return (a.fecha < b.fecha ? 1 : -1) || (b.id - a.id); });
    var noLeidas = comNoLeidas().length;
    html += '<div class="card">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">' +
        '<h3 style="margin:0;display:flex;align-items:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A6FDB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>Comunicaciones internas' + (noLeidas ? ' <span class="chip y">' + noLeidas + ' nuevas</span>' : '') + '</h3>' +
      '</div>' +
      '<div class="note" style="margin:4px 0 10px">Anuncios y novedades publicados por Capital Humano.</div>' +
      (coms.length ? coms.map(comRow).join('') : '<div class="empty">Aún no hay comunicaciones.</div>') +
    '</div>';

    $('#content').innerHTML = html;
    $('#content').addEventListener('click', function (e) {
      var er = e.target.closest('[data-encr]');
      if (er) { var en = db.encuestas.find(function (x) { return x.id === +er.getAttribute('data-encr'); }); if (en) encResponder(en); return; }
      var eqd = e.target.closest('[data-eqdone]');
      if (eqd) { var rq = db.equipReqs.find(function (x) { return x.id === +eqd.getAttribute('data-eqdone'); }); if (rq) { rq.estado = 'entregado'; rq.entregadoEl = nowStamp(); rq.entregadoPor = me.nombre; var uu = byId(rq.empId); if (uu) { logHist(uu, 'Equipamiento entregado por Sistemas: ' + rq.texto, me.nombre); (uu.requerimientos || []).forEach(function (r2) { if (r2.texto === rq.texto) r2.entregado = true; }); } logHist(me, 'Entregó equipamiento a ' + (uu ? uu.nombre : rq.empNombre) + ': ' + rq.texto); saveDB(db); refreshNav(); rPendientes(); toast('Requerimiento entregado.'); } return; }
      var chk = e.target.closest('[data-comcheck]');
      if (chk) { e.stopPropagation(); comMarcar(+chk.getAttribute('data-comcheck')); return; }
      var cm = e.target.closest('[data-com]');
      if (cm) { var c = db.comunicaciones.find(function (x) { return x.id === +cm.getAttribute('data-com'); }); if (c) comView(c); return; }
      var pv = e.target.closest('[data-pend]');
      if (pv) { var p = db.pendientes.find(function (x) { return x.id === +pv.getAttribute('data-pend'); }); if (p) pendView(p); }
    });
  }

  function comRow(c) {
    var unread = (c.leidoPor || []).indexOf(me.id) === -1;
    var preview = String(c.cuerpo || '').replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').slice(0, 90);
    return '<div class="docrow" data-com="' + c.id + '" style="cursor:pointer' + (unread ? ';border-color:#F3D48A;background:linear-gradient(180deg,#FFFBF0,#fff)' : '') + '">' +
      '<div class="docic" style="background:#EAF1FD;color:#2A6FDB"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg></div>' +
      '<div style="min-width:0;flex:1"><div class="dn">' + esc(c.titulo) + (unread ? ' <span class="chip y">Nueva</span>' : '') + (c.adjuntoNombre ? ' <span class="chip n">adjunto</span>' : '') + '</div>' +
        '<div class="dm">' + esc(c.por) + ' · ' + fechaCorta(c.fecha) + ' · ' + esc(preview) + '…</div></div>' +
      '<span class="sp"></span>' +
      (unread ? '<button class="btn-g" data-comcheck="' + c.id + '" style="padding:8px 12px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M20 6L9 17l-5-5"></path></svg>Marcar leída</button>' : '<span class="chip g">Leída</span>') +
    '</div>';
  }

  function comMarcar(id) {
    var c = db.comunicaciones.find(function (x) { return x.id === id; });
    if (!c) return;
    c.leidoPor = c.leidoPor || [];
    if (c.leidoPor.indexOf(me.id) === -1) c.leidoPor.push(me.id);
    saveDB(db); closeModal(); refreshNav(); go(current); toast('Comunicación marcada como leída.');
  }

  function comView(c) {
    var esRH = me.role === 'rrhh' || me.role === 'admin';
    var unread = (c.leidoPor || []).indexOf(me.id) === -1;
    var cuerpo = String(c.cuerpo || '').split(/\n\n+/).map(function (p) { return '<p style="margin:0 0 12px;font-size:14.5px;color:#33415C;line-height:1.7">' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
    modal('<button class="mod-x">✕</button>' +
      '<div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#2A6FDB;margin-bottom:4px">Comunicación interna</div>' +
      '<h3 style="margin:0 0 4px">' + esc(c.titulo) + '</h3>' +
      '<div class="note" style="margin:0 0 14px">' + esc(c.por) + ' · ' + fechaCorta(c.fecha) + '</div>' +
      cuerpo +
      (c.adjuntoNombre ? '<div style="margin-top:6px;padding:11px 13px;border:1px solid var(--line);border-radius:11px;display:flex;align-items:center;gap:10px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49"></path></svg><a href="#" data-comdl="' + c.id + '" style="flex:1;font-weight:600">' + esc(c.adjuntoNombre) + '</a></div>' : '') +
      '<div class="mod-actions">' + (esRH ? '<button class="btn-s btn-danger" id="comDel">Eliminar</button>' : '') + (unread ? '<button class="btn-g" id="comOk">Marcar como leída</button>' : '<button class="btn-g mod-x">Cerrar</button>') + '</div>');
    var dl = document.querySelector('#modalHost [data-comdl]');
    if (dl) dl.addEventListener('click', function (e) { e.preventDefault(); if (!c.adjunto) { toast('El adjunto no está disponible.'); return; } var a = document.createElement('a'); a.href = c.adjunto; a.download = c.adjuntoNombre || 'adjunto'; document.body.appendChild(a); a.click(); a.remove(); });
    var ok = $('#comOk'); if (ok) ok.addEventListener('click', function () { comMarcar(c.id); });
    var del = $('#comDel'); if (del) del.addEventListener('click', function () { db.comunicaciones = db.comunicaciones.filter(function (x) { return x.id !== c.id; }); saveDB(db); closeModal(); refreshNav(); go(current); toast('Comunicación eliminada.'); });
  }

  function openComModal() {
    var attach = { nombre: null, data: null };
    modal('<button class="mod-x">✕</button><h3>Nueva comunicación interna</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:4px 0 10px">Publica un anuncio para todo el equipo. Aparecerá como notificación hasta que cada persona la marque como leída.</p>' +
      '<div class="fld"><label>Título</label><input id="coT" type="text" placeholder="Ej: Nuevo horario de la sede"></div>' +
      '<div class="fld"><label>Contenido</label><textarea id="coB" placeholder="Escribe el anuncio. Deja una línea en blanco para separar párrafos." style="min-height:150px"></textarea></div>' +
      '<div class="fld"><label>Adjunto (opcional)</label><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><button type="button" class="btn-s" id="coAdjBtn">Adjuntar archivo</button><span id="coAdjName" style="font-size:13px;color:var(--muted)">Ningún archivo</span></div></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="coOk">Publicar</button></div>');
    $('#coAdjBtn').addEventListener('click', function () { var inp = document.createElement('input'); inp.type = 'file'; inp.onchange = function () { var f = inp.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { attach.nombre = f.name; attach.data = rd.result; $('#coAdjName').textContent = f.name; }; rd.readAsDataURL(f); }; inp.click(); });
    $('#coOk').addEventListener('click', function () {
      var t = $('#coT').value.trim(), b = $('#coB').value.trim();
      if (t.length < 3) { toast('Escribe un título.'); return; }
      if (b.length < 10) { toast('Escribe el contenido de la comunicación.'); return; }
      db.comunicaciones.push({ id: db.nextComId++, titulo: t, cuerpo: b, por: me.nombre, fecha: reqToday(), adjuntoNombre: attach.nombre, adjunto: attach.data, leidoPor: [me.id] });
      saveDB(db); closeModal(); refreshNav(); rPendientes(); toast('Comunicación publicada.');
    });
  }

  var solHistVista = false, histFiltro = 'todo', histPersona = '';
  function rHistEquipo() {
    var esRH = me.role === 'rrhh' || me.role === 'admin';
    var hstamp = function (iso) { var d = new Date(iso); if (isNaN(d)) return ''; var p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
    db.atendidoEquipo = db.atendidoEquipo || {};
    var histAt = Object.keys(db.atendidoEquipo).filter(function (kk) { return kk.indexOf(me.id + ':') === 0 && db.atendidoEquipo[kk] && typeof db.atendidoEquipo[kk] === 'object'; })
      .map(function (kk) { return db.atendidoEquipo[kk]; }).filter(function (m) { return m.el; })
      .sort(function (a, b) { return a.el < b.el ? 1 : -1; });
    var sols = reqSeguimiento().sort(function (a, b) { return b.id - a.id; });
    if (histPersona) {
      histAt = histAt.filter(function (m) { return String(m.uid) === histPersona; });
      sols = sols.filter(function (r) { return String(r.userId) === histPersona; });
    }
    var pid = parseInt(histPersona, 10);
    var personas = subtree(me.id).filter(function (u) { return u.id !== me.id && u.role !== 'candidato'; }).sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre)); });
    var showNotif = histFiltro === 'todo' || histFiltro === 'notif';
    var showSol = histFiltro === 'todo' || histFiltro === 'sol';

    var hero =
      '<div class="pf-hero" style="margin-bottom:16px">' +
        '<div class="pf-avawrap"><span style="width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;color:#fff"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span></div>' +
        '<div class="pf-id"><div style="font-size:11.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#00E58C;margin-bottom:6px">Historial del equipo</div>' +
          '<div class="pf-name" style="font-size:24px">Historial de notificaciones y solicitudes</div>' +
          '<div class="pf-role">Todo lo atendido y todas las solicitudes de tu equipo, con su fecha.</div></div>' +
        '<div style="position:relative;z-index:2"><button data-histback="1" style="display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);color:#fff;font-weight:700;font-size:13px;font-family:inherit;padding:9px 14px;border-radius:11px;cursor:pointer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>Volver</button></div>' +
      '</div>';

    var FILT = [['todo', 'Todo'], ['notif', 'Notificaciones'], ['sol', 'Solicitudes']];
    var filtro = '<div class="toolrow" style="margin-bottom:16px">' +
      '<div class="doccat" style="margin:0">' + FILT.map(function (f) { return '<button data-histfilt="' + f[0] + '" class="' + (histFiltro === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      '<span class="sp"></span>' +
      '<select id="histPersona" style="padding:9px 11px;border:1.5px solid var(--line);border-radius:10px;font-size:13px;font-family:inherit;color:var(--navy)"><option value="">Toda la gente</option>' + personas.map(function (u) { return '<option value="' + u.id + '"' + (pid === u.id ? ' selected' : '') + '>' + esc(u.nombre) + '</option>'; }).join('') + '</select>' +
    '</div>';

    var cardNotif = !showNotif ? '' : '<div class="card" style="margin-bottom:16px">' +
      '<h3 style="display:flex;align-items:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00874f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path></svg>Notificaciones atendidas' + (histAt.length ? ' <span class="chip g">' + histAt.length + '</span>' : '') + '</h3>' +
      '<div class="note" style="margin:-4px 0 10px">Ausencias, tardanzas, contratos y pendientes que revisaste, con fecha y hora.</div>' +
      (histAt.length ? '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Fecha</th><th>Notificación</th><th>Persona</th><th>Atendida por</th></tr></thead><tbody>' +
        histAt.map(function (m) {
          return '<tr><td style="white-space:nowrap;font-weight:700;color:var(--navy)">' + hstamp(m.el) + '</td><td style="color:#33415C">' + esc(m.texto || 'Notificación') + '</td><td style="white-space:nowrap;color:var(--muted)">' + (m.uid ? '<span data-verperfil="' + m.uid + '" style="cursor:pointer;color:#2A6FDB;font-weight:600">' + esc(m.persona || '') + '</span>' : esc(m.persona || '—')) + '</td><td style="white-space:nowrap;color:var(--muted)">' + esc(m.por || '') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="empty">Sin notificaciones atendidas para este filtro.</div>') +
    '</div>';

    var cardSol = !showSol ? '' : '<div class="card" style="margin-bottom:16px">' +
      '<h3 style="display:flex;align-items:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A6FDB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"></path><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"></path></svg>' + (me.role === 'gerente' ? 'Solicitudes de mi equipo' : 'Solicitudes del equipo') + (sols.length ? ' <span class="chip n">' + sols.length + '</span>' : '') + '</h3>' +
      '<div class="note" style="margin:-4px 0 10px">Historial completo de solicitudes de tu equipo, en cualquier etapa, con su fecha.</div>' +
      (sols.length ? sols.map(function (r) { return reqRow(r, true); }).join('') : '<div class="empty">Sin solicitudes para este filtro.</div>') +
    '</div>';

    $('#content').innerHTML = hero + filtro + cardNotif + cardSol;
    var bk = $('#content [data-histback]'); if (bk) bk.addEventListener('click', function () { solHistVista = false; rSolEquipo(); window.scrollTo(0, 0); });
    $$('#content [data-histfilt]').forEach(function (b) { b.addEventListener('click', function () { histFiltro = b.getAttribute('data-histfilt'); rHistEquipo(); }); });
    var hp = $('#histPersona'); if (hp) hp.addEventListener('change', function () { histPersona = hp.value; rHistEquipo(); });
    $('#content').addEventListener('click', function (e) {
      var vp = e.target.closest('[data-verperfil]');
      if (vp) { var uu = byId(+vp.getAttribute('data-verperfil')); if (uu) { perfilTarget = uu; perfilTab = 'resumen'; go('perfil'); } return; }
      var rv = e.target.closest('[data-reqview],[data-req]');
      if (rv) { var rid = +(rv.getAttribute('data-reqview') || rv.getAttribute('data-req')); var rr = db.rrhhReqs.find(function (x) { return x.id === rid; }); if (rr) reqView(rr); }
    });
  }

  function rSolEquipo() {
    resetContent();
    if (solHistVista) { rHistEquipo(); return; }
    var esRH = me.role === 'rrhh' || me.role === 'admin';
    var porAprobar = db.rrhhReqs.filter(puedoActuar).sort(function (a, b) { return a.id - b.id; });
    var gestiono = pendGestiono();

    var html =
      '<div class="toolrow" style="margin-bottom:16px">' +
        '<div style="font-size:14px;color:var(--muted);max-width:640px;line-height:1.55">' + (esRH ? 'Revisa y gestiona las solicitudes de <b>toda la empresa</b> y las alertas asignadas al equipo.' : 'Revisa y aprueba las solicitudes de <b>tu equipo</b> de trabajo.') + '</div>' +
        '<span class="sp"></span>' +
        (esRH ? '<button class="btn-s" id="btnCfgAprob"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>Configurar aprobaciones</button>' : '') +
        ((esRH || me.role === 'gerente') ? '<button class="btn-g" id="btnNewPend"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v8M8 12h8"></path><circle cx="12" cy="12" r="9"></circle></svg>Asignar pendiente</button>' : '') +
      '</div>';

    // --- Requerimientos de equipamiento (Sistemas) ---
    (function () {
      var esAdmin = me.role === 'admin';
      var pend = (db.equipReqs || []).filter(function (r) { return r.estado === 'pendiente' && (esAdmin || r.asignadoA === me.id || r.mgrId === me.id); });
      if (!pend.length) return;
      var byEmp = {};
      pend.forEach(function (r) { (byEmp[r.empId] = byEmp[r.empId] || []).push(r); });
      var areaChip = { sistemas: '<span class="chip b" style="font-size:10px">Sistemas</span>', mercadeo: '<span class="chip" style="font-size:10px;background:#F1EAFB;color:#8A5CD1">Mercadeo</span>', administracion: '<span class="chip n" style="font-size:10px">Administración</span>' };
      var rows = Object.keys(byEmp).map(function (eid) {
        var arr = byEmp[eid], u = byId(+eid);
        return '<div style="padding:10px 0;border-bottom:1px solid #EEF3F9">' +
          '<div style="font-weight:700;color:var(--navy);margin-bottom:6px">' + esc(u ? u.nombre : (arr[0].empNombre || '—')) + ' <span style="font-weight:500;color:var(--muted2);font-size:12.5px">· equipamiento de ingreso</span></div>' +
          arr.map(function (r) {
            return '<div style="display:flex;align-items:center;gap:10px;padding:5px 0"><span style="width:24px;height:24px;border-radius:7px;background:#EAF1FD;color:#2A6FDB;display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg></span>' +
              '<div style="flex:1;min-width:0;font-size:13.5px;color:var(--navy)">' + esc(r.texto) + ' ' + (areaChip[r.area] || '') + '</div>' +
              (r.disponible ? '<span class="chip g">En inventario</span>' : '<span class="chip y">Por gestionar</span>') +
              '<button class="btn-s" data-eqdone="' + r.id + '" style="font-size:12px;padding:6px 11px">Marcar entregado</button></div>';
          }).join('') + '</div>';
      }).join('');
      html += '<div class="card" style="margin-bottom:16px;border-left:4px solid #2A6FDB">' +
        '<h3 style="display:flex;align-items:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A6FDB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>Requerimientos de equipamiento de nuevos ingresos <span class="chip y">' + pend.length + '</span></h3>' +
        '<div class="note" style="margin:-4px 0 10px">Equipos, uniformes, fotos y accesos que Capital Humano solicitó para nuevos ingresos y te fueron asignados. Entrégalos y márcalos como listos.</div>' +
        rows +
      '</div>';
    })();

    // --- Por atender: resumen del equipo (gerentes) ---
    if (me.role === 'gerente') {
      var hoyF = reqToday();
      var equipo = subtree(me.id).filter(function (u) { return u.id !== me.id && u.activo && u.role !== 'candidato'; });
      var asisHoy = {};
      db.asistencia.forEach(function (r) { if (r.fecha === hoyF && r.userId) asisHoy[r.userId] = r; });
      var tardes = [], ausentes = [];
      equipo.forEach(function (u) {
        if (enVacaciones(u.id, hoyF)) return;
        var r = asisHoy[u.id];
        var e = r ? asisEstado(r) : { ausente: true };
        if (e.ausente) { ausentes.push({ u: u, just: ausenciaJustificada(u.id, hoyF) }); }
        else if (e.tarde) { tardes.push({ u: u, hora: r.llego }); }
      });
      var contAlarmas = equipo.map(function (u) { var a = contratoAlarma(u); return a ? { u: u, a: a } : null; }).filter(Boolean).sort(function (a, b) { return a.a.dias - b.a.dias; });
      var pendEquipo = db.pendientes.filter(function (p) { return p.estado !== 'resuelto' && equipo.some(function (u) { return u.id === p.userId; }); });
      var total = tardes.length + ausentes.length + contAlarmas.length + pendEquipo.length;
      db.atendidoEquipo = db.atendidoEquipo || {};
      var atKey = function (sig) { return me.id + ':' + hoyF + ':' + sig; };
      var atVisto = function (sig) { return !!db.atendidoEquipo[atKey(sig)]; };
      var atMeta = function (sig) { var m = db.atendidoEquipo[atKey(sig)]; return (m && typeof m === 'object') ? m : (m ? { el: null, por: me.nombre } : null); };
      var MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      var fechaChip = function (f) { var d = new Date((f && f.length <= 10 ? f + 'T12:00:00' : f)); return isNaN(d) ? '' : (d.getDate() + ' ' + MES3[d.getMonth()]); };
      var atStamp = function (iso) { var d = new Date(iso); if (isNaN(d)) return ''; var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getDate() + ' ' + MES3[d.getMonth()] + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
      function atRow(color, bg, ico, titulo, sub, chip, uid, sig, fecha, ver) {
        var visto = atVisto(sig), meta = atMeta(sig);
        var estado = visto
          ? '<span style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><span class="chip g">✓ Atendida</span><span style="font-size:11px;color:var(--muted2)">' + (meta && meta.el ? atStamp(meta.el) + ' · ' : '') + esc((meta && meta.por) || me.nombre) + '</span></span>'
          : chip;
        return '<div class="docrow" style="' + (visto ? 'opacity:.62;' : '') + '">' +
          '<button class="atchk" data-atcheck="' + esc(sig) + '" data-atuid="' + (uid || '') + '" data-attexto="' + esc(titulo) + '" title="' + (visto ? 'Desmarcar' : 'Marcar como atendida') + '" style="flex:0 0 auto;width:26px;height:26px;border-radius:8px;border:2px solid ' + (visto ? '#00B871' : '#CDD7E4') + ';background:' + (visto ? '#00B871' : '#fff') + ';display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:all .15s">' + (visto ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>' : '') + '</button>' +
          '<div class="docic" style="background:' + bg + ';color:' + color + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></div>' +
          '<div style="min-width:0;flex:1"><div class="dn"' + (visto ? ' style="text-decoration:line-through"' : '') + '>' + titulo + '</div><div class="dm">' + sub + '</div></div>' +
          '<span style="flex:0 0 auto;font-size:12px;font-weight:700;color:var(--muted2);white-space:nowrap;min-width:52px;text-align:right">' + (fecha ? fechaChip(fecha) : '') + '</span>' +
          '<span class="sp"></span>' + estado +
          (ver ? '<button class="btn-s" data-vermas="' + esc(ver) + '" style="flex:0 0 auto;font-size:12.5px;padding:6px 12px">Ver más<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px"><path d="M9 18l6-6-6-6"></path></svg></button>' : '') +
          '</div>';
      }
      var items = [];
      ausentes.forEach(function (x) { items.push({ sig: 'aus' + x.u.id, html: atRow('#B23A6E', '#FBE9F0', '<path d="M18 6 6 18M6 6l12 12"></path>', esc(x.u.nombre) + ' está ausente hoy', esc(x.u.cargo || x.u.area || ''), x.just ? '<span class="chip" style="background:#EAF1FC;color:#2A6FDB">Justificada</span>' : '<span class="chip r">Sin justificativo</span>', x.u.id, 'aus' + x.u.id, hoyF, 'asis:' + x.u.id) }); });
      tardes.forEach(function (x) { items.push({ sig: 'tar' + x.u.id, html: atRow('#E07B1E', '#FDF1E3', '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>', esc(x.u.nombre) + ' llegó tarde', 'Entrada registrada ' + esc(x.hora || '') + ' · horario ' + horarioTxt(x.u), '<span class="chip y">Tardanza</span>', x.u.id, 'tar' + x.u.id, hoyF, 'asis:' + x.u.id) }); });
      contAlarmas.forEach(function (x) { items.push({ sig: 'cont' + x.u.id, html: atRow('#D9463E', '#FDEBEA', '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path>', 'Renovar contrato de ' + esc(x.u.nombre), CONTRATO_LABEL[x.u.contrato.etapa] + ' · vence ' + fechaCorta(x.u.contrato.fin), x.a.dias < 0 ? '<span class="chip r">Vencido ' + Math.abs(x.a.dias) + 'd</span>' : '<span class="chip y">' + x.a.dias + 'd</span>', x.u.id, 'cont' + x.u.id, x.u.contrato.fin, 'cont:' + x.u.id) }); });
      pendEquipo.forEach(function (p) { var pu = byId(p.userId); items.push({ sig: 'pend' + p.id, html: atRow('#8A5CD1', '#F1EAFB', '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>', esc(p.titulo || 'Pendiente') + (pu ? ' — ' + esc(pu.nombre) : ''), (PEND_TIPOS[p.tipo] ? PEND_TIPOS[p.tipo].t : 'Pendiente') + (p.estado === 'atendido' ? ' · respondido' : ''), p.estado === 'atendido' ? '<span class="chip g">Respondió</span>' : '<span class="chip n">Abierto</span>', p.userId || null, 'pend' + p.id, p.creadoEl || p.fecha, 'pend:' + p.id) }); });
      var pend = items.filter(function (i) { return !atVisto(i.sig); });
      var vistos = items.length - pend.length;
      var rows = pend.map(function (i) { return i.html; }).join('');
      html += '<div class="card" style="margin-bottom:16px' + (pend.length ? ';border-color:#F3D48A;background:linear-gradient(180deg,#FFFBF0,#fff)' : '') + '">' +
        '<div class="toolrow" style="margin:0 0 6px"><h3 style="margin:0;display:flex;align-items:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C77700" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path></svg>Por atender de mi equipo' + (pend.length ? ' <span class="chip y">' + pend.length + '</span>' : '') + '</h3><span class="sp"></span>' +
        '<button class="btn-s" data-histequipo="1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>Ver historial' + (vistos ? ' (' + vistos + ' hoy)' : '') + '</button></div>' +
        '<div class="note" style="margin:-2px 0 10px">Asistencia, contratos y pendientes de tu equipo. Al marcar cada una, queda registrada en tu historial y en el de la persona.</div>' +
        (pend.length ? rows : '<div class="empty">Todo atendido por hoy. ' + (vistos ? 'Las ' + vistos + ' revisadas quedaron en el historial. 🎉' : 'Tu equipo está al día. 🎉') + '</div>') +
      '</div>';
    }

    // --- Por aprobar ---
    html += '<div class="card" style="margin-bottom:16px">' +
      '<h3 style="display:flex;align-items:center;gap:8px">Por aprobar' + (porAprobar.length ? ' <span class="chip y">' + porAprobar.length + '</span>' : '') + '</h3>' +
      '<div class="note" style="margin:-4px 0 10px">Solicitudes que esperan tu decisión ahora mismo.</div>' +
      (porAprobar.length ? porAprobar.map(function (r) { return reqRow(r, true); }).join('') : '<div class="empty">No tienes solicitudes por aprobar. ¡Todo al día!</div>') +
    '</div>';

    // --- Seguimiento (RRHH: todas · gerente: su equipo) ---
    var seg = reqSeguimiento().filter(function (r) { return !puedoActuar(r); }).sort(function (a, b) { return b.id - a.id; });
    var segTitulo = (me.role === 'gerente') ? 'Solicitudes de mi equipo' : 'Todas las solicitudes';
    var segNota = (me.role === 'gerente') ? 'Historial y estado de las solicitudes de tu equipo, en cualquier etapa.' : 'Historial y estado de las solicitudes de la empresa, en cualquier etapa.';
    var FILTROS = [['todas', 'Todas'], ['pendientes', 'En proceso'], ['aprobadas', 'Aprobadas'], ['rechazadas', 'Rechazadas']];
    var DEPTF = [['todos', 'Todos los deptos.']].concat(TIC.DEPTS.map(function (dp) { return [dp.id, dp.nombre]; }));
    var segF = seg.filter(reqMatchFilter).filter(function (r) { return segDept === 'todos' || (reqTipo(r.tipo).depto || r.depto) === segDept; });
    html += '<div class="card" style="margin-bottom:16px">' +
      '<h3 style="display:flex;align-items:center;gap:8px">' + segTitulo + ' <span class="chip n">' + seg.length + '</span></h3>' +
      '<div class="note" style="margin:-4px 0 10px">' + segNota + '</div>' +
      '<div class="doccat" style="margin-bottom:8px">' + FILTROS.map(function (f) { return '<button data-reqfilter="' + f[0] + '" class="' + (reqFilter === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      '<div class="doccat" style="margin-bottom:12px">' + DEPTF.map(function (f) { return '<button data-segdept="' + f[0] + '" class="' + (segDept === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      (segF.length ? segF.map(function (r) { return reqRow(r, true); }).join('') : '<div class="empty">No hay solicitudes con este filtro.</div>') +
    '</div>';

    // --- Pendientes que gestiona (RRHH: toda la empresa · gerente: su equipo) ---
    if (esRH || me.role === 'gerente') {
      html += '<div class="card">' +
        '<h3 style="display:flex;align-items:center;gap:8px">Pendientes asignados' + (gestiono.length ? ' <span class="chip n">' + gestiono.length + '</span>' : '') + '</h3>' +
        '<div class="note" style="margin:-4px 0 10px">' + (esRH ? 'Alertas que asignaste al equipo (horario, planillas, gestiones). Marca como resuelto cuando el empleado responda.' : 'Pendientes que asignaste a tu equipo. Marca como resuelto cuando la persona responda.') + '</div>' +
        (gestiono.length ? gestiono.sort(function (a, b) { return (a.estado === 'atendido' ? -1 : 1) - (b.estado === 'atendido' ? -1 : 1); }).map(function (p) { return pendRow(p, true); }).join('') : '<div class="empty">No hay pendientes asignados. Usa “Asignar pendiente” para crear uno.</div>') +
      '</div>';
    }

    $('#content').innerHTML = html;
    var bp = $('#btnNewPend'); if (bp) bp.addEventListener('click', openPendModal);
    var bc = $('#btnCfgAprob'); if (bc) bc.addEventListener('click', function () { openConfigModal('resp'); });
    $$('#content [data-eqdone]').forEach(function (b) { b.addEventListener('click', function () {
      var r = db.equipReqs.find(function (x) { return x.id === +b.getAttribute('data-eqdone'); }); if (!r) return;
      r.estado = 'entregado'; r.entregadoEl = nowStamp(); r.entregadoPor = me.nombre;
      var u = byId(r.empId); if (u) { logHist(u, 'Equipamiento entregado por Sistemas: ' + r.texto, me.nombre); (u.requerimientos || []).forEach(function (rq) { if (rq.texto === r.texto) rq.entregado = true; }); }
      logHist(me, 'Entregó equipamiento a ' + (u ? u.nombre : r.empNombre) + ': ' + r.texto);
      saveDB(db); refreshNav(); rSolEquipo(); toast('Requerimiento marcado como entregado.');
    }); });
    $('#content').addEventListener('click', function (e) {
      var chk = e.target.closest('[data-atcheck]');
      if (chk) {
        e.stopPropagation();
        var hoyF2 = reqToday();
        var sig2 = chk.getAttribute('data-atcheck');
        var k = me.id + ':' + hoyF2 + ':' + sig2;
        var txt = chk.getAttribute('data-attexto') || 'notificación del equipo';
        var uid2 = parseInt(chk.getAttribute('data-atuid'), 10);
        var pers = uid2 ? byId(uid2) : null;
        db.atendidoEquipo = db.atendidoEquipo || {};
        if (db.atendidoEquipo[k]) {
          delete db.atendidoEquipo[k];
          toast('Marcada como pendiente de nuevo.');
        } else {
          db.atendidoEquipo[k] = { el: new Date().toISOString(), por: me.nombre, texto: txt, persona: pers ? pers.nombre : '', uid: uid2 || null, dia: hoyF2 };
          logHist(me, 'Atendió una notificación del equipo: ' + txt);
          if (pers) logHist(pers, 'Tu supervisor ' + me.nombre + ' revisó y atendió: ' + txt);
          toast('✓ Atendida y registrada en el historial' + (pers ? ' de ' + pers.nombre.split(' ')[0] : '') + '.');
        }
        saveDB(db); rSolEquipo();
        return;
      }
      var gh = e.target.closest('[data-histequipo]');
      if (gh) { solHistVista = true; rSolEquipo(); window.scrollTo(0, 0); return; }
      var vm = e.target.closest('[data-vermas]');
      if (vm) {
        e.stopPropagation();
        var parts = vm.getAttribute('data-vermas').split(':'), tipo = parts[0], vid = +parts[1];
        if (tipo === 'asis') { go('asistencia'); asisPersona = vid; rAsistencia(); window.scrollTo(0, 0); }
        else if (tipo === 'cont') { go('contratos'); }
        else if (tipo === 'pend') { var pp = db.pendientes.find(function (x) { return x.id === vid; }); if (pp) pendView(pp); }
        return;
      }
      var vp = e.target.closest('[data-verperfil]');
      if (vp) { var uu = byId(+vp.getAttribute('data-verperfil')); if (uu) { perfilTarget = uu; perfilTab = 'resumen'; go('perfil'); } return; }
      var ff = e.target.closest('[data-reqfilter]');
      if (ff) { reqFilter = ff.getAttribute('data-reqfilter'); rSolEquipo(); return; }
      var sd = e.target.closest('[data-segdept]');
      if (sd) { segDept = sd.getAttribute('data-segdept'); rSolEquipo(); return; }
      var pv = e.target.closest('[data-pend]');
      if (pv) { var p = db.pendientes.find(function (x) { return x.id === +pv.getAttribute('data-pend'); }); if (p) pendView(p); return; }
      var t = e.target.closest('[data-reqview]'); if (!t) t = e.target.closest('[data-req]');
      if (!t) return;
      var id = +(t.getAttribute('data-reqview') || t.getAttribute('data-req'));
      var r = db.rrhhReqs.find(function (x) { return x.id === id; });
      if (r) reqView(r);
    });
  }

  function reqRow(r, showWho) {
    var tp = reqTipo(r.tipo), d = reqDepto(tp.depto || r.depto), est = REQ_ESTADO[r.estado] || { t: r.estado, chip: 'n' }, u = byId(r.userId), pr = PRIOR[r.prioridad] || PRIOR.normal;
    var steps = flujoDe(r);
    var etapa = r.estado === 'abierta' ? ('Paso ' + ((r.paso || 0) + 1) + ' de ' + steps.length + ' · esperando ' + stepLabel(steps[r.paso || 0])) : (r.estado === 'aprobada' ? 'Concluido' : 'Rechazado');
    var meta = reqFolio(r) + ' · ' + (showWho ? esc(u ? u.nombre : '—') + ' · ' : '') + d.nombre + ' · ' + fechaCorta(r.fecha);
    return '<div class="docrow" data-req="' + r.id + '" style="cursor:pointer">' +
      '<div class="docic" style="background:' + d.bg + ';color:' + d.color + '">' + reqIco(d.ico) + '</div>' +
      '<div style="min-width:0;flex:1"><div class="dn">' + esc(r.titulo || tp.nombre) + (r.adjuntoNombre ? ' <span class="chip n">adjunto</span>' : '') + '</div>' +
        '<div class="dm">' + esc(tp.nombre) + ' · ' + meta + '</div>' +
        '<div style="font-size:12px;color:' + (r.estado === 'abierta' ? d.color : 'var(--muted2)') + ';font-weight:600;margin-top:2px">' + etapa + '</div></div>' +
      '<span class="sp"></span>' +
      '<span class="chip ' + pr.chip + '">' + pr.t + '</span>' +
      '<span class="chip ' + est.chip + '">' + est.t + '</span>' +
      '<button class="btn-s" data-reqview="' + r.id + '">' + (puedoActuar(r) ? 'Revisar' : 'Ver') + '</button>' +
    '</div>';
  }

  function reqFlujoTxt(tp) {
    return flujoDeTipo(tp.id).map(function (k) {
      var ap = k === 'supervisor' ? (me.managerId ? byId(me.managerId) : null) : ((db.aprobadores || {})[k] ? byId(db.aprobadores[k]) : null);
      return '<span style="white-space:nowrap">' + esc(stepLabel(k)) + (ap ? ' <span style="color:var(--muted);font-weight:500">(' + esc(ap.nombre.split(' ').slice(0, 2).join(' ')) + ')</span>' : '') + '</span>';
    }).join(' <span style="color:var(--muted2)">→</span> ');
  }

  function openReqModal(tipoId) {
    var fixed = !!tipoId;
    var deptId = fixed ? reqTipo(tipoId).depto : solDept;
    var tp = fixed ? reqTipo(tipoId) : (tiposDeDepto(deptId)[0] || reqTipo(''));
    var attach = { nombre: null, data: null }, prio = 'normal';

    function headHtml() {
      if (fixed) {
        var d = reqDepto(tp.depto);
        return '<div style="display:flex;align-items:center;gap:11px;margin-bottom:6px"><span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:11px;background:' + d.bg + ';color:' + d.color + ';flex:0 0 auto"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d.ico + '</svg></span>' +
          '<div style="min-width:0"><div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:' + d.color + '">' + esc(d.nombre) + ' · ' + esc(tp.cat || '') + '</div><h3 style="margin:0">' + esc(tp.nombre) + '</h3></div></div>';
      }
      return '<h3 style="margin:0 0 12px">Crear ticket</h3>' +
        '<div class="grid g2">' +
          '<div class="fld"><label>Departamento</label><select id="rqDept">' + TIC.DEPTS.map(function (dp) { return '<option value="' + dp.id + '"' + (dp.id === deptId ? ' selected' : '') + '>' + esc(dp.nombre) + '</option>'; }).join('') + '</select></div>' +
          '<div class="fld"><label>Tipo de solicitud</label><select id="rqTipoSel">' + tiposDeDepto(deptId).map(function (t) { return '<option value="' + t.id + '"' + (t.id === tp.id ? ' selected' : '') + '>' + esc(t.nombre) + '</option>'; }).join('') + '</select></div>' +
        '</div>';
    }

    modal('<button class="mod-x">✕</button>' + headHtml() +
      '<div class="fld"><label>Título</label><input id="rqTitulo" type="text" placeholder="Resume tu solicitud en pocas palabras"></div>' +
      '<div class="fld"><label>Prioridad</label><div class="doccat" id="rqPrioRow">' + ['normal', 'intermedia', 'urgente'].map(function (k) { return '<button type="button" data-prio="' + k + '" class="' + (k === 'normal' ? 'on' : '') + '">' + PRIOR[k].t + '</button>'; }).join('') + '</div></div>' +
      '<div id="rqRango"></div>' +
      '<div class="fld"><label>Descripción <span style="color:var(--muted2);font-weight:600">(mínimo 35 caracteres)</span></label><textarea id="rqDescr" placeholder="Describe con detalle qué necesitas, para qué y cualquier dato útil…" style="min-height:96px"></textarea><div id="rqCount" style="font-size:12px;color:var(--muted);margin-top:4px">0 / 35</div></div>' +
      '<div class="fld"><label>Adjunto (opcional)</label><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><button type="button" class="btn-s" id="rqAdjBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49"></path></svg>Adjuntar archivo</button><span id="rqAdjName" style="font-size:13px;color:var(--muted)">Ningún archivo</span></div></div>' +
      '<div id="rqFlujoBox"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="rqOk">Crear ticket</button></div>');

    function drawDyn() {
      $('#rqRango').innerHTML = tp.rango ? '<div class="grid g2"><div class="fld"><label>Desde</label><input id="rqDesde" type="date"></div><div class="fld"><label>Hasta</label><input id="rqHasta" type="date"></div></div>' : '';
      $('#rqFlujoBox').innerHTML = '<div style="background:#F6F9FD;border:1px solid var(--line);border-radius:11px;padding:11px 13px;margin-bottom:14px"><div style="font-size:10.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:5px">Responsable de aprobación' + (adminReq() ? ' · <a href="#" id="rqCfg" style="text-transform:none;letter-spacing:0;font-weight:700">Configurar</a>' : '') + '</div><div style="font-size:13px;color:var(--navy);font-weight:600;line-height:1.7">' + (tp.id ? reqFlujoTxt(tp) : '<span style="color:var(--muted)">Elige un tipo de solicitud</span>') + '</div></div>';
      var cfg = $('#rqCfg'); if (cfg) cfg.addEventListener('click', function (e) { e.preventDefault(); openConfigModal('flujo', tp.id); });
    }
    drawDyn();

    if (!fixed) {
      $('#rqDept').addEventListener('change', function () {
        deptId = this.value; var l = tiposDeDepto(deptId); tp = l[0] || reqTipo('');
        $('#rqTipoSel').innerHTML = l.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nombre) + '</option>'; }).join('');
        drawDyn();
      });
      $('#rqTipoSel').addEventListener('change', function () { tp = reqTipo(this.value); drawDyn(); });
    }

    $$('#rqPrioRow [data-prio]').forEach(function (b) { b.addEventListener('click', function () { prio = b.getAttribute('data-prio'); $$('#rqPrioRow [data-prio]').forEach(function (x) { x.classList.toggle('on', x === b); }); }); });
    var ta = $('#rqDescr');
    ta.addEventListener('input', function () { var n = ta.value.trim().length; var c = $('#rqCount'); c.textContent = n + ' / 35'; c.style.color = n >= 35 ? '#00874f' : 'var(--muted)'; });
    $('#rqAdjBtn').addEventListener('click', function () { var inp = document.createElement('input'); inp.type = 'file'; inp.onchange = function () { var f = inp.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { attach.nombre = f.name; attach.data = rd.result; $('#rqAdjName').textContent = f.name; }; rd.readAsDataURL(f); }; inp.click(); });
    $('#rqOk').addEventListener('click', function () {
      if (!tp.id) { toast('Elige un tipo de solicitud.'); return; }
      var titulo = $('#rqTitulo').value.trim();
      if (titulo.length < 3) { toast('Escribe un título para el ticket.'); return; }
      var descr = ta.value.trim();
      if (descr.length < 35) { toast('La descripción debe tener al menos 35 caracteres.'); ta.focus(); return; }
      var desde = null, hasta = null;
      if (tp.rango) { desde = $('#rqDesde').value; hasta = $('#rqHasta').value || desde; if (!desde) { toast('Indica la fecha de inicio.'); return; } if (hasta < desde) { toast('La fecha “Hasta” no puede ser anterior a “Desde”.'); return; } }
      var flujo = flujoDeTipo(tp.id).slice();
      var r = { id: db.nextRrhhReqId++, userId: me.id, depto: tp.depto, tipo: tp.id, tipoNombre: tp.nombre, titulo: titulo, prioridad: prio, descripcion: descr, desde: desde, hasta: hasta, adjuntoNombre: attach.nombre, adjunto: attach.data, flujo: flujo, paso: 0, fecha: reqToday(), estado: 'abierta', eventos: [{ accion: 'creada', por: me.nombre, rol: ROLE_LABEL[me.role], fecha: reqToday(), nota: '' }] };
      db.rrhhReqs.push(r);
      logHist(me, 'Creó la solicitud ' + reqFolio(r) + ' — ' + tp.nombre + ' (' + reqDepto(tp.depto).nombre + ', prioridad ' + PRIOR[prio].t + ')');
      saveDB(db); closeModal(); refreshNav();
      solTab = 'mis'; reqFilter = 'todas'; rSolicitudes();
      var ap = stepAprobador(r, flujo[0]);
      toast('Ticket ' + reqFolio(r) + ' creado. Enviado a ' + (ap ? ap.nombre.split(' ')[0] : stepLabel(flujo[0])) + '.');
    });
  }

  function reqView(r) {
    var tp = reqTipo(r.tipo), d = reqDepto(tp.depto || r.depto), est = REQ_ESTADO[r.estado] || { t: r.estado, chip: 'n' }, u = byId(r.userId), pr = PRIOR[r.prioridad] || PRIOR.normal;
    var steps = flujoDe(r);
    function prow(k, v) { return '<div class="prow"><span class="k" style="color:var(--muted);min-width:120px;font-weight:600">' + k + '</span><span style="flex:1;color:var(--navy)">' + v + '</span></div>'; }
    var rows = prow('Departamento', '<span class="chip" style="background:' + d.bg + ';color:' + d.color + '">' + esc(d.nombre) + '</span>') +
      prow('Tipo', esc(tp.nombre) + (tp.cat ? ' <span style="color:var(--muted)">· ' + esc(tp.cat) + '</span>' : '')) +
      prow('Prioridad', '<span class="chip ' + pr.chip + '">' + pr.t + '</span>') +
      prow('Solicitante', esc(u ? u.nombre : '—') + (u && u.cargo ? ' · ' + esc(u.cargo) : ''));
    if (tp.rango && r.desde) { var dd = reqDias(r.desde, r.hasta); rows += prow('Fechas', fechaCorta(r.desde) + (r.hasta && r.hasta !== r.desde ? ' al ' + fechaCorta(r.hasta) : '') + ' <span style="color:var(--muted)">(' + dd + (dd === 1 ? ' día' : ' días') + ')</span>'); }
    if (r.descripcion) rows += '<div class="prow" style="align-items:flex-start"><span class="k" style="color:var(--muted);min-width:120px;font-weight:600">Descripción</span><span style="flex:1;color:#33415C;line-height:1.6">' + esc(r.descripcion) + '</span></div>';
    if (r.adjuntoNombre) rows += prow('Adjunto', '<a href="#" data-reqdl="' + r.id + '">' + esc(r.adjuntoNombre) + '</a>');
    if (r.resDocNombre) rows += prow('Documento', '<a href="#" data-resdl="' + r.id + '">' + esc(r.resDocNombre) + '</a> <button class="btn-s" data-resbib="' + r.id + '" style="padding:5px 10px;font-size:12px;margin-left:6px">Ver en Biblioteca</button>');

    // Flujo (stepper)
    var pasoActual = r.paso || 0;
    var stepper = '<div class="chk-h" style="margin-top:16px">Flujo de aprobación</div>' +
      '<div style="display:flex;flex-direction:column;gap:0;margin-top:2px">' +
      steps.map(function (k, i) {
        var done = r.estado === 'aprobada' || i < pasoActual;
        var cur = r.estado === 'abierta' && i === pasoActual;
        var rej = r.estado === 'rechazada' && i === pasoActual;
        var col = done ? '#00CE7C' : (cur ? d.color : (rej ? '#D9463E' : '#CBD5E1'));
        var ap = stepAprobador(r, k);
        var icon = done ? '<path d="M20 6L9 17l-5-5"></path>' : (rej ? '<path d="M18 6 6 18M6 6l12 12"></path>' : '<circle cx="12" cy="12" r="3"></circle>');
        return '<div style="display:flex;gap:11px;align-items:flex-start">' +
          '<div style="display:flex;flex-direction:column;align-items:center;flex:0 0 auto">' +
            '<span style="width:26px;height:26px;border-radius:50%;background:' + (done || cur || rej ? col : '#EEF2F8') + ';color:' + (done || cur || rej ? '#fff' : '#94A3B8') + ';display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + icon + '</svg></span>' +
            (i < steps.length - 1 ? '<span style="width:2px;height:26px;background:' + (done ? '#00CE7C' : '#E3EAF3') + '"></span>' : '') +
          '</div>' +
          '<div style="padding-bottom:' + (i < steps.length - 1 ? '14px' : '0') + '"><div style="font-weight:700;color:var(--navy);font-size:14px">' + esc(stepLabel(k)) + '</div>' +
            '<div style="font-size:12.5px;color:var(--muted)">' + (ap ? esc(ap.nombre) : 'Sin asignar') + (cur ? ' · <b style="color:' + d.color + '">pendiente</b>' : (done ? ' · aprobado' : (rej ? ' · rechazó' : ''))) + '</div></div>' +
        '</div>';
      }).join('') + '</div>';

    var tl = '<div class="chk-h" style="margin-top:16px">Historial</div>' + r.eventos.map(function (e) {
      var isRej = e.accion === 'rechazada', col = isRej ? '#D9463E' : '#00CE7C';
      var lbl = e.accion === 'aprobado' ? ('Aprobado por ' + (e.paso || stepLabel('supervisor'))) : (EV_LABEL[e.accion] || e.accion);
      return '<div style="display:flex;gap:11px;padding:8px 0;border-bottom:1px solid #F2F6FB">' +
        '<span style="width:9px;height:9px;border-radius:50%;background:' + col + ';margin-top:6px;flex:0 0 auto;box-shadow:0 0 0 4px ' + (isRej ? 'rgba(217,70,62,.14)' : 'rgba(0,206,124,.14)') + '"></span>' +
        '<div style="flex:1"><div style="font-weight:700;color:var(--navy);font-size:14px">' + esc(lbl) + '</div>' +
        '<div style="font-size:12.5px;color:var(--muted)">' + esc(e.por) + ' · ' + esc(e.rol) + ' · ' + fechaCorta(e.fecha) + '</div>' +
        (e.nota ? '<div style="font-size:13.5px;color:#33415C;margin-top:3px;line-height:1.5">“' + esc(e.nota) + '”</div>' : '') + '</div></div>';
    }).join('');

    var actions, resDoc = { nombre: null, data: null };
    if (puedoActuar(r)) {
      var esFinal = pasoActual >= steps.length - 1;
      var nextLbl = esFinal ? '' : stepLabel(steps[pasoActual + 1]);
      var nextTxt = esFinal ? 'Al aprobar, el ticket quedará concluido.' : 'Al aprobar, pasará a: <b>' + esc(nextLbl) + '</b>.';
      var docFld = (esFinal && (tp.genera || true)) ? '<div class="fld"><label>Documento de respuesta ' + (tp.genera ? '(si no adjuntas uno, se genera automáticamente)' : '(opcional)') + '</label><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><button type="button" class="btn-s" id="rqDocBtn">Adjuntar documento</button><span id="rqDocName" style="font-size:13px;color:var(--muted)">Ningún archivo</span></div><div class="note" style="margin-top:4px">Quedará disponible para el solicitante en “Mis documentos”.</div></div>' : '';
      actions = '<div class="chk-h" style="margin-top:16px">Tu decisión</div><div class="note" style="margin-bottom:8px">' + nextTxt + '</div>' +
        '<div class="fld" style="margin-top:0"><textarea id="rqNota" placeholder="Comentario para el solicitante (opcional)"></textarea></div>' + docFld +
        '<div class="mod-actions"><button class="btn-s btn-danger" id="rqRej">Rechazar</button><button class="btn-g" id="rqApp">Aprobar</button></div>';
    } else {
      actions = '<div class="mod-actions"><button class="btn-g mod-x">Cerrar</button></div>';
    }

    modal('<button class="mod-x">✕</button><div style="font-size:12px;font-weight:800;letter-spacing:1px;color:var(--muted)">' + reqFolio(r) + '</div><h3 style="margin-top:2px">' + esc(r.titulo || tp.nombre) + ' <span class="chip ' + est.chip + '" style="vertical-align:middle;margin-left:4px">' + est.t + '</span></h3>' + rows + stepper + tl + actions);

    var dlA = document.querySelector('#modalHost [data-reqdl]');
    if (dlA) dlA.addEventListener('click', function (e) { e.preventDefault(); if (!r.adjunto) { toast('El archivo adjunto no está disponible.'); return; } var a = document.createElement('a'); a.href = r.adjunto; a.download = r.adjuntoNombre || 'adjunto'; document.body.appendChild(a); a.click(); a.remove(); });
    var resA = document.querySelector('#modalHost [data-resdl]');
    if (resA) resA.addEventListener('click', function (e) { e.preventDefault(); if (!r.resDoc) { toast('El documento no está disponible.'); return; } var a = document.createElement('a'); a.href = r.resDoc; a.download = r.resDocNombre || 'documento'; document.body.appendChild(a); a.click(); a.remove(); });
    var bib = document.querySelector('#modalHost [data-resbib]');
    if (bib) bib.addEventListener('click', function () { closeModal(); docCat = 'personales'; go('docs'); toast('Abriendo “Mis documentos” en la Biblioteca.'); });
    var dbt = $('#rqDocBtn');
    if (dbt) dbt.addEventListener('click', function () { var inp = document.createElement('input'); inp.type = 'file'; inp.onchange = function () { var f = inp.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { resDoc.nombre = f.name; resDoc.data = rd.result; $('#rqDocName').textContent = f.name; }; rd.readAsDataURL(f); }; inp.click(); });
    if (puedoActuar(r)) {
      $('#rqApp').addEventListener('click', function () { reqDecidir(r, true, $('#rqNota').value.trim(), resDoc); });
      $('#rqRej').addEventListener('click', function () { reqDecidir(r, false, $('#rqNota').value.trim()); });
    }
  }

  function reqCrearDoc(r, resDoc) {
    var u = byId(r.userId), tp = reqTipo(r.tipo);
    var nombre, dataUrl;
    if (resDoc && resDoc.data) {
      nombre = resDoc.nombre; dataUrl = resDoc.data;
    } else if (tp.genera) {
      var txt = 'VEPAGOS\r\nCONSTANCIA DE TRABAJO\r\n\r\n' +
        'Por medio de la presente, VEPAGOS hace constar que ' + (u ? u.nombre : '—') + ' presta sus servicios en esta empresa desempeñando el cargo de ' + ((u && u.cargo) || '—') + ', en el área de ' + ((u && u.area) || '—') + ', desde el ' + fechaCorta(u && u.ingreso) + '.\r\n\r\n' +
        'Constancia emitida el ' + fechaCorta(reqToday()) + ' por Capital Humano — VEPAGOS.\r\n\r\n' +
        '[Documento generado por la intranet Somos VEPAGOS con fines de demostración.]';
      nombre = 'Constancia de trabajo — ' + (u ? u.nombre.split(' ').slice(0, 2).join(' ') : '') + '.txt';
      dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(txt);
    } else { return; }
    var doc = { id: db.nextDocId++, cat: 'personales', nombre: nombre, archivo: dataUrl, real: true, fecha: reqToday(), por: me.nombre, userId: r.userId, deptos: null, equipos: null };
    db.docs.push(doc);
    r.resDocId = doc.id; r.resDocNombre = nombre; r.resDoc = dataUrl;
  }

  function reqDecidir(r, ok, nota, resDoc) {
    if (!puedoActuar(r)) return;
    var steps = flujoDe(r), tp = reqTipo(r.tipo), sol = byId(r.userId), folio = reqFolio(r);
    var pasoLbl = stepLabel(steps[r.paso || 0]);
    if (ok) {
      r.eventos.push({ accion: 'aprobado', por: me.nombre, rol: roleLabelOf(me.role), paso: pasoLbl, fecha: reqToday(), nota: nota });
      r.paso = (r.paso || 0) + 1;
      if (r.paso >= steps.length) { r.estado = 'aprobada'; if (tp.genera || (resDoc && resDoc.data)) reqCrearDoc(r, resDoc); }
      logHist(sol, 'Solicitud ' + folio + ' (' + tp.nombre + ') aprobada por ' + me.nombre + ' — ' + pasoLbl + (r.estado === 'aprobada' ? '. Ticket concluido.' : '. Pasó a ' + stepLabel(steps[r.paso]) + '.'), me.nombre);
      logHist(me, 'Aprobó la solicitud ' + folio + ' de ' + (sol ? sol.nombre : '—') + ' — ' + tp.nombre + ' (' + pasoLbl + ')');
    } else {
      r.eventos.push({ accion: 'rechazada', por: me.nombre, rol: roleLabelOf(me.role), fecha: reqToday(), nota: nota }); r.estado = 'rechazada';
      logHist(sol, 'Solicitud ' + folio + ' (' + tp.nombre + ') rechazada por ' + me.nombre + (nota ? ': “' + nota + '”' : '.'), me.nombre);
      logHist(me, 'Rechazó la solicitud ' + folio + ' de ' + (sol ? sol.nombre : '—') + ' — ' + tp.nombre);
    }
    saveDB(db); closeModal(); refreshNav(); reRenderSol();
    toast(!ok ? 'Ticket rechazado.' : (r.estado === 'aprobada' ? 'Ticket aprobado y concluido.' + (r.resDocNombre ? ' Documento en la Biblioteca.' : '') : 'Aprobado. Pasó a ' + stepLabel(steps[r.paso]) + '.'));
  }

  function pendRow(p, admin) {
    var m = PEND_TIPOS[p.tipo] || { t: p.tipo, chip: 'n', ico: '', accion: 'Atender' }, u = byId(p.userId);
    var estChip = p.estado === 'atendido' ? '<span class="chip b">En revisión</span>' : (p.estado === 'resuelto' ? '<span class="chip g">Resuelto</span>' : '<span class="chip ' + m.chip + '">' + m.t + '</span>');
    var meta = (admin ? esc(u ? u.nombre : '—') + ' · ' : '') + esc(m.t) + ' · ' + fechaCorta(p.fecha);
    var btn = admin ? '<button class="btn-s" data-pend="' + p.id + '">Gestionar</button>'
      : (p.estado === 'abierto' ? '<button class="btn-g" data-pend="' + p.id + '" style="padding:8px 14px">' + m.accion + '</button>' : '<button class="btn-s" data-pend="' + p.id + '">Ver</button>');
    return '<div class="docrow" data-pend="' + p.id + '" style="cursor:pointer">' +
      '<div class="docic" style="background:#FFF6E3;color:#9A6B00">' + reqIco(m.ico) + '</div>' +
      '<div style="min-width:0"><div class="dn">' + esc(p.titulo) + '</div><div class="dm">' + meta + '</div></div>' +
      '<span class="sp"></span>' + estChip + btn +
    '</div>';
  }

  function openPendModal() {
    var empleados = (me.role === 'gerente'
      ? subtree(me.id).filter(function (u) { return u.id !== me.id && u.activo && u.role !== 'candidato'; })
      : db.users.filter(function (u) { return u.activo && u.role !== 'candidato'; })
    ).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    if (me.role === 'gerente' && !empleados.length) { toast('Aún no tienes personas en tu equipo.'); return; }
    modal('<button class="mod-x">✕</button><h3>Asignar pendiente</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">' + (me.role === 'gerente' ? 'Crea una alerta para alguien de <b>tu equipo</b>: horario/puntualidad, una planilla por llenar o una gestión.' : 'Crea una alerta para un empleado: horario/puntualidad, una planilla por llenar o una gestión con Capital Humano.') + '</p>' +
      '<div class="fld"><label>Empleado</label><select id="pnU">' + empleados.map(function (u) { return '<option value="' + u.id + '">' + esc(u.nombre) + ' — ' + esc(u.cargo || '') + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label>Tipo</label><select id="pnT"><option value="horario">Horario / puntualidad</option><option value="planilla">Planilla por llenar</option><option value="rrhh">Pendiente con Capital Humano</option></select></div>' +
      '<div class="fld"><label>Título</label><input id="pnTit" type="text" placeholder="Ej: Planilla de actualización de datos"></div>' +
      '<div class="fld"><label>Detalle / instrucciones</label><textarea id="pnDet" placeholder="Qué debe hacer el empleado…"></textarea></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="pnOk">Asignar</button></div>');
    $('#pnOk').addEventListener('click', function () {
      var tit = $('#pnTit').value.trim(); if (!tit) { toast('Escribe un título.'); return; }
      var pu = +$('#pnU').value, ptipo = $('#pnT').value;
      db.pendientes.push({ id: db.nextPendId++, userId: pu, tipo: ptipo, titulo: tit, detalle: $('#pnDet').value.trim(), estado: 'abierto', fecha: reqToday(), por: me.nombre, respuesta: '', adjuntoNombre: null, adjunto: null });
      var quien = (me.role === 'rrhh' || me.role === 'admin') ? 'Capital Humano' : me.nombre + ' (tu líder)';
      logHist(byId(pu), quien + ' le asignó un pendiente (' + (PEND_TIPOS[ptipo] ? PEND_TIPOS[ptipo].t : ptipo) + '): ' + tit, me.nombre);
      saveDB(db); closeModal(); refreshNav(); reRenderSol(); toast('Pendiente asignado.');
    });
  }

  function pendView(p) {
    var m = PEND_TIPOS[p.tipo] || { t: p.tipo, chip: 'n' }, u = byId(p.userId);
    var esRH = me.role === 'rrhh' || me.role === 'admin', soyDueno = p.userId === me.id;
    var puedoGestionar = esRH || (me.role === 'gerente' && subtree(me.id).some(function (u) { return u.id === p.userId; }));
    function prow(k, val) { return '<div class="prow"><span class="k" style="color:var(--muted);min-width:120px;font-weight:600">' + k + '</span><span style="flex:1;color:var(--navy)">' + val + '</span></div>'; }
    var rows = prow('Tipo', esc(m.t)) + (puedoGestionar ? prow('Empleado', esc(u ? u.nombre : '—')) : '') + prow('Asignado por', esc(p.por) + ' · ' + fechaCorta(p.fecha)) +
      '<div style="margin:12px 0 2px;color:#33415C;font-size:14px;line-height:1.6">' + esc(p.detalle) + '</div>';
    if (p.respuesta) rows += '<div class="chk-h" style="margin-top:12px">Respuesta del empleado</div><div style="font-size:13.5px;color:#33415C;line-height:1.55">“' + esc(p.respuesta) + '”</div>';
    if (p.adjuntoNombre) rows += '<div style="margin-top:8px"><a href="#" data-penddl="' + p.id + '">' + esc(p.adjuntoNombre) + '</a></div>';

    var attach = { nombre: p.adjuntoNombre, data: p.adjunto }, actions;
    if (soyDueno && p.estado === 'abierto') {
      actions = '<div class="chk-h" style="margin-top:14px">Tu respuesta</div>' +
        '<div class="fld" style="margin-top:0"><textarea id="pvResp" placeholder="' + (p.tipo === 'horario' ? 'Explica el motivo de las llegadas tarde…' : (p.tipo === 'planilla' ? 'Comentario (opcional)' : 'Escribe tu respuesta…')) + '"></textarea></div>' +
        '<div class="fld"><label>Adjunto ' + (p.tipo === 'planilla' ? '(planilla firmada)' : '(opcional)') + '</label><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><button type="button" class="btn-s" id="pvAdjBtn">Adjuntar archivo</button><span id="pvAdjName" style="font-size:13px;color:var(--muted)">Ningún archivo</span></div></div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="pvSend">Enviar a Capital Humano</button></div>';
    } else if (puedoGestionar && p.estado !== 'resuelto') {
      actions = '<div class="mod-actions"><button class="btn-s" id="pvReopen">' + (p.estado === 'atendido' ? 'Devolver al empleado' : 'Cerrar') + '</button><button class="btn-g" id="pvResolve">Marcar resuelto</button></div>';
    } else {
      actions = '<div class="mod-actions"><button class="btn-g mod-x">Cerrar</button></div>';
    }
    var estLbl = p.estado === 'atendido' ? '<span class="chip b">En revisión</span>' : (p.estado === 'resuelto' ? '<span class="chip g">Resuelto</span>' : '<span class="chip ' + (m.chip || 'n') + '">Abierto</span>');
    modal('<button class="mod-x">✕</button><h3>' + esc(p.titulo) + ' <span style="margin-left:4px;vertical-align:middle">' + estLbl + '</span></h3>' + rows + actions);

    var dl = document.querySelector('#modalHost [data-penddl]');
    if (dl) dl.addEventListener('click', function (e) { e.preventDefault(); if (!p.adjunto) { toast('El adjunto no está disponible.'); return; } var a = document.createElement('a'); a.href = p.adjunto; a.download = p.adjuntoNombre || 'adjunto'; document.body.appendChild(a); a.click(); a.remove(); });
    var ab = $('#pvAdjBtn'); if (ab) ab.addEventListener('click', function () { var inp = document.createElement('input'); inp.type = 'file'; inp.onchange = function () { var f = inp.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { attach.nombre = f.name; attach.data = rd.result; $('#pvAdjName').textContent = f.name; }; rd.readAsDataURL(f); }; inp.click(); });
    var send = $('#pvSend'); if (send) send.addEventListener('click', function () {
      var resp = $('#pvResp').value.trim();
      if (p.tipo === 'horario' && !resp) { toast('Escribe una justificación.'); return; }
      if (p.tipo === 'planilla' && !attach.data && !resp) { toast('Adjunta la planilla firmada o deja un comentario.'); return; }
      p.respuesta = resp; p.adjuntoNombre = attach.nombre; p.adjunto = attach.data; p.estado = 'atendido';
      logHist(me, 'Respondió el pendiente “' + p.titulo + '” asignado por ' + (p.por || 'Capital Humano') + (attach.nombre ? ' (adjuntó ' + attach.nombre + ')' : ''));
      saveDB(db); closeModal(); refreshNav(); reRenderSol(); toast('Enviado a Capital Humano.');
    });
    var rs = $('#pvResolve'); if (rs) rs.addEventListener('click', function () { p.estado = 'resuelto'; logHist(byId(p.userId), 'Pendiente “' + p.titulo + '” marcado como resuelto por ' + me.nombre, me.nombre); saveDB(db); closeModal(); refreshNav(); reRenderSol(); toast('Pendiente marcado como resuelto.'); });
    var ro = $('#pvReopen'); if (ro) ro.addEventListener('click', function () { p.estado = 'abierto'; logHist(byId(p.userId), 'Pendiente “' + p.titulo + '” reabierto por ' + me.nombre, me.nombre); saveDB(db); closeModal(); refreshNav(); reRenderSol(); toast('Pendiente reabierto para el empleado.'); });
  }

  /* ---------- CONFIGURACIÓN DE APROBACIONES ---------- */
  function tiposDeDepto(deptId) {
    var out = []; var dp = reqDepto(deptId);
    (dp.cats || []).forEach(function (c) { c.tipos.forEach(function (t) { out.push(t); }); });
    return out;
  }
  function openConfigModal(tab, tipoId, deptFilter) {
    if (!adminReq()) { toast('Solo Capital Humano o Dirección pueden configurar.'); return; }
    var st = {
      tab: tab || 'resp',
      dept: deptFilter || (tipoId ? reqTipo(tipoId).depto : 'tecnologia'),
      tipo: tipoId || null,
      resp: Object.assign({}, db.aprobadores)
    };
    if (!st.tipo) { var lst = tiposDeDepto(st.dept); st.tipo = lst[0] ? lst[0].id : null; }
    var STEP_KEYS = Object.keys(TIC.STEPS);
    var usuarios = db.users.filter(function (u) { return u.activo && u.role !== 'candidato'; }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });

    function tabsHtml() {
      return '<div style="display:inline-flex;background:#EEF2F8;border-radius:10px;padding:3px;gap:2px;margin:6px 0 14px">' +
        [['resp', 'Responsables por área'], ['flujo', 'Flujo por tipo']].map(function (t) {
          return '<button data-ctab="' + t[0] + '" style="border:none;cursor:pointer;font-weight:700;font-size:13px;padding:8px 14px;border-radius:8px;' + (st.tab === t[0] ? 'background:#fff;color:var(--navy);box-shadow:0 1px 3px rgba(2,12,38,.12)' : 'background:transparent;color:var(--muted)') + '">' + t[1] + '</button>';
        }).join('') + '</div>';
    }
    function respBody() {
      return '<p style="color:var(--muted);font-size:13.5px;margin:0 0 10px;line-height:1.55">Asigna la persona responsable de aprobar en cada área. Estos responsables se usan en los flujos de todos los tipos de solicitud.</p>' +
        STEP_KEYS.filter(function (k) { return k !== 'supervisor'; }).map(function (k) {
          return '<div class="fld"><label>' + esc(TIC.STEPS[k].t) + '</label><select data-resp="' + k + '">' +
            usuarios.map(function (u) { return '<option value="' + u.id + '"' + (st.resp[k] === u.id ? ' selected' : '') + '>' + esc(u.nombre) + ' · ' + esc(u.cargo) + '</option>'; }).join('') +
          '</select></div>';
        }).join('') +
        '<div class="mod-actions"><button class="btn-s mod-x">Cerrar</button><button class="btn-g" id="cfgRespSave">Guardar responsables</button></div>';
    }
    function loadWork() { if (st.workTipo !== st.tipo) { st.work = (db.reqFlujoOverrides[st.tipo] || reqTipo(st.tipo).flujo || []).slice(); st.workTipo = st.tipo; } }
    function flujoBody() {
      loadWork();
      var steps = st.work;
      var esOverride = !!db.reqFlujoOverrides[st.tipo];
      var chips = steps.map(function (k, i) {
        var ap = k === 'supervisor' ? null : (db.aprobadores[k] ? byId(db.aprobadores[k]) : null);
        return '<div style="display:flex;align-items:center;gap:8px;background:#F6F9FD;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px">' +
          '<span style="width:20px;height:20px;border-radius:50%;background:var(--navy);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto">' + (i + 1) + '</span>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:13.5px">' + esc(TIC.STEPS[k].t) + '</div>' + (ap ? '<div style="font-size:12px;color:var(--muted)">' + esc(ap.nombre) + '</div>' : (k === 'supervisor' ? '<div style="font-size:12px;color:var(--muted)">Según cada solicitante</div>' : '')) + '</div>' +
          (i > 0 ? '<button class="btn-s" data-fup="' + i + '" style="padding:4px 8px" title="Subir">↑</button>' : '') +
          '<button class="btn-s btn-danger" data-fdel="' + i + '" style="padding:4px 8px" title="Quitar">✕</button>' +
        '</div>';
      }).join('');
      var deptSel = '<div class="fld"><label>Departamento</label><select id="cfgDept">' + TIC.DEPTS.map(function (dp) { return '<option value="' + dp.id + '"' + (dp.id === st.dept ? ' selected' : '') + '>' + esc(dp.nombre) + '</option>'; }).join('') + '</select></div>';
      var tipoSel = '<div class="fld"><label>Tipo de solicitud</label><select id="cfgTipo">' + tiposDeDepto(st.dept).map(function (t) { return '<option value="' + t.id + '"' + (t.id === st.tipo ? ' selected' : '') + '>' + esc(t.nombre) + '</option>'; }).join('') + '</select></div>';
      var addSel = '<div style="display:flex;gap:8px;align-items:flex-end;margin-top:6px"><div class="fld" style="flex:1;margin:0"><label>Agregar paso</label><select id="cfgAdd">' + Object.keys(TIC.STEPS).map(function (k) { return '<option value="' + k + '">' + esc(TIC.STEPS[k].t) + '</option>'; }).join('') + '</select></div><button class="btn-s" id="cfgAddBtn" style="margin-bottom:2px">Agregar</button></div>';
      return '<p style="color:var(--muted);font-size:13.5px;margin:0 0 8px;line-height:1.55">Define el orden de aprobación para un tipo de solicitud. Cada categoría puede tener un flujo distinto.</p>' +
        '<div class="grid g2">' + deptSel + tipoSel + '</div>' +
        '<div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:8px 0 8px">Flujo de aprobación ' + (esOverride ? '<span class="chip y" style="margin-left:4px">personalizado</span>' : '<span class="chip n" style="margin-left:4px">por defecto</span>') + '</div>' +
        (chips || '<div class="empty" style="padding:14px">Sin pasos. Agrega al menos uno.</div>') + addSel +
        '<div class="mod-actions">' + (esOverride ? '<button class="btn-s" id="cfgReset">Restablecer</button>' : '') + '<button class="btn-s mod-x">Cerrar</button><button class="btn-g" id="cfgFlujoSave">Guardar flujo</button></div>';
    }
    function draw() {
      modal('<button class="mod-x">✕</button><h3>Configurar aprobaciones</h3>' + tabsHtml() + (st.tab === 'resp' ? respBody() : flujoBody()), 'wide');
      $$('#modalHost [data-ctab]').forEach(function (b) { b.addEventListener('click', function () { st.tab = b.getAttribute('data-ctab'); draw(); }); });
      if (st.tab === 'resp') {
        $$('#modalHost [data-resp]').forEach(function (s) { s.addEventListener('change', function () { st.resp[s.getAttribute('data-resp')] = +s.value; }); });
        $('#cfgRespSave').addEventListener('click', function () { db.aprobadores = Object.assign({}, db.aprobadores, st.resp); saveDB(db); toast('Responsables actualizados.'); closeModal(); reRenderSol(); });
      } else {
        var dsel = $('#cfgDept'); if (dsel) dsel.addEventListener('change', function () { st.dept = dsel.value; var l = tiposDeDepto(st.dept); st.tipo = l[0] ? l[0].id : null; st.workTipo = null; draw(); });
        var tsel = $('#cfgTipo'); if (tsel) tsel.addEventListener('change', function () { st.tipo = tsel.value; st.workTipo = null; draw(); });
        $('#cfgAddBtn').addEventListener('click', function () { st.work.push($('#cfgAdd').value); draw(); });
        $$('#modalHost [data-fdel]').forEach(function (b) { b.addEventListener('click', function () { st.work.splice(+b.getAttribute('data-fdel'), 1); draw(); }); });
        $$('#modalHost [data-fup]').forEach(function (b) { b.addEventListener('click', function () { var i = +b.getAttribute('data-fup'); var t = st.work[i - 1]; st.work[i - 1] = st.work[i]; st.work[i] = t; draw(); }); });
        var rst = $('#cfgReset'); if (rst) rst.addEventListener('click', function () { delete db.reqFlujoOverrides[st.tipo]; st.workTipo = null; draw(); });
        $('#cfgFlujoSave').addEventListener('click', function () {
          if (!st.work.length) { toast('El flujo debe tener al menos un paso.'); return; }
          db.reqFlujoOverrides[st.tipo] = st.work.slice();
          saveDB(db); toast('Flujo de “' + reqTipo(st.tipo).nombre + '” guardado.'); closeModal(); reRenderSol();
        });
      }
    }
    draw();
  }

  /* ---------- ASISTENCIA (carga masiva de horarios) ---------- */
  var ASIS_COLS = {
    nombre: ['nombre', 'empleado', 'trabajador', 'colaborador', 'miembro', 'miembro del equipo'],
    email: ['email', 'correo', 'correo electronico', 'e-mail', 'mail'],
    area: ['area', 'departamento', 'equipo', 'cargo', 'grupo'],
    fecha: ['fecha', 'dia', 'date'],
    estado: ['estado', 'ubicacion', 'status', 'location'],
    productivo: ['tiempo productivo', 'tiempo product', 'productivo', 'tiempo productivo (h)'],
    inactivo: ['tiempo sin actividad', 'tiempo si', 'sin actividad', 'inactivo', 'tiempo inactivo', 'ausente de actividad'],
    desktime: ['desktime', 'tiempo desktime', 'tiempo total'],
    llego: ['llego a las', 'llego', 'llegada', 'hora de entrada', 'hora entrada', 'entrada', 'ingreso', 'hora de entrada control de acceso', 'control de acceso', 'entrada control de acceso'],
    salio: ['salio a las', 'salio', 'hora de salida', 'hora salida', 'salida', 'egreso'],
    desktimeInicio: ['hora inicio sesion', 'inicio de sesion', 'inicio sesion', 'hora inicio sesion desk time', 'inicio sesion desk time', 'login desktime', 'hora de inicio'],
    enTrabajo: ['en el trabajo', 'en el tr', 'en trabajo', 'tiempo en el trabajo', 'jornada'],
    appActiva: ['aplicacion activa', 'app activa', 'aplicacion', 'aplicación activa'],
    proyecto: ['proyecto activo', 'proyecto'],
    ultimoReporte: ['ultimo reporte', 'ultima actividad', 'ultima actividad detectada', 'last activity', 'ultimo'],
    obs: ['observaciones', 'observacion', 'obs', 'nota', 'notas', 'comentario', 'comentarios']
  };
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.+$/, '').trim(); }
  function asisColKey(header) {
    var h = norm(header);
    for (var k in ASIS_COLS) { if (ASIS_COLS[k].indexOf(h) > -1) return k; }
    // coincidencia por prefijo (encabezados truncados tipo "Tiempo product…")
    for (var k2 in ASIS_COLS) { for (var i = 0; i < ASIS_COLS[k2].length; i++) { var cand = ASIS_COLS[k2][i]; if (h && (h.indexOf(cand) === 0 || cand.indexOf(h) === 0) && Math.min(h.length, cand.length) >= 4) return k2; } }
    return null;
  }
  function parseCSV(text) {
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    if (!rows.length) return [];
    var head = rows.shift();
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); }).map(function (r) { var o = {}; head.forEach(function (h, j) { o[h] = r[j]; }); return o; });
  }
  function parseSheet(file, cb) {
    var name = file.name.toLowerCase(), reader = new FileReader();
    if (window.XLSX) {
      reader.onload = function () { try { var wb = XLSX.read(new Uint8Array(reader.result), { type: 'array' }); var ws = wb.Sheets[wb.SheetNames[0]]; cb(null, XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })); } catch (e) { cb(String(e)); } };
      reader.readAsArrayBuffer(file);
    } else if (/\.csv$/.test(name)) {
      reader.onload = function () { try { cb(null, parseCSV(reader.result)); } catch (e) { cb(String(e)); } };
      reader.readAsText(file);
    } else { cb('No se pudo leer el archivo Excel. Guarda el archivo como CSV e inténtalo de nuevo.'); }
  }
  function asisMapRows(rawRows) {
    return rawRows.map(function (r) {
      var rec = { nombre: '', email: '', area: '', fecha: '', estado: '', productivo: '', inactivo: '', desktime: '', desktimeInicio: '', llego: '', salio: '', enTrabajo: '', appActiva: '', proyecto: '', ultimoReporte: '', obs: '' };
      for (var h in r) { var k = asisColKey(h); if (k) rec[k] = String(r[h] == null ? '' : r[h]).trim(); }
      var u = null;
      if (rec.email) u = db.users.find(function (x) { return norm(x.email) === norm(rec.email); });
      if (!u && rec.nombre) u = db.users.find(function (x) { return norm(x.nombre) === norm(rec.nombre); });
      rec.userId = u ? u.id : null;
      rec.nombre = u ? u.nombre : rec.nombre;
      if (!rec.area && u) rec.area = u.area || '';
      // compat: si viene entrada/salida clásicas
      if (!rec.llego && r.entrada) rec.llego = String(r.entrada).trim();
      return rec;
    }).filter(function (r) { return r.nombre || r.llego || r.desktime || r.desktimeInicio || r.fecha; });
  }

  var asisFiltro = '';
  var asisTab = 'todos';
  var asisFecha = null;
  var asisSort = 'nombre';
  var asisFiltroArea = '';
  var asisPersona = null;
  var ASIS_ENTRADA_LIMITE = '08:05';
  var ASIS_IDLE_MIN = 10;
  function hhmmMin(s) { s = String(s || '').trim(); var m = s.match(/(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i); if (!m) { m = s.match(/(\d{1,2})[h\.](\d{2})/); if (!m) return null; return (+m[1]) * 60 + (+m[2]); } var hh = +m[1], mm = +m[2], ap = (m[3] || '').toLowerCase(); if (ap.indexOf('p') === 0 && hh < 12) hh += 12; if (ap.indexOf('a') === 0 && hh === 12) hh = 0; return hh * 60 + mm; }
  function minToDur(min) { if (min == null || min < 0) return '—'; var h = Math.floor(min / 60), m = min % 60; return (h ? h + 'h ' : '') + m + 'm'; }
  function fmtHora(min) { if (min == null) return '—'; var h = Math.floor(min / 60), m = min % 60, ap = h < 12 ? 'AM' : 'PM', h12 = h % 12; if (h12 === 0) h12 = 12; return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ap; }
  function esBlanco(v) { v = String(v == null ? '' : v).trim(); return !v || v === '-' || v === '—'; }
  function nowMin() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function esHoy(f) { return f === reqToday(); }
  function asisEstado(r) {
    var u = r.userId ? byId(r.userId) : null;
    var entrada = (u && u.horaEntrada) ? u.horaEntrada : '08:00';
    var llego = hhmmMin(r.llego), lim = hhmmMin(entrada) + 15;
    var salioTxt = norm(r.salio), estadoTxt = norm(r.estado);
    var enJornada = /trabajando|working|activo/.test(salioTxt) || (!esBlanco(r.llego) && esBlanco(r.salio));
    var ausente = /ausen|falta|no asist|absent/.test(estadoTxt) || (esBlanco(r.llego) && esBlanco(r.desktime) && esBlanco(r.enTrabajo) && esBlanco(r.salio));
    // inactividad en vivo: si hoy y sigue en jornada pero su último reporte fue hace > IDLE min
    var vivo = esHoy(r.fecha), ultimo = hhmmMin(r.ultimoReporte), idle = false;
    if (vivo && enJornada && ultimo != null && (nowMin() - ultimo) > ASIS_IDLE_MIN) idle = true;
    var vagueando = idle || /vague|idle|inactiv|ocioso/.test(estadoTxt) || /vague/.test(salioTxt);
    var envac = r.userId ? enVacaciones(r.userId, r.fecha) : false;
    var trabajando = enJornada && !ausente && !vagueando;
    var tarde = !ausente && llego != null && llego > lim;
    if (envac) { return { trabajando: false, vagueando: false, ausente: false, tarde: false, retraso: 0, enJornada: false, idle: false, envac: true }; }
    return { trabajando: trabajando, vagueando: vagueando && !ausente, ausente: ausente, tarde: tarde, retraso: (tarde ? llego - lim : 0), enJornada: enJornada && !ausente, idle: idle };
  }
  function asisEnTrabajoLive(r) {
    var e = asisEstado(r), llego = hhmmMin(r.llego);
    if (e.enJornada && esHoy(r.fecha) && llego != null) return minToDur(Math.max(0, nowMin() - llego));
    return esBlanco(r.enTrabajo) ? '—' : r.enTrabajo;
  }
  function rAsistencia() {
    resetContent();
    if (window._asisTimer) { clearInterval(window._asisTimer); window._asisTimer = null; }
    if (asisPersona != null) { rAsisHistorico(); return; }
    if (!asisFecha) asisFecha = reqToday();
    var all = db.asistencia.slice();
    var fechas = {}; all.forEach(function (r) { if (r.fecha) fechas[r.fecha] = 1; });
    var delDia = all.filter(function (r) { return (r.fecha || reqToday()) === asisFecha; });
    var porUser = {}; delDia.forEach(function (r) { if (r.userId) porUser[r.userId] = r; });
    // Mostrar SIEMPRE toda la plantilla; quien no tenga registro del día se marca ausente
    var asisGestiona = me.role === 'admin' || me.role === 'rrhh';
    var plantilla = db.users.filter(function (u) {
      if (!u.activo || u.role === 'candidato' || !perfilVisible(u)) return false;
      if (me.role === 'admin') return true;
      if (me.role === 'rrhh') return u.role !== 'admin' && u.role !== 'gerente';
      if (me.role === 'gerente') return u.id === me.id || subtree(me.id).some(function (x) { return x.id === u.id; });
      return u.id === me.id;
    });
    var recs = plantilla.map(function (u) {
      if (porUser[u.id]) return porUser[u.id];
      return { userId: u.id, nombre: u.nombre, area: u.area, fecha: asisFecha, estado: '', productivo: '', inactivo: '', desktime: '', llego: '', salio: '', enTrabajo: '', appActiva: '', proyecto: '', ultimoReporte: '', _sinRegistro: true };
    });
    if (asisGestiona) delDia.forEach(function (r) { if (!r.userId) recs.push(r); });
    var st = function (r) { return asisEstado(r); };
    var nTrab = recs.filter(function (r) { return st(r).trabajando; }).length;
    var nVag = recs.filter(function (r) { return st(r).vagueando; }).length;
    var nAus = recs.filter(function (r) { return st(r).ausente; }).length;
    var nTarde = recs.filter(function (r) { return st(r).tarde; }).length;
    var nVaca = recs.filter(function (r) { return st(r).envac; }).length;
    var areas = {}; recs.forEach(function (r) { var a = r.area || (r.userId && byId(r.userId) ? byId(r.userId).area : '') || ''; if (a) areas[a] = 1; });
    var areaArr = Object.keys(areas).sort();

    var q = norm(asisFiltro);
    var vis = recs.filter(function (r) {
      var e = st(r);
      if (asisTab === 'trabajando' && !e.trabajando) return false;
      if (asisTab === 'vagueando' && !e.vagueando) return false;
      if (asisTab === 'ausente' && !e.ausente) return false;
      if (asisTab === 'tarde' && !e.tarde) return false;
      if (asisTab === 'vacaciones' && !e.envac) return false;
      if (asisFiltroArea && (r.area || (r.userId && byId(r.userId) ? byId(r.userId).area : '') || '') !== asisFiltroArea) return false;
      if (q && norm(r.nombre + ' ' + (r.area || '')).indexOf(q) === -1) return false;
      return true;
    });
    vis.sort(function (a, b) {
      if (asisSort === 'llegada') return (hhmmMin(a.llego) == null ? 9999 : hhmmMin(a.llego)) - (hhmmMin(b.llego) == null ? 9999 : hhmmMin(b.llego));
      if (asisSort === 'productivo') return (hhmmMin(b.productivo) || 0) - (hhmmMin(a.productivo) || 0);
      if (asisSort === 'desktime') return (hhmmMin(b.desktime) || 0) - (hhmmMin(a.desktime) || 0);
      return String(a.nombre || '').localeCompare(String(b.nombre || ''));
    });

    var fd = new Date(asisFecha + 'T12:00:00');
    var MESES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var fechaLbl = isNaN(fd) ? asisFecha : (fd.getDate() + ' ' + MESES3[fd.getMonth()] + ' ' + fd.getFullYear());

    var html =
      '<div class="pf-hero" style="margin-bottom:16px">' +
        '<div class="pf-avawrap"><span style="width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;color:#fff"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M8 2v4M16 2v4M3 10h18"></path><path d="m9 16 2 2 4-4"></path></svg></span></div>' +
        '<div class="pf-id"><div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#00E58C;margin-bottom:6px"><span style="width:8px;height:8px;border-radius:50%;background:#00CE7C' + (esHoy(asisFecha) ? ';animation:asisPulse 1.8s infinite' : '') + '"></span>Asistencia</div>' +
          '<div class="pf-name" style="font-size:24px">Miembros del equipo</div>' +
          '<div class="pf-role">Registro de entradas, permisos y horarios del equipo</div></div>' +
        '<div style="position:relative;z-index:2;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
          '<button data-asishist="list" style="display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);color:#fff;font-weight:700;font-size:13px;font-family:inherit;padding:9px 14px;border-radius:11px;cursor:pointer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>Histórico</button>' +
          '<div style="display:flex;align-items:center;gap:2px;background:rgba(255,255,255,.14);border-radius:11px;padding:3px">' +
            '<button class="asisnav" data-asisday="-1" title="Día anterior" style="width:34px;height:34px;border:none;background:none;color:#fff;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg></button>' +
            '<span style="min-width:120px;text-align:center;font-weight:700;font-size:13.5px;color:#fff">' + fechaLbl + '</span>' +
            '<button class="asisnav" data-asisday="1" title="Día siguiente"' + (esHoy(asisFecha) ? ' disabled style="opacity:.35;width:34px;height:34px;border:none;background:none;color:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center"' : ' style="width:34px;height:34px;border:none;background:none;color:#fff;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center"') + '><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg></button>' +
          '</div>' +
        '</div>' +
      '</div>';

    if (!asisVeEquipo()) {
      var permHoy = permisosActivos(me, asisFecha);
      html += '<div class="card" style="margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
        '<span style="width:46px;height:46px;border-radius:13px;background:#EAF1FD;color:#2A6FDB;display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span>' +
        '<div style="flex:1;min-width:180px"><div style="font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Tu horario de trabajo</div>' +
          '<div style="font-size:19px;font-weight:800;color:var(--navy);margin-top:1px">' + horarioTxt(me) + '</div>' +
          '<div class="note" style="margin-top:1px">Entrada ' + horaFmt(horarioDe(me).entrada) + ' · Salida ' + horaFmt(horarioDe(me).salida) + ' · tolerancia de 15 min</div></div>' +
        (permHoy.length ? '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' + permHoy.map(function (p) { return '<span class="chip" style="background:#F1EAFB;color:#8A5CD1;font-size:12.5px">' + esc(permisoTxt(p)) + '</span>'; }).join('') + '</div>' : '') +
      '</div>';
    }
    var presentes = recs.filter(function (r) { var e = st(r); return !e.ausente && !e.envac; });
    var puntuales = presentes.filter(function (r) { return !st(r).tarde; }).length;
    var puntualidad = presentes.length ? Math.round(puntuales / presentes.length * 100) : 0;
    function promMin(campo) { var v = presentes.map(function (r) { return hhmmMin(r[campo]); }).filter(function (x) { return x != null; }); return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length) : null; }
    html += '<div class="dash-kpis" style="margin-bottom:16px;grid-template-columns:repeat(5,1fr)">' +
      '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#00B87118;color:#00B871"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></span><div><div class="dash-kpi-n">' + puntualidad + '%</div><div class="dash-kpi-l">Puntualidad del día</div></div></div>' +
      '<div class="dash-kpi" data-asistab="trabajando"><span class="dash-kpi-ic" style="background:#00B87118;color:#00B871"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"></path></svg></span><div><div class="dash-kpi-n">' + nTrab + '</div><div class="dash-kpi-l">En la oficina</div></div></div>' +
      '<div class="dash-kpi"' + (nAus ? ' style="border-color:#EAB8C8"' : '') + ' data-asistab="ausente"><span class="dash-kpi-ic" style="background:#B23A6E18;color:#B23A6E"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"></path></svg></span><div><div class="dash-kpi-n" style="color:' + (nAus ? '#B23A6E' : 'var(--navy)') + '">' + nAus + '</div><div class="dash-kpi-l">Ausentes</div></div></div>' +
      '<div class="dash-kpi"' + (nTarde ? ' style="border-color:#F1CFA0"' : '') + ' data-asistab="tarde"><span class="dash-kpi-ic" style="background:#E07B1E18;color:#E07B1E"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span><div><div class="dash-kpi-n" style="color:' + (nTarde ? '#E07B1E' : 'var(--navy)') + '">' + nTarde + '</div><div class="dash-kpi-l">Llegaron tarde</div></div></div>' +
      '<div class="dash-kpi" data-asistab="vacaciones"><span class="dash-kpi-ic" style="background:#8A5CD118;color:#8A5CD1"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M8 2v4M16 2v4M3 10h18"></path></svg></span><div><div class="dash-kpi-n" style="color:' + (nVaca ? '#8A5CD1' : 'var(--navy)') + '">' + nVaca + '</div><div class="dash-kpi-l">Vacaciones</div></div></div>' +
    '</div>';

    var tabs = [['todos', 'Todos los empleados', recs.length, '#2A6FDB'], ['trabajando', 'En la oficina', nTrab, '#00B871'], ['ausente', 'Ausentes', nAus, '#B23A6E'], ['tarde', 'Llegaron tarde', nTarde, '#E07B1E'], ['vacaciones', 'Vacaciones', nVaca, '#8A5CD1']];
    html += '<div class="card" style="padding:0;overflow:hidden">' +
      '<div style="display:flex;overflow-x:auto;border-bottom:1px solid var(--line)">' + tabs.map(function (t) {
        var on = asisTab === t[0];
        return '<button type="button" data-asistab="' + t[0] + '" style="flex:1;min-width:150px;background:none;border:none;border-bottom:3px solid ' + (on ? t[3] : 'transparent') + ';padding:15px 18px;cursor:pointer;font-family:inherit;text-align:left">' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="font-weight:800;color:' + (on ? 'var(--navy)' : 'var(--muted)') + ';font-size:13.5px;white-space:nowrap">' + t[1] + '</span></div></button>';
      }).join('') + '</div>' +
      '<div class="toolrow" style="margin:0;padding:12px 16px;border-bottom:1px solid var(--line);gap:8px;flex-wrap:wrap">' +
        '<input id="asisQ" type="text" value="' + esc(asisFiltro) + '" placeholder="Buscar miembro del equipo…" style="width:260px;max-width:55vw;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px;font-size:13.5px;font-family:inherit">' +
        '<select id="asisArea" style="padding:9px 11px;border:1.5px solid var(--line);border-radius:10px;font-size:13px;font-family:inherit;color:var(--navy)"><option value="">Todos los departamentos</option>' + areaArr.map(function (a) { return '<option value="' + esc(a) + '"' + (asisFiltroArea === a ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select>' +
        '<select id="asisSort" style="padding:9px 11px;border:1.5px solid var(--line);border-radius:10px;font-size:13px;font-family:inherit;color:var(--navy)">' +
          [['nombre', 'Ordenar: Nombre'], ['llegada', 'Ordenar: Hora de llegada'], ['productivo', 'Ordenar: Tiempo productivo'], ['desktime', 'Ordenar: Tiempo conectado']].map(function (o) { return '<option value="' + o[0] + '"' + (asisSort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
        '<span class="sp"></span>' + (asisGestiona && recs.length ? '<button class="btn-s" id="btnAsisUp"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M17 8l-5-5-5 5M12 3v12"></path></svg>Carga masiva</button>' + (me.role === 'admin' ? '<button class="btn-s btn-danger" id="btnAsisClear">Vaciar día</button>' : '') + '' : '') +
      '</div>' +
      (vis.length ?
        '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Nombre</th><th>Estado</th><th>Hora de entrada · Control de acceso</th><th>Hora inicio sesión · Desk Time</th><th>Observaciones</th></tr></thead><tbody>' +
        vis.map(function (r) {
          var e = st(r), u = r.userId ? byId(r.userId) : null;
          var dot = e.envac ? '#2A6FDB' : (e.ausente ? '#C9CFD8' : (e.vagueando ? '#E07B1E' : (e.trabajando ? '#00CE7C' : '#8FA0B5')));
          var ausJustif = e.ausente && r.userId && ausenciaJustificada(r.userId, r.fecha);
          var estadoChip = e.envac ? '<span class="chip" style="background:#E7F0FF;color:#2A6FDB">En vacaciones</span>' : (e.ausente ? ('<span class="chip r">Ausente</span> ' + (ausJustif ? '<span class="chip" style="background:#EAF1FC;color:#2A6FDB">Justificada</span>' : '<span class="chip" style="background:#FBE9F0;color:#B23A6E">Sin justificativo</span>')) : (e.trabajando ? '<span class="chip g">En la oficina</span>' : (esBlanco(r.estado) ? '—' : esc(r.estado))));
          var ubic = esBlanco(r.estado) ? '' : '<div style="font-size:11.5px;color:var(--muted2);margin-top:2px">' + esc(r.estado) + '</div>';
          var salioCell = e.enJornada ? '<span style="color:var(--muted2)">—</span>' : (esBlanco(r.salio) ? '—' : esc(r.salio));
          var appLive = e.trabajando ? (esBlanco(r.appActiva) ? '<span style="color:var(--muted2)">—</span>' : '<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:#00CE7C;flex:0 0 auto"></span>' + esc(r.appActiva) + '</span>') : (esBlanco(r.appActiva) ? '—' : esc(r.appActiva));
          var permRow = u ? permisosActivos(u, asisFecha) : [];
          var permChips = permRow.length ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px">' + permRow.map(function (p) { return '<span class="chip" style="background:#F1EAFB;color:#8A5CD1;font-size:11px">' + esc(permisoTxt(p)) + '</span>'; }).join('') + '</div>' : '';
          var schedSub = u ? '<div style="font-size:11.5px;color:var(--muted2)">' + esc(r.area || u.cargo || '') + ' · ' + horarioTxt(u) + '</div>' : '<div style="font-size:12px;color:var(--muted2)">' + esc(r.area || '') + '</div>';
          return '<tr>' +
            '<td><div style="display:flex;align-items:center;gap:9px"><span style="position:relative;flex:0 0 auto">' + (u ? avatarHtml(u, 32, 12) : '<span style="width:32px;height:32px;border-radius:50%;background:#E3E9F2;display:inline-block"></span>') + '<span style="position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;background:' + dot + ';border:2px solid #fff"></span></span>' +
              '<div style="min-width:0"><div style="font-weight:700;color:var(--navy);white-space:nowrap">' + esc(r.nombre || '—') + (r.userId ? '' : ' <span class="chip y">sin emparejar</span>') + '</div>' + schedSub + permChips + '</div></div></td>' +
            '<td>' + estadoChip + ubic + '</td>' +
            '<td style="white-space:nowrap;font-weight:700;color:' + (e.tarde ? '#E07B1E' : 'var(--navy)') + '">' + (esBlanco(r.llego) ? '—' : esc(r.llego)) + (e.tarde ? ' <span class="chip y">tarde</span>' : '') + '</td>' +
            '<td style="white-space:nowrap;font-weight:600;color:var(--navy)">' + (esBlanco(r.desktimeInicio) ? (esBlanco(r.desktime) ? '—' : esc(r.desktime)) : esc(r.desktimeInicio)) + '</td>' +
            '<td style="max-width:220px;color:#33415C">' + (esBlanco(r.observaciones) ? (esBlanco(r.appActiva) ? '<span style="color:var(--muted2)">—</span>' : esc(r.appActiva)) : esc(r.observaciones)) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="empty" style="padding:28px">' + (recs.length ? (asisTab === 'todos' ? 'Sin resultados para tu búsqueda.' : 'Nadie en este estado.') : (esHoy(asisFecha) ? 'Sin registros para hoy. Usa “Añadir miembro” para marcar entradas o “Carga masiva” para subir el reporte.' : 'Sin registros para esta fecha.')) + '</div>') +
    '</div>';

    // --- Historial de jornadas ---
    var histDias = Object.keys(fechas).sort(function (a, b) { return b < a ? -1 : 1; }).slice(0, 10);
    if (histDias.length) {
      var totalPlantilla = plantilla.length;
      html += '<div class="card" style="margin-top:16px"><div class="pf-ch"><span class="ic" style="background:#EEF2F8;color:#334"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span><h3>Historial de jornadas</h3></div>' +
        '<div class="note" style="margin:2px 0 10px">Resumen de días anteriores. Toca uno para ver el detalle.</div>' +
        '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Fecha</th><th>Presentes</th><th>Tarde</th><th>Ausentes</th><th>Puntualidad</th><th></th></tr></thead><tbody>' +
        histDias.map(function (f) {
          var rr = all.filter(function (r) { return (r.fecha || reqToday()) === f; });
          var pres = rr.filter(function (r) { return !asisEstado(r).ausente; });
          var tar = rr.filter(function (r) { return asisEstado(r).tarde; }).length;
          var aus = Math.max(0, totalPlantilla - pres.length);
          var punt = pres.length ? Math.round((pres.length - tar) / pres.length * 100) : 0;
          var fd2 = new Date(f + 'T12:00:00'); var lbl = isNaN(fd2) ? f : (fd2.getDate() + ' ' + MESES3[fd2.getMonth()] + ' ' + fd2.getFullYear());
          return '<tr data-asisgo="' + f + '"' + (f === asisFecha ? ' style="background:#F2F8FF"' : ' style="cursor:pointer"') + '><td style="font-weight:700;color:var(--navy);white-space:nowrap">' + lbl + (f === reqToday() ? ' <span class="chip g">Hoy</span>' : '') + '</td>' +
            '<td>' + pres.length + '</td><td style="color:' + (tar ? '#E07B1E' : 'var(--muted2)') + '">' + tar + '</td><td style="color:' + (aus ? '#B23A6E' : 'var(--muted2)') + '">' + aus + '</td>' +
            '<td><div style="display:flex;align-items:center;gap:8px"><div style="width:70px;height:8px;background:#EEF3F9;border-radius:999px;overflow:hidden"><div style="height:100%;width:' + punt + '%;background:' + (punt >= 85 ? '#00B871' : punt >= 60 ? '#E07B1E' : '#B23A6E') + '"></div></div><b style="color:var(--navy);font-size:12.5px">' + punt + '%</b></div></td>' +
            '<td><span style="color:var(--muted2)">' + (f === asisFecha ? 'Viendo' : 'Ver →') + '</span></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }

    $('#content').innerHTML = html;
    var bt = $('#btnAsisTpl'); if (bt) bt.addEventListener('click', asisPlantilla);
    var bu = $('#btnAsisUp'); if (bu) bu.addEventListener('click', openAsisUpload);
    $$('#content [data-asistab]').forEach(function (b) { b.addEventListener('click', function () { asisTab = b.getAttribute('data-asistab'); rAsistencia(); }); });
    $$('#content [data-asishist]').forEach(function (b) { b.addEventListener('click', function () { asisPersona = 'list'; rAsistencia(); window.scrollTo(0, 0); }); });
    $$('#content [data-asisgo]').forEach(function (b) { b.addEventListener('click', function () { asisFecha = b.getAttribute('data-asisgo'); asisTab = 'todos'; rAsistencia(); window.scrollTo(0, 0); }); });
    $$('#content [data-asisday]').forEach(function (b) { b.addEventListener('click', function () { if (b.disabled) return; var d = new Date(asisFecha + 'T12:00:00'); d.setDate(d.getDate() + (+b.getAttribute('data-asisday'))); var iso = d.toISOString().slice(0, 10); if (iso > reqToday()) return; asisFecha = iso; rAsistencia(); }); });
    var ar = $('#asisArea'); if (ar) ar.addEventListener('change', function () { asisFiltroArea = ar.value; rAsistencia(); });
    var so = $('#asisSort'); if (so) so.addEventListener('change', function () { asisSort = so.value; rAsistencia(); });
    var qi = $('#asisQ'); if (qi) qi.addEventListener('input', function () { asisFiltro = qi.value; var pos = qi.selectionStart; rAsistencia(); var n = $('#asisQ'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } });
    var cl = $('#btnAsisClear'); if (cl) cl.addEventListener('click', function () { if (confirm('¿Vaciar los registros de ' + fechaLbl + '?')) { db.asistencia = db.asistencia.filter(function (r) { return (r.fecha || reqToday()) !== asisFecha; }); saveDB(db); rAsistencia(); toast('Registros del día eliminados.'); } });
    // refresco en vivo solo para hoy
    if (esHoy(asisFecha)) { window._asisTimer = setInterval(function () { if (current !== 'asistencia') { clearInterval(window._asisTimer); window._asisTimer = null; return; } rAsistencia(); }, 60000); }
  }

  function asisPlantillaVisible() {
    return db.users.filter(function (u) {
      if (!u.activo || u.role === 'candidato' || !perfilVisible(u)) return false;
      if (me.role === 'admin') return true;
      if (me.role === 'rrhh') return u.role !== 'admin' && u.role !== 'gerente';
      if (me.role === 'gerente') return u.id === me.id || subtree(me.id).some(function (x) { return x.id === u.id; });
      return u.id === me.id;
    });
  }
  function asisFechasRegistradas() {
    var f = {}; db.asistencia.forEach(function (r) { if (r.fecha) f[r.fecha] = 1; });
    f[reqToday()] = 1;
    return Object.keys(f).sort(function (a, b) { return b < a ? -1 : 1; });
  }
  function asisResumenPersona(uid, fechas) {
    var recPorFecha = {}; db.asistencia.forEach(function (r) { if (r.userId === uid && r.fecha) recPorFecha[r.fecha] = r; });
    var pres = 0, tarde = 0, ausJust = 0, ausInj = 0, vac = 0;
    fechas.forEach(function (f) {
      if (enVacaciones(uid, f)) { vac++; return; }
      var r = recPorFecha[f];
      var ausente = !r || asisEstado(r).ausente;
      if (ausente) { if (ausenciaJustificada(uid, f)) ausJust++; else ausInj++; return; }
      var e = asisEstado(r);
      pres++; if (e.tarde) tarde++;
    });
    var punt = pres ? Math.round((pres - tarde) / pres * 100) : 0;
    var u = byId(uid), vi = u ? vacInfo(u) : { tomados: 0, disponibles: 0 };
    return { recPorFecha: recPorFecha, pres: pres, tarde: tarde, ausJust: ausJust, ausInj: ausInj, vac: vac, punt: punt, vacTomadas: vi.tomados, vacPend: vi.disponibles };
  }
  function rAsisHistorico() {
    resetContent();
    var MESES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    function fLbl(f) { var d = new Date(f + 'T12:00:00'); return isNaN(d) ? f : (d.getDate() + ' ' + MESES3[d.getMonth()] + ' ' + d.getFullYear()); }
    var plantilla = asisPlantillaVisible();
    var fechas = asisFechasRegistradas();
    var persona = (asisPersona !== 'list') ? byId(+asisPersona) : null;
    if (persona && !plantilla.some(function (u) { return u.id === persona.id; })) { asisPersona = 'list'; persona = null; }

    var hero =
      '<div class="pf-hero" style="margin-bottom:16px">' +
        '<div class="pf-avawrap"><span style="width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;color:#fff"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span></div>' +
        '<div class="pf-id"><div style="font-size:11.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#00E58C;margin-bottom:6px">Histórico de asistencia</div>' +
          '<div class="pf-name" style="font-size:24px">' + (persona ? esc(persona.nombre) : 'Histórico') + '</div>' +
          '<div class="pf-role">' + (persona ? esc(persona.cargo || persona.area || '') : 'Selecciona a un miembro del equipo para ver su asistencia día a día') + '</div></div>' +
        '<div style="position:relative;z-index:2">' +
          '<button data-asisback="' + (persona ? 'list' : 'panel') + '" style="display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);color:#fff;font-weight:700;font-size:13px;font-family:inherit;padding:9px 14px;border-radius:11px;cursor:pointer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>' + (persona ? 'Volver a la lista' : 'Volver al panel') + '</button>' +
        '</div>' +
      '</div>';

    var html = hero;
    if (!persona) {
      html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Persona</th><th>Tardanzas</th><th>Aus. justificadas</th><th>Aus. injustificadas</th><th>Vac. tomadas</th><th>Vac. pendientes</th><th>Puntualidad</th><th></th></tr></thead><tbody>' +
        plantilla.slice().sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre)); }).map(function (u) {
          var s = asisResumenPersona(u.id, fechas);
          return '<tr data-asisver="' + u.id + '" style="cursor:pointer">' +
            '<td><div style="display:flex;align-items:center;gap:9px">' + avatarHtml(u, 32, 12) + '<div style="min-width:0"><div style="font-weight:700;color:var(--navy);white-space:nowrap">' + esc(u.nombre) + '</div><div style="font-size:12px;color:var(--muted2)">' + esc(u.cargo || u.area || '') + '</div></div></div></td>' +
            '<td style="color:' + (s.tarde ? '#E07B1E' : 'var(--muted2)') + '">' + s.tarde + '</td>' +
            '<td style="color:' + (s.ausJust ? 'var(--navy)' : 'var(--muted2)') + '">' + s.ausJust + '</td>' +
            '<td style="color:' + (s.ausInj ? '#B23A6E' : 'var(--muted2)') + '">' + s.ausInj + '</td>' +
            '<td style="color:' + (s.vacTomadas ? 'var(--navy)' : 'var(--muted2)') + '">' + s.vacTomadas + '</td>' +
            '<td style="color:' + (s.vacPend ? '#2A6FDB' : 'var(--muted2)') + ';font-weight:' + (s.vacPend ? '700' : '400') + '">' + s.vacPend + '</td>' +
            '<td><div style="display:flex;align-items:center;gap:8px"><div style="width:70px;height:8px;background:#EEF3F9;border-radius:999px;overflow:hidden"><div style="height:100%;width:' + s.punt + '%;background:' + (s.punt >= 85 ? '#00B871' : s.punt >= 60 ? '#E07B1E' : '#B23A6E') + '"></div></div><b style="color:var(--navy);font-size:12.5px">' + s.punt + '%</b></div></td>' +
            '<td><button data-asisver="' + u.id + '" style="display:inline-flex;align-items:center;gap:6px;background:#EAF1FC;border:1px solid #DCE7F6;color:#2A6FDB;font-weight:700;font-size:12.5px;font-family:inherit;padding:6px 11px;border-radius:9px;cursor:pointer;white-space:nowrap">Ver detalle<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg></button></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    } else {
      var s = asisResumenPersona(persona.id, fechas);
      html += '<div class="dash-kpis" style="margin-bottom:16px;grid-template-columns:repeat(6,1fr)">' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#00B87118;color:#00B871"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path></svg></span><div><div class="dash-kpi-n">' + s.punt + '%</div><div class="dash-kpi-l">Puntualidad</div></div></div>' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#E07B1E18;color:#E07B1E"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span><div><div class="dash-kpi-n">' + s.tarde + '</div><div class="dash-kpi-l">Tardanzas</div></div></div>' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#2A6FDB18;color:#2A6FDB"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></span><div><div class="dash-kpi-n" style="color:' + (s.ausJust ? 'var(--navy)' : 'var(--navy)') + '">' + s.ausJust + '</div><div class="dash-kpi-l">Aus. justificadas</div></div></div>' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#B23A6E18;color:#B23A6E"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"></path></svg></span><div><div class="dash-kpi-n" style="color:' + (s.ausInj ? '#B23A6E' : 'var(--navy)') + '">' + s.ausInj + '</div><div class="dash-kpi-l">Aus. injustificadas</div></div></div>' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#8A5CD118;color:#8A5CD1"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M8 2v4M16 2v4M3 10h18"></path></svg></span><div><div class="dash-kpi-n">' + s.vacTomadas + '</div><div class="dash-kpi-l">Vac. tomadas</div></div></div>' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#2A6FDB18;color:#2A6FDB"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10z"></path><circle cx="12" cy="11" r="2"></circle></svg></span><div><div class="dash-kpi-n" style="color:' + (s.vacPend ? '#2A6FDB' : 'var(--navy)') + '">' + s.vacPend + '</div><div class="dash-kpi-l">Vac. pendientes</div></div></div>' +
      '</div>';
      html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Fecha</th><th>Estado</th><th>Llegó</th><th>Salió</th><th>T. productivo</th><th>Conectado</th><th>App activa</th></tr></thead><tbody>' +
        fechas.map(function (f) {
          var vac = enVacaciones(persona.id, f);
          var r = s.recPorFecha[f];
          var e = vac ? { envac: true } : (r ? asisEstado(r) : { ausente: true });
          var chip = e.envac ? '<span class="chip" style="background:#E7F0FF;color:#2A6FDB">En vacaciones</span>' : (e.ausente ? '<span class="chip r">Ausente</span>' : (e.vagueando ? '<span class="chip y">Inactivo</span>' : (e.trabajando ? '<span class="chip g">Trabajando</span>' : '<span class="chip g">Presente</span>')));
          var llego = (r && !esBlanco(r.llego)) ? (esc(r.llego) + (e.tarde ? ' <span class="chip y">tarde</span>' : '')) : '—';
          return '<tr' + (f === reqToday() ? ' style="background:#F2F8FF"' : '') + '><td style="font-weight:700;color:var(--navy);white-space:nowrap">' + fLbl(f) + (f === reqToday() ? ' <span class="chip g">Hoy</span>' : '') + '</td>' +
            '<td>' + chip + '</td>' +
            '<td style="white-space:nowrap;font-weight:700;color:' + (e.tarde ? '#E07B1E' : 'var(--navy)') + '">' + llego + '</td>' +
            '<td style="white-space:nowrap">' + ((r && !esBlanco(r.salio)) ? esc(r.salio) : '—') + '</td>' +
            '<td style="font-weight:600;color:var(--navy)">' + ((r && !esBlanco(r.productivo)) ? esc(r.productivo) : '—') + '</td>' +
            '<td style="font-weight:600;color:var(--navy)">' + ((r && !esBlanco(r.desktime)) ? esc(r.desktime) : '—') + '</td>' +
            '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#33415C">' + ((r && !esBlanco(r.appActiva)) ? esc(r.appActiva) : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }

    $('#content').innerHTML = html;
    $$('#content [data-asisback]').forEach(function (b) { b.addEventListener('click', function () { var t = b.getAttribute('data-asisback'); asisPersona = (t === 'list') ? 'list' : null; rAsistencia(); window.scrollTo(0, 0); }); });
    $$('#content [data-asisver]').forEach(function (b) { b.addEventListener('click', function () { asisPersona = +b.getAttribute('data-asisver'); rAsistencia(); window.scrollTo(0, 0); }); });
  }

  function openAsisAdd() {
    var yaHoy = {}; db.asistencia.forEach(function (r) { if ((r.fecha || reqToday()) === asisFecha && r.userId) yaHoy[r.userId] = 1; });
    var libres = db.users.filter(function (u) { return u.activo && u.role !== 'candidato' && perfilVisible(u) && !yaHoy[u.id]; });
    modal('<button class="mod-x">✕</button><h3>Añadir miembro al día</h3>' +
      '<p style="color:var(--muted);font-size:13.5px;margin:4px 0 12px;line-height:1.5">Registra manualmente la entrada de alguien que aún no aparece en ' + esc(asisFecha) + '. Se marca como <b>Trabajando</b> desde la hora indicada.</p>' +
      '<div class="fld"><label>Miembro del equipo</label><select id="amU">' + (libres.length ? libres.map(function (u) { return '<option value="' + u.id + '">' + esc(u.nombre) + ' · ' + esc(u.area || u.cargo || '') + '</option>'; }).join('') : '<option value="">Todos ya están registrados hoy</option>') + '</select></div>' +
      '<div class="grid g2"><div class="fld"><label>Hora de llegada</label><input id="amHora" type="time" value="08:00"></div>' +
      '<div class="fld"><label>Ubicación</label><select id="amLoc"><option>Oficina</option><option>Remoto</option><option>En cliente</option></select></div></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="amOk"' + (libres.length ? '' : ' disabled style="opacity:.5"') + '>Registrar entrada</button></div>');
    var ok = $('#amOk'); if (ok && libres.length) ok.addEventListener('click', function () {
      var uid = +$('#amU').value, u = byId(uid), hm = $('#amHora').value || '08:00';
      var mn = hhmmMin(hm);
      db.asistencia.push({ id: db.nextAsisId++, userId: uid, nombre: u.nombre, area: u.area, fecha: asisFecha, estado: $('#amLoc').value, productivo: '', inactivo: '', desktime: '', llego: fmtHora(mn), salio: '', enTrabajo: '', appActiva: '', proyecto: '', ultimoReporte: fmtHora(nowMin()), cargadoPor: me.nombre, cargadoEl: new Date().toISOString() });
      logHist(u, 'Entrada registrada ' + asisFecha + ' a las ' + fmtHora(mn) + ' (' + $('#amLoc').value + ')', me.nombre);
      saveDB(db); closeModal(); rAsistencia(); toast('Entrada de ' + u.nombre.split(' ')[0] + ' registrada.');
    });
  }

  function asisPlantilla() {
    var ej = db.users.find(function (u) { return u.activo && u.role === 'interno'; }) || db.users[0];
    var rows = [
      ['Nombre', 'Email', 'Area', 'Fecha', 'Estado', 'Hora de entrada (Control de acceso)', 'Hora inicio sesion (Desk Time)', 'Observaciones'],
      [ej ? ej.nombre : 'Nombre Apellido', ej ? ej.email : 'correo@somosvepagos.com', ej ? (ej.area || 'Tecnologia') : 'Tecnologia', '2026-07-13', 'Oficina', '8:03 AM', '8:10 AM', ''],
      [ej ? ej.nombre : 'Nombre Apellido', ej ? ej.email : 'correo@somosvepagos.com', ej ? (ej.area || 'Tecnologia') : 'Ventas', '2026-07-13', 'Ausente', '', '', 'Permiso medico']
    ];
    csvDownload(rows, 'plantilla-asistencia-vepagos.csv');
    toast('Plantilla descargada. Ábrela en Excel, llénala y súbela.');
  }

  function openAsisUpload() {
    var parsed = null;
    function draw() {
      var preview = '';
      if (parsed) {
        var emp = parsed.filter(function (r) { return r.userId; }).length;
        var sinEmp = parsed.length - emp;
        var sample = parsed.slice(0, 6);
        preview = '<div style="background:#F6F9FD;border:1px solid var(--line);border-radius:11px;padding:12px 14px;margin:6px 0 12px">' +
          '<div style="font-weight:800;color:var(--navy);font-size:14px;margin-bottom:6px">Vista previa</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><span class="chip n">' + parsed.length + ' filas</span><span class="chip g">' + emp + ' emparejadas</span>' + (sinEmp ? '<span class="chip y">' + sinEmp + ' sin emparejar</span>' : '') + '</div>' +
          '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Miembro</th><th>Estado</th><th>Entrada</th><th>Inicio sesión</th><th>Observaciones</th></tr></thead><tbody>' +
          sample.map(function (r) { return '<tr><td>' + esc(r.nombre || '—') + (r.userId ? '' : ' <span class="chip y">?</span>') + '</td><td>' + esc(r.estado || '—') + '</td><td>' + esc(r.llego || '—') + '</td><td>' + esc(r.desktimeInicio || r.desktime || '—') + '</td><td>' + esc(r.obs || '—') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
          (parsed.length > 6 ? '<div class="note" style="margin-top:6px">…y ' + (parsed.length - 6) + ' filas más.</div>' : '') +
          (sinEmp ? '<div class="note" style="margin-top:6px;color:#9A6B00">Las filas sin emparejar se guardan igual, pero no se asocian a un perfil. Revisa que el email o el nombre coincidan.</div>' : '') +
        '</div>';
      }
      modal('<button class="mod-x">✕</button><h3>Carga masiva de asistencia</h3>' +
        '<p style="color:var(--muted);font-size:13.5px;margin:4px 0 10px;line-height:1.55">Sube el reporte de asistencia en <b>Excel (.xlsx)</b> o <b>CSV</b> con columnas <b>Nombre, Estado, Hora de entrada (Control de acceso), Hora inicio sesión (Desk Time), Observaciones</b>. Emparejamos cada fila por nombre o email. <a href="#" id="auTpl">Descargar plantilla</a></p>' +
        '<div class="fld"><label>Archivo</label><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><button type="button" class="btn-s" id="auPick">Seleccionar archivo</button><span id="auName" style="font-size:13px;color:var(--muted)">Ningún archivo</span></div></div>' +
        preview +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="auOk"' + (parsed && parsed.length ? '' : ' disabled style="opacity:.5;cursor:not-allowed"') + '>Confirmar carga' + (parsed && parsed.length ? ' (' + parsed.length + ')' : '') + '</button></div>');
      $('#auTpl').addEventListener('click', function (e) { e.preventDefault(); asisPlantilla(); });
      $('#auPick').addEventListener('click', function () {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv';
        inp.onchange = function () {
          var f = inp.files[0]; if (!f) return;
          $('#auName').textContent = f.name;
          parseSheet(f, function (err, rows) {
            if (err) { toast(err); return; }
            parsed = asisMapRows(rows);
            if (!parsed.length) { toast('No se encontraron filas válidas. Revisa los encabezados.'); }
            draw();
          });
        };
        inp.click();
      });
      var ok = $('#auOk');
      if (ok && parsed && parsed.length) ok.addEventListener('click', function () {
        var now = new Date().toISOString();
        parsed.forEach(function (r) {
          db.asistencia.push({ id: db.nextAsisId++, userId: r.userId, nombre: r.nombre, area: r.area, fecha: r.fecha, estado: r.estado, productivo: r.productivo, inactivo: r.inactivo, desktime: r.desktime, desktimeInicio: r.desktimeInicio, llego: r.llego, salio: r.salio, enTrabajo: r.enTrabajo, appActiva: r.appActiva, proyecto: r.proyecto, ultimoReporte: r.ultimoReporte, obs: r.obs, observaciones: r.obs, cargadoPor: me.nombre, cargadoEl: now });
          if (r.userId) logHist(byId(r.userId), 'Asistencia registrada ' + (r.fecha || '') + ': llegó ' + (r.llego || '—') + ', salió ' + (r.salio || '—') + (r.desktime ? ' · DeskTime ' + r.desktime : ''), me.nombre);
        });
        saveDB(db); closeModal(); rAsistencia(); toast(parsed.length + ' registros de asistencia cargados.');
      });
    }
    draw();
  }

  /* ---------- METAS Y OBJETIVOS ---------- */
  var metasHistTab = 'dash';
  function rMetas() {
    resetContent();
    var esAdmin = me.role === 'admin';
    var m = db.metas;
    var sec = current === 'metasvision' ? 'vision' : current === 'metashist' ? 'historico' : 'metas2026';
    var HERO = {
      metas2026: ['#EAF1FD', '#2A6FDB', 'Metas 2026', 'Los objetivos estratégicos de VEPAGOS para este año.'],
      vision: ['#F1EAFB', '#8A5CD1', 'Visión', 'Hacia dónde vamos y cuál es nuestro norte.'],
      historico: ['#E7F6EE', '#1F8A5B', 'Histórico', 'Metas y resultados de años anteriores.']
    };
    var H = HERO[sec];
    var html = '<div class="pf-hero" style="margin-bottom:18px">' +
      '<div class="pf-id" style="min-width:auto"><div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#00E58C;margin-bottom:6px"><span style="width:8px;height:8px;border-radius:50%;background:#00CE7C"></span>Metas y objetivos</div>' +
      '<div class="pf-name">' + H[2] + '</div>' +
      '<div class="pf-role">' + H[3] + '</div></div>' +
      (esAdmin ? '<div style="position:relative;z-index:2"><button class="btn-g" id="btnEditMetas" style="background:#fff;color:var(--navy)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>Editar</button></div>' : '') +
    '</div>';

    if (sec === 'metas2026') {
      var kpis = m.kpis || [];
      if (kpis.length) {
        html += '<div class="card" style="margin-bottom:16px"><div class="toolrow" style="margin:0 0 4px"><h3 style="margin:0">Indicadores clave — actual vs meta 2026</h3><span class="sp"></span>' + (m.updated ? '<span class="chip n">Datos a ' + esc(m.updated) + '</span>' : '') + '</div>' +
          '<div class="note" style="margin:0 0 12px">Estado actual del negocio frente a la meta de cierre de año.</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">' + kpis.map(function (k) {
            return '<div style="border:1px solid var(--line);border-radius:14px;padding:15px 16px">' +
              '<div style="font-size:12px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">' + esc(k.k) + '</div>' +
              '<div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:24px;font-weight:800;color:var(--navy);letter-spacing:-.5px">' + esc(k.actual) + '</span>' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>' +
              '<span style="font-size:15px;font-weight:800;color:' + (k.dir === 'down' ? '#B23A6E' : '#00874f') + '">' + esc(k.meta) + '</span></div>' +
              '<div style="font-size:11.5px;color:var(--muted2);margin-top:4px">Meta dic 2026</div></div>';
          }).join('') + '</div></div>';
      }
      html += '<div class="pf-card" style="margin-bottom:16px"><div class="pf-ch"><span class="ic" style="background:#EAF1FD;color:#2A6FDB"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></span><h3>Objetivos estratégicos</h3></div>' +
        (m.objetivos.length ? '<div style="display:flex;flex-direction:column;gap:12px">' + m.objetivos.map(function (o, i) {
          return '<div style="display:flex;gap:14px;padding:14px 0' + (i < m.objetivos.length - 1 ? ';border-bottom:1px solid #F2F6FB' : '') + '">' +
            '<span style="width:34px;height:34px;border-radius:10px;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex:0 0 auto">' + (i + 1) + '</span>' +
            '<div style="flex:1;min-width:0"><div style="font-weight:800;color:var(--navy);font-size:15px">' + esc(o.titulo) + '</div><div style="font-size:14px;color:var(--muted);margin-top:3px;line-height:1.55">' + esc(o.desc) + '</div>' +
            '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' + (o.metrica ? '<span class="chip g">' + esc(o.metrica) + '</span>' : '') + (o.plazo ? '<span class="chip n">' + esc(o.plazo) + '</span>' : '') + '</div></div></div>';
        }).join('') + '</div>' : '<div class="empty">Aún no hay objetivos definidos.</div>') + '</div>';
      var mm = m.metasMensuales || [];
      if (mm.length) {
        html += '<div class="pf-card"><div class="pf-ch"><span class="ic" style="background:#E7F6EE;color:#1F8A5B"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M8 2v4M16 2v4M3 10h18"></path></svg></span><h3>Metas mensuales · Mayo–Diciembre 2026</h3></div>' +
          '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Mes</th><th>Colocaciones</th><th>Churn máx.</th><th>Reactivaciones</th><th>Cobranza</th><th>ARPU</th></tr></thead><tbody>' +
          mm.map(function (r) { return '<tr><td style="font-weight:700;color:var(--navy)">' + esc(r[0]) + '</td><td>' + esc(String(r[1])) + '</td><td>' + esc(r[2]) + '</td><td>' + esc(String(r[3])) + '</td><td>' + esc(r[4]) + '</td><td>' + esc(r[5]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      }
    } else if (sec === 'vision') {
      html += '<div class="pf-grid" style="margin-bottom:16px">' +
        '<div class="pf-card"><div class="pf-ch"><span class="ic" style="background:#F1EAFB;color:#8A5CD1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle></svg></span><h3>Nuestra visión</h3></div>' +
          '<div style="font-size:15.5px;line-height:1.6;color:#33415C">' + esc(m.vision) + '</div></div>' +
        '<div class="pf-card"><div class="pf-ch"><span class="ic" style="background:#E7F6EE;color:#1F8A5B"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle></svg></span><h3>Nuestro norte</h3></div>' +
          '<div style="font-size:15.5px;line-height:1.6;color:#33415C">' + esc(m.norte) + '</div></div>' +
      '</div>';
      var proy = m.proyeccion || [];
      if (proy.length) {
        html += '<div class="pf-card"><div class="pf-ch"><span class="ic" style="background:#FBF1DC;color:#C9922B"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="m7 14 4-4 4 4 5-5"></path></svg></span><h3>Proyección trianual 2026–2028</h3></div>' +
          '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Concepto</th><th>2026 (proy.)</th><th>2027</th><th>2028</th></tr></thead><tbody>' +
          proy.map(function (r) { return '<tr><td style="font-weight:700;color:var(--navy)">' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td style="font-weight:700;color:#00874f">' + esc(r[3]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      }
    } else {
      var hist = (m.historico || []);
      if (hist.length) {
        if (!hist.some(function (h) { return h.id === metasHistTab; })) metasHistTab = hist[0].id;
        var act = hist.find(function (h) { return h.id === metasHistTab; }) || hist[0];
        html += '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:14px;scrollbar-width:none">' +
          hist.map(function (h) {
            var on = h.id === metasHistTab;
            return '<button data-histtab="' + h.id + '" style="flex:0 0 auto;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;border-radius:11px;padding:9px 15px;border:1.5px solid ' + (on ? h.color : 'var(--line)') + ';background:' + (on ? h.color : '#fff') + ';color:' + (on ? '#fff' : 'var(--navy)') + ';white-space:nowrap;transition:all .15s">' + esc(h.area) + '</button>';
          }).join('') + '</div>';
        function riskChip(v) { var lc = String(v).toLowerCase(); var c = lc.indexOf('alto') > -1 || lc.indexOf('concentr') > -1 ? 'r' : lc.indexOf('medio') > -1 ? 'y' : 'g'; return '<span class="chip ' + c + '">' + esc(v) + '</span>'; }
        html += '<div class="pf-card" style="border-left:4px solid ' + act.color + '">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="width:32px;height:32px;border-radius:9px;background:' + act.bg + ';color:' + act.color + ';display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="m7 14 4-4 4 4 5-5"></path></svg></span><h3 style="margin:0">' + esc(act.area) + '</h3></div>' +
          (act.intro ? '<div class="note" style="margin:0 0 8px;font-size:13.5px">' + esc(act.intro) + '</div>' : '') +
          (act.updated ? '<div style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted2);margin:0 0 12px;background:#F4F8FD;border:1px solid var(--line);border-radius:8px;padding:5px 10px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>Actualizado por última vez: <b style="color:var(--navy)">' + esc(fmtStamp(act.updated)) + '</b></div>' : '') +
          '<div style="overflow-x:auto"><table class="tbl"><thead><tr>' + act.cols.map(function (c, i) { return '<th' + (i === 0 ? '' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          act.filas.map(function (row) { return '<tr>' + row.map(function (cell, ci) {
            var isRisk = act.cols[ci] && String(act.cols[ci]).toLowerCase().indexOf('riesgo') > -1;
            return '<td' + (ci === 0 ? ' style="font-weight:700;color:var(--navy);white-space:nowrap"' : '') + '>' + (isRisk ? riskChip(cell) : esc(cell)) + '</td>';
          }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
          (act.histFilas && act.histFilas.length ? '<div style="font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted2);margin:16px 0 6px">' + esc(act.histTitulo || 'Histórico') + '</div><div style="overflow-x:auto"><table class="tbl"><thead><tr>' + act.histCols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + act.histFilas.map(function (row) { return '<tr>' + row.map(function (cell, ci) { return '<td' + (ci === 0 ? ' style="font-weight:700;color:var(--navy)"' : '') + '>' + esc(cell) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '') +
        '</div>';
      } else {
        html += '<div class="pf-card"><div class="empty">Aún no hay metas de años anteriores registradas.' + (esAdmin ? ' Usa “Editar” para agregar el histórico.' : '') + '</div></div>';
      }
    }

    $('#content').innerHTML = html;
    var eb = $('#btnEditMetas'); if (eb) eb.addEventListener('click', sec === 'historico' ? function () { openHistModal(metasHistTab); } : openMetasModal);
    $$('#content [data-histtab]').forEach(function (b) { b.addEventListener('click', function () { metasHistTab = b.getAttribute('data-histtab'); rMetas(); }); });
  }

  function openMetasModal() {
    var objs = db.metas.objetivos.map(function (o) { return { id: o.id, titulo: o.titulo, desc: o.desc, metrica: o.metrica, plazo: o.plazo }; });
    var meta = { vision: db.metas.vision, norte: db.metas.norte };
    function draw() {
      var body = '<button class="mod-x">✕</button><h3>Editar metas y objetivos</h3>' +
        '<div class="fld"><label>Nuestra visión</label><textarea id="mtV" style="min-height:70px">' + esc(meta.vision) + '</textarea></div>' +
        '<div class="fld"><label>Nuestro norte</label><textarea id="mtN" style="min-height:60px">' + esc(meta.norte) + '</textarea></div>' +
        '<div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin:10px 0 6px">Objetivos estratégicos</div>' +
        objs.map(function (o, i) {
          return '<div style="border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:8px">' +
            '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span style="font-weight:800;color:var(--navy)">' + (i + 1) + '</span><input data-otit="' + i + '" type="text" value="' + esc(o.titulo) + '" placeholder="Título del objetivo" style="flex:1;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-size:13.5px;font-family:inherit"><button class="btn-s btn-danger" data-odel="' + i + '" style="padding:5px 9px">✕</button></div>' +
            '<textarea data-odesc="' + i + '" placeholder="Descripción" style="min-height:52px;margin-bottom:8px">' + esc(o.desc) + '</textarea>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap"><input data-omet="' + i + '" type="text" value="' + esc(o.metrica || '') + '" placeholder="Métrica (ej: +40% PDV)" style="flex:1;min-width:130px;border:1.5px solid #D9E2EF;border-radius:9px;padding:7px 10px;font-size:13px;font-family:inherit"><input data-opla="' + i + '" type="text" value="' + esc(o.plazo || '') + '" placeholder="Plazo (ej: 2026)" style="flex:1;min-width:110px;border:1.5px solid #D9E2EF;border-radius:9px;padding:7px 10px;font-size:13px;font-family:inherit"></div></div>';
        }).join('') +
        '<button class="btn-s" id="mtAdd" style="margin-bottom:6px">+ Agregar objetivo</button>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="mtOk">Guardar</button></div>';
      modal(body);
      function sync() { meta.vision = $('#mtV').value; meta.norte = $('#mtN').value; objs.forEach(function (o, i) { var t = $('#modalHost [data-otit="' + i + '"]'); if (t) o.titulo = t.value; var d = $('#modalHost [data-odesc="' + i + '"]'); if (d) o.desc = d.value; var mm = $('#modalHost [data-omet="' + i + '"]'); if (mm) o.metrica = mm.value; var p = $('#modalHost [data-opla="' + i + '"]'); if (p) o.plazo = p.value; }); }
      $$('#modalHost [data-odel]').forEach(function (b) { b.addEventListener('click', function () { sync(); objs.splice(+b.getAttribute('data-odel'), 1); draw(); }); });
      $('#mtAdd').addEventListener('click', function () { sync(); objs.push({ id: db.metas.nextObjId++, titulo: '', desc: '', metrica: '', plazo: '' }); draw(); });
      $('#mtOk').addEventListener('click', function () {
        sync();
        db.metas.vision = meta.vision.trim(); db.metas.norte = meta.norte.trim();
        db.metas.objetivos = objs.filter(function (o) { return o.titulo.trim(); }).map(function (o) { return { id: o.id, titulo: o.titulo.trim(), desc: o.desc.trim(), metrica: o.metrica.trim(), plazo: o.plazo.trim() }; });
        saveDB(db); closeModal(); rMetas(); toast('Metas actualizadas.');
      });
    }
    draw();
  }

  function openHistModal(tabId) {
    var work = JSON.parse(JSON.stringify(db.metas.historico || []));
    function newHistArea() { return { id: 'area' + Date.now(), area: 'Nueva área', color: '#2A6FDB', bg: '#EAF1FD', intro: '', cols: ['Concepto', 'Valor'], filas: [['', '']] }; }
    if (!work.length) work.push(newHistArea());
    var idx = 0;
    work.forEach(function (a, i) { if (a.id === tabId) idx = i; });

    function gridEditor(g, cols, filas) {
      var h = '<div style="overflow-x:auto;border:1px solid var(--line);border-radius:11px;padding:8px"><table style="border-collapse:collapse"><thead><tr>';
      cols.forEach(function (c, ci) {
        h += '<th style="padding:3px"><div style="display:flex;flex-direction:column;gap:3px"><input data-g="' + g + '" data-col="' + ci + '" value="' + esc(c) + '" placeholder="Columna" style="width:100%;min-width:90px;border:1.5px solid #C9D6E8;border-radius:7px;padding:6px 7px;font-size:12px;font-weight:700;font-family:inherit;background:#F4F8FD">' + (cols.length > 1 ? '<button data-delcol="' + g + ':' + ci + '" title="Eliminar columna" style="border:none;background:#FBE9F0;color:#B23A6E;border-radius:6px;font-size:10.5px;font-weight:700;padding:3px;cursor:pointer">✕ col</button>' : '<span style="height:20px"></span>') + '</div></th>';
      });
      h += '<th style="width:28px"></th></tr></thead><tbody>';
      filas.forEach(function (row, ri) {
        h += '<tr>';
        cols.forEach(function (c, ci) { h += '<td style="padding:3px"><input data-g="' + g + '" data-r="' + ri + '" data-c="' + ci + '" value="' + esc(row[ci] == null ? '' : row[ci]) + '" style="width:100%;min-width:90px;border:1.5px solid #D9E2EF;border-radius:7px;padding:6px 7px;font-size:12.5px;font-family:inherit"></td>'; });
        h += '<td style="padding:3px;text-align:center">' + (filas.length > 1 ? '<button data-delrow="' + g + ':' + ri + '" title="Eliminar fila" style="border:none;background:#FBE9F0;color:#B23A6E;border-radius:6px;font-size:12px;padding:5px 7px;cursor:pointer">✕</button>' : '') + '</td></tr>';
      });
      h += '</tbody></table></div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn-s" data-addrow="' + g + '">+ Fila</button><button class="btn-s" data-addcol="' + g + '">+ Columna</button></div>';
      return h;
    }
    function syncGrid(g, A, colsKey, filasKey) {
      if (!$('#modalHost [data-g="' + g + '"][data-col="0"]')) return;
      var newCols = A[colsKey].map(function (c, ci) { var el = $('#modalHost [data-g="' + g + '"][data-col="' + ci + '"]'); return el ? el.value : c; });
      var newFilas = A[filasKey].map(function (row, ri) { return newCols.map(function (c, ci) { var el = $('#modalHost [data-g="' + g + '"][data-r="' + ri + '"][data-c="' + ci + '"]'); return el ? el.value : (row[ci] || ''); }); });
      A[colsKey] = newCols; A[filasKey] = newFilas;
    }
    function sync() {
      var A = work[idx];
      var nm = $('#hmName'); if (nm) A.area = nm.value;
      var iv = $('#hmIntro'); if (iv) A.intro = iv.value;
      var cv = $('#hmColor'); if (cv) A.color = cv.value;
      syncGrid('m', A, 'cols', 'filas');
      if (A.histFilas) { var ht = $('#hmHistTit'); if (ht) A.histTitulo = ht.value; syncGrid('h', A, 'histCols', 'histFilas'); }
    }
    function draw() {
      var A = work[idx];
      var body = '<button class="mod-x">✕</button><h3>Editar Histórico · métricas</h3>' +
        '<div class="note" style="margin:0 0 14px">Actualiza las tablas del área seleccionada. Al guardar se registra la fecha y hora del cambio.</div>' +
        '<div class="fld"><label>Área / pestaña</label><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select id="hmSel" style="flex:1;min-width:150px;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-size:13.5px;font-family:inherit">' +
          work.map(function (a, i) { return '<option value="' + i + '"' + (i === idx ? ' selected' : '') + '>' + esc(a.area) + '</option>'; }).join('') +
          '</select><button class="btn-s" id="hmAddArea">+ Área</button>' + (work.length > 1 ? '<button class="btn-s btn-danger" id="hmDelArea">Eliminar</button>' : '') + '</div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:180px"><label>Nombre del área</label><input id="hmName" type="text" value="' + esc(A.area) + '" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-size:13.5px;font-family:inherit"></div>' +
          '<div class="fld" style="width:110px"><label>Color</label><input id="hmColor" type="color" value="' + (/^#[0-9a-f]{6}$/i.test(A.color || '') ? A.color : '#2A6FDB') + '" style="width:100%;height:40px;border:1.5px solid #D9E2EF;border-radius:9px;padding:3px;cursor:pointer"></div></div>' +
        '<div class="fld"><label>Introducción</label><textarea id="hmIntro" style="min-height:54px">' + esc(A.intro || '') + '</textarea></div>' +
        '<div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin:12px 0 6px">Tabla principal</div>' + gridEditor('m', A.cols, A.filas) +
        '<div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin:18px 0 6px">Tabla histórica secundaria (opcional)</div>' +
        (A.histFilas ? '<div class="fld"><label>Título de la tabla</label><input id="hmHistTit" type="text" value="' + esc(A.histTitulo || '') + '" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-size:13.5px;font-family:inherit"></div>' + gridEditor('h', A.histCols, A.histFilas) + '<button class="btn-s btn-danger" id="hmDelHist" style="margin-top:8px">Quitar tabla secundaria</button>' : '<button class="btn-s" id="hmAddHist">+ Agregar tabla secundaria</button>') +
        '<div class="mod-actions"><button class="btn-s" id="hmCancel">Cancelar</button><button class="btn-g" id="hmOk">Guardar cambios</button></div>';
      modal(body, 'wide');
      $('#hmSel').addEventListener('change', function () { sync(); idx = +this.value; draw(); });
      $('#hmAddArea').addEventListener('click', function () { sync(); work.push(newHistArea()); idx = work.length - 1; draw(); });
      var da = $('#hmDelArea'); if (da) da.addEventListener('click', function () { if (!confirm('¿Eliminar esta área del histórico?')) return; work.splice(idx, 1); idx = Math.max(0, idx - 1); draw(); });
      var ah = $('#hmAddHist'); if (ah) ah.addEventListener('click', function () { sync(); var A2 = work[idx]; A2.histTitulo = 'Comparativo histórico'; A2.histCols = ['Año', 'Valor']; A2.histFilas = [['', '']]; draw(); });
      var dh = $('#hmDelHist'); if (dh) dh.addEventListener('click', function () { sync(); var A2 = work[idx]; delete A2.histTitulo; delete A2.histCols; delete A2.histFilas; draw(); });
      $$('#modalHost [data-addrow]').forEach(function (b) { b.addEventListener('click', function () { sync(); var g = b.getAttribute('data-addrow'); var A2 = work[idx]; if (g === 'm') A2.filas.push(A2.cols.map(function () { return ''; })); else A2.histFilas.push(A2.histCols.map(function () { return ''; })); draw(); }); });
      $$('#modalHost [data-addcol]').forEach(function (b) { b.addEventListener('click', function () { sync(); var g = b.getAttribute('data-addcol'); var A2 = work[idx]; if (g === 'm') { A2.cols.push('Columna'); A2.filas.forEach(function (r) { r.push(''); }); } else { A2.histCols.push('Columna'); A2.histFilas.forEach(function (r) { r.push(''); }); } draw(); }); });
      $$('#modalHost [data-delrow]').forEach(function (b) { b.addEventListener('click', function () { sync(); var p = b.getAttribute('data-delrow').split(':'); var A2 = work[idx]; (p[0] === 'm' ? A2.filas : A2.histFilas).splice(+p[1], 1); draw(); }); });
      $$('#modalHost [data-delcol]').forEach(function (b) { b.addEventListener('click', function () { sync(); var p = b.getAttribute('data-delcol').split(':'); var A2 = work[idx]; var ck = p[0] === 'm' ? 'cols' : 'histCols'; var fk = p[0] === 'm' ? 'filas' : 'histFilas'; var c = +p[1]; A2[ck].splice(c, 1); A2[fk].forEach(function (r) { r.splice(c, 1); }); draw(); }); });
      $('#hmCancel').addEventListener('click', closeModal);
      $('#hmOk').addEventListener('click', function () {
        sync();
        work[idx].updated = nowStamp();
        db.metas.historico = work;
        saveDB(db); closeModal(); metasHistTab = work[idx].id; rMetas(); toast('Métricas del histórico actualizadas.');
      });
    }
    draw();
  }
  var ENC_TIPOS = { escala: 'Escala 1–5', opcion: 'Opción múltiple', texto: 'Respuesta abierta' };
  /* ---------- ADMINISTRACIÓN · INDUCCIONES ---------- */
  function rAdminInducciones() {
    resetContent();
    $('#content').innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">Cargando inducciones...</div>';
    Promise.all([window.SV_API.getInducciones(), window.SV_API.getPerfiles()]).then(function (res) {
      var rutas = res[0].error ? [] : res[0];
      var perfiles = res[1].error ? [] : res[1];
      var totalMods = rutas.reduce(function (s, r) { var m = typeof r.modulos === 'string' ? JSON.parse(r.modulos) : (r.modulos || []); return s + m.length; }, 0);
      var html = '<div class="toolrow" style="margin-bottom:16px">' +
        '<div style="font-size:14px;color:var(--muted);max-width:620px;line-height:1.55">Crea y gestiona las <b>rutas de inducción</b> por perfil. Cada ruta tiene módulos con lecciones y quiz que los colaboradores completan al ingresar.</div>' +
        '<span class="sp"></span><button class="btn-g" id="btnNewInd"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Nueva ruta</button></div>';
      html += '<div class="dash-kpis" style="margin-bottom:16px">' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#2A6FDB18;color:#2A6FDB"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></span><div><div class="dash-kpi-n">' + rutas.length + '</div><div class="dash-kpi-l">Rutas creadas</div></div></div>' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#00B87118;color:#00B871"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="M22 4L12 14.01l-3-3"></path></svg></span><div><div class="dash-kpi-n">' + totalMods + '</div><div class="dash-kpi-l">Módulos totales</div></div></div>' +
        '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#8A5CD118;color:#8A5CD1"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg></span><div><div class="dash-kpi-n">' + rutas.filter(function (r) { return r.activa; }).length + '</div><div class="dash-kpi-l">Perfiles con inducción</div></div></div>' +
      '</div>';
      html += '<h3 style="margin:2px 0 10px;font-size:15px;color:var(--navy)">Rutas de inducción</h3><div class="card">' +
        (rutas.length ? rutas.map(function (r) {
          var mods = typeof r.modulos === 'string' ? JSON.parse(r.modulos) : (r.modulos || []);
          var pLabel = r.perfil_key === '_todos' ? 'Todos los perfiles' : (r.perfil_label || r.perfil_key);
          return '<div class="docrow" data-indedit="' + r.id + '" style="cursor:pointer">' +
            '<div class="docic" style="background:#EAF1FD;color:#2A6FDB"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></div>' +
            '<div style="flex:1;min-width:0"><div class="dn">' + esc(r.titulo) + (r.activa ? ' <span class="chip g">Activa</span>' : ' <span class="chip n">Inactiva</span>') + '</div>' +
            '<div class="dm">' + mods.length + ' módulos · Perfil: ' + esc(pLabel) + ' · Actualizada ' + fechaCorta(r.updated_at) + '</div></div>' +
            '<span class="sp"></span><button class="btn-s" data-indedit="' + r.id + '">Editar</button>' +
            '<button class="btn-s btn-danger" data-inddel="' + r.id + '" style="margin-left:6px">Eliminar</button></div>';
        }).join('') : '<div class="empty">Aún no has creado rutas de inducción. Usa "Nueva ruta".</div>') + '</div>';
      $('#content').innerHTML = html;
      $('#btnNewInd').addEventListener('click', function () { induccionForm(null, perfiles); });
      $$('#content [data-indedit]').forEach(function (b) { b.addEventListener('click', function (e) {
        e.stopPropagation();
        var rid = b.getAttribute('data-indedit');
        var r = rutas.find(function (x) { return String(x.id) === rid; });
        if (r) induccionForm(r, perfiles);
      }); });
      $$('#content [data-inddel]').forEach(function (b) { b.addEventListener('click', function (e) {
        e.stopPropagation();
        var rid = b.getAttribute('data-inddel');
        if (!confirm('¿Eliminar esta ruta de inducción?')) return;
        window.SV_API.deleteInduccion(rid).then(function (res) {
          if (res.error) { toast(res.error); return; }
          rAdminInducciones(); toast('Ruta eliminada.');
        });
      }); });
    });
  }
  function induccionForm(ruta, perfiles) {
    var edit = !!ruta;
    var r = ruta ? JSON.parse(JSON.stringify(ruta)) : { perfil_key: '', titulo: '', modulos: [], activa: true };
    r.modulos = typeof r.modulos === 'string' ? JSON.parse(r.modulos) : (r.modulos || []);
    function renderModal() {
      var pfOpts = perfiles.map(function (p) { return '<option value="' + esc(p.key) + '"' + (r.perfil_key === p.key ? ' selected' : '') + '>' + esc(p.label) + '</option>'; }).join('');
      var modsHtml = r.modulos.map(function (m, i) {
        var lessCount = (m.lesson || []).length;
        var quizCount = (m.quiz || []).length;
        return '<div class="card" style="padding:14px 16px;margin-bottom:10px;border-left:4px solid ' + (m.color || '#2A6FDB') + '">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
            '<span style="font-size:10.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Módulo ' + (i + 1) + '</span>' +
            '<span class="sp"></span>' +
            '<button class="btn-s" data-editlesson="' + i + '" style="font-size:11.5px;padding:4px 10px">Lecciones (' + lessCount + ')</button>' +
            '<button class="btn-s" data-editquiz="' + i + '" style="font-size:11.5px;padding:4px 10px">Quiz (' + quizCount + ')</button>' +
            (r.modulos.length > 1 ? '<button class="btn-s btn-danger" data-delmod="' + i + '" style="font-size:11.5px;padding:4px 8px">&times;</button>' : '') +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
            '<div class="fld" style="margin:0"><label style="font-size:12px">Título</label><input data-modt="' + i + '" value="' + esc(m.t || '') + '" style="font-size:13px;padding:7px 10px"></div>' +
            '<div class="fld" style="margin:0"><label style="font-size:12px">Color</label><div style="display:flex;gap:6px;align-items:center"><input type="color" data-modc="' + i + '" value="' + (m.color || '#2A6FDB') + '" style="width:36px;height:32px;padding:2px;border:1px solid #E3EAF3;border-radius:6px;cursor:pointer"><input data-modc2="' + i + '" value="' + (m.color || '#2A6FDB') + '" style="font-size:12px;padding:7px 10px;flex:1"></div></div>' +
          '</div>' +
          '<div class="fld" style="margin:6px 0 0"><label style="font-size:12px">Descripción</label><input data-modd="' + i + '" value="' + esc(m.d || '') + '" style="font-size:13px;padding:7px 10px"></div>' +
        '</div>';
      }).join('');
      modal('<button class="mod-x">\u2715</button><h3>' + (edit ? 'Editar ruta de inducción' : 'Nueva ruta de inducción') + '</h3>' +
        '<div class="fld"><label>Título de la ruta *</label><input id="indTitulo" value="' + esc(r.titulo) + '" placeholder="Ej: Inducción — Equipo VEPAGOS"></div>' +
        '<div class="fld"><label>Perfil destino *</label><select id="indPerfil"><option value="">— Selecciona —</option><option value="_todos"' + (r.perfil_key === '_todos' ? ' selected' : '') + '>✦ Todos los perfiles</option>' + pfOpts + '</select></div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin:12px 0 6px"><div style="font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2)">Módulos (' + r.modulos.length + ')</div><span class="sp"></span><button class="btn-s" id="indAddMod" style="font-size:12px;padding:5px 12px">+ Agregar módulo</button></div>' +
        modsHtml +
        '<div class="mod-actions" style="margin-top:16px"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="indOk">' + (edit ? 'Guardar cambios' : 'Crear ruta') + '</button></div>', 'wide');
      /* Eventos */
      $$('#modalHost [data-modt]').forEach(function (inp) { inp.addEventListener('input', function () { r.modulos[+inp.getAttribute('data-modt')].t = inp.value; }); });
      $$('#modalHost [data-modd]').forEach(function (inp) { inp.addEventListener('input', function () { r.modulos[+inp.getAttribute('data-modd')].d = inp.value; }); });
      $$('#modalHost [data-modc]').forEach(function (inp) { inp.addEventListener('input', function () {
        var i = +inp.getAttribute('data-modc'); r.modulos[i].color = inp.value; r.modulos[i].bg = hexToBg(inp.value);
        var c2 = document.querySelector('[data-modc2="' + i + '"]'); if (c2) c2.value = inp.value;
      }); });
      $$('#modalHost [data-modc2]').forEach(function (inp) { inp.addEventListener('change', function () {
        var i = +inp.getAttribute('data-modc2'); r.modulos[i].color = inp.value; r.modulos[i].bg = hexToBg(inp.value);
        var cp = document.querySelector('[data-modc="' + i + '"]'); if (cp) cp.value = inp.value;
      }); });
      $('#indAddMod').addEventListener('click', function () {
        r.modulos.push({ id: 'm' + Date.now(), t: '', d: '', color: '#2A6FDB', bg: 'rgba(42,111,219,.12)', ico: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>', lesson: [], quiz: [] });
        collectFormState(); renderModal();
      });
      $$('#modalHost [data-delmod]').forEach(function (b) { b.addEventListener('click', function () {
        collectFormState(); r.modulos.splice(+b.getAttribute('data-delmod'), 1); renderModal();
      }); });
      $$('#modalHost [data-editlesson]').forEach(function (b) { b.addEventListener('click', function () {
        collectFormState(); editLessons(+b.getAttribute('data-editlesson'));
      }); });
      $$('#modalHost [data-editquiz]').forEach(function (b) { b.addEventListener('click', function () {
        collectFormState(); editQuiz(+b.getAttribute('data-editquiz'));
      }); });
      $('#indOk').addEventListener('click', doSave);
    }
    function hexToBg(hex) { var r2 = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return 'rgba(' + r2 + ',' + g + ',' + b + ',.12)'; }
    function collectFormState() {
      var t = $('#indTitulo'); if (t) r.titulo = t.value.trim();
      var p = $('#indPerfil'); if (p) r.perfil_key = p.value;
    }
    function doSave() {
      collectFormState();
      if (!r.titulo) { toast('Escribe el título de la ruta.'); return; }
      if (!r.perfil_key) { toast('Selecciona un perfil destino.'); return; }
      r.modulos.forEach(function (m) { if (!m.id) m.id = 'm' + Date.now() + Math.random().toString(36).slice(2, 6); });
      var payload = { titulo: r.titulo, perfil_key: r.perfil_key, modulos: r.modulos, activa: r.activa !== false };
      var promise = edit ? window.SV_API.updateInduccion(ruta.id, payload) : window.SV_API.createInduccion(payload);
      promise.then(function (res) {
        if (res.error) { toast(res.error); return; }
        closeModal(); rAdminInducciones(); toast(edit ? 'Ruta actualizada.' : 'Ruta creada.');
      });
    }
    /* Editor de lecciones */
    function editLessons(modIdx) {
      var mod = r.modulos[modIdx];
      mod.lesson = mod.lesson || [];
      var html = '<button class="mod-x">\u2715</button><h3>Lecciones — ' + esc(mod.t || 'Módulo ' + (modIdx + 1)) + '</h3>' +
        '<div class="note" style="margin:0 0 12px">Cada lección es una página de contenido con título, cuerpo (HTML permitido) y un apunte clave opcional.</div>';
      mod.lesson.forEach(function (l, li) {
        html += '<div class="card" style="padding:12px 16px;margin-bottom:8px">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:10.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Página ' + (li + 1) + '</span><span class="sp"></span>' +
          '<button class="btn-s btn-danger" data-dellesson="' + li + '" style="font-size:11px;padding:3px 8px">&times;</button></div>' +
          '<div class="fld" style="margin:0 0 6px"><label style="font-size:12px">Título</label><input data-lh="' + li + '" value="' + esc(l.h || '') + '" style="font-size:13px;padding:7px 10px"></div>' +
          '<div class="fld" style="margin:0 0 6px"><label style="font-size:12px">Contenido (HTML)</label><textarea data-lb="' + li + '" style="min-height:80px;font-size:12.5px;padding:8px 10px;font-family:monospace">' + esc(l.b || '') + '</textarea></div>' +
          '<div class="fld" style="margin:0"><label style="font-size:12px">Apunte clave (opcional)</label><input data-lk="' + li + '" value="' + esc(l.key || '') + '" style="font-size:13px;padding:7px 10px"></div>' +
        '</div>';
      });
      html += '<div style="margin:8px 0"><button class="btn-s" id="lAddLesson" style="font-size:12px;padding:6px 14px">+ Agregar lección</button></div>' +
        '<div class="mod-actions"><button class="btn-s" id="lBack">Volver</button></div>';
      modal(html, 'wide');
      $$('#modalHost [data-lh]').forEach(function (inp) { inp.addEventListener('input', function () { mod.lesson[+inp.getAttribute('data-lh')].h = inp.value; }); });
      $$('#modalHost [data-lb]').forEach(function (inp) { inp.addEventListener('input', function () { mod.lesson[+inp.getAttribute('data-lb')].b = inp.value; }); });
      $$('#modalHost [data-lk]').forEach(function (inp) { inp.addEventListener('input', function () { mod.lesson[+inp.getAttribute('data-lk')].key = inp.value; }); });
      $$('#modalHost [data-dellesson]').forEach(function (b) { b.addEventListener('click', function () { mod.lesson.splice(+b.getAttribute('data-dellesson'), 1); editLessons(modIdx); }); });
      $('#lAddLesson').addEventListener('click', function () { mod.lesson.push({ h: '', b: '', key: '' }); editLessons(modIdx); });
      $('#lBack').addEventListener('click', function () { renderModal(); });
    }
    /* Editor de quiz */
    function editQuiz(modIdx) {
      var mod = r.modulos[modIdx];
      mod.quiz = mod.quiz || [];
      var html = '<button class="mod-x">\u2715</button><h3>Quiz — ' + esc(mod.t || 'Módulo ' + (modIdx + 1)) + '</h3>' +
        '<div class="note" style="margin:0 0 12px">Cada pregunta tiene opciones de respuesta. Marca la correcta con el radio.</div>';
      mod.quiz.forEach(function (q, qi) {
        html += '<div class="card" style="padding:12px 16px;margin-bottom:8px">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:10.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Pregunta ' + (qi + 1) + '</span><span class="sp"></span>' +
          '<button class="btn-s btn-danger" data-delquiz="' + qi + '" style="font-size:11px;padding:3px 8px">&times;</button></div>' +
          '<div class="fld" style="margin:0 0 8px"><label style="font-size:12px">Pregunta</label><input data-qq="' + qi + '" value="' + esc(q.q || '') + '" style="font-size:13px;padding:7px 10px"></div>' +
          '<div style="font-size:11.5px;font-weight:700;color:var(--muted2);margin-bottom:4px">Opciones (marca la correcta)</div>';
        (q.opts || []).forEach(function (opt, oi) {
          html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
            '<input type="radio" name="qa' + qi + '" data-qans="' + qi + '-' + oi + '"' + (q.a === oi ? ' checked' : '') + ' style="accent-color:#00CE7C;width:17px;height:17px">' +
            '<input data-qopt="' + qi + '-' + oi + '" value="' + esc(opt) + '" style="flex:1;font-size:13px;padding:6px 10px">' +
            (q.opts.length > 2 ? '<button class="btn-s btn-danger" data-delopt="' + qi + '-' + oi + '" style="font-size:11px;padding:3px 8px">&times;</button>' : '') +
          '</div>';
        });
        html += '<button class="btn-s" data-addopt="' + qi + '" style="font-size:11.5px;padding:4px 12px;margin-top:4px">+ Opción</button></div>';
      });
      html += '<div style="margin:8px 0"><button class="btn-s" id="qAddQ" style="font-size:12px;padding:6px 14px">+ Agregar pregunta</button></div>' +
        '<div class="mod-actions"><button class="btn-s" id="qBack">Volver</button></div>';
      modal(html, 'wide');
      function collectQuiz() {
        mod.quiz.forEach(function (q, qi) {
          var qIn = document.querySelector('[data-qq="' + qi + '"]'); if (qIn) q.q = qIn.value;
          (q.opts || []).forEach(function (_, oi) {
            var oIn = document.querySelector('[data-qopt="' + qi + '-' + oi + '"]'); if (oIn) q.opts[oi] = oIn.value;
          });
          var radios = document.querySelectorAll('[name="qa' + qi + '"]');
          radios.forEach(function (rd, ri) { if (rd.checked) q.a = ri; });
        });
      }
      $$('#modalHost [data-delquiz]').forEach(function (b) { b.addEventListener('click', function () { collectQuiz(); mod.quiz.splice(+b.getAttribute('data-delquiz'), 1); editQuiz(modIdx); }); });
      $$('#modalHost [data-addopt]').forEach(function (b) { b.addEventListener('click', function () { collectQuiz(); var qi = +b.getAttribute('data-addopt'); mod.quiz[qi].opts.push(''); editQuiz(modIdx); }); });
      $$('#modalHost [data-delopt]').forEach(function (b) { b.addEventListener('click', function () {
        collectQuiz(); var parts = b.getAttribute('data-delopt').split('-'); var qi = +parts[0], oi = +parts[1];
        mod.quiz[qi].opts.splice(oi, 1); if (mod.quiz[qi].a >= mod.quiz[qi].opts.length) mod.quiz[qi].a = 0;
        editQuiz(modIdx);
      }); });
      $('#qAddQ').addEventListener('click', function () { collectQuiz(); mod.quiz.push({ q: '', opts: ['', '', ''], a: 0 }); editQuiz(modIdx); });
      $('#qBack').addEventListener('click', function () { collectQuiz(); renderModal(); });
    }
    renderModal();
  }

  function encAudiencia() { return db.users.filter(function (u) { return u.activo && u.role !== 'candidato' && perfilVisible(u); }); }
  function rEncuestas() {
    resetContent();
    var encs = (db.encuestas || []).slice().sort(function (a, b) { return b.id - a.id; });
    var total = encAudiencia().length;
    var html = '<div class="toolrow" style="margin-bottom:16px">' +
      '<div style="font-size:14px;color:var(--muted);max-width:620px;line-height:1.55">Crea <b>encuestas</b> para el equipo con audiencia y frecuencia. Les llegan en <b>Notificaciones</b> y aquí ves los resultados en tiempo real.</div>' +
      '<span class="sp"></span><button class="btn-g" id="btnNewEnc"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Nueva encuesta</button></div>';

    var activas = encs.filter(function (e) { return e.estado !== 'cerrada'; });
    var recurrentes = encs.filter(function (e) { return (CADENCIAS[e.cadencia] || CADENCIAS.unica).meses > 0; });
    var totalResp = encs.reduce(function (a, e) { return a + (e.respuestas || []).length; }, 0);
    html += '<div class="dash-kpis" style="margin-bottom:16px">' +
      '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#2A6FDB18;color:#2A6FDB"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></span><div><div class="dash-kpi-n">' + encs.length + '</div><div class="dash-kpi-l">Encuestas enviadas</div></div></div>' +
      '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#00B87118;color:#00B871"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg></span><div><div class="dash-kpi-n">' + activas.length + '</div><div class="dash-kpi-l">Activas ahora</div></div></div>' +
      '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#8A5CD118;color:#8A5CD1"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg></span><div><div class="dash-kpi-n">' + recurrentes.length + '</div><div class="dash-kpi-l">Programadas (recurrentes)</div></div></div>' +
      '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:#FF9F4518;color:#E07B1E"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="m7 14 4-4 4 4 5-5"></path></svg></span><div><div class="dash-kpi-n">' + totalResp + '</div><div class="dash-kpi-l">Respuestas recibidas</div></div></div>' +
    '</div>';
    html += '<h3 style="margin:2px 0 10px;font-size:15px;color:var(--navy)">Historial de encuestas</h3><div class="card">' + (encs.length ? encs.map(function (e) {
      var aud = encAudiencia().filter(function (u) { return enAudiencia(e, u); }).length;
      var ciclo = encCicloActual(e);
      var n = (e.respuestas || []).filter(function (r) { return (r.ciclo || 0) === ciclo; }).length;
      var pct = aud ? Math.round(n / aud * 100) : 0;
      var recur = (CADENCIAS[e.cadencia] || CADENCIAS.unica).meses > 0;
      return '<div class="docrow" data-enc="' + e.id + '" style="cursor:pointer">' +
        '<div class="docic" style="background:#EAF1FD;color:#2A6FDB"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></div>' +
        '<div style="flex:1;min-width:0"><div class="dn">' + esc(e.titulo) + (e.estado === 'cerrada' ? ' <span class="chip n">Cerrada</span>' : ' <span class="chip g">Activa</span>') + (e.tipo === '360' ? ' <span class="chip b">360°</span>' : '') + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 2px"><span class="chip n">' + cadLabel(e.cadencia) + '</span><span class="chip n">' + esc(audLabel(e.audiencia)) + '</span></div>' +
        '<div class="dm">' + (e.preguntas || []).length + ' preguntas · ' + n + '/' + aud + ' respondieron' + (recur ? ' (ciclo actual)' : '') + ' · ' + fechaCorta(e.fecha) + '</div>' +
        '<div class="progress" style="margin-top:6px;max-width:260px"><i style="width:' + pct + '%"></i></div></div>' +
        '<span class="sp"></span><button class="btn-s" data-encview="' + e.id + '">Resultados</button></div>';
    }).join('') : '<div class="empty">Aún no has creado encuestas. Usa “Nueva encuesta”.</div>') + '</div>';
    $('#content').innerHTML = html;
    $('#btnNewEnc').addEventListener('click', encPlantillaPicker);
    $('#content').addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-encview]') || ev.target.closest('[data-enc]');
      if (t) { var e = db.encuestas.find(function (x) { return x.id === +(t.getAttribute('data-encview') || t.getAttribute('data-enc')); }); if (e) encResultados(e); }
    });
  }

  var ENC_PLANTILLAS = [
    {
      id: 'clima',
      nombre: 'Clima laboral',
      icono: '<path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"></path>',
      color: '#00B871',
      cadencia: 'trimestral', audiencia: 'todos',
      titulo: 'Encuesta de clima laboral',
      descripcion: 'Tu opinión es anónima para el equipo y nos ayuda a construir un mejor lugar para trabajar. Responde con honestidad.',
      preguntas: [
        { texto: 'Me siento a gusto trabajando en VEPAGOS.', tipo: 'escala' },
        { texto: 'Recomendaría a VEPAGOS como un buen lugar para trabajar.', tipo: 'escala' },
        { texto: 'Mi jefe directo me trata con respeto y me da retroalimentación útil.', tipo: 'escala' },
        { texto: 'Cuento con las herramientas y recursos que necesito para hacer bien mi trabajo.', tipo: 'escala' },
        { texto: 'Existe buena comunicación entre mi equipo y las demás áreas.', tipo: 'escala' },
        { texto: 'Siento que mi trabajo es reconocido y valorado.', tipo: 'escala' },
        { texto: 'Percibo un equilibrio sano entre mi vida laboral y personal.', tipo: 'escala' },
        { texto: 'Veo oportunidades de crecimiento y desarrollo para mí en la empresa.', tipo: 'escala' },
        { texto: '¿Qué es lo que más valoras de trabajar en VEPAGOS?', tipo: 'texto' },
        { texto: '¿Qué cambiarías o mejorarías para sentirte mejor en tu día a día?', tipo: 'texto' }
      ]
    },
    {
      id: 'enps',
      nombre: 'Pulso rápido (eNPS)',
      icono: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="M22 4 12 14.01l-3-3"></path>',
      color: '#2A6FDB',
      cadencia: 'mensual', audiencia: 'todos',
      titulo: 'Pulso del equipo',
      descripcion: 'Una medición corta y frecuente para tomarle el pulso al equipo. Solo te tomará un minuto.',
      preguntas: [
        { texto: 'En una escala de 1 a 5, ¿qué tan probable es que recomiendes VEPAGOS como lugar para trabajar?', tipo: 'escala' },
        { texto: '¿Cómo te has sentido en el trabajo esta última semana?', tipo: 'opcion', opciones: 'Muy bien, Bien, Regular, Con dificultades, Agotado/a' },
        { texto: '¿Hay algo que quieras contarle a la dirección en este momento?', tipo: 'texto' }
      ]
    },
    {
      id: 'desempeno',
      nombre: 'Desempeño (evaluación)',
      icono: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',
      color: '#8A5CD1',
      cadencia: 'semestral', audiencia: 'todos',
      titulo: 'Evaluación de desempeño',
      descripcion: 'Evaluación de competencias y resultados del colaborador correspondiente al período. Sé objetivo y aporta ejemplos concretos.',
      preguntas: [
        { texto: 'Cumple con los objetivos y metas de su cargo en los plazos acordados.', tipo: 'escala' },
        { texto: 'Calidad y precisión del trabajo entregado.', tipo: 'escala' },
        { texto: 'Responsabilidad, puntualidad y compromiso.', tipo: 'escala' },
        { texto: 'Trabajo en equipo y colaboración con otras áreas.', tipo: 'escala' },
        { texto: 'Comunicación efectiva y actitud de servicio.', tipo: 'escala' },
        { texto: 'Iniciativa, proactividad y capacidad de resolver problemas.', tipo: 'escala' },
        { texto: 'Adaptación al cambio y disposición a aprender.', tipo: 'escala' },
        { texto: 'Vive los valores y la cultura de VEPAGOS.', tipo: 'escala' },
        { texto: 'Principales fortalezas y logros del período.', tipo: 'texto' },
        { texto: 'Áreas de mejora y plan de desarrollo sugerido.', tipo: 'texto' },
        { texto: 'Calificación general del desempeño.', tipo: 'opcion', opciones: 'Excepcional, Supera lo esperado, Cumple lo esperado, Necesita mejorar, No cumple' }
      ]
    },
    {
      id: 'onboarding',
      nombre: 'Experiencia de ingreso',
      icono: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
      color: '#FF9F45',
      cadencia: 'onboarding', audiencia: 'nuevoIngreso',
      titulo: 'Encuesta de experiencia de ingreso (onboarding)',
      descripcion: 'Para quienes se incorporaron recientemente: cuéntanos cómo fue tu llegada a VEPAGOS.',
      preguntas: [
        { texto: 'El proceso de inducción me preparó bien para mi cargo.', tipo: 'escala' },
        { texto: 'Recibí a tiempo las herramientas y accesos que necesitaba.', tipo: 'escala' },
        { texto: 'Mi equipo y mi jefe me recibieron y me hicieron sentir parte.', tipo: 'escala' },
        { texto: 'Entiendo claramente qué se espera de mí y cómo se mide mi trabajo.', tipo: 'escala' },
        { texto: '¿Qué te ayudó más durante tus primeras semanas?', tipo: 'texto' },
        { texto: '¿Qué faltó o mejorarías del proceso de ingreso?', tipo: 'texto' }
      ]
    },
    {
      id: '360',
      nombre: 'Evaluación 360°',
      icono: '<path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>',
      color: '#B23A6E',
      cadencia: 'anual', audiencia: 'todos',
      titulo: 'Evaluación 360°',
      descripcion: 'Retroalimentación integral: evalúa a tu líder, a tus pares y a ti mismo/a. Tus respuestas se usan de forma agregada y constructiva.',
      preguntas: [
        { texto: '¿A quién estás evaluando principalmente en esta ronda?', tipo: 'opcion', opciones: 'A mi líder / supervisor, A un par / compañero de equipo, A un colaborador a mi cargo, Autoevaluación' },
        { texto: 'Comunica con claridad y escucha de forma abierta.', tipo: 'escala' },
        { texto: 'Colabora y apoya a los demás para lograr resultados en conjunto.', tipo: 'escala' },
        { texto: 'Demuestra responsabilidad y cumple sus compromisos.', tipo: 'escala' },
        { texto: 'Muestra liderazgo, iniciativa y capacidad de resolver problemas.', tipo: 'escala' },
        { texto: 'Actúa con respeto, integridad y vive los valores de VEPAGOS.', tipo: 'escala' },
        { texto: 'Da y recibe retroalimentación de manera constructiva.', tipo: 'escala' },
        { texto: 'Fortalezas que debería seguir potenciando.', tipo: 'texto' },
        { texto: 'Una recomendación concreta para su desarrollo.', tipo: 'texto' }
      ]
    },
    { id: 'blank', nombre: 'Empezar desde cero', icono: '<path d="M12 5v14M5 12h14"></path>', color: '#64748B', cadencia: 'unica', audiencia: 'todos', titulo: '', descripcion: '', preguntas: [{ texto: '', tipo: 'escala' }] }
  ];

  function materializeEncSemillas() {
    if (!db._encSemillas || !db._encSemillas.length) return;
    db._encSemillas.forEach(function (s) {
      var p = ENC_PLANTILLAS.find(function (x) { return x.id === s.pid; });
      if (!p) return;
      db.encuestas.push({
        id: db.nextEncId++, titulo: p.titulo, descripcion: p.descripcion,
        preguntas: p.preguntas.map(function (q, i) { return { id: i + 1, texto: q.texto, tipo: q.tipo || 'escala', opciones: q.opciones ? q.opciones.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [] }; }),
        audiencia: p.audiencia, cadencia: p.cadencia, tipo: p.id === '360' ? '360' : 'normal',
        desde: s.desde, por: 'Dirección', fecha: s.desde, estado: 'activa', respuestas: []
      });
    });
    db._encSemillas = null;
    saveDB(db);
  }
  materializeEncSemillas();

  function encPlantillaPicker() {
    var body = '<button class="mod-x">✕</button><h3>Nueva encuesta</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:2px 0 14px;line-height:1.5">Elige una plantilla preformateada con las mejores prácticas de cultura organizacional, o empieza desde cero. Podrás editar todo antes de publicar.</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">' +
      ENC_PLANTILLAS.map(function (p) {
        var n = p.id === 'blank' ? '' : '<span style="font-size:12px;color:var(--muted);font-weight:600">' + p.preguntas.length + ' preguntas</span>';
        return '<button type="button" data-plant="' + p.id + '" style="text-align:left;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:15px;cursor:pointer;font-family:inherit;transition:all .15s" onmouseover="this.style.borderColor=\'' + p.color + '\';this.style.boxShadow=\'0 6px 16px rgba(16,42,80,.08)\'" onmouseout="this.style.borderColor=\'var(--line)\';this.style.boxShadow=\'none\'">' +
          '<span style="width:40px;height:40px;border-radius:11px;background:' + p.color + '18;color:' + p.color + ';display:flex;align-items:center;justify-content:center;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p.icono + '</svg></span>' +
          '<div style="font-weight:800;color:var(--navy);font-size:14.5px">' + esc(p.nombre) + '</div>' +
          '<div style="margin-top:3px">' + n + '</div></button>';
      }).join('') + '</div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button></div>';
    modal(body);
    $$('#modalHost [data-plant]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = ENC_PLANTILLAS.find(function (x) { return x.id === b.getAttribute('data-plant'); });
        closeModal();
        openEncModal(p);
      });
    });
  }

  function openEncModal(plant) {
    plant = plant || ENC_PLANTILLAS[ENC_PLANTILLAS.length - 1];
    var qs = plant.preguntas.map(function (q) { return { texto: q.texto || '', tipo: q.tipo || 'escala', opciones: q.opciones || '' }; });
    var meta = { titulo: plant.titulo || '', descr: plant.descripcion || '', cadencia: plant.cadencia || 'unica', audiencia: plant.audiencia || 'todos', tipo: plant.id === '360' ? '360' : 'normal' };
    var areasDisp = {}; encAudiencia().forEach(function (u) { if (u.area) areasDisp[u.area] = 1; });
    var areasArr = Object.keys(areasDisp).sort();
    var rolesArr = [['interno', 'Equipo interno'], ['gerente', 'Gerencia'], ['rrhh', 'Capital Humano']];
    function draw() {
      var body = '<button class="mod-x">✕</button><h3>Nueva encuesta</h3>' +
        '<div class="fld"><label>Título</label><input id="enT" type="text" value="' + esc(meta.titulo) + '" placeholder="Ej: Clima laboral — julio"></div>' +
        '<div class="fld"><label>Descripción (opcional)</label><textarea id="enD" placeholder="Contexto breve para el equipo">' + esc(meta.descr) + '</textarea></div>' +
        '<div class="grid g2">' +
          '<div class="fld"><label>¿A quién se asigna?</label><select id="enAud">' +
            '<option value="todos"' + (meta.audiencia === 'todos' ? ' selected' : '') + '>Toda la empresa</option>' +
            '<option value="nuevoIngreso"' + (meta.audiencia === 'nuevoIngreso' ? ' selected' : '') + '>Nuevos ingresos (al completar onboarding)</option>' +
            '<optgroup label="Por área">' + areasArr.map(function (a) { return '<option value="area:' + esc(a) + '"' + (meta.audiencia === 'area:' + a ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</optgroup>' +
            '<optgroup label="Por rol">' + rolesArr.map(function (r) { return '<option value="rol:' + r[0] + '"' + (meta.audiencia === 'rol:' + r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</optgroup>' +
          '</select></div>' +
          '<div class="fld"><label>¿Con qué frecuencia?</label><select id="enCad">' + Object.keys(CADENCIAS).map(function (k) { return '<option value="' + k + '"' + (meta.cadencia === k ? ' selected' : '') + '>' + CADENCIAS[k].t + '</option>'; }).join('') + '</select></div>' +
        '</div>' +
        '<div id="enCadNote" style="font-size:12.5px;color:var(--muted);margin:-4px 0 12px;line-height:1.5"></div>' +
        '<div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin:10px 0 6px">Preguntas</div>' +
        qs.map(function (q, i) {
          return '<div style="border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:8px">' +
            '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span style="font-weight:800;color:var(--navy)">' + (i + 1) + '</span><input data-qtext="' + i + '" type="text" value="' + esc(q.texto) + '" placeholder="Escribe la pregunta" style="flex:1;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-size:13.5px;font-family:inherit">' + (qs.length > 1 ? '<button class="btn-s btn-danger" data-qdel="' + i + '" style="padding:5px 9px">✕</button>' : '') + '</div>' +
            '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><select data-qtipo="' + i + '" style="border:1.5px solid #D9E2EF;border-radius:9px;padding:7px 10px;font-size:13px;font-family:inherit">' + Object.keys(ENC_TIPOS).map(function (k) { return '<option value="' + k + '"' + (q.tipo === k ? ' selected' : '') + '>' + ENC_TIPOS[k] + '</option>'; }).join('') + '</select>' +
            (q.tipo === 'opcion' ? '<input data-qopts="' + i + '" type="text" value="' + esc(q.opciones) + '" placeholder="Opciones separadas por coma" style="flex:1;min-width:160px;border:1.5px solid #D9E2EF;border-radius:9px;padding:7px 10px;font-size:13px;font-family:inherit">' : '') +
            '</div></div>';
        }).join('') +
        '<button class="btn-s" id="enAddQ" style="margin-bottom:6px">+ Agregar pregunta</button>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="enOk">Publicar encuesta</button></div>';
      modal(body);
      function sync() { var mt = $('#enT'); if (mt) meta.titulo = mt.value; var md = $('#enD'); if (md) meta.descr = md.value; var au = $('#enAud'); if (au) meta.audiencia = au.value; var cd = $('#enCad'); if (cd) meta.cadencia = cd.value; qs.forEach(function (q, i) { var tx = $('#modalHost [data-qtext="' + i + '"]'); if (tx) q.texto = tx.value; var op = $('#modalHost [data-qopts="' + i + '"]'); if (op) q.opciones = op.value; }); }
      function cadNote() {
        var c = $('#enCad').value, a = $('#enAud').value, el = $('#enCadNote');
        var txt = c === 'onboarding' ? 'Se asigna automáticamente a cada persona en cuanto <b>completa su onboarding</b>.' :
          c === 'unica' ? 'Se envía una sola vez a ' + audLabel(a).toLowerCase() + '.' :
          'Se reenvía de forma automática cada <b>' + cadLabel(c).toLowerCase() + '</b> a ' + audLabel(a).toLowerCase() + '. Cada ciclo vuelve a aparecer en Notificaciones hasta que respondan.';
        el.innerHTML = txt;
      }
      $('#enAud').addEventListener('change', cadNote);
      $('#enCad').addEventListener('change', cadNote);
      cadNote();
      $$('#modalHost [data-qtipo]').forEach(function (s) { s.addEventListener('change', function () { sync(); qs[+s.getAttribute('data-qtipo')].tipo = s.value; draw(); }); });
      $$('#modalHost [data-qdel]').forEach(function (b) { b.addEventListener('click', function () { sync(); qs.splice(+b.getAttribute('data-qdel'), 1); draw(); }); });
      $('#enAddQ').addEventListener('click', function () { sync(); qs.push({ texto: '', tipo: 'escala', opciones: '' }); draw(); });
      $('#enOk').addEventListener('click', function () {
        sync();
        var tit = $('#enT').value.trim(); if (tit.length < 3) { toast('Escribe un título.'); return; }
        var preguntas = qs.filter(function (q) { return q.texto.trim(); }).map(function (q, i) { return { id: i + 1, texto: q.texto.trim(), tipo: q.tipo, opciones: q.tipo === 'opcion' ? q.opciones.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [] }; });
        if (!preguntas.length) { toast('Agrega al menos una pregunta.'); return; }
        db.encuestas.push({ id: db.nextEncId++, titulo: tit, descripcion: $('#enD').value.trim(), preguntas: preguntas, audiencia: meta.audiencia, cadencia: meta.cadencia, tipo: meta.tipo, desde: reqToday(), por: me.nombre, fecha: reqToday(), estado: 'activa', respuestas: [] });
        saveDB(db); closeModal(); refreshNav(); (current === 'adminenc' ? rAdminEnc : rEncuestas)();
        toast(meta.cadencia === 'onboarding' ? 'Encuesta activada. Se asignará automáticamente al completar el onboarding.' : 'Encuesta publicada para ' + audLabel(meta.audiencia).toLowerCase() + '.');
      });
    }
    draw();
  }

  function encRepetir(e) {
    var plant = {
      id: e.tipo === '360' ? '360' : 'repeat',
      nombre: e.titulo, color: '#2A6FDB',
      titulo: e.titulo, descripcion: e.descripcion || '',
      cadencia: e.cadencia || 'unica', audiencia: e.audiencia || 'todos',
      preguntas: (e.preguntas || []).map(function (q) { return { texto: q.texto, tipo: q.tipo, opciones: (q.opciones || []).join(', ') }; })
    };
    closeModal(); openEncModal(plant);
  }
  function preguntasResumen(e) {
    return '<div style="border-top:1px solid #EEF3F9;padding-top:12px;margin-top:12px"><div style="font-weight:800;color:var(--navy);font-size:14px;margin-bottom:8px">Preguntas (' + (e.preguntas || []).length + ')</div>' +
      (e.preguntas || []).map(function (q, i) { return '<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #F4F6FA"><span style="width:20px;font-weight:800;color:var(--muted2);flex:0 0 auto">' + (i + 1) + '</span><div style="flex:1;min-width:0"><div style="font-size:13.5px;color:var(--navy);font-weight:600;line-height:1.4">' + esc(q.texto) + '</div><div style="font-size:11.5px;color:var(--muted2);margin-top:2px">' + (ENC_TIPOS[q.tipo] || q.tipo) + ((q.opciones && q.opciones.length) ? ' · ' + q.opciones.map(esc).join(' / ') : '') + '</div></div></div>'; }).join('') + '</div>';
  }

  function encResultados(e) {
    if (e.tipo === '360') { enc360Resultados(e); return; }
    var ciclo = encCicloActual(e);
    var total = encAudiencia().filter(function (u) { return enAudiencia(e, u); }).length;
    var resp = (e.respuestas || []).filter(function (r) { return (r.ciclo || 0) === ciclo; });
    var recurrente = (CADENCIAS[e.cadencia] || CADENCIAS.unica).meses > 0;
    var body = '<button class="mod-x">✕</button><div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#2A6FDB;margin-bottom:2px">Resultados</div><h3 style="margin-top:2px">' + esc(e.titulo) + '</h3>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 8px"><span class="chip n">' + cadLabel(e.cadencia) + '</span><span class="chip n">' + esc(audLabel(e.audiencia)) + '</span>' + (e.tipo === '360' ? '<span class="chip b">360°</span>' : '') + (recurrente ? '<span class="chip g">Ciclo actual</span>' : '') + '</div>' +
      '<div class="note" style="margin:0 0 12px">' + resp.length + ' de ' + total + ' respondieron' + (recurrente ? ' en este ciclo' : '') + ' · ' + esc(e.por) + ' · desde ' + fechaCorta(e.desde || e.fecha) + '</div>';
    e.preguntas.forEach(function (q) {
      body += '<div style="border-top:1px solid #EEF3F9;padding-top:12px;margin-top:12px"><div style="font-weight:700;color:var(--navy);font-size:14.5px;margin-bottom:8px">' + esc(q.texto) + '</div>';
      var vals = resp.map(function (r) { return r.answers[q.id]; }).filter(function (v) { return v != null && v !== ''; });
      if (q.tipo === 'escala') {
        var prom = vals.length ? (vals.reduce(function (a, b) { return a + (+b); }, 0) / vals.length) : 0;
        body += '<div style="display:flex;align-items:center;gap:12px"><div style="font-size:26px;font-weight:800;color:var(--navy)">' + prom.toFixed(1) + '</div><div style="font-size:12.5px;color:var(--muted)">promedio de ' + vals.length + ' respuestas (1–5)</div></div>';
        for (var s = 5; s >= 1; s--) { var c = vals.filter(function (v) { return +v === s; }).length; var p = vals.length ? Math.round(c / vals.length * 100) : 0; body += '<div style="display:flex;align-items:center;gap:10px;margin-top:5px"><span style="width:14px;font-weight:700;color:var(--navy)">' + s + '</span><div style="flex:1;height:9px;background:#EEF3F9;border-radius:999px;overflow:hidden"><div style="height:100%;width:' + p + '%;background:var(--green)"></div></div><span style="width:34px;text-align:right;font-size:12px;color:var(--muted)">' + c + '</span></div>'; }
      } else if (q.tipo === 'opcion') {
        q.opciones.forEach(function (o) { var c = vals.filter(function (v) { return v === o; }).length; var p = vals.length ? Math.round(c / vals.length * 100) : 0; body += '<div style="display:flex;align-items:center;gap:10px;margin-top:5px"><span style="width:130px;font-size:13px;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(o) + '</span><div style="flex:1;height:9px;background:#EEF3F9;border-radius:999px;overflow:hidden"><div style="height:100%;width:' + p + '%;background:#2A6FDB"></div></div><span style="width:34px;text-align:right;font-size:12px;color:var(--muted)">' + c + '</span></div>'; });
      } else {
        body += vals.length ? vals.map(function (v) { return '<div style="font-size:13.5px;color:#33415C;background:#F6F9FD;border:1px solid var(--line);border-radius:9px;padding:8px 11px;margin-top:5px;line-height:1.5">“' + esc(v) + '”</div>'; }).join('') : '<div class="note">Sin respuestas todavía.</div>';
      }
      body += '</div>';
    });
    var faltan = encAudiencia().filter(function (u) { return enAudiencia(e, u) && !(e.respuestas || []).some(function (r) { return r.userId === u.id && (r.ciclo || 0) === ciclo; }); });
    body += '<div style="border-top:1px solid #EEF3F9;padding-top:12px;margin-top:14px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="font-weight:800;color:var(--navy);font-size:14px">Quién respondió</div><span class="chip g">' + resp.length + '</span>' + (faltan.length ? '<span class="chip y">' + faltan.length + ' pendientes</span>' : '') + '</div>';
    if (resp.length) {
      body += resp.slice().sort(function (a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); }).map(function (r) {
        var u = byId(r.userId);
        return '<div style="display:flex;align-items:center;gap:11px;padding:7px 0;border-bottom:1px solid #F4F6FA">' + (u ? avatarHtml(u, 30, 11.5) : '') +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:13.5px">' + esc(u ? u.nombre : 'Colaborador') + '</div><div style="font-size:12px;color:var(--muted2)">' + esc(u ? u.cargo : '') + '</div></div>' +
          '<span style="font-size:12px;color:var(--muted)">' + fechaCorta(r.fecha) + '</span></div>';
      }).join('');
    } else { body += '<div class="note">Nadie ha respondido este ciclo todavía.</div>'; }
    if (faltan.length) {
      body += '<div style="font-size:11.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted2);margin:12px 0 6px">Pendientes por responder</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:7px">' + faltan.map(function (u) { return '<span style="display:inline-flex;align-items:center;gap:7px;background:#F6F9FD;border:1px solid var(--line);border-radius:999px;padding:5px 11px 5px 6px;font-size:12.5px;color:var(--navy);font-weight:600">' + avatarHtml(u, 22, 9) + esc(u.nombre) + '</span>'; }).join('') + '</div>';
    }
    body += '</div>';
    body += preguntasResumen(e);
    body += '<div class="mod-actions"><button class="btn-s" id="encRep"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>Repetir</button>' + (e.estado === 'cerrada' ? '<button class="btn-s" id="encOpen">Reabrir</button>' : '<button class="btn-s" id="encClose">Cerrar encuesta</button>') + '<button class="btn-s btn-danger" id="encDel">Eliminar</button><button class="btn-g mod-x">Listo</button></div>';
    modal(body);
    var rp = $('#encRep'); if (rp) rp.addEventListener('click', function () { encRepetir(e); });
    var cc = $('#encClose'); if (cc) cc.addEventListener('click', function () { e.estado = 'cerrada'; saveDB(db); closeModal(); refreshNav(); rEncuestas(); toast('Encuesta cerrada.'); });
    var oo = $('#encOpen'); if (oo) oo.addEventListener('click', function () { e.estado = 'activa'; saveDB(db); closeModal(); refreshNav(); rEncuestas(); toast('Encuesta reabierta.'); });
    var dd = $('#encDel'); if (dd) dd.addEventListener('click', function () { db.encuestas = db.encuestas.filter(function (x) { return x.id !== e.id; }); saveDB(db); closeModal(); refreshNav(); rEncuestas(); toast('Encuesta eliminada.'); });
  }

  function enc360Comp(e) { return e.preguntas.filter(function (q) { return q.tipo === 'escala' || q.tipo === 'texto'; }); }
  function nearestVisibleLeader(u) {
    var cur = u.managerId ? byId(u.managerId) : null, guard = 0;
    while (cur && guard++ < 12) {
      if (cur.activo && perfilVisible(cur)) return cur;
      cur = cur.managerId ? byId(cur.managerId) : null;
    }
    return null;
  }
  function enc360Targets(uid) {
    var u = byId(uid); if (!u) return [];
    var out = [], seen = {};
    var lead = nearestVisibleLeader(u);
    if (lead && lead.id !== u.id) { out.push({ id: lead.id, rel: 'lider', relLabel: 'Tu líder / supervisor', nombre: lead.nombre, cargo: lead.cargo }); seen[lead.id] = 1; }
    db.users.filter(function (p) { return p.managerId === u.managerId && p.id !== u.id && p.activo && perfilVisible(p) && !seen[p.id]; })
      .forEach(function (p) { out.push({ id: p.id, rel: 'par', relLabel: 'Compañero de equipo', nombre: p.nombre, cargo: p.cargo }); seen[p.id] = 1; });
    out.push({ id: u.id, rel: 'auto', relLabel: 'Autoevaluación', nombre: u.nombre, cargo: u.cargo });
    return out;
  }
  var REL_META = { lider: { t: 'Líder', color: '#2A6FDB', bg: '#EAF1FD' }, par: { t: 'Par', color: '#1F8A5B', bg: '#E7F6EE' }, auto: { t: 'Tú', color: '#8A5CD1', bg: '#F1EAFB' } };

  function enc360Responder(e) {
    var targets = enc360Targets(me.id);
    var comp = enc360Comp(e);
    var ans = {};
    var head = '<button class="mod-x">✕</button><div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#B23A6E;margin-bottom:2px">Evaluación 360°</div><h3 style="margin-top:2px">' + esc(e.titulo) + '</h3>' +
      (e.descripcion ? '<div class="note" style="margin:0 0 6px">' + esc(e.descripcion) + '</div>' : '') +
      '<div style="background:#FBF0F5;border:1px solid #F0D4E1;border-radius:11px;padding:11px 13px;margin:0 0 8px;font-size:13px;color:#7A2E51;line-height:1.5">Vas a evaluar a <b>' + targets.length + '</b>: tu líder, tus compañeros de equipo y una autoevaluación. Cada bloque usa las mismas competencias.</div>';
    var groups = targets.map(function (t, ti) {
      var rm = REL_META[t.rel];
      var qs = comp.map(function (q) {
        var key = t.id + '_' + q.id;
        var inp = q.tipo === 'escala'
          ? '<div class="doccat" data-escala="' + key + '" style="margin-top:6px">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-val="' + n + '">' + n + '</button>'; }).join('') + '</div>'
          : '<textarea data-texto="' + key + '" placeholder="Tu respuesta (opcional)" style="margin-top:6px"></textarea>';
        return '<div class="fld"><label style="font-size:13px">' + esc(q.texto) + '</label>' + inp + '</div>';
      }).join('');
      return '<div style="border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;gap:11px;margin-bottom:10px">' + (byId(t.id) ? avatarHtml(byId(t.id), 38, 14) : '') +
          '<div style="min-width:0"><div style="font-size:10.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:' + rm.color + '">' + t.relLabel + '</div><div style="font-weight:800;color:var(--navy);font-size:14.5px">' + esc(t.nombre) + '</div><div style="font-size:12px;color:var(--muted)">' + esc(t.cargo || '') + '</div></div>' +
          '<span style="flex:1"></span><span class="chip" style="background:' + rm.bg + ';color:' + rm.color + '">' + (ti + 1) + '/' + targets.length + '</span></div>' +
        qs + '<div style="font-size:11.5px;color:var(--muted2)">1 = muy bajo · 5 = excelente</div></div>';
    }).join('');
    modal(head + groups + '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Ahora no</button><button class="btn-g" id="enc360Send">Enviar evaluación</button></div>');
    $$('#modalHost [data-escala] button').forEach(function (b) {
      b.addEventListener('click', function () { var cont = b.parentNode; cont.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); ans[cont.getAttribute('data-escala')] = b.getAttribute('data-val'); });
    });
    $('#enc360Send').addEventListener('click', function () {
      $$('#modalHost [data-texto]').forEach(function (t) { var v = t.value.trim(); if (v) ans[t.getAttribute('data-texto')] = v; });
      var faltan = false;
      targets.forEach(function (t) { comp.forEach(function (q) { if (q.tipo === 'escala' && !ans[t.id + '_' + q.id]) faltan = true; }); });
      if (faltan) { toast('Califica todas las competencias (escala) de cada persona.'); return; }
      e.respuestas = e.respuestas || [];
      e.respuestas.push({ userId: me.id, fecha: reqToday(), ciclo: encCicloActual(e), tipo360: true, targets: targets.map(function (t) { return { id: t.id, rel: t.rel }; }), answers: ans });
      logHist(me, 'Completó la evaluación 360°: ' + e.titulo);
      saveDB(db); closeModal(); refreshNav(); go(current); toast('¡Evaluación 360° enviada. Gracias!');
    });
  }

  function enc360Resultados(e) {
    var ciclo = encCicloActual(e);
    var resp = (e.respuestas || []).filter(function (r) { return (r.ciclo || 0) === ciclo && r.tipo360; });
    var comp = enc360Comp(e);
    var escalaQs = comp.filter(function (q) { return q.tipo === 'escala'; });
    var textoQs = comp.filter(function (q) { return q.tipo === 'texto'; });
    // agrupar por persona evaluada
    var porPersona = {};
    resp.forEach(function (r) {
      (r.targets || []).forEach(function (t) {
        porPersona[t.id] = porPersona[t.id] || { evalCount: 0, rels: {}, escala: {}, textos: [] };
        var P = porPersona[t.id];
        P.evalCount++; P.rels[t.rel] = (P.rels[t.rel] || 0) + 1;
        escalaQs.forEach(function (q) { var v = r.answers[t.id + '_' + q.id]; if (v != null && v !== '') { P.escala[q.id] = P.escala[q.id] || []; P.escala[q.id].push(+v); } });
        textoQs.forEach(function (q) { var v = r.answers[t.id + '_' + q.id]; if (v) P.textos.push({ q: q.texto, v: v, rel: t.rel }); });
      });
    });
    var body = '<button class="mod-x">✕</button><div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#B23A6E;margin-bottom:2px">Resultados · 360°</div><h3 style="margin-top:2px">' + esc(e.titulo) + '</h3>' +
      '<div class="note" style="margin:2px 0 12px">' + resp.length + ' personas completaron su evaluación · ' + Object.keys(porPersona).length + ' evaluados · ' + cadLabel(e.cadencia) + '</div>';
    var ids = Object.keys(porPersona);
    if (!ids.length) { body += '<div class="empty">Nadie ha respondido este ciclo todavía.</div>'; }
    else {
      body += ids.map(function (uid) {
        var u = byId(+uid), P = porPersona[uid];
        var allVals = [], perQ = escalaQs.map(function (q) { var arr = P.escala[q.id] || []; var avg = arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0; arr.forEach(function (v) { allVals.push(v); }); return { q: q.texto, avg: avg, n: arr.length }; });
        var global = allVals.length ? (allVals.reduce(function (a, b) { return a + b; }, 0) / allVals.length) : 0;
        var relChips = Object.keys(P.rels).map(function (k) { return '<span class="chip" style="background:' + REL_META[k].bg + ';color:' + REL_META[k].color + '">' + P.rels[k] + ' ' + (REL_META[k].t) + '</span>'; }).join(' ');
        return '<div style="border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px">' +
          '<div style="display:flex;align-items:center;gap:11px;margin-bottom:10px">' + (u ? avatarHtml(u, 40, 15) : '') +
            '<div style="flex:1;min-width:0"><div style="font-weight:800;color:var(--navy);font-size:15px">' + esc(u ? u.nombre : 'Colaborador') + '</div><div style="font-size:12px;color:var(--muted)">' + esc(u ? u.cargo : '') + '</div></div>' +
            '<div style="text-align:right"><div style="font-size:24px;font-weight:800;color:var(--navy);line-height:1">' + global.toFixed(1) + '</div><div style="font-size:11px;color:var(--muted)">global (1–5)</div></div></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + relChips + '</div>' +
          perQ.map(function (pq) { var p = Math.round(pq.avg / 5 * 100); return '<div style="display:flex;align-items:center;gap:10px;margin-top:5px"><span style="flex:1;font-size:12.5px;color:#33415C;min-width:0">' + esc(pq.q) + '</span><div style="width:110px;height:8px;background:#EEF3F9;border-radius:999px;overflow:hidden;flex:0 0 auto"><div style="height:100%;width:' + p + '%;background:#B23A6E"></div></div><span style="width:30px;text-align:right;font-weight:700;color:var(--navy);font-size:12.5px">' + (pq.avg ? pq.avg.toFixed(1) : '—') + '</span></div>'; }).join('') +
          (P.textos.length ? '<div style="margin-top:10px;border-top:1px solid #F2F6FB;padding-top:8px"><div style="font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted2);margin-bottom:5px">Comentarios</div>' + P.textos.map(function (t) { return '<div style="font-size:13px;color:#33415C;background:#F6F9FD;border:1px solid var(--line);border-radius:9px;padding:7px 10px;margin-top:5px;line-height:1.5"><span class="chip" style="background:' + REL_META[t.rel].bg + ';color:' + REL_META[t.rel].color + ';margin-right:6px">' + REL_META[t.rel].t + '</span>“' + esc(t.v) + '”</div>'; }).join('') + '</div>' : '') +
        '</div>';
      }).join('');
    }
    body += preguntasResumen(e);
    body += '<div class="mod-actions"><button class="btn-s" id="encRep"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>Repetir</button>' + (e.estado === 'cerrada' ? '<button class="btn-s" id="encOpen">Reabrir</button>' : '<button class="btn-s" id="encClose">Cerrar encuesta</button>') + '<button class="btn-s btn-danger" id="encDel">Eliminar</button><button class="btn-g mod-x">Listo</button></div>';
    modal(body);
    var rp = $('#encRep'); if (rp) rp.addEventListener('click', function () { encRepetir(e); });
    var cc = $('#encClose'); if (cc) cc.addEventListener('click', function () { e.estado = 'cerrada'; saveDB(db); closeModal(); refreshNav(); rEncuestas(); toast('Encuesta cerrada.'); });
    var oo = $('#encOpen'); if (oo) oo.addEventListener('click', function () { e.estado = 'activa'; saveDB(db); closeModal(); refreshNav(); rEncuestas(); toast('Encuesta reabierta.'); });
    var dd = $('#encDel'); if (dd) dd.addEventListener('click', function () { db.encuestas = db.encuestas.filter(function (x) { return x.id !== e.id; }); saveDB(db); closeModal(); refreshNav(); rEncuestas(); toast('Encuesta eliminada.'); });
  }

  function encResponder(e) {
    if (e.tipo === '360') { enc360Responder(e); return; }
    var ans = {};
    var body = '<button class="mod-x">✕</button><div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#2A6FDB;margin-bottom:2px">Encuesta</div><h3 style="margin-top:2px">' + esc(e.titulo) + '</h3>' +
      (e.descripcion ? '<div class="note" style="margin:0 0 8px">' + esc(e.descripcion) + '</div>' : '') +
      e.preguntas.map(function (q) {
        var inp;
        if (q.tipo === 'escala') inp = '<div class="doccat" data-escala="' + q.id + '" style="margin-top:6px">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-val="' + n + '">' + n + '</button>'; }).join('') + '</div><div style="font-size:11.5px;color:var(--muted2);margin-top:3px">1 = muy malo · 5 = excelente</div>';
        else if (q.tipo === 'opcion') inp = '<div class="doccat" data-opcion="' + q.id + '" style="margin-top:6px;flex-direction:column;align-items:stretch">' + q.opciones.map(function (o) { return '<button type="button" data-val="' + esc(o) + '" style="text-align:left">' + esc(o) + '</button>'; }).join('') + '</div>';
        else inp = '<textarea data-texto="' + q.id + '" placeholder="Tu respuesta" style="margin-top:6px"></textarea>';
        return '<div class="fld"><label>' + esc(q.texto) + '</label>' + inp + '</div>';
      }).join('') +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Ahora no</button><button class="btn-g" id="encSend">Enviar respuesta</button></div>';
    modal(body);
    $$('#modalHost [data-escala] button, #modalHost [data-opcion] button').forEach(function (b) {
      b.addEventListener('click', function () {
        var cont = b.parentNode, qid = +(cont.getAttribute('data-escala') || 0) || cont.getAttribute('data-opcion');
        cont.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
        ans[qid] = b.getAttribute('data-val');
      });
    });
    $('#encSend').addEventListener('click', function () {
      $$('#modalHost [data-texto]').forEach(function (t) { ans[t.getAttribute('data-texto')] = t.value.trim(); });
      var faltan = e.preguntas.some(function (q) { return q.tipo !== 'texto' && (ans[q.id] == null || ans[q.id] === ''); });
      if (faltan) { toast('Responde todas las preguntas de escala y opción.'); return; }
      e.respuestas = e.respuestas || [];
      e.respuestas.push({ userId: me.id, fecha: reqToday(), ciclo: encCicloActual(e), answers: ans });
      logHist(me, 'Respondió la encuesta: ' + e.titulo);
      saveDB(db); closeModal(); refreshNav(); go(current); toast('¡Gracias por responder!');
    });
  }

  /* ---------- ORGANIGRAMA ---------- */
  var orgOpen = {};
  var FASE1_SENALES = [
    ['horsepower', 'Horsepower', 'Capacidad intelectual + inteligencia social'],
    ['problemas', 'Resuelve problemas', 'Desempeño real verificado en el pasado'],
    ['etica', 'Ética de trabajo', 'Excelencia personal y constancia sostenida'],
    ['aprendizaje', 'Curva de aprendizaje', 'Absorbe conocimiento y rinde con autonomía rápido'],
    ['eleva', 'Eleva a otros', 'Liderazgo con el ejemplo y transmisión de conocimiento'],
    ['ambicion', 'Ambición', 'Superación y crecimiento con ejecución constante'],
    ['agencia', 'Agencia', 'Logra resultados de alta calidad en incertidumbre']
  ];
  var FASE1_ETAPAS = [
    ['requerimiento', '1 · Requerimiento', 'Líder del área', 'Completa el formato estándar del cargo (misión, responsabilidades, herramientas reales).', 'Bloque de cargo'],
    ['perfil', '2 · Perfil', 'Capital Humano', 'Perfil publicable estilo Vepagos + guía interna, on-brand.', 'Perfil DOCX + PDF'],
    ['difusion', '3 · Difusión', 'CH / Mercadeo', 'Texto de LinkedIn (sin emojis) e historia de WhatsApp.', 'Copy + pieza 1080×1920'],
    ['sourcing', '4 · Sourcing', 'Capital Humano', 'Búsqueda activa: arbitrajes de talento + referencias duras.', 'Target list'],
    ['screening', '5 · Screening', 'Capital Humano', 'Filtro contra must-have, potencial y red flags.', 'Shortlist'],
    ['entrevistas', '6 · Entrevistas', 'CH + área técnica', 'Proceso exigente con casos reales y scorecard (1–5).', 'Evaluaciones'],
    ['oferta', '7 · Oferta y cierre', 'CH + Dirección', '"Intercambio de problemas": carrera y contexto por desempeño.', 'Carta oferta'],
    ['onboarding', '8 · Onboarding', 'Área + CH', 'Inducción y primera misión clave de 30 días.', 'Plan de inducción']
  ];
  var SCORECARD_CRIT = [
    ['Experiencia / potencial', 'Cumple el must-have y muestra curva de aprendizaje'],
    ['Herramientas', 'Domina el stack real del rol'],
    ['Comunicación', 'Claridad, dicción y ortografía'],
    ['Actitud / agencia', 'Resuelve y empuja sin que se lo pidan'],
    ['Encaje cultural', 'Propósito, cultura de dueño y trabajo en equipo']
  ];
  function f1EtapaLabel(k) { var e = FASE1_ETAPAS.filter(function (x) { return x[0] === k; })[0]; return e ? e[1] : k; }
  var _candCv = null;
  function wireCandCv() {
    var btn = $('#caCvBtn'); if (!btn) return;
    btn.addEventListener('click', function () {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,.doc,.docx,image/*';
      inp.onchange = function () { var f = inp.files[0]; if (!f) return; if (f.size > 6 * 1024 * 1024) { toast('El archivo supera 6 MB.'); return; } var rd = new FileReader(); rd.onload = function () { _candCv = { data: rd.result, name: f.name }; var nm = $('#caCvName'); if (nm) { nm.textContent = f.name; nm.style.color = 'var(--navy)'; } var rm = $('#caCvRm'); if (rm) rm.style.display = ''; }; rd.readAsDataURL(f); };
      inp.click();
    });
    var rm = $('#caCvRm'); if (rm) rm.addEventListener('click', function () { _candCv = null; var nm = $('#caCvName'); if (nm) { nm.textContent = 'Sin CV adjunto'; nm.style.color = 'var(--muted)'; } rm.style.display = 'none'; });
  }
  function candScoreAvg(c) { var s = c.senales || {}, vals = FASE1_SENALES.map(function (x) { return +s[x[0]] || 0; }).filter(function (v) { return v > 0; }); if (!vals.length) return 0; return Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length * 10) / 10; }
  function canManageCand() { return me.role === 'admin' || me.role === 'rrhh'; }
  function candScopeIds() {
    if (me.role === 'gerente' || me.role === 'gerenteop' || me.role === 'coordinador' || me.role === 'reclutador') { return [me.id].concat(subtree(me.id).map(function (u) { return u.id; })); }
    return null;
  }
  function candVisibles() {
    var sc = candScopeIds();
    return (db.orgCandidatos || []).filter(function (c) {
      if (!sc) return true;
      if (!c.vacanteId) return canManageCand();
      var v = db.vacantes.filter(function (x) { return x.id === c.vacanteId; })[0];
      return v && sc.indexOf(v.managerId) > -1;
    });
  }
  function candVacLabel(c) { if (!c.vacanteId) return 'Sin vacante asignada'; var v = db.vacantes.filter(function (x) { return x.id === c.vacanteId; })[0]; return v ? v.cargo : 'Vacante eliminada'; }
  function orgCandCard() {
    if (!(canManageCand() || me.role === 'gerente' || me.role === 'gerenteop' || me.role === 'coordinador')) return '';
    var list = candVisibles();
    var scoreDot = function (n) { var col = n >= 4 ? '#00874f' : n >= 3 ? '#B26A00' : n > 0 ? '#C0392B' : '#94A3B8'; return '<span style="font-weight:800;color:' + col + '">' + (n || '—') + '</span>'; };
    var rows = list.length ? list.map(function (c) {
      var avg = candScoreAvg(c);
      return '<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #EEF3F9;flex-wrap:wrap;cursor:pointer" data-cand="' + c.id + '">' +
        '<div style="width:34px;height:34px;border-radius:50%;background:#EEF3FB;color:#2A6FDB;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:0 0 auto">' + initials(c.nombre) + '</div>' +
        '<div style="flex:1;min-width:180px"><div style="font-weight:700;color:var(--navy)">' + esc(c.nombre) + '</div><div style="font-size:12.5px;color:var(--muted)">' + esc(candVacLabel(c)) + (c.ciudad ? ' · ' + esc(c.ciudad) : '') + '</div></div>' +
        '<div style="text-align:center;min-width:64px"><div style="font-size:10px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted2)">Score</div>' + scoreDot(avg) + '</div>' +
        '<span class="chip n" style="font-size:10.5px">' + esc(f1EtapaLabel(c.etapa)) + '</span>' +
        (canManageCand() ? '<button class="btn-s btn-danger" data-canddel="' + c.id + '" style="font-size:11.5px;padding:4px 9px">Eliminar</button>' : '') +
      '</div>';
    }).join('') : '<div class="empty">Aún no hay candidatos registrados' + (canManageCand() ? '. Agrega el primero.' : ' para tus vacantes.') + '</div>';
    return '<div class="card" style="margin-top:16px">' +
      '<div class="toolrow"><h3 style="margin:0">Candidatos para vacantes</h3><span class="sp"></span>' +
      '<button class="btn-s" id="btnFase1">Ver proceso Fase 1</button>' +
      (canManageCand() ? '<button class="btn-g" id="btnAddCand"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Agregar candidato</button>' : '') + '</div>' +
      '<div class="note" style="margin:0 0 6px">Posibles candidatos para las vacantes abiertas. Los gerentes de área ven los candidatos de las vacantes de su equipo; Capital Humano gestiona todos.</div>' +
      rows + '</div>';
  }
  function fase1Modal() {
    modal('<button class="mod-x">✕</button><h3>Fase 1 · Atracción y selección</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:4px 0 10px">Contratamos por <b>potencial de aprendizaje</b> sobre credenciales rígidas (framework "Cinturón Unicornio"). No llenamos puestos: subimos de división con el mejor talento. Proceso riguroso, ágil y transparente.</p>' +
      '<div class="card" style="background:#F8FAFD;margin:0 0 12px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin-bottom:4px">Filosofía de talento</div><div style="font-size:13px;color:#33415C;line-height:1.55">Buscamos "messicitos": potencial, no credenciales. La experiencia evita caer; el potencial hace crecer. <b>Arbitraje de talento:</b> el mejor talento suele estar donde otros no miran (mujeres, migrantes, quienes tuvieron menos oportunidades). Elitismo por <b>rendimiento</b>, nunca por origen, género o apellido.</div></div>' +
      '<div style="font-size:11.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:4px 0 6px">Las 7 señales de alto potencial</div>' +
      FASE1_SENALES.map(function (s) { return '<div style="padding:8px 0;border-bottom:1px solid #F2F6FB"><b style="color:var(--navy);font-size:13.5px">' + esc(s[1]) + '</b><div style="font-size:12.5px;color:var(--muted)">' + esc(s[2]) + '</div></div>'; }).join('') +
      '<div style="font-size:11.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:16px 0 6px">El proceso de punta a punta (8 etapas)</div>' +
      FASE1_ETAPAS.map(function (e) { return '<div style="display:flex;gap:11px;padding:8px 0;border-bottom:1px solid #F2F6FB"><div style="flex:1"><b style="color:var(--navy);font-size:13.5px">' + esc(e[1]) + '</b><div style="font-size:12.5px;color:var(--muted)">' + esc(e[3]) + '</div><div style="font-size:11.5px;color:var(--muted2);margin-top:2px">Entregable: <b>' + esc(e[4]) + '</b></div></div><span class="chip n" style="font-size:10px;align-self:flex-start">' + esc(e[2]) + '</span></div>'; }).join('') +
      '<div style="font-size:11.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:16px 0 6px">Scorecard de entrevista (1–5)</div>' +
      SCORECARD_CRIT.map(function (s) { return '<div style="padding:7px 0;border-bottom:1px solid #F2F6FB"><b style="color:var(--navy);font-size:13px">' + esc(s[0]) + '</b><div style="font-size:12.5px;color:var(--muted)">' + esc(s[1]) + '</div></div>'; }).join('') +
      '<div class="card" style="background:#F0FBF6;border-left:4px solid #00CE7C;margin:14px 0 0"><div style="font-size:13px;color:#33415C;line-height:1.5"><b>Entregables por vacante:</b> Perfil DOCX + PDF · Texto de LinkedIn · Historia de WhatsApp (1080×1920). Todo on-brand (Barlow, verde #00CE7C, navy #001F60), en español y sin emojis. Descárgalos en <b>Biblioteca → Captaciones</b>.</div></div>' +
      '<div class="mod-actions"><button class="btn-s" id="f1Bib">Ir a Captaciones</button><button class="btn-g mod-x">Entendido</button></div>', 'wide');
    var fb = $('#f1Bib'); if (fb) fb.addEventListener('click', function () { closeModal(); docCat = 'captaciones'; go('docs'); });
  }
  function candFormFields(c) {
    c = c || {};
    var vacs = db.vacantes.filter(function (v) { return v.estado === 'abierta'; });
    return '<div class="fld"><label>Nombre completo *</label><input id="caN" type="text" value="' + esc(c.nombre || '') + '"></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:160px"><label>Correo</label><input id="caE" type="email" value="' + esc(c.email || '') + '"></div>' +
      '<div class="fld" style="flex:1;min-width:140px"><label>Teléfono</label><input id="caT" type="text" value="' + esc(c.telefono || '') + '"></div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:140px"><label>Ciudad</label><input id="caC" type="text" value="' + esc(c.ciudad || '') + '"></div>' +
      '<div class="fld" style="flex:1;min-width:160px"><label>LinkedIn</label><input id="caL" type="url" value="' + esc(c.linkedin || '') + '"></div></div>' +
      '<div class="fld"><label>Vacante a la que aplica</label><select id="caV"><option value="">— Sin vacante asignada —</option>' + vacs.map(function (v) { return '<option value="' + v.id + '"' + (c.vacanteId === v.id ? ' selected' : '') + '>' + esc(v.cargo) + ' · ' + esc(roleLabelOf(v.perfil || 'interno')) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label>Etapa del proceso</label><select id="caEt">' + FASE1_ETAPAS.map(function (e) { return '<option value="' + e[0] + '"' + ((c.etapa || 'sourcing') === e[0] ? ' selected' : '') + '>' + esc(e[1]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label>Fuente / referencia</label><input id="caF" type="text" value="' + esc(c.fuente || '') + '" placeholder="LinkedIn, referido, banca, universidad…"></div>' +
      '<div class="fld"><label>Experiencia / resumen</label><textarea id="caExp" rows="2" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical">' + esc(c.experiencia || '') + '</textarea></div>' +
      '<div class="fld"><label>Currículo (CV)</label><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><button type="button" class="btn-s" id="caCvBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M17 8l-5-5-5 5"></path><path d="M12 3v12"></path></svg>Adjuntar CV</button><span id="caCvName" style="font-size:12.5px;color:' + (c.cv ? 'var(--navy)' : 'var(--muted)') + '">' + (c.cv ? esc(c.cvName || 'CV adjunto') : 'Sin CV adjunto') + '</span><button type="button" class="btn-s btn-danger" id="caCvRm" style="font-size:11.5px;padding:4px 9px;display:' + (c.cv ? '' : 'none') + '">Quitar</button></div><div class="note" style="margin:5px 0 0">PDF, Word o imagen (máx. 6 MB). Queda como referencia en su ficha.</div></div>';
  }
  function orgCandAddModal() {
    _candCv = null;
    modal('<button class="mod-x">✕</button><h3>Agregar candidato</h3>' +
      '<p style="color:var(--muted);font-size:13.5px;margin:4px 0 10px">Registra un posible candidato para una vacante. Podrás evaluar las 7 señales y su scorecard al abrir su ficha.</p>' +
      candFormFields(null) +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="caOk">Agregar candidato</button></div>', 'wide');
    wireCandCv();
    $('#caOk').addEventListener('click', function () {
      var n = $('#caN').value.trim(); if (!n) { toast('Escribe el nombre del candidato.'); return; }
      var c = { id: db.nextOrgCandId++, nombre: n, email: $('#caE').value.trim(), telefono: $('#caT').value.trim(), ciudad: $('#caC').value.trim(), linkedin: $('#caL').value.trim(), vacanteId: $('#caV').value ? +$('#caV').value : null, etapa: $('#caEt').value, fuente: $('#caF').value.trim(), experiencia: $('#caExp').value.trim(), cv: _candCv ? _candCv.data : '', cvName: _candCv ? _candCv.name : '', senales: {}, scorecard: '', notas: '', redflags: '', fecha: reqToday(), por: me.nombre };
      db.orgCandidatos.push(c); saveDB(db); closeModal(); rOrg(); toast('Candidato "' + n + '" agregado.');
    });
  }
  function orgCandModal(c) {
    if (!c) return;
    var edit = canManageCand();
    var avg = candScoreAvg(c);
    var senalesHtml = FASE1_SENALES.map(function (s) {
      var val = (c.senales && c.senales[s[0]]) || 0;
      var stars = [1, 2, 3, 4, 5].map(function (n) {
        var on = n <= val;
        return '<button type="button" data-sen="' + s[0] + '" data-val="' + n + '"' + (edit ? '' : ' disabled') + ' style="width:30px;height:30px;border-radius:8px;border:1.5px solid ' + (on ? '#00CE7C' : '#E3EAF3') + ';background:' + (on ? '#00CE7C' : '#fff') + ';color:' + (on ? '#fff' : '#94A3B8') + ';font-weight:800;font-size:12px;cursor:' + (edit ? 'pointer' : 'default') + '">' + n + '</button>';
      }).join('');
      return '<div style="padding:9px 0;border-bottom:1px solid #F2F6FB"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:150px"><b style="color:var(--navy);font-size:13px">' + esc(s[1]) + '</b><div style="font-size:11.5px;color:var(--muted)">' + esc(s[2]) + '</div></div><div style="display:flex;gap:5px">' + stars + '</div></div></div>';
    }).join('');
    var pipeline = FASE1_ETAPAS.map(function (e) {
      var on = c.etapa === e[0];
      return '<button type="button" data-candet="' + e[0] + '"' + (edit ? '' : ' disabled') + ' style="display:block;width:100%;text-align:left;padding:9px 11px;margin-bottom:5px;border-radius:10px;border:1.5px solid ' + (on ? '#00CE7C' : '#E9EFF6') + ';background:' + (on ? '#F0FBF6' : '#fff') + ';cursor:' + (edit ? 'pointer' : 'default') + '"><b style="color:var(--navy);font-size:13px">' + esc(e[1]) + '</b> <span class="chip n" style="font-size:9.5px">' + esc(e[2]) + '</span><div style="font-size:11.5px;color:var(--muted);margin-top:2px">' + esc(e[3]) + '</div></button>';
    }).join('');
    var line = function (k, v) { return v ? '<div class="prow"><span class="k">' + k + '</span><span>' + v + '</span></div>' : ''; };
    modal('<button class="mod-x">✕</button><h3>' + esc(c.nombre) + '</h3>' +
      '<div style="display:flex;align-items:center;gap:10px;margin:0 0 10px;flex-wrap:wrap"><span class="chip n">' + esc(f1EtapaLabel(c.etapa)) + '</span><span class="chip ' + (avg >= 4 ? 'g' : avg >= 3 ? 'y' : avg > 0 ? 'r' : 'n') + '">Score ' + (avg || '—') + ' / 5</span></div>' +
      line('Vacante', esc(candVacLabel(c))) +
      line('Correo', c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '') +
      line('Teléfono', esc(c.telefono || '')) +
      line('Ciudad', esc(c.ciudad || '')) +
      line('LinkedIn', c.linkedin ? '<a href="' + esc(c.linkedin) + '" target="_blank" rel="noopener">Ver perfil</a>' : '') +
      line('Fuente', esc(c.fuente || '')) +
      (c.cv ? '<div class="prow"><span class="k">CV</span><a href="' + c.cv + '" download="' + esc(c.cvName || ('CV-' + c.nombre + '.pdf')) + '">Descargar ' + esc(c.cvName || 'CV') + '</a></div>' : '') +
      (c.experiencia ? '<div style="margin-top:10px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2)">Experiencia</div><div style="font-size:13.5px;color:#33415C;line-height:1.5;margin-top:3px">' + esc(c.experiencia) + '</div></div>' : '') +
      '<div style="font-size:11.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:16px 0 4px">7 señales de alto potencial (1–5)</div>' + senalesHtml +
      '<div style="font-size:11.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:16px 0 6px">Etapa del proceso</div>' + pipeline +
      '<div class="fld" style="margin-top:12px"><label>Scorecard / notas de entrevista</label><textarea id="caSc" rows="3"' + (edit ? '' : ' readonly') + ' style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical">' + esc(c.scorecard || '') + '</textarea></div>' +
      '<div class="fld"><label>Red flags / alarmas</label><textarea id="caRf" rows="2"' + (edit ? '' : ' readonly') + ' style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical">' + esc(c.redflags || '') + '</textarea></div>' +
      (edit ? '<div class="mod-actions" style="flex-wrap:wrap"><button class="btn-s" id="caEdit">Editar datos</button><button class="btn-g" id="caGuardar">Guardar evaluación</button><button class="btn-g" id="caContratar" style="background:#00874f">Convertir en vacante cubierta</button></div>' : '<div class="mod-actions"><button class="btn-g mod-x">Cerrar</button></div>'), 'wide');
    var live = { etapa: c.etapa, senales: Object.assign({}, c.senales || {}) };
    $$('#modalHost [data-sen]').forEach(function (b) { b.addEventListener('click', function () { if (!edit) return; live.senales[b.getAttribute('data-sen')] = +b.getAttribute('data-val'); c.senales = live.senales; orgCandModalRefresh(c); }); });
    $$('#modalHost [data-candet]').forEach(function (b) { b.addEventListener('click', function () { if (!edit) return; live.etapa = b.getAttribute('data-candet'); c.etapa = live.etapa; orgCandModalRefresh(c); }); });
    var ce = $('#caEdit'); if (ce) ce.addEventListener('click', function () { orgCandEditModal(c); });
    var cg = $('#caGuardar'); if (cg) cg.addEventListener('click', function () {
      c.scorecard = $('#caSc').value.trim(); c.redflags = $('#caRf').value.trim(); c.senales = live.senales; c.etapa = live.etapa;
      saveDB(db); closeModal(); rOrg(); toast('Evaluación de ' + c.nombre.split(' ')[0] + ' guardada.');
    });
    var cc = $('#caContratar'); if (cc) cc.addEventListener('click', function () {
      c.scorecard = $('#caSc').value.trim(); c.redflags = $('#caRf').value.trim();
      c.etapa = 'onboarding'; saveDB(db); closeModal();
      toast('Marcado en Onboarding. Crea su cuenta desde la vacante en el Organigrama.');
      rOrg();
    });
  }
  function orgCandModalRefresh(c) { c.scorecard = ($('#caSc') ? $('#caSc').value : c.scorecard); c.redflags = ($('#caRf') ? $('#caRf').value : c.redflags); orgCandModal(c); }
  function orgCandEditModal(c) {
    _candCv = c.cv ? { data: c.cv, name: c.cvName } : null;
    modal('<button class="mod-x">✕</button><h3>Editar candidato</h3>' + candFormFields(c) +
      '<div class="mod-actions"><button class="btn-s" id="caBack">Volver</button><button class="btn-g" id="caUpd">Guardar</button></div>', 'wide');
    wireCandCv();
    $('#caBack').addEventListener('click', function () { orgCandModal(c); });
    $('#caUpd').addEventListener('click', function () {
      var n = $('#caN').value.trim(); if (!n) { toast('Escribe el nombre.'); return; }
      c.nombre = n; c.email = $('#caE').value.trim(); c.telefono = $('#caT').value.trim(); c.ciudad = $('#caC').value.trim(); c.linkedin = $('#caL').value.trim(); c.vacanteId = $('#caV').value ? +$('#caV').value : null; c.etapa = $('#caEt').value; c.fuente = $('#caF').value.trim(); c.experiencia = $('#caExp').value.trim(); c.cv = _candCv ? _candCv.data : ''; c.cvName = _candCv ? _candCv.name : '';
      saveDB(db); orgCandModal(c); toast('Datos actualizados.');
    });
  }
  function rOrg() {
    resetContent();
    var scoped = (me.role === 'gerente' || me.role === 'gerenteop' || me.role === 'coordinador' || me.role === 'reclutador') ? me.id : null;
    var root = byId(scoped || 1);
    var PROF_ICO = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a8 8 0 0 1 16 0v1"></path></svg>';
    function chev(open) { return '<svg class="orgchev' + (open ? ' open' : '') + '" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>'; }
    var execs = visibleReports(root.id);
    var vacAll = db.vacantes.filter(function (v) { return v.estado === 'abierta'; });
    var scopeIds = scoped ? [root.id].concat(subtree(root.id).map(function (u) { return u.id; })) : null;
    var vacScope = scoped ? vacAll.filter(function (v) { return scopeIds.indexOf(v.managerId) > -1; }) : vacAll;
    function vacCard(v) {
      var pv = PRIOR_VAC[v.prioridad] || PRIOR_VAC.normal;
      return '<div class="orgitem" data-vac="' + v.id + '" style="border-style:dashed;border-color:' + (v.prioridad === 'pausa' ? '#C9D3E0' : v.prioridad === 'urgente' ? '#E9A2A2' : '#E8C842') + ';background:' + (v.prioridad === 'pausa' ? '#F5F7FA' : '#FFFBEB') + ';cursor:pointer">' +
        '<div style="width:28px;height:28px;border-radius:50%;background:#FBEEB8;display:flex;align-items:center;justify-content:center;color:#8a7500;font-weight:800;font-size:11px;flex:0 0 auto">V</div>' +
        '<div style="flex:1;min-width:0"><div class="oi1" style="color:#8a7500">VACANTE</div><div class="oi2">' + esc(v.cargo) + '</div></div>' +
        '<span class="chip ' + pv.chip + '" style="font-size:10px">' + pv.t + '</span>' +
        (me.role === 'admin' ? '<button class="btn-s btn-danger" data-vdel="' + v.id + '" style="font-size:11.5px;padding:4px 9px">Eliminar</button>' : '') +
      '</div>';
    }
    function vacsOf(uid) { return vacScope.filter(function (v) { return v.managerId === uid; }); }
    function item(u) {
      var kids = visibleReports(u.id);
      var vacs = vacsOf(u.id);
      var open = !!orgOpen[u.id];
      var expandable = kids.length || vacs.length;
      var html = '<div class="orgitem"' + (expandable ? ' data-tog="' + u.id + '"' : ' data-prof="' + u.id + '"') + '>' + avatarHtml(u, 28, 11) +
        '<div style="flex:1;min-width:0"><div class="oi1">' + esc(u.nombre) + '</div><div class="oi2">' + esc(u.cargo) + '</div></div>' +
        '<button class="orgprof" data-prof="' + u.id + '" title="Ver perfil">' + PROF_ICO + '</button>' +
        (expandable ? '<span class="orgcount">' + subtreeVisible(u.id).length + (vacs.length ? ' +' + vacs.length + 'V' : '') + '</span>' + chev(open) : '') +
      '</div>';
      if (expandable && open) html += '<div class="orgsub">' + visibleReports(u.id).map(item).join('') + vacs.map(vacCard).join('') + '</div>';
      return html;
    }
    var totalPersonas = scoped ? subtreeVisible(root.id).length : db.users.filter(function (u) { return u.activo && u.role !== 'candidato' && perfilVisible(u); }).length;
    var vacListCard = (me.role === 'admin' || me.role === 'rrhh' || me.role === 'gerente')
      ? '<div class="card" style="margin-top:16px"><div class="toolrow"><h3 style="margin:0">Vacantes abiertas</h3><span class="sp"></span>' +
        (me.role === 'admin' ? '<button class="btn-g" id="btnAddVac"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Crear vacante</button>' : '') + '</div>' +
        (vacScope.length ? vacScope.map(function (v) {
          var m = byId(v.managerId);
          return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #EEF3F9;flex-wrap:wrap;cursor:pointer" data-vac="' + v.id + '">' +
            '<div style="flex:1;min-width:220px"><div style="font-weight:700;color:var(--navy)">' + esc(v.cargo) + '</div><div style="font-size:13px;color:var(--muted)">Reporta a: ' + esc(m ? m.nombre : '—') + ' · ' + esc(roleLabelOf(v.perfil || 'interno')) + ' · Abierta desde ' + v.fecha + '</div></div>' +
            '<span class="chip ' + (PRIOR_VAC[v.prioridad] || PRIOR_VAC.normal).chip + '">' + (PRIOR_VAC[v.prioridad] || PRIOR_VAC.normal).t + '</span>' +
            (me.role === 'admin' ? '<button class="btn-s btn-danger" data-vdel="' + v.id + '" style="font-size:12px;padding:5px 10px">Eliminar</button>' : '') + '</div>';
        }).join('') : '<div class="empty">No hay vacantes abiertas.</div>') + '</div>'
      : '';
    $('#content').innerHTML =
      '<div class="grid g4" style="margin-bottom:16px">' + kpi(totalPersonas, scoped ? 'Personas en tu equipo' : 'Personas en el equipo') + kpi(vacScope.length, scoped ? 'Vacantes en tu equipo' : 'Vacantes abiertas') + '</div>' +
      '<div class="card"><h3>' + (scoped ? 'Tu equipo en la estructura' : 'Estructura organizacional') + '</h3>' +
      '<div class="note" style="margin:0 0 14px">Haz clic en una gerencia o persona para desplegar su equipo. Usa el ícono de persona para ver su ficha completa.</div>' +
      '<div class="orgroot"><div class="orgcard" data-prof="' + root.id + '">' + avatarHtml(root, 34, 12.5) + '<div><div class="on1">' + esc(root.nombre) + '</div><div class="on2">' + esc(root.cargo) + '</div></div></div></div>' +
      '<div class="orgcols">' + execs.map(function (g2) {
        var open = !!orgOpen[g2.id];
        var gvacs = vacsOf(g2.id);
        return '<div><div class="orgcol-h" data-tog="' + g2.id + '">' + avatarHtml(g2, 34, 12.5) +
          '<div style="flex:1;min-width:0"><div class="oc1">' + esc(g2.nombre) + '</div><div class="oc2">' + esc(g2.cargo) + '</div></div>' +
          '<button class="orgprof" data-prof="' + g2.id + '" title="Ver perfil">' + PROF_ICO + '</button>' +
          '<span class="orgcount">' + subtreeVisible(g2.id).length + (gvacs.length ? ' +' + gvacs.length + 'V' : '') + '</span>' + chev(open) + '</div>' +
          (open ? '<div class="orgcol-body">' + visibleReports(g2.id).map(item).join('') + gvacs.map(vacCard).join('') + '</div>' : '') +
        '</div>';
      }).join('') + '</div></div>' + vacListCard + orgCandCard();
    var bav = $('#btnAddVac');
    if (bav) bav.addEventListener('click', function () {
      var mgrs = db.users.filter(function (u) { return u.activo && u.role !== 'candidato'; });
      modal('<button class="mod-x">✕</button><h3>Crear vacante</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Define el cargo con el mayor detalle posible. Aparecerá en el organigrama; RRHH solo puede crear personas sobre vacantes <b>abiertas</b> que no estén en pausa.</p>' +
        '<div class="fld"><label>Nombre del cargo *</label><input id="nvC" type="text" placeholder="Ej: Analista de SAC Solicitudes"></div>' +
        '<div class="fld"><label>Reporta a *</label><select id="nvM">' + mgrs.map(function (u) { return '<option value="' + u.id + '">' + esc(u.nombre) + ' · ' + esc(u.cargo) + '</option>'; }).join('') + '</select></div>' +
        '<div class="fld"><label>Perfil que ocupará el cargo *</label><select id="nvR">' + assignableRoles().map(function (k) { return '<option value="' + k + '"' + (k === 'interno' ? ' selected' : '') + '>' + esc(roleLabelOf(k)) + '</option>'; }).join('') + '</select><div class="note" style="margin:5px 0 0">Queda fijo para quien ocupe esta vacante.</div></div>' +
        '<div class="fld"><label>Prioridad</label><div class="doccat" id="nvPrioRow">' + ['urgente', 'normal', 'pausa'].map(function (k) { return '<button type="button" data-nvprio="' + k + '" class="' + (k === 'normal' ? 'on' : '') + '">' + PRIOR_VAC[k].t + '</button>'; }).join('') + '</div><div class="note" id="nvPrioHint" style="margin:5px 0 0">' + PRIOR_VAC.normal.desc + '</div></div>' +
        '<div class="fld"><label>Descripción del cargo *</label><textarea id="nvD" rows="2" placeholder="Qué hace esta persona en su día a día" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical"></textarea></div>' +
        '<div class="fld"><label>Importancia en la empresa <span style="color:var(--muted2);font-weight:600">(opcional)</span></label><textarea id="nvImp" rows="2" placeholder="Por qué este cargo importa para el negocio" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical"></textarea></div>' +
        '<div class="fld"><label>Su rol en el flywheel <span style="color:var(--muted2);font-weight:600">(opcional)</span></label><textarea id="nvFly" rows="2" placeholder="Cómo aporta a que el flywheel gire" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical"></textarea></div>' +
        '<div class="fld"><label>Requerimientos para trabajar</label>' + reqChecklistHtml('nvReq', []) + '</div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="nvOk">Crear vacante</button></div>');
      var nvPrio = 'normal';
      $$('#nvPrioRow [data-nvprio]').forEach(function (b) { b.addEventListener('click', function () { nvPrio = b.getAttribute('data-nvprio'); $$('#nvPrioRow [data-nvprio]').forEach(function (x) { x.classList.toggle('on', x === b); }); var h = $('#nvPrioHint'); if (h) h.textContent = PRIOR_VAC[nvPrio].desc; }); });
      $('#nvOk').addEventListener('click', function () {
        var c = $('#nvC').value.trim(); if (!c) { toast('Escribe el nombre del cargo.'); return; }
        var d = $('#nvD').value.trim(); if (!d) { toast('Escribe la descripción del cargo.'); return; }
        db.vacantes.push({ id: db.nextVacId++, cargo: c, managerId: +$('#nvM').value, perfil: ($('#nvR') ? $('#nvR').value : 'interno'), prioridad: nvPrio, fecha: new Date().toISOString().slice(0, 10), estado: 'abierta', descripcion: d, importancia: $('#nvImp').value.trim(), rolFlywheel: $('#nvFly').value.trim(), requerimientos: readReqChecklist('nvReq') });
        saveDB(db); closeModal(); rOrg(); toast('Vacante "' + c + '" creada' + (nvPrio === 'pausa' ? ' (en pausa).' : '.'));
      });
    });
    var bfa = $('#btnFase1'); if (bfa) bfa.addEventListener('click', fase1Modal);
    var bac = $('#btnAddCand'); if (bac) bac.addEventListener('click', orgCandAddModal);
    $('#content').addEventListener('click', function (e) {
      var cdel = e.target.closest('[data-canddel]');
      if (cdel) {
        if (!canManageCand()) return;
        var cid = +cdel.getAttribute('data-canddel');
        db.orgCandidatos = db.orgCandidatos.filter(function (x) { return x.id !== cid; });
        saveDB(db); rOrg(); toast('Candidato eliminado.');
        return;
      }
      var cand = e.target.closest('[data-cand]');
      if (cand) { orgCandModal((db.orgCandidatos || []).filter(function (x) { return x.id === +cand.getAttribute('data-cand'); })[0]); return; }
      var vd = e.target.closest('[data-vdel]');
      if (vd) {
        if (me.role !== 'admin') { toast('Solo el administrador puede eliminar vacantes.'); return; }
        db.vacantes = db.vacantes.filter(function (v) { return v.id !== +vd.getAttribute('data-vdel'); });
        saveDB(db); rOrg(); toast('Vacante eliminada.');
        return;
      }
      var vac = e.target.closest('[data-vac]');
      if (vac) { vacanteModal(db.vacantes.find(function (v) { return v.id === +vac.getAttribute('data-vac'); })); return; }
      var pb = e.target.closest('.orgprof');
      if (pb) { profileModal(byId(+pb.getAttribute('data-prof'))); return; }
      var tg = e.target.closest('[data-tog]');
      if (tg) { var id = +tg.getAttribute('data-tog'); orgOpen[id] = !orgOpen[id]; rOrg(); return; }
      var c = e.target.closest('[data-prof]');
      if (c) profileModal(byId(+c.getAttribute('data-prof')));
    });
  }

  /* ---------- DIRECTORIO ---------- */
  function rDirectorio() {
    resetContent();
    var q = '';
    function rows() {
      var list = db.users.filter(function (u) { return u.activo && u.role !== 'candidato' && perfilVisible(u); });
      if (q) list = list.filter(function (u) { return (u.nombre + ' ' + u.cargo + ' ' + u.area).toLowerCase().indexOf(q) > -1; });
      return list.map(function (u) {
        return '<tr data-prof="' + u.id + '" style="cursor:pointer"><td><div style="display:flex;align-items:center;gap:10px">' + avatarHtml(u, 32, 12) + '<b style="color:var(--navy)">' + esc(u.nombre) + '</b></div></td><td>' + esc(u.cargo) + '</td><td>' + esc(u.area) + '</td><td>' + esc(u.ciudad) + '</td></tr>';
      }).join('');
    }
    $('#content').innerHTML =
      '<div class="toolrow"><input class="search" id="dirQ" placeholder="Buscar por nombre, cargo o área…"><span class="sp"></span>' +
      (me.role === 'admin' ? '<button class="btn-s" id="dirCsv"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg>Descargar lista (CSV)</button>' : '') + '</div>' +
      '<div class="card" style="padding:6px 16px"><table class="tbl"><thead><tr><th>Nombre</th><th>Cargo</th><th>Área</th><th>Ciudad</th></tr></thead><tbody id="dirBody">' + rows() + '</tbody></table></div>';
    $('#dirQ').addEventListener('input', function () { q = this.value.trim().toLowerCase(); $('#dirBody').innerHTML = rows(); });
    var csv = $('#dirCsv');
    if (csv) csv.addEventListener('click', function () {
      var rows2 = [['Nombre', 'Cargo', 'Área', 'Rol', 'Email', 'Teléfono', 'LinkedIn', 'Ciudad']];
      db.users.filter(function (u) { return u.activo && u.role !== 'candidato' && perfilVisible(u); }).forEach(function (u) { rows2.push([u.nombre, u.cargo, u.area, roleLabelOf(u.role), u.email, u.telefono, u.linkedin, u.ciudad]); });
      csvDownload(rows2, 'empleados-vepagos.csv'); logHist(me, 'Descargó la lista de empleados'); saveDB(db); toast('Lista descargada.');
    });
    $('#content').addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-prof]'); if (tr) profileModal(byId(+tr.getAttribute('data-prof')));
    });
  }

  /* ---------- VENTAS · BANCOS ---------- */
  function rBancos() {
    resetContent();
    var proc = [
      { n: 'Credicard', d: 'Principal procesador de pagos del país. Mayor cobertura y participación de mercado.', c: '#001F60', bg: '#E7ECF7' },
      { n: 'Platco', d: 'Procesador aliado con foco en comercios y soluciones de bajo costo.', c: '#1F8A5B', bg: '#E7F6EE' },
      { n: 'Banesco', d: 'Procesamiento propio del banco, integrado a la red VEPAGOS.', c: '#B23A6E', bg: '#FBE9F0' }
    ];
    var bancos = ['Banesco', 'Banco de Venezuela', 'Banco Mercantil', 'BBVA Provincial', 'Banco Nacional de Crédito (BNC)', 'Banco Exterior', 'Bancaribe', 'Banco del Tesoro', 'Banplus', 'Banco Plaza', 'Banco Caroní', 'Bancamiga', 'Banco Activo', 'Banco Venezolano de Crédito', '100% Banco'];
    var html = afHero('Ventas', 'Bancos', 'Procesadores y bancos aliados de la red VEPAGOS para la afiliación de comercios.', '');
    html += '<div class="pf-card" style="margin-bottom:16px"><div class="pf-ch"><span class="ic" style="background:#EAF1FD;color:#2A6FDB"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path></svg></span><h3>Plataformas de procesamiento</h3></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">' + proc.map(function (p) {
        return '<div style="border:1px solid var(--line);border-left:4px solid ' + p.c + ';border-radius:12px;padding:14px 16px"><div style="font-weight:800;color:' + p.c + ';font-size:16px;margin-bottom:4px">' + esc(p.n) + '</div><div style="font-size:13px;color:var(--muted);line-height:1.55">' + esc(p.d) + '</div></div>';
      }).join('') + '</div></div>';
    html += '<div class="pf-card"><div class="pf-ch"><span class="ic" style="background:#E7F6EE;color:#1F8A5B"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V10l7-5 7 5v11"></path><path d="M9 21v-6h6v6"></path></svg></span><h3>Bancos aliados <span class="chip n">' + bancos.length + '</span></h3></div>' +
      '<div class="note" style="margin:-4px 0 12px">Bancos con los que un comercio puede domiciliar su cuenta para cobrar con VEPAGOS.</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px">' + bancos.map(function (b) { return '<span style="display:inline-flex;align-items:center;gap:8px;border:1.5px solid var(--line);border-radius:10px;padding:9px 14px;font-size:13.5px;font-weight:700;color:var(--navy)"><span style="width:8px;height:8px;border-radius:50%;background:#00CE7C"></span>' + esc(b) + '</span>'; }).join('') + '</div>' +
      '<div class="note" style="margin-top:14px">Las fichas técnicas y tarifas por plataforma están en la <a href="#" data-go2="docs" style="color:#00874f;font-weight:700">Biblioteca</a>.</div></div>';
    $('#content').innerHTML = html;
    $('#content').addEventListener('click', goBtnHandler);
  }

  /* ---------- MI EQUIPO ---------- */
  function rEquipo() {
    resetContent();
    var list = me.role === 'admin'
      ? db.users.filter(function (u) { return u.activo && (u.role === 'ventas' || u.role === 'reclutador' || u.role === 'entrenador'); })
      : subtree(me.id);
    var ventasCount = list.filter(function (u) { return u.role === 'ventas'; }).length;
    var subsPend = db.subvendedores.filter(function (s) { var o = byId(s.ownerId); return o && (me.role === 'admin' || list.some(function (u) { return u.id === o.id; })); });
    $('#content').innerHTML =
      '<div class="grid g4" style="margin-bottom:16px">' +
      (me.role === 'admin'
        ? kpi(ventasCount, 'Fuerza de ventas activa') + kpi(list.length - ventasCount, 'Reclutadores y entrenadores') + kpi(db.candidatos.filter(function (c) { return c.etapa !== 'activo' && c.etapa !== 'rechazado'; }).length, 'Candidatos en proceso')
        : kpi(list.length, 'Personas en tu equipo') + kpi(team(me.id).length, 'Reportes directos')) +
      (subsPend.length ? kpi(subsPend.filter(function (s) { return s.estado === 'pendiente'; }).length, 'Vendedores por autorizar') : '') + '</div>' +
      '<div class="card" style="padding:6px 16px"><table class="tbl"><thead><tr><th>Nombre</th><th>Cargo</th><th>Onboarding</th><th>Contacto</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (u) {
        var pr = progressOf(u.id, ONB[u.role] ? u.role : 'interno');
        var carga = u.role === 'ventas' ? '<button class="btn-s" data-carga="' + u.id + '" onclick="event.stopPropagation()" style="font-size:12.5px;padding:6px 10px">' + (u.cargaCoordId || u.cargaAsistId || (u.almacenes && u.almacenes.length) ? 'Editar asignación' : 'Asignar carga') + '</button>' : '';
        return '<tr data-prof="' + u.id + '" style="cursor:pointer"><td><b style="color:var(--navy)">' + esc(u.nombre) + '</b></td><td>' + esc(u.cargo) + '</td>' +
          '<td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="width:90px"><i style="width:' + pr.pct + '%"></i></div><span style="font-size:12.5px;color:var(--muted)">' + pr.pct + '%</span></div></td>' +
          '<td><a href="mailto:' + esc(u.email) + '" onclick="event.stopPropagation()">' + esc(u.email) + '</a></td><td>' + carga + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="empty">' + (me.role === 'admin' ? 'No hay fuerza de ventas registrada.' : 'Aún no tienes personas asignadas.') + '</td></tr>') +
      '</tbody></table></div>' +
      (subsPend.length ? '<div class="card" style="margin-top:16px"><h3>Vendedores reportados — autorización de almacén</h3><div class="note" style="margin-bottom:6px">Vendedores que tu fuerza de ventas reportó por debajo de ellos. Autoriza su acceso a almacenes.</div>' +
        subsPend.map(function (s) {
          var o = byId(s.ownerId);
          return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #EEF3F9;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:200px"><div style="font-weight:700;color:var(--navy)">' + esc(s.nombre) + '</div><div style="font-size:13px;color:var(--muted)">C.I. ' + esc(s.cedula) + ' · ' + esc(s.telefono) + ' · Reporta a: ' + esc(o ? o.nombre : '—') + '</div></div>' +
            (s.estado === 'autorizado' ? '<span class="chip g">Almacén autorizado</span>' : '<span class="chip y">Pendiente</span><button class="btn-g" data-auth="' + s.id + '" style="font-size:13px;padding:8px 14px">Autorizar almacén</button>') + '</div>';
        }).join('') + '</div>' : '');
    $('#content').addEventListener('click', function (e) {
      var auth = e.target.closest('[data-auth]');
      if (auth) {
        var s = db.subvendedores.find(function (x) { return x.id === +auth.getAttribute('data-auth'); });
        s.estado = 'autorizado'; saveDB(db); rEquipo(); toast('Almacén autorizado para ' + s.nombre + '.');
        return;
      }
      var cg = e.target.closest('[data-carga]');
      if (cg) {
        var v = byId(+cg.getAttribute('data-carga'));
        var staff = db.users.filter(function (u) { return u.activo && u.id !== v.id && (u.role === 'interno' || u.role === 'reclutador' || u.role === 'gerente'); });
        var principales = db.users.filter(function (u) { return u.activo && u.id !== v.id && u.role === 'ventas'; });
        function opts(arr, sel) { return '<option value="">— Sin asignar —</option>' + arr.map(function (u) { return '<option value="' + u.id + '"' + (sel === u.id ? ' selected' : '') + '>' + esc(u.nombre) + ' · ' + esc(u.cargo) + '</option>'; }).join(''); }
        modal('<button class="mod-x">✕</button><h3>Asignación — ' + esc(v.nombre) + '</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Equipo de carga, vendedor principal y almacenes.</p>' +
          '<div class="fld"><label>Coordinador de carga</label><select id="ccSel">' + opts(staff, v.cargaCoordId) + '</select></div>' +
          '<div class="fld"><label>Asistente de carga</label><select id="caSel">' + opts(staff, v.cargaAsistId) + '</select></div>' +
          '<div class="fld"><label>Vendedor principal (solo si es subvendedor)</label><select id="cpSel">' + opts(principales, v.vendedorPrincipalId) + '</select></div>' +
          '<div class="fld"><label>Almacenes asignados (separados por coma)</label><input id="cwInp" type="text" value="' + esc((v.almacenes || []).join(', ')) + '" placeholder="Ej: Almacén Chacao, Almacén La Trinidad"></div>' +
          '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="ccOk">Guardar</button></div>');
        $('#ccOk').addEventListener('click', function () {
          v.cargaCoordId = +$('#ccSel').value || null;
          v.cargaAsistId = +$('#caSel').value || null;
          v.vendedorPrincipalId = +$('#cpSel').value || null;
          v.almacenes = $('#cwInp').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
          saveDB(db); closeModal(); rEquipo(); toast('Asignación actualizada.');
        });
        return;
      }
      var tr = e.target.closest('tr[data-prof]'); if (tr) profileModal(byId(+tr.getAttribute('data-prof')));
    });
  }

  /* ---------- ONBOARDING ---------- */
  function rOnboarding() {
    resetContent();
    var showTeamPage = (current === 'induccionequipo');
    // Carga rutas y progreso del usuario autenticado directamente desde la base de datos
    Promise.all([
      window.SV_API.getInduccionPerfil(me.role),
      window.SV_API.getMiProgresoInduccion()
    ]).then(function (results) {
      var apiRutas = results[0];
      var miProgreso = results[1];
      if (Array.isArray(miProgreso)) {
        db.progreso[me.id] = db.progreso[me.id] || {};
        miProgreso.forEach(function (row) {
          if (row.aprobado) {
            db.progreso[me.id][row.modulo_id] = true;
            db.progreso[me.id][row.modulo_id + '_score'] = row.puntaje_pct;
            db.progreso[me.id][row.modulo_id + '_date'] = row.completado_el;
          }
        });
        saveDB(db);
      }
      var plan;
      var key = myOnboardingKey();
      if (apiRutas && !apiRutas.error && Array.isArray(apiRutas) && apiRutas.length > 0) {
        var allMods = [];
        var titulos = [];
        apiRutas.forEach(function(r) {
          titulos.push(r.titulo);
          var mods = typeof r.modulos === 'string' ? JSON.parse(r.modulos) : r.modulos;
          (mods || []).forEach(function(m) {
            if (!m.id) m.id = 'm_' + Math.random().toString(36).slice(2, 9);
            allMods.push(m);
          });
        });
        plan = { titulo: titulos.length === 1 ? titulos[0] : 'Inducciones asignadas', modulos: allMods, rutas: apiRutas };
      } else {
        plan = ONB[key] || ONB.interno;
      }
      if (!plan || !plan.modulos || !plan.modulos.length) {
        $('#content').innerHTML = '<div class="card" style="padding:30px;text-align:center;color:var(--muted)">No hay ruta de inducción asignada a tu perfil.</div>';
        return;
      }
      _renderOnboarding(plan, key, showTeamPage);
    }).catch(function () {
      var key = myOnboardingKey();
      _renderOnboarding(ONB[key] || ONB.interno, key, showTeamPage);
    });
  }

  function _renderOnboarding(plan, key, showTeamPage) {
    var p = db.progreso[me.id] || {};
    var pr = progressOfPlan(plan, me.id);
    var html = '';

    if (!showTeamPage) {
      var celebra = pr.pct === 100;
      var totalMods = plan.modulos.length;
      html =
        '<div class="pf-hero" style="margin-bottom:18px">' +
          '<div class="pf-avawrap"><span style="width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;color:#fff"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></span></div>' +
          '<div class="pf-id"><div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#00E58C;margin-bottom:6px"><span style="width:8px;height:8px;border-radius:50%;background:#00CE7C"></span>' + esc(plan.titulo || 'Onboarding VEPAGOS') + '</div>' +
            '<div class="pf-name" style="font-size:clamp(21px,2.5vw,27px)">' + (celebra ? '¡Onboarding completado! 🎉' : 'Bienvenido a bordo, ' + esc(me.nombre.split(' ')[0])) + '</div>' +
            '<div class="pf-role" style="max-width:600px">' + (celebra ? 'Dominas lo esencial de VEPAGOS. Puedes repasar cualquier módulo cuando quieras.' : 'Completa los ' + totalMods + ' módulos: lee la Inducción y aprueba su Quiz para avanzar.') + '</div>' +
            '<div style="display:flex;align-items:center;gap:13px;margin-top:15px;max-width:460px"><div class="progress" style="flex:1;height:10px;background:rgba(255,255,255,.2)"><i style="width:' + pr.pct + '%;background:#00E58C"></i></div><b style="color:#fff;font-size:14px;white-space:nowrap">' + pr.done + '/' + pr.total + '</b></div>' +
          '</div>' +
        '</div>' +
        '<div class="pf-grid" style="margin-top:0">' +
        plan.modulos.map(function (m, i) {
          var color = m.color || '#2A6FDB';
          var bg = m.bg || 'rgba(42,111,219,.12)';
          var ico = m.ico || '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>';
          var t = m.t || m.titulo || 'Módulo ' + (i + 1);
          var d = m.d || m.descripcion || '';
          var done = !!p[m.id];
          var seen = !!p[m.id + '_seen'];
          var chip = done ? '<span class="chip g">Completado</span>' : (seen ? '<span class="chip y">En curso</span>' : '<span class="chip n">Pendiente</span>');
          var hasQuiz = !!(m.quiz && Array.isArray(m.quiz) && m.quiz.length > 0);
          var quizText = done ? 'Aprobado' : (hasQuiz ? 'Quiz' : 'Completar');
          var quizIco = done ? '<path d="M20 6L9 17l-5-5"></path>' : (hasQuiz ? '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path><circle cx="12" cy="12" r="10"></circle>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="M22 4L12 14.01l-3-3"></path>');
          
          return '<div class="pf-card" style="padding:0;overflow:hidden;display:flex;flex-direction:column">' +
            '<div style="height:4px;background:' + color + '"></div>' +
            '<div style="padding:18px 20px 18px;display:flex;flex-direction:column;flex:1">' +
              '<div style="display:flex;align-items:flex-start;gap:13px">' +
                '<span style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:' + bg + ';color:' + color + ';flex:0 0 auto"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span>' +
                '<div style="flex:1;min-width:0">' +
                  '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:10.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Módulo ' + (i + 1) + '</span>' + chip + '</div>' +
                  '<div style="font-weight:800;color:var(--navy);font-size:16px;margin-top:3px">' + esc(t) + '</div>' +
                  '<div style="font-size:13.5px;color:var(--muted);line-height:1.55;margin-top:4px">' + esc(d) + '</div>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;gap:9px;margin-top:auto;padding-top:16px">' +
                '<button class="btn-s" data-lesson="' + m.id + '" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:13.5px;padding:10px 12px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>Inducción</button>' +
                '<button data-quiz="' + m.id + '" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:13.5px;padding:10px 12px;border:none;border-radius:10px;font-weight:700;cursor:pointer;color:#fff;background:' + (done ? '#00B871' : color) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + quizIco + '</svg>' + quizText + '</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('') +
        '</div>';
    }

    var canAct = me.role === 'rrhh' || me.role === 'admin';
    if (showTeamPage && (me.role === 'rrhh' || me.role === 'admin' || me.role === 'entrenador')) {
      var segList = db.users.filter(function (u) { return u.activo && u.id !== me.id; });
      if (me.role === 'entrenador') segList = segList.filter(function (u) { return u.role === 'ventas' || u.role === 'candidato'; });
      else if (me.role === 'rrhh') segList = segList.filter(function (u) { return u.role !== 'ventas' && u.role !== 'candidato'; });
      html += '<div class="card"><h3>' + (me.role === 'entrenador' ? 'Seguimiento de tu fuerza de ventas' : 'Seguimiento de inducción del equipo') + '</h3><table class="tbl"><thead><tr><th>Persona</th><th>Ruta</th><th>Progreso</th><th>Estado</th>' + (canAct ? '<th>Trámites</th>' : '') + (canAct ? '<th>Activos fijos</th>' : '') + '</tr></thead><tbody>' +
        segList.map(function (u) {
          var k2 = 'interno';
          var pr2 = progressOf(u.id, k2);
          var st = pr2.pct === 100 ? '<span class="chip g">Completado</span>' : (pr2.pct > 0 ? '<span class="chip y">En curso</span>' : '<span class="chip n">Sin iniciar</span>');
          var uc = u.checklist || {}; var TRAM_KEYS = ['emailCorp', 'firma', 'carnet', 'huella', 'contrato', 'documentos']; var tDone = TRAM_KEYS.filter(function (k) { return uc[k]; }).length;
          return '<tr><td><b style="color:var(--navy)">' + esc(u.nombre) + '</b><div style="font-size:12.5px;color:var(--muted2)">' + esc(u.cargo) + '</div></td><td>' + ONB[k2].titulo.split('—')[1] + '</td>' +
            '<td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="width:90px"><i style="width:' + pr2.pct + '%"></i></div>' + pr2.pct + '%</div></td><td>' + st + '</td>' +
            (canAct ? '<td><button class="btn-s" data-tram="' + u.id + '" style="font-size:12.5px;padding:6px 10px">Trámites (' + tDone + '/6)</button></td>' : '') +
            (canAct ? '<td><button class="btn-s" data-act="' + u.id + '" style="font-size:12.5px;padding:6px 10px">Activos (' + db.activos.filter(function (a) { return a.userId === u.id; }).length + ')</button></td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }
    $('#content').innerHTML = html;

    function modById(id) {
      return (plan.modulos || []).find(function (m) { return String(m.id) === String(id); });
    }

    function lessonModal(m) {
      if (!m) return;
      var color = m.color || '#2A6FDB';
      var bg = m.bg || 'rgba(42,111,219,.12)';
      var ico = m.ico || '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>';
      var t = m.t || m.titulo || 'Inducción';
      var steps = (m.lesson && Array.isArray(m.lesson) && m.lesson.length > 0) ? m.lesson : [
        {
          h: t,
          b: m.d || m.descripcion || 'Revisa con tu tutor o líder de área las directrices y materiales de este módulo de inducción.',
          key: 'Aprende y pon en práctica estos conocimientos en tus funciones diarias.'
        }
      ];
      var hasQuiz = !!(m.quiz && Array.isArray(m.quiz) && m.quiz.length > 0);

      db.progreso[me.id] = db.progreso[me.id] || {};
      db.progreso[me.id][m.id + '_seen'] = true;
      if (!hasQuiz) {
        db.progreso[me.id][m.id] = true;
        window.SV_API.completarModuloInduccion(m.id, 100);
      }
      saveDB(db);

      var total = steps.length, idx = 0;

      function sectionHtml(s, i) {
        var extra = '';
        if (s.dd && s.dd.length) {
          extra += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px">' + s.dd.map(function (d) {
            var ok = d.ok, cl = ok ? '#00874f' : '#D9463E', bgc = ok ? 'rgba(0,206,124,.09)' : 'rgba(217,70,62,.08)', bd = ok ? 'rgba(0,206,124,.28)' : 'rgba(217,70,62,.26)';
            return '<div style="border:1px solid ' + bd + ';background:' + bgc + ';border-radius:12px;padding:12px 14px">' +
              '<div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:12px;letter-spacing:.3px;color:' + cl + ';margin-bottom:5px">' + (ok ? '✓ ASÍ SÍ' : '✕ ASÍ NO') + '</div>' +
              '<div style="font-size:13.5px;color:#33415C;line-height:1.55">' + esc(d.t) + '</div></div>';
          }).join('') + '</div>';
        }
        if (s.key) {
          extra += '<div style="display:flex;gap:12px;align-items:flex-start;margin-top:18px;border-radius:14px;padding:15px 16px;background:' + bg + ';border:1px solid ' + color + '33">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto;margin-top:1px"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"></path></svg>' +
            '<div><div style="font-size:10.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:' + color + ';margin-bottom:3px">Para que se te grabe</div>' +
            '<div style="font-size:14.5px;color:var(--navy);font-weight:700;line-height:1.5">' + esc(s.key) + '</div></div></div>';
        }
        return '<div style="font-size:11px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:' + color + ';margin-bottom:7px">Punto ' + (i + 1) + ' de ' + total + '</div>' +
          '<h3 style="font-size:22px;font-weight:800;color:var(--navy);margin:0 0 13px;letter-spacing:-.4px;line-height:1.22">' + esc(s.h) + '</h3>' +
          '<div style="font-size:15px;color:#3A4A63;line-height:1.75">' + (s.b || '') + '</div>' + extra;
      }

      function header() {
        var segs = '';
        for (var k = 0; k < total; k++) { segs += '<div style="flex:1;height:5px;border-radius:999px;background:' + (k <= idx ? color : '#E3EAF3') + ';transition:background .25s"></div>'; }
        return '<div class="wiz-hd" style="position:relative;padding:22px 26px 18px;background:' + bg + '">' +
          '<button class="mod-x" style="position:absolute;top:16px;right:16px;float:none">✕</button>' +
          '<div style="display:flex;align-items:center;gap:13px">' +
            '<span style="width:44px;height:44px;border-radius:13px;background:#fff;color:' + color + ';display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:0 2px 8px rgba(2,12,38,.08)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span>' +
            '<div style="min-width:0"><div style="font-size:11px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:' + color + '">Inducción · Paso ' + (idx + 1) + ' de ' + total + '</div><div style="font-size:18px;font-weight:800;color:var(--navy);letter-spacing:-.3px;line-height:1.25;margin-top:1px">' + esc(t) + '</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:5px;margin-top:16px">' + segs + '</div>' +
        '</div>';
      }

      function draw() {
        if (idx < total) {
          modal(header() +
            '<div class="wiz-bd" style="padding:24px 26px 6px;min-height:200px">' + sectionHtml(steps[idx], idx) + '</div>' +
            '<div class="wiz-ft" style="display:flex;align-items:center;gap:10px;padding:16px 26px 20px;border-top:1px solid #EEF3F9">' +
              (idx > 0 ? '<button class="btn-s" id="lsPrev">← Anterior</button>' : '<button class="btn-s mod-x">Cerrar</button>') +
              '<span style="flex:1"></span>' +
              '<button class="btn-g" id="lsNext" style="background:' + color + '">' + (idx === total - 1 ? 'Finalizar →' : 'Siguiente →') + '</button>' +
            '</div>', 'wiz');
          var pv = $('#lsPrev'); if (pv) pv.addEventListener('click', function () { idx--; draw(); });
          $('#lsNext').addEventListener('click', function () { idx++; draw(); });
        } else {
          var done = !!(db.progreso[me.id] || {})[m.id];
          modal('<div class="wiz-hd" style="position:relative;padding:34px 30px 30px;text-align:center;background:' + bg + ';overflow:hidden">' +
              '<button class="mod-x" style="position:absolute;top:16px;right:16px;float:none;z-index:2">✕</button>' +
              '<div style="width:74px;height:74px;border-radius:50%;background:#fff;color:' + color + ';display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 6px 20px ' + color + '33"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg></div>' +
              '<div style="font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:' + color + ';margin-bottom:6px">Lección completada</div>' +
              '<div style="font-weight:800;color:var(--navy);font-size:23px;letter-spacing:-.4px;line-height:1.2">¡Bien hecho! 🎉</div>' +
              '<div class="note" style="margin:9px auto 0;max-width:390px;line-height:1.6">Revisaste los ' + total + ' puntos de <b style="color:var(--navy)">' + esc(t) + '</b>.' + (done ? ' Módulo completado con éxito.' : '') + '</div>' +
            '</div>' +
            '<div class="wiz-bd" style="padding:20px 26px 8px">' +
              (hasQuiz ? (done ? '' : '<div style="display:flex;gap:11px;align-items:center;border-radius:13px;padding:13px 15px;margin-bottom:16px;background:' + bg + ';border:1px solid ' + color + '33">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="M22 4L12 14.01l-3-3"></path></svg>' +
                '<div style="font-size:13.5px;color:#33415C;line-height:1.5">Último paso: <b style="color:var(--navy)">aprueba el quiz</b> para marcar este módulo como completado.</div></div>') : '') +
              (hasQuiz ? '<button class="btn-g" id="lsQuiz" style="background:' + color + ';padding:14px;width:100%;font-size:15px">' + (done ? 'Repetir el quiz' : 'Hacer el quiz →') + '</button>' : '<button class="btn-g mod-x" style="background:' + color + ';padding:14px;width:100%;font-size:15px">Entendido / Completado</button>') +
              '<div style="display:flex;gap:9px;margin-top:9px">' +
                '<button class="btn-s" id="lsDl" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:11px;font-size:13.5px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5M12 15V3"></path></svg>Resumen</button>' +
                '<button class="btn-s" id="lsRestart" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:11px;font-size:13.5px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"></path><path d="M3.5 8a9 9 0 1 0 2.3-3.3L3 8"></path></svg>Repasar</button>' +
              '</div>' +
            '</div>' +
            '<div style="height:16px"></div>', 'wiz');
          var lsq = $('#lsQuiz'); if (lsq) lsq.addEventListener('click', function () { quizModal(m); });
          $('#lsDl').addEventListener('click', function () { lessonDownload(m); logHist(me, 'Descargó el resumen de la inducción: ' + t); saveDB(db); });
          $('#lsRestart').addEventListener('click', function () { idx = 0; draw(); });
        }
        $$('.mod-x').forEach(function (x) { x.addEventListener('click', function () { closeModal(); rOnboarding(); }); });
      }
      draw();
    }

    function quizModal(m) {
      if (!m) return;
      var color = m.color || '#2A6FDB';
      var bg = m.bg || 'rgba(42,111,219,.12)';
      var ico = m.ico || '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path><circle cx="12" cy="12" r="10"></circle>';
      var t = m.t || m.titulo || 'Evaluación';
      var yaAprobado = !!(db.progreso[me.id] || {})[m.id];

      // Si ya está aprobado, no permite volver a llenar el cuestionario
      if (yaAprobado) {
        var score = (db.progreso[me.id] || {})[m.id + '_score'] || 100;
        var head = '<button class="mod-x">✕</button>' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:2px"><span style="width:40px;height:40px;border-radius:12px;background:rgba(0,206,124,.12);color:#00B871;display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg></span><div><div style="font-size:11.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#00874f">Módulo Aprobado</div><h3 style="margin:0">' + esc(t) + '</h3></div></div>';
        modal(head +
          '<div style="padding:24px 0 14px;text-align:center">' +
            '<div style="width:68px;height:68px;border-radius:50%;background:#E7FAF1;color:#00B871;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 4px 14px rgba(0,206,124,.18)"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg></div>' +
            '<div style="font-size:18px;font-weight:800;color:var(--navy);margin-bottom:6px">¡Evaluación Aprobada! 🎉</div>' +
            '<div style="font-size:13.5px;color:var(--muted);max-width:380px;margin:0 auto;line-height:1.55">Ya has completado satisfactoriamente este módulo de inducción. Tu resultado está registrado en la base de datos (' + score + '%).</div>' +
          '</div>' +
          '<div class="mod-actions"><button class="btn-g mod-x" style="background:#00B871;width:100%;padding:12px;font-size:14px">Entendido</button></div>');
        $$('.mod-x').forEach(function (x) { x.addEventListener('click', function () { closeModal(); rOnboarding(); }); });
        return;
      }

      if (!m.quiz || !Array.isArray(m.quiz) || m.quiz.length === 0) {
        var head = '<button class="mod-x">✕</button>' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:2px"><span style="width:40px;height:40px;border-radius:12px;background:' + bg + ';color:' + color + ';display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="M22 4L12 14.01l-3-3"></path></svg></span><div><div style="font-size:11.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:' + color + '">Evaluación</div><h3 style="margin:0">' + esc(t) + '</h3></div></div>';
        modal(head +
          '<div style="padding:22px 0 12px;text-align:center">' +
            '<div style="width:60px;height:60px;border-radius:50%;background:' + bg + ';color:' + color + ';display:flex;align-items:center;justify-content:center;margin:0 auto 14px"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg></div>' +
            '<div style="font-size:16px;color:var(--navy);font-weight:800;margin-bottom:6px">Este módulo no requiere quiz evaluativo</div>' +
            '<div style="font-size:13.5px;color:var(--muted);max-width:380px;margin:0 auto;line-height:1.5">Al haber revisado la inducción correspondiente, puedes marcar el módulo como completado.</div>' +
          '</div>' +
          '<div class="mod-actions"><button class="btn-s mod-x">Cancelar</button><button class="btn-g" id="qAutoOk" style="background:' + color + '">Marcar como completado</button></div>');
        var aok = $('#qAutoOk');
        if (aok) aok.addEventListener('click', function () {
          db.progreso[me.id] = db.progreso[me.id] || {};
          db.progreso[me.id][m.id] = true;
          db.progreso[me.id][m.id + '_seen'] = true;
          logHist(me, 'Completó la inducción: ' + t);
          saveDB(db);
          window.SV_API.completarModuloInduccion(m.id, 100);
          closeModal();
          rOnboarding();
          toast('¡Módulo completado y guardado en BD!');
        });
        $$('.mod-x').forEach(function (x) { x.addEventListener('click', function () { closeModal(); rOnboarding(); }); });
        return;
      }

      var sel = {}, submitted = false, PASS = 0.75;
      function draw() {
        var total = m.quiz.length, correct = 0, answered = Object.keys(sel).length;
        m.quiz.forEach(function (q, i) { if (sel[i] === q.a) correct++; });
        var pct = Math.round(correct / total * 100), passed = correct / total >= PASS;
        var head = '<button class="mod-x">✕</button>' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:2px"><span style="width:40px;height:40px;border-radius:12px;background:' + bg + ';color:' + color + ';display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span><div><div style="font-size:11.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:' + color + '">Quiz</div><h3 style="margin:0">' + esc(t) + '</h3></div></div>';
        if (!submitted) {
          var body = m.quiz.map(function (q, i) {
            return '<div style="margin-top:16px"><div style="font-weight:700;color:var(--navy);font-size:14.5px;margin-bottom:9px">' + (i + 1) + '. ' + esc(q.q) + '</div>' +
              q.opts.map(function (o, oi) {
                var on = sel[i] === oi;
                return '<button class="qopt" data-q="' + i + '" data-o="' + oi + '" style="display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:1.5px solid ' + (on ? color : '#E3EAF3') + ';background:' + (on ? bg : '#fff') + ';border-radius:11px;padding:11px 13px;margin-bottom:8px;cursor:pointer;font-size:14px;color:#33415C">' +
                  '<span style="width:18px;height:18px;border-radius:50%;border:2px solid ' + (on ? color : '#C9D5E5') + ';flex:0 0 auto;display:flex;align-items:center;justify-content:center">' + (on ? '<span style="width:9px;height:9px;border-radius:50%;background:' + color + '"></span>' : '') + '</span><span>' + esc(o) + '</span></button>';
              }).join('') + '</div>';
          }).join('');
          var can = answered === total;
          modal(head + body + '<div class="mod-actions"><button class="btn-s mod-x">Cancelar</button><button class="btn-g" id="qSubmit" style="background:' + color + (can ? '' : ';opacity:.45;cursor:not-allowed') + '">Enviar (' + answered + '/' + total + ')</button></div>');
          $$('.qopt').forEach(function (b) { b.addEventListener('click', function () { sel[+b.getAttribute('data-q')] = +b.getAttribute('data-o'); draw(); }); });
          var sb = $('#qSubmit'); if (sb && can) sb.addEventListener('click', function () { submitted = true; draw(); });
          $$('.mod-x').forEach(function (x) { x.addEventListener('click', function () { closeModal(); rOnboarding(); }); });
        } else {
          if (passed) {
            db.progreso[me.id] = db.progreso[me.id] || {};
            var yaEstaba = !!db.progreso[me.id][m.id];
            db.progreso[me.id][m.id] = true;
            db.progreso[me.id][m.id + '_seen'] = true;
            db.progreso[me.id][m.id + '_score'] = pct;
            if (!yaEstaba) {
              logHist(me, 'Finalizó la inducción: ' + t + ' (quiz aprobado ' + pct + '%)');
            }
            saveDB(db);
            window.SV_API.completarModuloInduccion(m.id, pct);
          }
          var res = '<div style="text-align:center;padding:12px 0 2px">' +
            '<div style="font-size:46px;font-weight:800;letter-spacing:-1px;color:' + (passed ? '#00874f' : '#D9463E') + ';line-height:1">' + pct + '%</div>' +
            '<div style="font-weight:800;color:var(--navy);font-size:17px;margin-top:6px">' + (passed ? '¡Aprobado! 🎉' : 'Casi… vuelve a intentarlo') + '</div>' +
            '<div class="note" style="margin-top:4px">Acertaste ' + correct + ' de ' + total + '.' + (passed ? ' Módulo completado y guardado en BD.' : ' Necesitas al menos ' + Math.ceil(total * PASS) + ' correctas para aprobar.') + '</div></div>';
          var review = m.quiz.map(function (q, i) {
            var ok = sel[i] === q.a;
            return '<div style="border:1px solid #EEF3F9;border-radius:11px;padding:11px 13px;margin-top:8px">' +
              '<div style="font-weight:700;color:var(--navy);font-size:13.5px">' + (i + 1) + '. ' + esc(q.q) + '</div>' +
              '<div style="font-size:13px;margin-top:5px;font-weight:600;color:' + (ok ? '#00874f' : '#D9463E') + '">' + (ok ? '✓ ' : '✗ ') + esc(q.opts[sel[i]]) + '</div>' +
              (ok ? '' : '<div style="font-size:13px;margin-top:2px;color:#00874f">Correcta: ' + esc(q.opts[q.a]) + '</div>') +
            '</div>';
          }).join('');
          modal(head + res + review + '<div class="mod-actions">' + (passed ? '' : '<button class="btn-s" id="qRetry">Reintentar</button>') + '<button class="btn-g mod-x" style="background:' + color + '">' + (passed ? 'Listo' : 'Cerrar') + '</button></div>');
          var rt = $('#qRetry'); if (rt) rt.addEventListener('click', function () { sel = {}; submitted = false; draw(); });
          $$('.mod-x').forEach(function (x) { x.addEventListener('click', function () { closeModal(); rOnboarding(); }); });
        }
      }
      draw();
    }

    function activosModal(u) {
      var acts = db.activos.filter(function (a) { return a.userId === u.id; });
      modal('<button class="mod-x">✕</button><h3>Activos fijos — ' + esc(u.nombre) + '</h3>' +
        (acts.length ? acts.map(function (a) {
          return '<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #EEF3F9">' +
            '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:14px">' + esc(a.nombre) + '</div><div style="font-size:12.5px;color:var(--muted)">Serial: ' + esc(a.serial) + ' · ' + a.fecha + '</div></div>' +
            '<button class="btn-s btn-danger" data-adel="' + a.id + '" style="font-size:12px;padding:5px 10px">Retirar</button></div>';
        }).join('') : '<div class="empty">Sin activos asignados.</div>') +
        '<div style="border-top:1px solid #EEF3F9;margin-top:12px;padding-top:12px">' +
        '<div class="fld"><label>Activo fijo</label><input id="naN" type="text" placeholder="Ej: Laptop HP ProBook 440"></div>' +
        '<div class="fld"><label>Serial</label><input id="naS" type="text" placeholder="Ej: HP-440-93412"></div>' +
        '<label style="display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:#33415C;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="naI" style="accent-color:#00CE7C;width:15px;height:15px;margin:0">Es parte de la entrega de ingreso</label>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cerrar</button><button class="btn-g" id="naOk">Asignar activo</button></div></div>');
      $('#naOk').addEventListener('click', function () {
        var n = $('#naN').value.trim(), s2 = $('#naS').value.trim();
        if (!n || !s2) { toast('Indica el activo y su serial.'); return; }
        db.activos.push({ id: db.nextActId++, userId: u.id, nombre: n, serial: s2, fecha: new Date().toISOString().slice(0, 10), por: me.nombre, ingreso: $('#naI').checked });
        logHist(u, 'Activo fijo asignado: ' + n + ' (serial ' + s2 + ')');
        saveDB(db); closeModal(); rOnboarding(); toast('Activo asignado a ' + u.nombre + '.');
      });
      document.querySelectorAll('#modalHost [data-adel]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var quitado = db.activos.find(function (a) { return a.id === +btn.getAttribute('data-adel'); });
          db.activos = db.activos.filter(function (a) { return a.id !== +btn.getAttribute('data-adel'); });
          logHist(u, 'Activo fijo retirado: ' + (quitado ? quitado.nombre : ''));
          saveDB(db); closeModal(); rOnboarding(); toast('Activo retirado.');
        });
      });
    }

    function tramitesModal(u) {
      u.checklist = u.checklist || {};
      var items = [{ key: 'emailCorp', label: 'Email corporativo listo' }, { key: 'firma', label: 'Firma de email configurada' }, { key: 'carnet', label: 'Carnet institucional entregado' }, { key: 'huella', label: 'Huella registrada' }, { key: 'contrato', label: 'Firma de contrato' }, { key: 'documentos', label: 'Entrega de documentos' }];
      modal('<button class="mod-x">✕</button><h3>Trámites administrativos — ' + esc(u.nombre) + '</h3>' +
        '<p style="color:var(--muted);font-size:14px;margin:4px 0 12px">Marca cada trámite a medida que acompañas a la persona y se va cumpliendo. Ella no puede marcarlos.</p>' +
        items.map(function (it) {
          return '<label style="display:flex;align-items:center;gap:11px;padding:12px 0;border-bottom:1px solid #EEF3F9;font-size:14px;font-weight:600;color:#33415C;cursor:pointer"><input type="checkbox" data-tk="' + it.key + '"' + (u.checklist[it.key] ? ' checked' : '') + ' style="accent-color:#00CE7C;width:18px;height:18px;margin:0;flex:0 0 auto">' + it.label + '</label>';
        }).join('') +
        '<div class="mod-actions"><button class="btn-g mod-x">Listo</button></div>');
      document.querySelectorAll('#modalHost [data-tk]').forEach(function (cb) {
        cb.addEventListener('change', function () { u.checklist[cb.getAttribute('data-tk')] = cb.checked; logHist(u, (cb.checked ? 'Trámite completado: ' : 'Trámite desmarcado: ') + cb.parentNode.textContent.trim()); saveDB(db); });
      });
      document.querySelectorAll('#modalHost .mod-x').forEach(function (x) { x.addEventListener('click', rOnboarding); });
    }

    $('#content').addEventListener('click', function (e) {
      var ls = e.target.closest('[data-lesson]');
      if (ls) { lessonModal(modById(ls.getAttribute('data-lesson'))); return; }
      var qz = e.target.closest('[data-quiz]');
      if (qz) { quizModal(modById(qz.getAttribute('data-quiz'))); return; }
      var ac = e.target.closest('[data-act]');
      if (ac) { activosModal(byId(+ac.getAttribute('data-act'))); return; }
      var tm = e.target.closest('[data-tram]');
      if (tm) { tramitesModal(byId(+tm.getAttribute('data-tram'))); return; }
      var b = e.target.closest('[data-mod]'); if (!b) return;
      var id = b.getAttribute('data-mod');
      db.progreso[me.id] = db.progreso[me.id] || {};
      db.progreso[me.id][id] = !db.progreso[me.id][id];
      var mm = modById(id);
      logHist(me, (db.progreso[me.id][id] ? 'Completó el módulo de inducción: ' : 'Desmarcó el módulo: ') + (mm ? (mm.t || mm.titulo) : id));
      saveDB(db); rOnboarding();
    });
  }

  /* ---------- CANDIDATOS ---------- */
  var ETAPAS = ['nuevo', 'entrevista', 'entrenamiento', 'activo', 'rechazado'];
  var ETAPA_CHIP = { nuevo: 'b', entrevista: 'y', entrenamiento: 'g', activo: 'g', rechazado: 'r' };
  var ETAPA_LABEL = { nuevo: 'Nuevo', entrevista: 'Entrevista', entrenamiento: 'Entrenamiento', activo: 'Activo', rechazado: 'Rechazado' };
  function rCandidatos() {
    resetContent();
    $('#content').innerHTML =
      '<div class="note" style="margin:0 0 14px">Pipeline de la fuerza de ventas. Avanza a cada candidato por etapas; al marcarlo <b>Activo</b> pasa a ser Fuerza de ventas.</div>' +
      '<div class="card" style="padding:6px 16px"><table class="tbl"><thead><tr><th>Candidato</th><th>Ciudad</th><th>Experiencia</th><th>Etapa</th><th>Acciones</th></tr></thead><tbody>' +
      (db.candidatos.length ? db.candidatos.map(function (c) {
        return '<tr><td><b style="color:var(--navy)">' + esc(c.nombre) + '</b><div style="font-size:12.5px;color:var(--muted2)">' + esc(c.email) + ' · ' + esc(c.telefono) + '</div><div style="font-size:12.5px"><a href="' + esc(c.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a></div></td>' +
          '<td>' + esc(c.ciudad) + '</td><td>' + esc(c.experiencia) + '</td>' +
          '<td><span class="chip ' + ETAPA_CHIP[c.etapa] + '">' + ETAPA_LABEL[c.etapa] + '</span></td>' +
          '<td style="white-space:nowrap">' +
            (c.etapa !== 'activo' && c.etapa !== 'rechazado' ? '<button class="btn-s" data-adv="' + c.id + '">Avanzar →</button> ' : '') +
            (c.etapa !== 'rechazado' && c.etapa !== 'activo' ? '<button class="btn-s btn-danger" data-rej="' + c.id + '">Rechazar</button>' : '') +
          '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="empty">No hay candidatos aún.</td></tr>') +
      '</tbody></table></div>';
    $('#content').addEventListener('click', function (e) {
      var adv = e.target.closest('[data-adv]'), rej = e.target.closest('[data-rej]');
      if (adv) {
        var c = db.candidatos.find(function (x) { return x.id === +adv.getAttribute('data-adv'); });
        var i = ETAPAS.indexOf(c.etapa);
        c.etapa = ETAPAS[Math.min(i + 1, 3)];
        if (c.etapa === 'activo') {
          var u = db.users.find(function (x) { return x.email.toLowerCase() === c.email.toLowerCase(); });
          if (u) { u.role = 'ventas'; u.cargo = 'Fuerza de Ventas'; }
          toast(c.nombre + ' ahora es Fuerza de ventas.');
        } else toast(c.nombre + ' → ' + ETAPA_LABEL[c.etapa] + '.');
        saveDB(db); rCandidatos();
      }
      if (rej) {
        var c2 = db.candidatos.find(function (x) { return x.id === +rej.getAttribute('data-rej'); });
        c2.etapa = 'rechazado'; saveDB(db); rCandidatos(); toast('Candidato rechazado.');
      }
    });
  }

  /* ---------- VACANTE (detalle) ---------- */
  function vacanteModal(v) {
    if (!v) return;
    var m = v.managerId ? byId(v.managerId) : null;
    var auto = roleInfoAuto({ cargo: v.cargo });
    var desc = v.descripcion || auto.desc;
    var imp = v.importancia || auto.imp;
    var reqs = v.requerimientos || [];
    var pv = PRIOR_VAC[v.prioridad] || PRIOR_VAC.normal;
    var enPausa = v.prioridad === 'pausa';
    var puedeEditar = me.role === 'admin' || me.role === 'rrhh' || isSysManager(me);
    function sec(t, b) { return '<div style="margin-top:12px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">' + t + '</div><div style="font-size:13.5px;color:#33415C;line-height:1.55;margin-top:3px">' + b + '</div></div>'; }
    modal('<button class="mod-x">✕</button>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px"><span class="chip ' + pv.chip + '">' + (enPausa ? 'En pausa' : 'Vacante ' + pv.t.toLowerCase()) + '</span></div>' +
      '<h3 style="margin-top:6px">' + esc(v.cargo) + '</h3>' +
      '<div style="font-size:13.5px;color:var(--muted)">Reporta a: <b style="color:var(--navy)">' + esc(m ? m.nombre : '—') + '</b>' + (m ? ' · ' + esc(m.cargo) : '') + '<br>Perfil: <b style="color:var(--navy)">' + esc(roleLabelOf(v.perfil || 'interno')) + '</b> · Abierta desde ' + v.fecha + (v.origenNombre ? ' · Reabierta por salida de ' + esc(v.origenNombre) : '') + '</div>' +
      (enPausa ? '<div class="note" style="margin-top:8px;color:#5b6b86;background:#F5F7FA;border-radius:9px;padding:8px 11px">Cargo <b>en pausa</b>: planificado para más adelante. Aún no se recluta ni se puede cubrir.</div>' : '') +
      sec('Descripción del cargo', esc(desc)) +
      sec('Importancia en la empresa', esc(imp)) +
      (v.rolFlywheel ? sec('Su rol en el flywheel', esc(v.rolFlywheel)) : '') +
      '<div style="margin-top:12px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Requerimientos para trabajar</div>' +
        (reqs.length ? '<ul style="margin:6px 0 0;padding-left:18px;font-size:13.5px;color:#33415C;line-height:1.7">' + reqs.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' : '<div class="note" style="margin-top:4px">Sin requerimientos definidos para esta vacante.</div>') +
      '</div>' +
      (puedeEditar ? '<div class="mod-actions"><button class="btn-s" id="vacEdit">Editar descripción y requerimientos</button>' + (me.role === 'admin' && !enPausa ? '<button class="btn-g" id="vacFill">Cubrir vacante</button>' : '') + '</div>' : '<div class="mod-actions"><button class="btn-s mod-x">Cerrar</button></div>'), 'wide');
    var ve = $('#vacEdit');
    if (ve) ve.addEventListener('click', function () { vacanteEditModal(v); });
    var vf = $('#vacFill');
    if (vf) vf.addEventListener('click', function () { closeModal(); go('empleados'); setTimeout(function () { var b = $('#btnAddEmp'); if (b) b.click(); }, 60); });
  }
  function vacanteEditModal(v) {
    var auto = roleInfoAuto({ cargo: v.cargo });
    modal('<button class="mod-x">✕</button><h3>Editar vacante — ' + esc(v.cargo) + '</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:4px 0 10px">Deja vacío para usar el texto automático del cargo.</p>' +
      '<div class="fld"><label>Perfil que ocupará el cargo</label><select id="vePerfil">' + assignableRoles().map(function (k) { return '<option value="' + k + '"' + ((v.perfil || 'interno') === k ? ' selected' : '') + '>' + esc(roleLabelOf(k)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label>Prioridad</label><div class="doccat" id="vePrioRow">' + ['urgente', 'normal', 'pausa'].map(function (k) { return '<button type="button" data-veprio="' + k + '" class="' + ((v.prioridad || 'normal') === k ? 'on' : '') + '">' + PRIOR_VAC[k].t + '</button>'; }).join('') + '</div></div>' +
      '<div class="fld"><label>Descripción del cargo</label><textarea id="veDesc" rows="3" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical">' + esc(v.descripcion || '') + '</textarea><div class="note" style="font-size:12px;margin-top:3px">Automático: ' + esc(auto.desc) + '</div></div>' +
      '<div class="fld"><label>Importancia en la empresa</label><textarea id="veImp" rows="3" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical">' + esc(v.importancia || '') + '</textarea></div>' +
      '<div class="fld"><label>Su rol en el flywheel</label><textarea id="veFly" rows="2" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13.5px;resize:vertical">' + esc(v.rolFlywheel || '') + '</textarea></div>' +
      '<div class="fld"><label>Requerimientos para trabajar</label>' + reqChecklistHtml('veReq', v.requerimientos || []) + '</div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="veSave">Guardar</button></div>');
    var vePrio = v.prioridad || 'normal';
    $$('#vePrioRow [data-veprio]').forEach(function (b) { b.addEventListener('click', function () { vePrio = b.getAttribute('data-veprio'); $$('#vePrioRow [data-veprio]').forEach(function (x) { x.classList.toggle('on', x === b); }); }); });
    $('#veSave').addEventListener('click', function () {
      v.perfil = $('#vePerfil').value;
      v.prioridad = vePrio;
      v.descripcion = $('#veDesc').value.trim();
      v.importancia = $('#veImp').value.trim();
      v.rolFlywheel = $('#veFly').value.trim();
      v.requerimientos = readReqChecklist('veReq');
      saveDB(db); closeModal(); vacanteModal(v); toast('Vacante actualizada.');
    });
  }

  /* ---------- RESTAURACIÓN DE CLAVES (admin/rrhh) ---------- */
  function restaurarClaveModal(u, onDone) {
    var temp = 'VP' + Math.floor(1000 + Math.random() * 9000);
    modal('<button class="mod-x">✕</button><h3>Restaurar contraseña — ' + esc(u.nombre) + '</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Se asignará una contraseña temporal que ' + esc(u.nombre.split(' ')[0]) + ' deberá cambiar al ingresar. Puedes editarla antes de confirmar.</p>' +
      '<div class="fld"><label>Contraseña temporal</label><input id="rcPw" type="text" value="' + temp + '"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="rcOk">Restaurar</button></div>');
    $('#rcOk').addEventListener('click', function () {
      var pw = $('#rcPw').value.trim(); if (!pw) { toast('Escribe una contraseña temporal.'); return; }
      u.password = pw; u.mustChangePass = true;
      db.claveReqs = db.claveReqs || [];
      var pend = db.claveReqs.filter(function (r) { return r.userId === u.id && r.estado === 'pendiente'; });
      if (pend.length) { pend.forEach(function (r) { r.estado = 'resuelta'; r.resueltoEl = nowStamp(); r.resueltoPor = me.nombre; r.tempPass = pw; }); }
      else { db.claveReqs.push({ id: db.nextClaveId++, userId: u.id, nombre: u.nombre, email: u.email, fecha: reqToday(), creadoEl: nowStamp(), estado: 'resuelta', resueltoEl: nowStamp(), resueltoPor: me.nombre, tempPass: pw, manual: true }); }
      logHist(u, 'Capital Humano restauró su contraseña (clave temporal asignada)', me.nombre);
      logHist(me, 'Restauró la contraseña de ' + u.nombre + ' (clave temporal asignada)');
      saveDB(db); closeModal(); refreshNav(); if (onDone) onDone(pw);
      toast('Clave restaurada. Comparte la contraseña temporal con ' + esc(u.nombre.split(' ')[0]) + ': ' + pw);
    });
  }
  function rClaves() {
    resetContent();
    var pend = (db.claveReqs || []).filter(function (r) { return r.estado === 'pendiente'; }).sort(function (a, b) { return a.id - b.id; });
    var hist = (db.claveReqs || []).filter(function (r) { return r.estado !== 'pendiente'; }).sort(function (a, b) { return (b.resueltoEl || '').localeCompare(a.resueltoEl || ''); });
    var html = '<div class="pf-hero" style="margin-bottom:16px"><div class="pf-id" style="min-width:auto">' +
      '<div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#00E58C;margin-bottom:6px"><span style="width:8px;height:8px;border-radius:50%;background:#00CE7C"></span>Seguridad de accesos</div>' +
      '<div class="pf-name">Restauración de claves</div>' +
      '<div class="pf-role">Solicitudes de restablecimiento de contraseña y su historial de atención.</div></div></div>';
    // Pendientes
    html += '<div class="card" style="margin-bottom:16px' + (pend.length ? ';border-color:#F3B24A;background:linear-gradient(180deg,#FFF6E9,#fff)' : '') + '">' +
      '<h3 style="display:flex;align-items:center;gap:8px' + (pend.length ? ';color:#B26A00' : '') + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + (pend.length ? '#C77700' : 'currentColor') + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path></svg>Solicitudes por atender' + (pend.length ? ' <span class="chip y">' + pend.length + '</span>' : '') + '</h3>' +
      '<div class="note" style="margin:-4px 0 10px">Alguien del equipo no puede ingresar y pidió restaurar su contraseña. Verifica la identidad antes de restaurar.</div>' +
      (pend.length ? pend.map(function (r) {
        var u = byId(r.userId);
        return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #F3E4C6;flex-wrap:wrap">' +
          '<span style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:#FDECCB;color:#B26A00;flex:0 0 auto"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>' +
          '<div style="flex:1;min-width:200px"><div style="font-weight:700;color:var(--navy)">' + esc(r.nombre) + (u ? '' : ' <span class="chip r">cuenta no encontrada</span>') + '</div><div style="font-size:13px;color:var(--muted)">' + esc(r.email) + (u && u.cargo ? ' · ' + esc(u.cargo) : '') + '</div><div style="font-size:12px;color:var(--muted2)">Solicitado ' + (r.creadoEl ? esc(fmtStamp(r.creadoEl)) : esc(r.fecha)) + '</div></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' + (u ? '<button class="btn-g" data-clavereset="' + r.id + '" style="font-size:13px;padding:8px 14px">Restaurar clave</button>' : '') + '<button class="btn-s" data-clavedismiss="' + r.id + '" style="font-size:13px;padding:8px 12px">Descartar</button></div></div>';
      }).join('') : '<div class="empty">No hay solicitudes de restauración pendientes.</div>') + '</div>';
    // Historial
    html += '<div class="card"><h3 style="display:flex;align-items:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>Historial de restauraciones' + (hist.length ? ' <span class="chip n">' + hist.length + '</span>' : '') + '</h3>' +
      '<div class="note" style="margin:-4px 0 10px">Registro de las solicitudes de contraseña ya atendidas.</div>' +
      (hist.length ? '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Empleado</th><th>Solicitado</th><th>Resultado</th><th>Atendido por</th><th>Fecha</th></tr></thead><tbody>' +
        hist.map(function (r) {
          return '<tr><td><b style="color:var(--navy)">' + esc(r.nombre) + '</b><div style="font-size:12px;color:var(--muted2)">' + esc(r.email) + '</div></td>' +
            '<td>' + esc(r.creadoEl ? fmtStamp(r.creadoEl) : r.fecha) + (r.manual ? ' <span class="chip n">Manual</span>' : '') + '</td>' +
            '<td>' + (r.estado === 'resuelta' ? '<span class="chip g">Clave restaurada</span>' : '<span class="chip n">Descartada</span>') + '</td>' +
            '<td>' + esc(r.resueltoPor || '—') + '</td>' +
            '<td>' + esc(r.resueltoEl ? fmtStamp(r.resueltoEl) : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty">Todavía no se ha atendido ninguna restauración.</div>') + '</div>';
    $('#content').innerHTML = html;
    $('#content').addEventListener('click', function (e) {
      var cr = e.target.closest('[data-clavereset]');
      if (cr) { var rq = db.claveReqs.find(function (x) { return x.id === +cr.getAttribute('data-clavereset'); }); var u3 = rq && byId(rq.userId); if (u3) restaurarClaveModal(u3, function () { rClaves(); }); return; }
      var cd = e.target.closest('[data-clavedismiss]');
      if (cd) { var rq2 = db.claveReqs.find(function (x) { return x.id === +cd.getAttribute('data-clavedismiss'); }); if (rq2) { rq2.estado = 'descartada'; rq2.resueltoEl = nowStamp(); rq2.resueltoPor = me.nombre; var uu = byId(rq2.userId); if (uu) logHist(uu, 'Solicitud de restauración de contraseña descartada por ' + me.nombre, me.nombre); logHist(me, 'Descartó la solicitud de restauración de contraseña de ' + (uu ? uu.nombre : rq2.nombre)); saveDB(db); refreshNav(); rClaves(); toast('Solicitud descartada.'); } return; }
    });
  }

  /* ================= ACTIVOS FIJOS, ALMACÉN Y PROCURA ================= */
  function afPad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function afNewActivoId() { return 'AF-' + afPad(db.af.nextActivo++, 4); }
  function afNewConsId() { return 'CO-' + afPad(db.af.nextCons++, 3); }
  function afNewSolId() { return 'SC-' + afPad(db.af.nextSol++, 4); }
  function afNewOrdenId() { return 'OC-' + afPad(db.af.nextOrden++, 4); }
  function afStock(artId) { return (db.af.stock || []).reduce(function (s, m) { return m.artId === artId ? s + (m.tipo === 'Salida' ? -m.cant : m.cant) : s; }, 0); }
  function afLog(accion, entidad, detalle) { db.af.audit.unshift({ id: db.af.nextAudit++, accion: accion, entidad: entidad, detalle: detalle, por: me.nombre, fecha: nowStamp() }); }
  function afMoney(n) { return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  var AF_EST = { 'Disponible': 'g', 'Asignado': 'b', 'En reparación': 'y', 'Dañado': 'r', 'De baja': 'n' };
  function afEstChip(e) { return '<span class="chip ' + (AF_EST[e] || 'n') + '">' + esc(e) + '</span>'; }
  function afConsById(id) { return (db.af.consumibles || []).find(function (c) { return c.id === id; }); }
  function afActById(id) { return (db.af.activos || []).find(function (a) { return a.id === id; }); }
  function afSelect(id, opts, val, extra) { return '<select id="' + id + '"' + (extra || '') + '>' + opts.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>'; }
  function afHero(kicker, title, sub, action) {
    return '<div class="pf-hero" style="margin-bottom:16px"><div class="pf-id" style="min-width:auto">' +
      '<div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#00E58C;margin-bottom:6px"><span style="width:8px;height:8px;border-radius:50%;background:#00CE7C"></span>' + kicker + '</div>' +
      '<div class="pf-name">' + title + '</div><div class="pf-role">' + sub + '</div></div>' +
      (action ? '<div style="position:relative;z-index:2">' + action + '</div>' : '') + '</div>';
  }

  /* Almacenes/activos: solo el Administrador modifica. Capital Humano y perfiles con permiso de procura son de solo lectura (pero pueden validar solicitudes si tienen el permiso). */
  function afBlock(k) { if (afCan(k)) return false; toast('No tienes permiso para realizar esta acción en Activos y procura.'); return true; }

  /* ---------- M6 · PANEL GENERAL ---------- */
  function rAfPanel() {
    resetContent();
    var A = db.af.activos.filter(function (a) { return a.estado !== 'De baja'; });
    var valor = A.reduce(function (s, a) { return s + (+a.costo || 0); }, 0);
    var porEstado = {}; db.af.activos.forEach(function (a) { porEstado[a.estado] = (porEstado[a.estado] || 0) + 1; });
    var porCat = {}; A.forEach(function (a) { porCat[a.categoria] = (porCat[a.categoria] || 0) + 1; });
    var porDep = {}; A.forEach(function (a) { porDep[a.departamento] = (porDep[a.departamento] || 0) + 1; });
    var repo = db.af.consumibles.filter(function (c) { return afStock(c.id) <= c.minimo; });
    var solPend = db.af.solicitudes.filter(function (s) { return s.estado === 'Enviada'; });
    var enRep = db.af.activos.filter(function (a) { return a.estado === 'En reparación'; }).length;
    function kpi(n, l, col, ico) { return '<div class="dash-kpi" style="cursor:default"><span class="dash-kpi-ic" style="background:' + col + '18;color:' + col + '"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span><div><div class="dash-kpi-n">' + n + '</div><div class="dash-kpi-l">' + l + '</div></div></div>'; }
    var html = afHero('Activos, almacén y procura', 'Panel general', 'Visibilidad total del inventario, el almacén y el pipeline de compras.',
      '<button class="btn-g" id="afExport" style="background:#fff;color:var(--navy)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5M12 15V3"></path></svg>Exportar inventario</button>');
    html += '<div class="dash-kpis" style="margin-bottom:16px">' +
      kpi(A.length, 'Activos registrados', '#2A6FDB', '<path d="M20 7h-3V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>') +
      (me.role === 'admin' ? kpi(afMoney(valor), 'Valor total (USD)', '#00B871', '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>') : '') +
      kpi(porEstado['Disponible'] || 0, 'Disponibles', '#1F8A5B', '<path d="M20 6L9 17l-5-5"></path>') +
      kpi(porEstado['Asignado'] || 0, 'Asignados', '#2A6FDB', '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>') +
      kpi(enRep, 'En reparación', '#E07B1E', '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>') +
      kpi(repo.length, 'Bajo stock mínimo', '#B23A6E', '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path>') +
    '</div>';
    // Alertas
    if (repo.length || solPend.length) {
      html += '<div class="pf-grid" style="margin-bottom:16px">';
      html += '<div class="pf-card"' + (repo.length ? ' style="border-left:4px solid #B23A6E"' : '') + '><div class="pf-ch"><span class="ic" style="background:#FBE9F0;color:#B23A6E"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path></svg></span><h3>Reposición de almacén</h3></div>' +
        (repo.length ? repo.map(function (c) { var st = afStock(c.id); return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F2F6FB"><div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:13.5px">' + esc(c.nombre) + '</div><div style="font-size:12px;color:var(--muted2)">' + esc(c.id) + ' · mínimo ' + c.minimo + ' ' + esc(c.unidad) + '</div></div><span class="chip ' + (st <= 0 ? 'r' : 'y') + '">' + st + ' ' + esc(c.unidad) + '</span></div>'; }).join('') : '<div class="empty">Todo el stock está por encima del mínimo. 🎉</div>') + '</div>';
      html += '<div class="pf-card"' + (solPend.length ? ' style="border-left:4px solid #E07B1E"' : '') + '><div class="pf-ch"><span class="ic" style="background:#FDF1E3;color:#E07B1E"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></span><h3>Solicitudes por aprobar</h3></div>' +
        (solPend.length ? solPend.map(function (s) { var u = byId(s.solicitante); return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F2F6FB"><div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:13.5px">' + esc(s.id) + ' · ' + esc(s.departamento) + '</div><div style="font-size:12px;color:var(--muted2)">' + (u ? esc(u.nombre) + ' · ' : '') + s.items.length + ' ítem(s)</div></div><button class="btn-s" data-afsol="' + s.id + '" style="font-size:12.5px;padding:6px 12px">Revisar</button></div>'; }).join('') : '<div class="empty">Sin solicitudes pendientes.</div>') + '</div>';
      html += '</div>';
    }
    // Distribuciones
    function barBlock(title, obj, col) {
      var keys = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; });
      var max = Math.max.apply(null, keys.map(function (k) { return obj[k]; }).concat([1]));
      return '<div class="pf-card"><div class="pf-ch"><span class="ic" style="background:' + col + '18;color:' + col + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><rect x="7" y="10" width="3" height="8"></rect><rect x="12" y="6" width="3" height="12"></rect><rect x="17" y="13" width="3" height="5"></rect></svg></span><h3>' + title + '</h3></div>' +
        (keys.length ? keys.map(function (k) { return '<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span style="color:var(--navy);font-weight:600">' + esc(k) + '</span><span style="color:var(--muted2);font-weight:700">' + obj[k] + '</span></div><div style="height:8px;border-radius:5px;background:#EEF3F9;overflow:hidden"><i style="display:block;height:100%;width:' + Math.round(obj[k] / max * 100) + '%;background:' + col + '"></i></div></div>'; }).join('') : '<div class="empty">Sin datos.</div>') + '</div>';
    }
    html += '<div class="pf-grid" style="margin-bottom:16px">' + barBlock('Por categoría', porCat, '#2A6FDB') + barBlock('Por departamento', porDep, '#8A5CD1') + '</div>';
    // Actividad reciente
    var aud = (db.af.audit || []).slice(0, 8);
    html += '<div class="pf-card"><div class="pf-ch"><span class="ic" style="background:#EEF3F9;color:#475569"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span><h3>Actividad reciente</h3></div>' +
      (aud.length ? aud.map(function (h) { return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #F4F6FA"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);margin-top:6px;flex:0 0 auto"></span><div style="flex:1"><div style="font-size:13.5px;color:var(--navy);font-weight:600;line-height:1.4">' + esc(h.detalle) + '</div><div style="font-size:12px;color:var(--muted2)">' + esc(fmtStamp(h.fecha)) + ' · ' + esc(h.por) + '</div></div></div>'; }).join('') : '<div class="empty">Aún no hay movimientos registrados.</div>') + '</div>';
    $('#content').innerHTML = html;
    $('#afExport').addEventListener('click', afExportInventario);
    $$('#content [data-afsol]').forEach(function (b) { b.addEventListener('click', function () { afSolModal(db.af.solicitudes.find(function (s) { return s.id === b.getAttribute('data-afsol'); })); }); });
  }

  /* ---------- M1 · ACTIVOS FIJOS ---------- */
  var afFiltro = { q: '', estado: 'todos', cat: 'todas' };
  function rAfActivos() {
    resetContent();
    var html = afHero('Registro maestro', 'Activos fijos', 'Cada bien con ID único, ficha, estado e historial completo.',
      (!afCan('activosGestionar') ? '' : '<button class="btn-g" id="afAdd" style="background:#fff;color:var(--navy)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Nuevo activo'));
    var ESTADOS = ['todos', 'Disponible', 'Asignado', 'En reparación', 'Dañado', 'De baja'];
    var CATS = ['todas'].concat(db.af.cat.categorias);
    html += '<div class="card" style="margin-bottom:14px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<div style="position:relative;flex:1;min-width:200px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" style="position:absolute;left:11px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg><input id="afQ" type="text" value="' + esc(afFiltro.q) + '" placeholder="Buscar por ID, descripción, serial, marca…" style="width:100%;border:1.5px solid #D9E2EF;border-radius:10px;padding:9px 11px 9px 34px;font-family:inherit;font-size:13.5px"></div>' +
      '<div class="doccat">' + ESTADOS.map(function (e) { return '<button data-afest="' + e + '" class="' + (afFiltro.estado === e ? 'on' : '') + '">' + (e === 'todos' ? 'Todos' : e) + '</button>'; }).join('') + '</div>' +
      '</div><div class="doccat" style="margin-top:10px">' + CATS.map(function (c) { return '<button data-afcat="' + esc(c) + '" class="' + (afFiltro.cat === c ? 'on' : '') + '">' + (c === 'todas' ? 'Todas las categorías' : esc(c)) + '</button>'; }).join('') + '</div></div>';
    var q = afFiltro.q.toLowerCase();
    var list = db.af.activos.filter(function (a) {
      if (afFiltro.estado !== 'todos' && a.estado !== afFiltro.estado) return false;
      if (afFiltro.cat !== 'todas' && a.categoria !== afFiltro.cat) return false;
      if (q && [a.id, a.descripcion, a.serial, a.marca, a.modelo, a.departamento].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>ID</th><th>Descripción</th><th>Categoría</th><th>Ubicación</th><th>Asignado a</th><th>Estado</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (a) { var u = a.userId ? byId(a.userId) : null; return '<tr data-afver="' + a.id + '" style="cursor:pointer"><td><b style="color:var(--navy)">' + esc(a.id) + '</b></td><td>' + esc(a.descripcion) + '<div style="font-size:12px;color:var(--muted2)">' + esc(a.marca || '') + (a.modelo ? ' · ' + esc(a.modelo) : '') + '</div></td><td>' + esc(a.categoria) + '</td><td style="font-size:12.5px">' + esc(a.sede) + '<div style="color:var(--muted2)">' + esc(a.area || '') + '</div></td><td>' + (u ? esc(u.nombre) : '<span style="color:var(--muted2)">—</span>') + '</td><td>' + afEstChip(a.estado) + '</td><td><button class="btn-s" data-afver="' + a.id + '" style="font-size:12.5px;padding:6px 11px">Ver ficha</button></td></tr>'; }).join('') : '<tr><td colspan="7"><div class="empty">No hay activos con estos filtros.</div></td></tr>') +
      '</tbody></table></div></div>';
    $('#content').innerHTML = html;
    var afAddBtn = $('#afAdd'); if (afAddBtn) afAddBtn.addEventListener('click', function () { afActivoForm(null); });
    var qi = $('#afQ'); qi.addEventListener('input', function () { afFiltro.q = qi.value; var pos = qi.selectionStart; rAfActivos(); var n = $('#afQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
    $$('#content [data-afest]').forEach(function (b) { b.addEventListener('click', function () { afFiltro.estado = b.getAttribute('data-afest'); rAfActivos(); }); });
    $$('#content [data-afcat]').forEach(function (b) { b.addEventListener('click', function () { afFiltro.cat = b.getAttribute('data-afcat'); rAfActivos(); }); });
    $('#content').addEventListener('click', function (e) { var v = e.target.closest('[data-afver]'); if (v) afFichaModal(afActById(v.getAttribute('data-afver'))); });
  }

  function afActivoForm(a, preCat) {
    if (afBlock('activosGestionar')) return;
    var edit = !!a; a = a || {};
    if (!edit && preCat) a.categoria = preCat;
    var C = db.af.cat;
    modal('<button class="mod-x">✕</button><h3>' + (edit ? 'Editar activo ' + esc(a.id) : 'Nuevo activo fijo') + '</h3>' +
      '<div class="fld"><label>Categoría *</label>' + afSelect('faCat', C.categorias, a.categoria) + '</div>' +
      '<div class="fld"><label>Descripción del bien *</label><input id="faDesc" type="text" value="' + esc(a.descripcion || '') + '" placeholder="Ej: Laptop 14 pulgadas administración"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:130px"><label>Marca</label><input id="faMarca" type="text" value="' + esc(a.marca || '') + '"></div><div class="fld" style="flex:1;min-width:130px"><label>Modelo</label><input id="faModelo" type="text" value="' + esc(a.modelo || '') + '"></div></div>' +
      '<div class="fld"><label>Serial del fabricante <span style="color:var(--muted2)">(obligatorio para electrónicos)</span></label><input id="faSerial" type="text" value="' + esc(a.serial || '') + '"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:120px"><label>Fecha de compra</label><input id="faFC" type="date" value="' + esc(a.fechaCompra || '') + '"></div><div class="fld" style="flex:1;min-width:110px"><label>Costo (USD)</label><input id="faCosto" type="number" min="0" step="1" value="' + esc(a.costo != null ? a.costo : '') + '"></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:150px"><label>Proveedor</label><input id="faProv" type="text" value="' + esc(a.proveedor || '') + '" list="afProvList"><datalist id="afProvList">' + db.af.proveedores.map(function (p) { return '<option value="' + esc(p.razon) + '">'; }).join('') + '</datalist></div><div class="fld" style="flex:1;min-width:110px"><label>N° factura</label><input id="faFact" type="text" value="' + esc(a.factura || '') + '"></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:130px"><label>Sede *</label>' + afSelect('faSede', C.sedes, a.sede) + '</div><div class="fld" style="flex:1;min-width:130px"><label>Piso / Área</label>' + afSelect('faArea', C.areas, a.area) + '</div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:130px"><label>Departamento</label>' + afSelect('faDep', C.departamentos, a.departamento) + '</div><div class="fld" style="flex:1;min-width:130px"><label>Estado físico</label>' + afSelect('faEF', C.estadoFisico, a.estadoFisico || 'Bueno') + '</div></div>' +
      '<div class="fld"><label>Observaciones</label><textarea id="faObs" style="min-height:52px">' + esc(a.obs || '') + '</textarea></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="faOk">' + (edit ? 'Guardar cambios' : 'Registrar activo') + '</button></div>', 'wide');
    $('#faOk').addEventListener('click', function () {
      var desc = $('#faDesc').value.trim(); if (!desc) { toast('La descripción es obligatoria.'); return; }
      var cat = $('#faCat').value, serial = $('#faSerial').value.trim();
      if (cat === 'Computación' || cat === 'POS / Terminales' || cat === 'Audiovisual') { if (!serial) { toast('El serial es obligatorio para equipos electrónicos.'); return; } }
      var data = { categoria: cat, descripcion: desc, marca: $('#faMarca').value.trim(), modelo: $('#faModelo').value.trim(), serial: serial, fechaCompra: $('#faFC').value, costo: +$('#faCosto').value || 0, proveedor: $('#faProv').value.trim(), factura: $('#faFact').value.trim(), sede: $('#faSede').value, area: $('#faArea').value, departamento: $('#faDep').value, estadoFisico: $('#faEF').value, obs: $('#faObs').value.trim() };
      if (edit) { Object.assign(a, data); afLog('Edición', a.id, 'Editó el activo ' + a.id + ' (' + desc + ')'); toast('Activo actualizado.'); }
      else { var id = afNewActivoId(); db.af.activos.push(Object.assign({ id: id, userId: null, fechaAsig: null, estado: 'Disponible', ultimoInv: null, creadoPor: me.nombre }, data)); afLog('Alta', id, 'Registró el activo ' + id + ' — ' + desc); toast('Activo ' + id + ' registrado.'); }
      saveDB(db); closeModal(); refreshNav(); afReRenderList();
    });
  }

  function afFichaModal(a) {
    if (!a) return;
    var u = a.userId ? byId(a.userId) : null;
    var movs = db.af.movs.filter(function (m) { return m.activoId === a.id; }).sort(function (x, y) { return y.id - x.id; });
    function row(k, v) { return '<div class="prow"><span class="k" style="min-width:130px;color:var(--muted);font-weight:600">' + k + '</span><span style="flex:1;color:var(--navy)">' + (v || '—') + '</span></div>'; }
    var acciones = '';
    if (a.estado === 'Disponible') acciones += '<button class="btn-g" data-afasig>Asignar a empleado</button>';
    if (a.estado === 'Asignado') acciones += '<button class="btn-g" data-afdev>Registrar devolución</button>';
    if (a.estado === 'Asignado') acciones += '<button class="btn-s" data-afsust>Sustituir equipo</button>';
    if (a.estado !== 'De baja' && a.estado !== 'En reparación') acciones += '<button class="btn-s" data-afrep>Enviar a reparación</button>';
    if (a.estado === 'En reparación') acciones += '<button class="btn-s" data-afret>Retorno de reparación</button>';
    if (a.estado !== 'De baja') acciones += '<button class="btn-s btn-danger" data-afbaja>Dar de baja</button>';
    modal('<button class="mod-x">✕</button><h3>' + esc(a.id) + ' <span style="margin-left:6px">' + afEstChip(a.estado) + '</span></h3>' +
      '<div style="font-size:15px;font-weight:700;color:var(--navy);margin:2px 0 10px">' + esc(a.descripcion) + '</div>' +
      row('Categoría', esc(a.categoria)) + row('Marca / Modelo', esc((a.marca || '') + (a.modelo ? ' · ' + a.modelo : '')) || '—') + row('Serial', esc(a.serial)) +
      row('Ubicación', esc(a.sede) + (a.area ? ' · ' + esc(a.area) : '')) + row('Departamento', esc(a.departamento)) + row('Asignado a', u ? esc(u.nombre) + (a.fechaAsig ? ' <span style="color:var(--muted2)">· desde ' + fechaCorta(a.fechaAsig) + '</span>' : '') : '—') +
      row('Estado físico', esc(a.estadoFisico)) + row('Compra', (a.fechaCompra ? fechaCorta(a.fechaCompra) : '—') + ' · ' + afMoney(a.costo)) + row('Proveedor', esc(a.proveedor) + (a.factura ? ' <span style="color:var(--muted2)">· factura ' + esc(a.factura) + '</span>' : '')) +
      row('Último inventario', a.ultimoInv ? fechaCorta(a.ultimoInv) : '—') + (a.obs ? row('Observaciones', esc(a.obs)) : '') +
      '<div style="margin-top:12px;border-top:1px solid #EEF3F9;padding-top:10px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin-bottom:8px">Historial del activo</div>' +
      (movs.length ? movs.map(function (m) { return '<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #F4F6FA"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);margin-top:6px;flex:0 0 auto"></span><div style="flex:1"><div style="font-size:13.5px;color:var(--navy);font-weight:600">' + esc(m.tipo) + (m.detalle ? ' · ' + esc(m.detalle) : '') + '</div><div style="font-size:12px;color:var(--muted2)">' + esc(fmtStamp(m.fecha)) + ' · ' + esc(m.por) + (m.actaId ? ' · acta ' + esc(m.actaId) : '') + '</div></div>' + (m.actaId ? '<button class="btn-s" data-afacta="' + m.actaId + '" style="font-size:11.5px;padding:4px 9px">Acta</button>' : '') + '</div>'; }).join('') : '<div class="empty" style="padding:8px 0">Sin movimientos.</div>') + '</div>' +
      '<div class="mod-actions" style="flex-wrap:wrap;justify-content:flex-start"><button class="btn-s" data-afedit>Editar</button>' + acciones + '</div>', 'wide');
    $('#modalHost [data-afedit]').addEventListener('click', function () { closeModal(); afActivoForm(a); });
    var b;
    if (b = $('#modalHost [data-afasig]')) b.addEventListener('click', function () { afAsignarModal(a); });
    if (b = $('#modalHost [data-afdev]')) b.addEventListener('click', function () { afDevolverModal(a); });
    if (b = $('#modalHost [data-afsust]')) b.addEventListener('click', function () { afSustituirModal(a); });
    if (b = $('#modalHost [data-afrep]')) b.addEventListener('click', function () { afMovSimple(a, 'Envío a reparación', 'En reparación'); });
    if (b = $('#modalHost [data-afret]')) b.addEventListener('click', function () { afMovSimple(a, 'Retorno', 'Disponible'); });
    if (b = $('#modalHost [data-afbaja]')) b.addEventListener('click', function () { afBajaModal(a); });
    $$('#modalHost [data-afacta]').forEach(function (x) { x.addEventListener('click', function () { var ac = db.af.actas.find(function (z) { return z.id === x.getAttribute('data-afacta'); }); if (ac) afActaDownload(ac); }); });
  }

  function afReRenderList() { if (current === 'aftech') rAfTech(); else if (current === 'afmercadeo') rAfMercadeo(); else if (current === 'afalmacen') rAfAlmacen(); else if (current === 'afpanel' || current === 'activos') rAfPanel(); else rAfActivos(); }
  function afAddMov(a, tipo, detalle, actaId) { var m = { id: db.af.nextMov++, activoId: a.id, tipo: tipo, detalle: detalle || '', fecha: nowStamp(), por: me.nombre, actaId: actaId || null }; db.af.movs.push(m); return m; }
  function afMovSimple(a, tipo, nuevoEstado) {
    if (afBlock('activosGestionar')) return;
    a.estado = nuevoEstado; afAddMov(a, tipo, ''); afLog(tipo, a.id, tipo + ' — ' + a.id + ' (' + a.descripcion + ')');
    saveDB(db); closeModal(); refreshNav(); afReRenderList(); toast('Registrado: ' + tipo + '.');
  }
  function afAsignarModal(a) {
    if (afBlock('activosGestionar')) return;
    var emps = db.users.filter(function (u) { return u.activo && u.role !== 'candidato'; }).sort(function (x, y) { return x.nombre.localeCompare(y.nombre); });
    modal('<button class="mod-x">✕</button><h3>Asignar ' + esc(a.id) + '</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">' + esc(a.descripcion) + '. Se generará el acta de entrega y el activo pasará a "Asignado".</p>' +
      '<div class="fld"><label>Empleado *</label><select id="asU">' + emps.map(function (u) { return '<option value="' + u.id + '">' + esc(u.nombre) + ' — ' + esc(u.cargo || '') + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label>Estado del equipo al entregar</label>' + afSelect('asEF', db.af.cat.estadoFisico, a.estadoFisico || 'Bueno') + '</div>' +
      '<div class="fld"><label>Notas (opcional)</label><textarea id="asN" style="min-height:48px"></textarea></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="asOk">Asignar y generar acta</button></div>');
    $('#asOk').addEventListener('click', function () {
      var uid = +$('#asU').value, u = byId(uid);
      a.userId = uid; a.fechaAsig = reqToday(); a.estado = 'Asignado'; a.estadoFisico = $('#asEF').value;
      var acta = afCrearActa(a, u, 'Entrega', $('#asN').value.trim());
      afAddMov(a, 'Asignación', 'a ' + u.nombre, acta.id);
      afLog('Asignación', a.id, 'Asignó ' + a.id + ' (' + a.descripcion + ') a ' + u.nombre);
      logHist(u, 'Activo fijo asignado: ' + a.descripcion + ' (' + a.id + ') — acta ' + acta.id, me.nombre);
      saveDB(db); closeModal(); refreshNav(); afReRenderList(); afActaDownload(acta); toast('Activo asignado. Acta ' + acta.id + ' generada.');
    });
  }
  function afDevolverModal(a) {
    if (afBlock('activosGestionar')) return;
    var u = a.userId ? byId(a.userId) : null;
    modal('<button class="mod-x">✕</button><h3>Devolución de ' + esc(a.id) + '</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">' + esc(a.descripcion) + (u ? ' · asignado a ' + esc(u.nombre) : '') + '</p>' +
      '<div class="fld"><label>Estado físico al recibir *</label>' + afSelect('dvEF', db.af.cat.estadoFisico, a.estadoFisico || 'Bueno') + '</div>' +
      '<div class="fld"><label>Observaciones de inspección</label><textarea id="dvN" style="min-height:48px" placeholder="Detalles del estado en que se recibe…"></textarea></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="dvOk">Registrar devolución</button></div>');
    $('#dvOk').addEventListener('click', function () {
      a.estadoFisico = $('#dvEF').value;
      var acta = afCrearActa(a, u, 'Devolución', $('#dvN').value.trim());
      afAddMov(a, 'Devolución', u ? 'de ' + u.nombre : '', acta.id);
      afLog('Devolución', a.id, 'Devolución de ' + a.id + (u ? ' por ' + u.nombre : ''));
      if (u) logHist(u, 'Devolvió el activo ' + a.descripcion + ' (' + a.id + ') — acta ' + acta.id, me.nombre);
      a.userId = null; a.fechaAsig = null; a.estado = 'Disponible';
      saveDB(db); closeModal(); refreshNav(); afReRenderList(); afActaDownload(acta); toast('Devolución registrada. Acta ' + acta.id + '.');
    });
  }
  function afBajaModal(a) {
    if (afBlock('activosGestionar')) return;
    modal('<button class="mod-x">✕</button><h3>Dar de baja ' + esc(a.id) + '</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">La baja requiere motivo y evidencia. El activo no se elimina: queda como "De baja" con su historial.</p>' +
      '<div class="fld"><label>Motivo *</label><textarea id="bjN" style="min-height:56px" placeholder="Ej: Equipo inoperativo sin reparación viable…"></textarea></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g btn-danger" id="bjOk">Confirmar baja</button></div>');
    $('#bjOk').addEventListener('click', function () {
      var mot = $('#bjN').value.trim(); if (!mot) { toast('Indica el motivo de la baja.'); return; }
      a.estado = 'De baja'; a.userId = null;
      afAddMov(a, 'Baja', mot); afLog('Baja', a.id, 'Dio de baja ' + a.id + ' (' + a.descripcion + '): ' + mot);
      saveDB(db); closeModal(); refreshNav(); afReRenderList(); toast('Activo dado de baja.');
    });
  }
  function afSustituirModal(a) {
    if (afBlock('activosGestionar')) return;
    if (!a || a.estado !== 'Asignado') { toast('Solo se sustituye un equipo asignado.'); return; }
    var u = a.userId ? byId(a.userId) : null;
    var mismaCat = db.af.activos.filter(function (x) { return x.estado === 'Disponible' && x.categoria === a.categoria; });
    var otros = db.af.activos.filter(function (x) { return x.estado === 'Disponible' && x.categoria !== a.categoria; });
    modal('<button class="mod-x">✕</button><h3>Sustituir equipo</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Equipo actual: <b>' + esc(a.id) + '</b> — ' + esc(a.descripcion) + (u ? '<br>Asignado a <b>' + esc(u.nombre) + '</b>' : '') + '</p>' +
      '<div class="fld"><label>Motivo de la sustitución *</label><textarea id="suJust" style="min-height:56px" placeholder="Ej: equipo con falla de hardware, actualización de gama…"></textarea></div>' +
      '<div class="fld"><label>El equipo actual entra al almacén como *</label>' + afSelect('suEstado', ['En reparación', 'Dañado', 'Disponible'], 'En reparación') + '</div>' +
      '<div class="fld"><label>Estado físico al recibir</label>' + afSelect('suEF', db.af.cat.estadoFisico, a.estadoFisico || 'Regular') + '</div>' +
      '<div class="fld"><label>Equipo de reemplazo (opcional)</label><select id="suNuevo"><option value="">— No asignar ahora —</option>' +
        (mismaCat.length ? '<optgroup label="' + esc(a.categoria) + '">' + mismaCat.map(function (x) { return '<option value="' + x.id + '">' + esc(x.id) + ' · ' + esc(x.descripcion) + (x.marca ? ' (' + esc(x.marca) + ')' : '') + '</option>'; }).join('') + '</optgroup>' : '') +
        (otros.length ? '<optgroup label="Otras categorías">' + otros.map(function (x) { return '<option value="' + x.id + '">' + esc(x.id) + ' · ' + esc(x.categoria) + ' · ' + esc(x.descripcion) + '</option>'; }).join('') + '</optgroup>' : '') +
      '</select></div>' +
      '<div class="note" style="margin:0 0 6px">Se genera el acta de devolución del equipo actual y, si eliges reemplazo, el acta de entrega del nuevo.</div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="suOk">Confirmar sustitución</button></div>', 'wide');
    $('#suOk').addEventListener('click', function () {
      var just = $('#suJust').value.trim(); if (!just) { toast('Indica el motivo de la sustitución.'); return; }
      var nuevoEstado = $('#suEstado').value, nuevoId = $('#suNuevo').value;
      // devolución del equipo actual
      a.estadoFisico = $('#suEF').value;
      var actaDev = afCrearActa(a, u, 'Devolución por sustitución', just);
      afAddMov(a, 'Devolución', (u ? 'de ' + u.nombre + ' · ' : '') + 'sustitución: ' + just + ' → ingresa como ' + nuevoEstado, actaDev.id);
      afLog('Sustitución', a.id, 'Sustitución: ' + a.id + (u ? ' (de ' + u.nombre + ')' : '') + ' ingresa al almacén como ' + nuevoEstado + '. Motivo: ' + just);
      if (u) logHist(u, 'Sustitución de equipo: devolvió ' + a.descripcion + ' (' + a.id + '). Motivo: ' + just, me.nombre);
      a.userId = null; a.fechaAsig = null; a.estado = nuevoEstado;
      var actas = [actaDev];
      // asignación del reemplazo
      if (nuevoId && u) {
        var nv = afActById(nuevoId);
        if (nv && nv.estado === 'Disponible') {
          nv.userId = u.id; nv.fechaAsig = reqToday(); nv.estado = 'Asignado';
          var actaEnt = afCrearActa(nv, u, 'Entrega por sustitución', 'Reemplazo de ' + a.id + '. ' + just);
          afAddMov(nv, 'Asignación', 'a ' + u.nombre + ' (reemplazo de ' + a.id + ')', actaEnt.id);
          afLog('Asignación', nv.id, 'Asignó ' + nv.id + ' a ' + u.nombre + ' como reemplazo de ' + a.id);
          logHist(u, 'Sustitución de equipo: recibió ' + nv.descripcion + ' (' + nv.id + ') en reemplazo de ' + a.id + ' — acta ' + actaEnt.id, me.nombre);
          actas.push(actaEnt);
        }
      }
      saveDB(db); closeModal(); refreshNav(); afReRenderList();
      actas.forEach(function (ac) { afActaDownload(ac); });
      toast('Sustitución registrada. ' + a.id + ' ingresó al almacén como ' + nuevoEstado + '.');
    });
  }
  function afCrearActa(a, u, tipo, notas) {    var acta = { id: 'ACTA-' + afPad(db.af.nextActa++, 4), activoId: a.id, descripcion: a.descripcion, serial: a.serial, empleado: u ? u.nombre : '—', empleadoCargo: u ? (u.cargo || '') : '', tipo: tipo, estadoFisico: a.estadoFisico, notas: notas || '', fecha: reqToday(), por: me.nombre };
    db.af.actas.push(acta); return acta;
  }
  function afActaDownload(acta) {
    var css = 'body{font-family:Barlow,Arial,sans-serif;color:#001F60;max-width:720px;margin:32px auto;padding:0 28px}h1{font-size:22px;margin:0}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #00CE7C;padding-bottom:14px;margin-bottom:20px}.logo{font-weight:800;font-size:20px;letter-spacing:1px}.logo span{color:#00CE7C}.k{color:#5b6b86;font-weight:600;width:190px;display:inline-block}.row{padding:7px 0;border-bottom:1px solid #eef3f9;font-size:14px}.sign{margin-top:48px;display:flex;justify-content:space-between;gap:40px}.sign div{flex:1;text-align:center;border-top:1px solid #001F60;padding-top:8px;font-size:13px;color:#5b6b86}.foot{margin-top:36px;font-size:12px;color:#8a97ad;border-top:1px solid #eef3f9;padding-top:10px}';
    var b = '<div class="top"><div><h1>Acta de ' + esc(acta.tipo) + '</h1><div style="color:#5b6b86;font-size:13px;margin-top:4px">N° ' + esc(acta.id) + ' · ' + fechaCorta(acta.fecha) + '</div></div><div class="logo">VE<span>|</span>PAGOS</div></div>' +
      '<div class="row"><span class="k">Activo</span>' + esc(acta.activoId) + ' — ' + esc(acta.descripcion) + '</div>' +
      '<div class="row"><span class="k">Serial</span>' + esc(acta.serial || '—') + '</div>' +
      '<div class="row"><span class="k">Empleado</span>' + esc(acta.empleado) + (acta.empleadoCargo ? ' · ' + esc(acta.empleadoCargo) : '') + '</div>' +
      '<div class="row"><span class="k">Estado del equipo</span>' + esc(acta.estadoFisico || '—') + '</div>' +
      '<div class="row"><span class="k">Registrado por</span>' + esc(acta.por) + '</div>' +
      (acta.notas ? '<div class="row"><span class="k">Notas</span>' + esc(acta.notas) + '</div>' : '') +
      '<p style="font-size:13.5px;line-height:1.6;margin-top:20px">Por medio de la presente se deja constancia de la ' + esc(acta.tipo.toLowerCase()) + ' del activo arriba descrito, propiedad de VEPAGOS, quedando el empleado responsable de su custodia y buen uso mientras permanezca bajo su resguardo.</p>' +
      '<div class="sign"><div>Entrega — Administración</div><div>Recibe — ' + esc(acta.empleado) + '</div></div>' +
      '<div class="foot">Documento generado automáticamente por el portal Somos VEPAGOS · ' + esc(acta.id) + '</div>';
    var html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + esc(acta.id) + '</title><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700;800&display=swap" rel="stylesheet"><style>' + css + '</style></head><body>' + b + '</body></html>';
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob); var link = document.createElement('a'); link.href = url; link.download = acta.id + '.html'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function afExportInventario() {
    var cols = ['ID', 'Categoría', 'Descripción', 'Marca', 'Modelo', 'Serial', 'Sede', 'Área', 'Departamento', 'Asignado a', 'Estado', 'Estado físico', 'Costo USD', 'Proveedor', 'Factura'];
    var rows = db.af.activos.map(function (a) { var u = a.userId ? byId(a.userId) : null; return [a.id, a.categoria, a.descripcion, a.marca, a.modelo, a.serial, a.sede, a.area, a.departamento, u ? u.nombre : '', a.estado, a.estadoFisico, a.costo, a.proveedor, a.factura]; });
    var csv = [cols].concat(rows).map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob); var link = document.createElement('a'); link.href = url; link.download = 'Inventario_activos_VEPAGOS.csv'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Inventario exportado a CSV.');
  }

  /* ---------- ALMACÉN DE TECNOLOGÍA (equipos de computación/tecnología) ---------- */
  var AF_TECH = ['Computación', 'POS / Terminales', 'Audiovisual'];
  var afTechSolo = false, afTechCat = 'todas', afTechQ = '';
  function rAfTech() {
    resetContent();
    var tech = db.af.activos.filter(function (a) { return AF_TECH.indexOf(a.categoria) > -1; });
    var html = afHero('Equipos de computación y tecnología', 'Almacén de tecnología', 'Pool de equipos tecnológicos disponibles para asignar al equipo. Cada entrega genera su acta.',
      (!afCan('activosGestionar') ? '' : '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-g" id="afTechAdd" style="background:#fff;color:var(--navy)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Nuevo equipo</button><button class="btn-s" id="afTechBulk" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M17 8l-5-5-5 5M12 3v12"></path></svg>Carga masiva</button></div>'));
    // resumen por categoría
    html += '<div class="dash-kpis" style="margin-bottom:16px">' + AF_TECH.map(function (cat) {
      var g = tech.filter(function (a) { return a.categoria === cat && a.estado !== 'De baja'; });
      var disp = g.filter(function (a) { return a.estado === 'Disponible'; }).length;
      var asig = g.filter(function (a) { return a.estado === 'Asignado'; }).length;
      var ico = cat === 'Computación' ? '<rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path>' : cat === 'POS / Terminales' ? '<rect x="5" y="2" width="14" height="20" rx="2"></rect><path d="M9 18h6"></path>' : '<path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2"></rect>';
      return '<div class="dash-kpi" style="cursor:pointer" data-aftcat="' + esc(cat) + '"><span class="dash-kpi-ic" style="background:#2A6FDB18;color:#2A6FDB"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span><div><div class="dash-kpi-n">' + g.length + '</div><div class="dash-kpi-l">' + esc(cat) + '</div><div style="font-size:11.5px;color:var(--muted2);margin-top:2px"><b style="color:#1F8A5B">' + disp + ' disp.</b> · ' + asig + ' asig.</div></div></div>';
    }).join('') + '</div>';
    // filtros
    var CATS = ['todas'].concat(AF_TECH);
    html += '<div class="card" style="margin-bottom:14px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<div style="position:relative;flex:1;min-width:200px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" style="position:absolute;left:11px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg><input id="afTechQ" type="text" value="' + esc(afTechQ) + '" placeholder="Buscar por ID, equipo, serial, marca…" style="width:100%;border:1.5px solid #D9E2EF;border-radius:10px;padding:9px 11px 9px 34px;font-family:inherit;font-size:13.5px"></div>' +
      '<div class="doccat">' + CATS.map(function (c) { return '<button data-aftcat="' + esc(c) + '" class="' + (afTechCat === c ? 'on' : '') + '">' + (c === 'todas' ? 'Todas' : esc(c)) + '</button>'; }).join('') + '</div>' +
      '<span class="sp" style="flex:1"></span>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--navy);cursor:pointer"><input type="checkbox" id="afTechSolo"' + (afTechSolo ? ' checked' : '') + ' style="accent-color:#00CE7C;width:17px;height:17px">Solo disponibles</label>' +
      '</div></div>';
    var techQ = afTechQ.toLowerCase();
    var list = tech.filter(function (a) {
      if (a.estado === 'De baja') return false;
      if (afTechCat !== 'todas' && a.categoria !== afTechCat) return false;
      if (afTechSolo && a.estado !== 'Disponible') return false;
      if (techQ && [a.id, a.descripcion, a.serial, a.marca, a.modelo].join(' ').toLowerCase().indexOf(techQ) < 0) return false;
      return true;
    }).sort(function (a, b) { var o = { 'Disponible': 0, 'Asignado': 1, 'En reparación': 2, 'Dañado': 3 }; return (o[a.estado] || 9) - (o[b.estado] || 9); });
    html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>ID</th><th>Equipo</th><th>Categoría</th><th>Serial</th><th>Estado</th><th>Asignado a</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (a) { var u = a.userId ? byId(a.userId) : null; return '<tr><td><b style="color:var(--navy)">' + esc(a.id) + '</b></td><td>' + esc(a.descripcion) + '<div style="font-size:12px;color:var(--muted2)">' + esc(a.marca || '') + (a.modelo ? ' · ' + esc(a.modelo) : '') + '</div></td><td>' + esc(a.categoria) + '</td><td style="font-size:12.5px">' + esc(a.serial || '—') + '</td><td>' + afEstChip(a.estado) + '</td><td>' + (u ? esc(u.nombre) : '<span style="color:var(--muted2)">—</span>') + '</td><td><div style="display:flex;gap:6px;justify-content:flex-end">' + (a.estado === 'Disponible' ? '<button class="btn-g" data-aftasig="' + a.id + '" style="font-size:12.5px;padding:6px 12px">Asignar</button>' : '') + (a.estado === 'Asignado' ? '<button class="btn-s" data-aftsust="' + a.id + '" style="font-size:12.5px;padding:6px 11px">Sustituir</button>' : '') + '<button class="btn-s" data-afver="' + a.id + '" style="font-size:12.5px;padding:6px 11px">Ficha</button></div></td></tr>'; }).join('') : '<tr><td colspan="7"><div class="empty">No hay equipos de tecnología con este filtro.</div></td></tr>') +
      '</tbody></table></div></div>';
    $('#content').innerHTML = html;
    var tAdd = $('#afTechAdd'); if (tAdd) tAdd.addEventListener('click', function () { afActivoForm(null); });
    var tBulk = $('#afTechBulk'); if (tBulk) tBulk.addEventListener('click', afBulkActivosModal);
    var chk = $('#afTechSolo'); chk.addEventListener('change', function () { afTechSolo = chk.checked; rAfTech(); });
    var tq = $('#afTechQ'); if (tq) tq.addEventListener('input', function () { afTechQ = tq.value; var pos = tq.selectionStart; rAfTech(); var n = $('#afTechQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
    $$('#content [data-aftcat]').forEach(function (b) { b.addEventListener('click', function () { afTechCat = b.getAttribute('data-aftcat'); rAfTech(); }); });
    $('#content').addEventListener('click', function (e) {
      var asg = e.target.closest('[data-aftasig]'); if (asg) { afAsignarModal(afActById(asg.getAttribute('data-aftasig'))); return; }
      var sus = e.target.closest('[data-aftsust]'); if (sus) { afSustituirModal(afActById(sus.getAttribute('data-aftsust'))); return; }
      var v = e.target.closest('[data-afver]'); if (v) afFichaModal(afActById(v.getAttribute('data-afver')));
    });
  }

  /* ---------- M3 · ALMACENES (consumibles / mercadeo) ---------- */
  var AF_ALM = {
    consumibles: { prefix: 'CO', kicker: 'Consumibles y servicios generales', title: 'Almacén consumibles', subExtra: 'de entradas y salidas, stock en tiempo real y alertas de reposición.', tplName: 'Plantilla_carga_consumibles.csv', ej: [['', 'Resma de papel oficio', 'Resma', '10', 'Estante A - Nivel 2', '30'], ['', 'Marcador de pizarra', 'Caja', '5', 'Estante A - Nivel 1', '12'], ['CO-002', 'Cartucho tóner HP 26A', 'Cartucho', '4', 'Estante B - Nivel 1', '6']] },
    mercadeo: { prefix: 'MK', kicker: 'Mercadeo, ventas y regalos corporativos', title: 'Almacén Mercadeo', subExtra: 'de material POP, uniformes, mobiliario de ventas, agendas, lapiceros y regalos corporativos.', tplName: 'Plantilla_carga_mercadeo.csv', ej: [['', 'Franela institucional VEPAGOS', 'Unidad', '20', 'Estante D - Nivel 1', '60'], ['', 'Agenda corporativa 2026', 'Unidad', '15', 'Estante E - Nivel 2', '40'], ['', 'Banner roll-up POP', 'Unidad', '3', 'Depósito mercadeo', '8']] }
  };
  var afAlmTipo = 'consumibles';
  function afNewItemId(tipo) { if (tipo === 'mercadeo') return 'MK-' + afPad(db.af.nextMerc++, 3); return 'CO-' + afPad(db.af.nextCons++, 3); }
  function afConsList(tipo) { return (db.af.consumibles || []).filter(function (c) { return (c.almacen || 'consumibles') === tipo; }); }
  function rAfAlmacen() { afAlmacenRender('consumibles'); }
  function rAfMercadeo() { afAlmacenRender('mercadeo'); }
  var afAlmQ = { consumibles: '', mercadeo: '' };
  function afAlmacenRender(tipo) {
    afAlmTipo = tipo;
    resetContent();
    var cfg = AF_ALM[tipo];
    var reglas = db.af.reglas || { factor: 2, margen: 0, autoSolicitud: false };
    var esAdmin = me.role === 'admin';
    function umbral(c) { return Math.ceil(c.minimo * (1 + (reglas.margen || 0) / 100)); }
    function objetivo(c) { return Math.max(c.minimo, Math.round(c.minimo * (reglas.factor || 1))); }
    function sugerido(c) { return Math.max(0, objetivo(c) - afStock(c.id)); }
    var full = afConsList(tipo);
    var q = (afAlmQ[tipo] || '').toLowerCase();
    var lista = q ? full.filter(function (c) { return [c.id, c.nombre, c.ubicacion].join(' ').toLowerCase().indexOf(q) > -1; }) : full;
    var html = afHero(cfg.kicker, cfg.title, 'Kardex <button id="afKardexHelp" title="¿Qué es el Kardex?" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1.5px solid rgba(255,255,255,.55);background:rgba(255,255,255,.14);color:#fff;font-size:11px;font-weight:800;cursor:pointer;vertical-align:2px;padding:0;font-family:inherit">?</button> ' + cfg.subExtra,
      ('<div style="display:flex;gap:8px;flex-wrap:wrap">' + (afCan('almacenMovimiento') ? '<button class="btn-g" id="afMov" style="background:#fff;color:var(--navy)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8l4 4-4 4M7 16l-4-4 4-4"></path></svg>Registrar movimiento</button>' : '') + (afCan('almacenArticulo') ? '<button class="btn-s" id="afBulk" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M17 8l-5-5-5 5M12 3v12"></path></svg>Carga masiva</button><button class="btn-s" id="afNewCons" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">+ Artículo</button>' : '') + '</div>'));
    // Reglas de reposición (solo admin)
    if (esAdmin) html += '<div class="card" style="margin-bottom:14px;border-left:4px solid #2A6FDB"><div class="toolrow" style="margin:0 0 4px"><h3 style="margin:0;display:flex;align-items:center;gap:8px"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2A6FDB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"></path></svg>Reglas de reposición</h3><span class="sp"></span><button class="btn-s" id="afReglas">Configurar</button></div><div class="note" style="margin:-2px 0 0">Alertar cuando el stock esté a <b>' + umbral({ minimo: 100 }) / 100 * 100 + '%</b>… <span style="color:var(--navy)">margen +' + (reglas.margen || 0) + '% sobre el mínimo</span> · <span style="color:var(--navy)">reponer hasta ' + (reglas.factor || 1) + '× el mínimo</span> · solicitud automática: <b>' + (reglas.autoSolicitud ? 'sí' : 'no') + '</b></div></div>';
    // Reposición sugerida
    var repo = full.filter(function (c) { return afStock(c.id) <= umbral(c); });
    if (repo.length) html += '<div class="card" style="margin-bottom:14px;border-color:#F3B24A;background:linear-gradient(180deg,#FFF6E9,#fff)"><div class="toolrow" style="margin:0 0 4px"><h3 style="margin:0;display:flex;align-items:center;gap:8px;color:#B26A00"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C77700" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path></svg>Reposición sugerida <span class="chip y">' + repo.length + '</span></h3><span class="sp"></span>' + (!afCan('almacenArticulo') ? '' : '<button class="btn-s" id="afGenSol">Generar solicitud de compra</button>') + '</div><div class="note" style="margin:-2px 0 8px">Según las reglas, reponer hasta ' + (reglas.factor || 1) + '× el mínimo.</div>' + repo.map(function (c) { return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #F3E4C6"><div style="flex:1"><b style="color:var(--navy)">' + esc(c.nombre) + '</b> <span style="color:var(--muted2);font-size:12.5px">· ' + esc(c.id) + '</span></div><span class="chip ' + (afStock(c.id) <= 0 ? 'r' : 'y') + '">' + afStock(c.id) + ' / mín ' + c.minimo + '</span><span class="chip g">Pedir ' + sugerido(c) + '</span></div>'; }).join('') + '</div>';
    // buscador
    html += '<div class="card" style="margin-bottom:14px"><div style="position:relative"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" style="position:absolute;left:11px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg><input id="afAlmQ" type="text" value="' + esc(afAlmQ[tipo]) + '" placeholder="Buscar por código, artículo o ubicación…" style="width:100%;border:1.5px solid #D9E2EF;border-radius:10px;padding:9px 11px 9px 34px;font-family:inherit;font-size:13.5px"></div></div>';
    html += '<div class="card" style="padding:6px 16px;margin-bottom:16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Código</th><th>Artículo</th><th>Ubicación</th><th>Stock actual</th><th>Mínimo</th><th>Estado</th><th></th></tr></thead><tbody>' +
      (lista.length ? lista.map(function (c) { var st = afStock(c.id); var low = st <= umbral(c); return '<tr><td><b style="color:var(--navy)">' + esc(c.id) + '</b></td><td>' + esc(c.nombre) + '</td><td style="font-size:12.5px;color:var(--muted)">' + esc(c.ubicacion || '—') + '</td><td><b style="color:var(--navy)">' + st + '</b> <span style="color:var(--muted2);font-size:12px">' + esc(c.unidad) + '</span></td><td>' + c.minimo + '</td><td>' + (low ? '<span class="chip ' + (st <= 0 ? 'r' : 'y') + '">Reponer</span>' : '<span class="chip g">OK</span>') + '</td><td><button class="btn-s" data-afkardex="' + c.id + '" style="font-size:12.5px;padding:6px 11px">Kardex</button></td></tr>'; }).join('') : '<tr><td colspan="7"><div class="empty">' + (q ? 'No hay artículos que coincidan con la búsqueda.' : 'Aún no hay artículos en este almacén. Usa "+ Artículo" o "Carga masiva".') + '</div></td></tr>') +
      '</tbody></table></div></div>';
    // Activos de mercadeo (no consumibles) → aparecen en el registro maestro
    if (tipo === 'mercadeo') {
      var mercAct = db.af.activos.filter(function (a) { return a.categoria === 'Mercadeo' && a.estado !== 'De baja'; });
      html += '<div class="card" style="padding:6px 16px;margin-bottom:16px"><div class="toolrow" style="margin:8px 4px 6px"><h3 style="margin:0;display:flex;align-items:center;gap:8px"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-3V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path></svg>Activos de mercadeo (no consumibles)</h3><span class="sp"></span>' + (!afCan('activosGestionar') ? '' : '<button class="btn-s" id="afMercAct">+ Activo de mercadeo</button>') + '</div><div class="note" style="margin:0 4px 8px">Bienes durables de mercadeo (stands, mobiliario, pantallas). Se registran como activos fijos y aparecen en el <b>Registro maestro</b>.</div><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>ID</th><th>Descripción</th><th>Ubicación</th><th>Estado</th><th>Asignado a</th><th></th></tr></thead><tbody>' +
        (mercAct.length ? mercAct.map(function (a) { var u = a.userId ? byId(a.userId) : null; return '<tr><td><b style="color:var(--navy)">' + esc(a.id) + '</b></td><td>' + esc(a.descripcion) + '</td><td style="font-size:12.5px;color:var(--muted)">' + esc(a.sede) + '</td><td>' + afEstChip(a.estado) + '</td><td>' + (u ? esc(u.nombre) : '<span style="color:var(--muted2)">—</span>') + '</td><td><button class="btn-s" data-afver="' + a.id + '" style="font-size:12.5px;padding:6px 11px">Ficha</button></td></tr>'; }).join('') : '<tr><td colspan="6"><div class="empty">Aún no hay activos de mercadeo. Usa "+ Activo de mercadeo".</div></td></tr>') +
        '</tbody></table></div></div>';
    }
    $('#content').innerHTML = html;
    var mMov = $('#afMov'); if (mMov) mMov.addEventListener('click', function () { afMovModal(null); });
    var mBulk = $('#afBulk'); if (mBulk) mBulk.addEventListener('click', afBulkConsModal);
    var mNew = $('#afNewCons'); if (mNew) mNew.addEventListener('click', afNewConsModal);
    var kh = $('#afKardexHelp'); if (kh) kh.addEventListener('click', afKardexHelp);
    var rg = $('#afReglas'); if (rg) rg.addEventListener('click', afReglasModal);
    var gs = $('#afGenSol'); if (gs) gs.addEventListener('click', function () { afGenerarReposicion(tipo); });
    var ma = $('#afMercAct'); if (ma) ma.addEventListener('click', function () { afActivoForm(null, 'Mercadeo'); });
    var qi = $('#afAlmQ'); if (qi) qi.addEventListener('input', function () { afAlmQ[tipo] = qi.value; var pos = qi.selectionStart; afAlmacenRender(tipo); var n = $('#afAlmQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
    $$('#content [data-afkardex]').forEach(function (b) { b.addEventListener('click', function () { afKardexModal(afConsById(b.getAttribute('data-afkardex'))); }); });
    $$('#content [data-afver]').forEach(function (b) { b.addEventListener('click', function () { afFichaModal(afActById(b.getAttribute('data-afver'))); }); });
  }
  function afReglasModal() {
    if (afBlock('almacenArticulo')) return;
    var r = db.af.reglas || { factor: 2, margen: 0, autoSolicitud: false };
    modal('<button class="mod-x">✕</button><h3>Reglas de reposición</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 10px">Definen cuándo se alerta y cuánto se sugiere reponer en todos los almacenes.</p>' +
      '<div class="fld"><label>Margen de alerta sobre el mínimo (%)</label><input id="rgMargen" type="number" min="0" max="200" value="' + (r.margen || 0) + '"><div class="note" style="margin:4px 0 0">Se alerta cuando el stock ≤ mínimo + este margen. 0% = alertar justo en el mínimo.</div></div>' +
      '<div class="fld"><label>Nivel objetivo de reposición (× el mínimo)</label><input id="rgFactor" type="number" min="1" step="0.5" value="' + (r.factor || 1) + '"><div class="note" style="margin:4px 0 0">La cantidad sugerida lleva el stock hasta este múltiplo del mínimo.</div></div>' +
      '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin:6px 0 2px"><input type="checkbox" id="rgAuto"' + (r.autoSolicitud ? ' checked' : '') + ' style="accent-color:#00CE7C;width:18px;height:18px;margin-top:2px"><span style="font-size:13.5px;color:var(--navy)"><b>Solicitud de compra automática</b><br><span style="color:var(--muted);font-weight:400">Al generar la reposición, crea directamente la solicitud en Procura.</span></span></label>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="rgOk">Guardar reglas</button></div>');
    $('#rgOk').addEventListener('click', function () {
      db.af.reglas = { margen: Math.max(0, +$('#rgMargen').value || 0), factor: Math.max(1, +$('#rgFactor').value || 1), autoSolicitud: $('#rgAuto').checked };
      afLog('Reglas', '', 'Actualizó las reglas de reposición (margen ' + db.af.reglas.margen + '%, objetivo ' + db.af.reglas.factor + '×, auto ' + (db.af.reglas.autoSolicitud ? 'sí' : 'no') + ')');
      saveDB(db); closeModal(); afAlmacenRender(afAlmTipo); toast('Reglas de reposición guardadas.');
    });
  }
  function afGenerarReposicion(tipo) {
    if (afBlock('almacenArticulo')) return;
    var r = db.af.reglas || { factor: 2, margen: 0 };
    function umbral(c) { return Math.ceil(c.minimo * (1 + (r.margen || 0) / 100)); }
    function sug(c) { return Math.max(1, Math.round(Math.max(c.minimo, c.minimo * (r.factor || 1)) - afStock(c.id))); }
    var repo = afConsList(tipo).filter(function (c) { return afStock(c.id) <= umbral(c); });
    if (!repo.length) { toast('No hay artículos bajo el umbral de reposición.'); return; }
    var items = repo.map(function (c) { return { desc: c.nombre, artId: c.id, cant: sug(c) }; });
    var id = afNewSolId();
    db.af.solicitudes.push({ id: id, solicitante: me.id, departamento: tipo === 'mercadeo' ? 'Comercial' : 'Administración', items: items, justificacion: 'Reposición automática de ' + AF_ALM[tipo].title + ' (artículos en o bajo el mínimo).', estado: 'Enviada', fecha: reqToday(), aprobadoPor: null, aprobadoFecha: null, ordenId: null, origen: 'reposicion' });
    afLog('Solicitud', id, 'Generó la solicitud de reposición ' + id + ' desde ' + AF_ALM[tipo].title + ' (' + items.length + ' ítem(s))');
    saveDB(db); refreshNav(); toast('Solicitud ' + id + ' creada en Procura con ' + items.length + ' ítem(s).');
  }
  function afKardexHelp() {
    modal('<button class="mod-x">✕</button><h3>¿Qué es el Kardex?</h3>' +
      '<p style="color:#33415C;font-size:14px;line-height:1.6;margin:6px 0 10px">El <b>Kardex</b> es el registro histórico de movimientos de un artículo de almacén: cada <b>entrada</b>, <b>salida</b> y <b>ajuste</b>, con su fecha, cantidad, a quién se entregó y quién lo registró.</p>' +
      '<p style="color:#33415C;font-size:14px;line-height:1.6;margin:0 0 10px">Sirve para saber en todo momento cómo se llegó al <b>stock actual</b> y auditar el consumo por departamento. El stock nunca se edita a mano: solo cambia por estos movimientos.</p>' +
      '<div class="mod-actions"><button class="btn-g mod-x">Entendido</button></div>');
  }
  function afBulkTemplate() {
    var cfg = AF_ALM[afAlmTipo];
    var cols = ['Codigo', 'Articulo', 'Unidad', 'StockMinimo', 'Ubicacion', 'StockInicial'];
    var ej = cfg.ej;
    var csv = [cols].concat(ej).map(function (r) { return r.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = cfg.tplName; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Plantilla descargada.');
  }
  function afParseCSV(text) {
    text = text.replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) { var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else { if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch; }
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
  }
  function afBulkConsModal() {
    if (afBlock('almacenArticulo')) return;
    var parsed = null;
    modal('<button class="mod-x">✕</button><h3>Carga masiva · ' + esc(AF_ALM[afAlmTipo].title) + '</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:4px 0 10px">Sube un archivo <b>CSV</b> con una fila por artículo. Usa la plantilla para respetar el formato.</p>' +
      '<div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:12px"><div style="overflow-x:auto"><table class="tbl" style="margin:0"><thead><tr><th>Columna</th><th>Descripción</th><th>Obligatorio</th></tr></thead><tbody>' +
      '<tr><td><b>Codigo</b></td><td>Código del artículo (ej. CO-010). Si se deja vacío, el sistema lo genera. Si el código ya existe, actualiza ese artículo.</td><td>No</td></tr>' +
      '<tr><td><b>Articulo</b></td><td>Nombre del consumible.</td><td>Sí</td></tr>' +
      '<tr><td><b>Unidad</b></td><td>Unidad de medida: ' + esc(db.af.cat.unidades.join(', ')) + '.</td><td>No</td></tr>' +
      '<tr><td><b>StockMinimo</b></td><td>Cantidad mínima antes de reponer (número).</td><td>No</td></tr>' +
      '<tr><td><b>Ubicacion</b></td><td>Ubicación en almacén (estante / nivel).</td><td>No</td></tr>' +
      '<tr><td><b>StockInicial</b></td><td>Existencia actual a cargar como entrada inicial (número).</td><td>No</td></tr>' +
      '</tbody></table></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px"><button class="btn-s" id="blTpl"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5M12 15V3"></path></svg>Descargar plantilla CSV</button><button class="btn-s" id="blFile">Seleccionar archivo CSV</button><span id="blName" style="font-size:13px;color:var(--muted)">Ningún archivo</span></div>' +
      '<div id="blPrev"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="blOk" disabled style="opacity:.5">Importar</button></div>', 'wide');
    $('#blTpl').addEventListener('click', afBulkTemplate);
    $('#blFile').addEventListener('click', function () {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
      inp.onchange = function () { var f = inp.files[0]; if (!f) return; $('#blName').textContent = f.name; var rd = new FileReader(); rd.onload = function () {
        var rows = afParseCSV(String(rd.result)); if (rows.length < 2) { $('#blPrev').innerHTML = '<div class="note" style="color:#B23A6E">El archivo no tiene filas de datos.</div>'; return; }
        var head = rows[0].map(function (h) { return String(h).trim().toLowerCase().replace(/[^a-z]/g, ''); });
        var idx = function (name) { return head.indexOf(name); };
        var iArt = idx('articulo'), iCod = idx('codigo'), iUni = idx('unidad'), iMin = idx('stockminimo'), iLoc = idx('ubicacion'), iIni = idx('stockinicial');
        if (iArt < 0) { $('#blPrev').innerHTML = '<div class="note" style="color:#B23A6E">Falta la columna obligatoria "Articulo".</div>'; return; }
        var items = [], errs = 0;
        rows.slice(1).forEach(function (r) { var art = (r[iArt] || '').trim(); if (!art) { errs++; return; } items.push({ codigo: iCod > -1 ? (r[iCod] || '').trim() : '', articulo: art, unidad: iUni > -1 ? (r[iUni] || '').trim() : '', minimo: iMin > -1 ? (parseInt(r[iMin], 10) || 0) : 0, ubicacion: iLoc > -1 ? (r[iLoc] || '').trim() : '', inicial: iIni > -1 ? (parseInt(r[iIni], 10) || 0) : 0 }); });
        parsed = items;
        $('#blPrev').innerHTML = '<div class="card" style="margin:0 0 4px"><div style="font-weight:700;color:var(--navy);margin-bottom:6px">Vista previa · ' + items.length + ' artículo(s)' + (errs ? ' · <span style="color:#B23A6E">' + errs + ' fila(s) sin nombre omitidas</span>' : '') + '</div><div style="overflow-x:auto;max-height:200px"><table class="tbl" style="margin:0"><thead><tr><th>Código</th><th>Artículo</th><th>Unidad</th><th>Mín.</th><th>Inicial</th></tr></thead><tbody>' + items.slice(0, 30).map(function (it) { return '<tr><td>' + esc(it.codigo || '(auto)') + '</td><td>' + esc(it.articulo) + '</td><td>' + esc(it.unidad || '—') + '</td><td>' + it.minimo + '</td><td>' + it.inicial + '</td></tr>'; }).join('') + '</tbody></table></div>' + (items.length > 30 ? '<div class="note" style="margin:6px 0 0">Mostrando 30 de ' + items.length + '.</div>' : '') + '</div>';
        var ok = $('#blOk'); ok.disabled = !items.length; ok.style.opacity = items.length ? '1' : '.5';
      }; rd.readAsText(f); };
      inp.click();
    });
    $('#blOk').addEventListener('click', function () {
      if (!parsed || !parsed.length) return;
      var nuevos = 0, actualizados = 0;
      parsed.forEach(function (it) {
        var unidad = db.af.cat.unidades.indexOf(it.unidad) > -1 ? it.unidad : 'Unidad';
        var existing = it.codigo ? afConsById(it.codigo) : null;
        if (existing) { existing.nombre = it.articulo; existing.unidad = unidad; existing.minimo = it.minimo; if (it.ubicacion) existing.ubicacion = it.ubicacion; actualizados++; if (it.inicial > 0) db.af.stock.push({ id: db.af.nextStock++, artId: existing.id, tipo: 'Ajuste', cant: it.inicial, fecha: reqToday(), ref: 'Carga masiva', por: me.nombre }); }
        else { var id = it.codigo || afNewItemId(afAlmTipo); db.af.consumibles.push({ id: id, nombre: it.articulo, unidad: unidad, minimo: it.minimo, ubicacion: it.ubicacion, almacen: afAlmTipo }); nuevos++; if (it.inicial > 0) db.af.stock.push({ id: db.af.nextStock++, artId: id, tipo: 'Entrada', cant: it.inicial, fecha: reqToday(), ref: 'Carga masiva (stock inicial)', por: me.nombre }); }
      });
      afLog('Carga masiva', '', 'Carga masiva en ' + AF_ALM[afAlmTipo].title + ': ' + nuevos + ' nuevo(s), ' + actualizados + ' actualizado(s)');
      saveDB(db); closeModal(); refreshNav(); afAlmacenRender(afAlmTipo); toast('Importados: ' + nuevos + ' nuevo(s), ' + actualizados + ' actualizado(s).');
    });
  }
  function afBulkActivosTemplate() {
    var cols = ['Categoria', 'Descripcion', 'Marca', 'Modelo', 'Serial', 'Sede', 'Area', 'Departamento', 'Costo', 'Proveedor', 'Factura', 'EstadoFisico', 'FechaCompra', 'Observaciones'];
    var ej = [
      ['Computación', 'Laptop 14" nueva analista', 'Dell', 'Latitude 3450', 'DL-3450-0091', 'Sede Principal', 'Piso 2 - Tecnología', 'Tecnología', '680', 'Distribuidora TecnoZulia', 'F-01110', 'Nuevo', '2026-07-12', ''],
      ['POS / Terminales', 'Terminal POS A920', 'PAX', 'A920', 'PAX-A920-3321', 'Depósito', 'PB - Almacén', 'Comercial', '260', 'VEPAGOS Importaciones', 'F-01111', 'Nuevo', '2026-07-12', 'Lote demo']
    ];
    var csv = [cols].concat(ej).map(function (r) { return r.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'Plantilla_carga_activos.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Plantilla descargada.');
  }
  function afBulkActivosModal() {
    if (afBlock('activosGestionar')) return;
    var parsed = null, C = db.af.cat;
    modal('<button class="mod-x">✕</button><h3>Carga masiva de equipos / activos</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:4px 0 10px">Sube un archivo <b>CSV</b> con una fila por equipo. Cada activo se registra como <b>Disponible</b> con su ID automático (AF-####). Usa la plantilla para respetar el formato.</p>' +
      '<div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:12px"><div style="overflow-x:auto"><table class="tbl" style="margin:0"><thead><tr><th>Columna</th><th>Descripción</th><th>Obligatorio</th></tr></thead><tbody>' +
      '<tr><td><b>Categoria</b></td><td>' + esc(C.categorias.join(', ')) + '.</td><td>No</td></tr>' +
      '<tr><td><b>Descripcion</b></td><td>Descripción del bien.</td><td>Sí</td></tr>' +
      '<tr><td><b>Marca / Modelo</b></td><td>Marca y modelo del equipo.</td><td>No</td></tr>' +
      '<tr><td><b>Serial</b></td><td>Serial del fabricante (obligatorio para equipos electrónicos).</td><td>No</td></tr>' +
      '<tr><td><b>Sede / Area / Departamento</b></td><td>Ubicación y área responsable.</td><td>No</td></tr>' +
      '<tr><td><b>Costo</b></td><td>Costo en USD (número).</td><td>No</td></tr>' +
      '<tr><td><b>Proveedor / Factura</b></td><td>Proveedor y N° de factura.</td><td>No</td></tr>' +
      '<tr><td><b>EstadoFisico</b></td><td>' + esc(C.estadoFisico.join(', ')) + '.</td><td>No</td></tr>' +
      '<tr><td><b>FechaCompra</b></td><td>Fecha de compra (AAAA-MM-DD).</td><td>No</td></tr>' +
      '<tr><td><b>Observaciones</b></td><td>Notas adicionales.</td><td>No</td></tr>' +
      '</tbody></table></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px"><button class="btn-s" id="baTpl"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5M12 15V3"></path></svg>Descargar plantilla CSV</button><button class="btn-s" id="baFile">Seleccionar archivo CSV</button><span id="baName" style="font-size:13px;color:var(--muted)">Ningún archivo</span></div>' +
      '<div id="baPrev"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="baOk" disabled style="opacity:.5">Importar</button></div>', 'wide');
    $('#baTpl').addEventListener('click', afBulkActivosTemplate);
    $('#baFile').addEventListener('click', function () {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
      inp.onchange = function () { var f = inp.files[0]; if (!f) return; $('#baName').textContent = f.name; var rd = new FileReader(); rd.onload = function () {
        var rows = afParseCSV(String(rd.result)); if (rows.length < 2) { $('#baPrev').innerHTML = '<div class="note" style="color:#B23A6E">El archivo no tiene filas de datos.</div>'; return; }
        var head = rows[0].map(function (h) { return String(h).trim().toLowerCase().replace(/[^a-z]/g, ''); });
        var ix = function (n) { return head.indexOf(n); };
        var iDesc = ix('descripcion');
        if (iDesc < 0) { $('#baPrev').innerHTML = '<div class="note" style="color:#B23A6E">Falta la columna obligatoria "Descripcion".</div>'; return; }
        var m = { cat: ix('categoria'), marca: ix('marca'), modelo: ix('modelo'), serial: ix('serial'), sede: ix('sede'), area: ix('area'), dep: ix('departamento'), costo: ix('costo'), prov: ix('proveedor'), fact: ix('factura'), ef: ix('estadofisico'), fc: ix('fechacompra'), obs: ix('observaciones') };
        var items = [], errs = 0;
        rows.slice(1).forEach(function (r) { var d = (r[iDesc] || '').trim(); if (!d) { errs++; return; } function g(i) { return i > -1 ? (r[i] || '').trim() : ''; }
          items.push({ categoria: C.categorias.indexOf(g(m.cat)) > -1 ? g(m.cat) : 'Otros', descripcion: d, marca: g(m.marca), modelo: g(m.modelo), serial: g(m.serial), sede: C.sedes.indexOf(g(m.sede)) > -1 ? g(m.sede) : 'Depósito', area: C.areas.indexOf(g(m.area)) > -1 ? g(m.area) : 'PB - Almacén', departamento: C.departamentos.indexOf(g(m.dep)) > -1 ? g(m.dep) : 'Tecnología', costo: parseFloat((g(m.costo) || '0').replace(',', '.')) || 0, proveedor: g(m.prov), factura: g(m.fact), estadoFisico: C.estadoFisico.indexOf(g(m.ef)) > -1 ? g(m.ef) : 'Nuevo', fechaCompra: g(m.fc), obs: g(m.obs) }); });
        parsed = items;
        $('#baPrev').innerHTML = '<div class="card" style="margin:0 0 4px"><div style="font-weight:700;color:var(--navy);margin-bottom:6px">Vista previa · ' + items.length + ' equipo(s)' + (errs ? ' · <span style="color:#B23A6E">' + errs + ' fila(s) sin descripción omitidas</span>' : '') + '</div><div style="overflow-x:auto;max-height:200px"><table class="tbl" style="margin:0"><thead><tr><th>Categoría</th><th>Descripción</th><th>Serial</th><th>Sede</th><th>Costo</th></tr></thead><tbody>' + items.slice(0, 30).map(function (it) { return '<tr><td>' + esc(it.categoria) + '</td><td>' + esc(it.descripcion) + '</td><td>' + esc(it.serial || '—') + '</td><td>' + esc(it.sede) + '</td><td>' + afMoney(it.costo) + '</td></tr>'; }).join('') + '</tbody></table></div>' + (items.length > 30 ? '<div class="note" style="margin:6px 0 0">Mostrando 30 de ' + items.length + '.</div>' : '') + '</div>';
        var ok = $('#baOk'); ok.disabled = !items.length; ok.style.opacity = items.length ? '1' : '.5';
      }; rd.readAsText(f); };
      inp.click();
    });
    $('#baOk').addEventListener('click', function () {
      if (!parsed || !parsed.length) return;
      parsed.forEach(function (it) { var id = afNewActivoId(); db.af.activos.push(Object.assign({ id: id, userId: null, fechaAsig: null, estado: 'Disponible', ultimoInv: null, creadoPor: me.nombre }, it)); });
      afLog('Carga masiva', '', 'Carga masiva de activos: ' + parsed.length + ' equipo(s) registrado(s)');
      saveDB(db); closeModal(); refreshNav(); afReRenderList(); toast(parsed.length + ' equipo(s) registrado(s).');
    });
  }
  function afNewConsModal() {    if (afBlock('almacenArticulo')) return;
    modal('<button class="mod-x">✕</button><h3>Nuevo artículo · ' + esc(AF_ALM[afAlmTipo].title) + '</h3>' +
      '<div class="fld"><label>Nombre *</label><input id="ncN" type="text" placeholder="Ej: Resma de papel carta"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:120px"><label>Unidad</label>' + afSelect('ncU', db.af.cat.unidades, 'Unidad') + '</div><div class="fld" style="flex:1;min-width:110px"><label>Stock mínimo</label><input id="ncMin" type="number" min="0" value="5"></div></div>' +
      '<div class="fld"><label>Ubicación en almacén</label><input id="ncLoc" type="text" placeholder="Estante / nivel"></div>' +
      '<div class="fld"><label>Stock inicial (opcional)</label><input id="ncInit" type="number" min="0" value="0"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="ncOk">Crear artículo</button></div>');
    $('#ncOk').addEventListener('click', function () {
      var n = $('#ncN').value.trim(); if (!n) { toast('Indica el nombre.'); return; }
      var id = afNewItemId(afAlmTipo);
      db.af.consumibles.push({ id: id, nombre: n, unidad: $('#ncU').value, minimo: +$('#ncMin').value || 0, ubicacion: $('#ncLoc').value.trim(), almacen: afAlmTipo });
      var init = +$('#ncInit').value || 0;
      if (init > 0) db.af.stock.push({ id: db.af.nextStock++, artId: id, tipo: 'Entrada', cant: init, fecha: reqToday(), ref: 'Stock inicial', por: me.nombre, dep: '' });
      afLog('Alta', id, 'Creó el artículo ' + id + ' — ' + n + ' (' + AF_ALM[afAlmTipo].title + ')');
      saveDB(db); closeModal(); afAlmacenRender(afAlmTipo); toast('Artículo ' + id + ' creado.');
    });
  }
  function afMovModal(preArt) {
    if (afBlock('almacenMovimiento')) return;
    var arts = afConsList(afAlmTipo);
    if (!arts.length) { toast('Primero crea un artículo en este almacén.'); return; }
    modal('<button class="mod-x">✕</button><h3>Movimiento · ' + esc(AF_ALM[afAlmTipo].title) + '</h3>' +
      '<div class="fld"><label>Artículo *</label><select id="mvA">' + arts.map(function (c) { return '<option value="' + c.id + '"' + (preArt && preArt.id === c.id ? ' selected' : '') + '>' + esc(c.id) + ' — ' + esc(c.nombre) + ' (stock ' + afStock(c.id) + ')</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label>Tipo *</label>' + afSelect('mvT', ['Entrada', 'Salida', 'Ajuste'], 'Salida') + '</div>' +
      '<div class="fld"><label>Cantidad *</label><input id="mvC" type="number" min="1" value="1"></div>' +
      '<div id="mvSalBox"><div style="display:flex;gap:8px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:130px"><label>Entregado a</label><input id="mvPara" type="text" list="mvParaList" placeholder="Buscar persona o equipo…" autocomplete="off"><datalist id="mvParaList">' + db.users.filter(function (u) { return u.activo && u.role !== 'candidato'; }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); }).map(function (u) { return '<option value="' + esc(u.nombre) + '">' + esc(u.cargo || u.area || '') + '</option>'; }).join('') + '</datalist></div><div class="fld" style="flex:1;min-width:130px"><label>Departamento</label>' + afSelect('mvDep', db.af.cat.departamentos, 'Administración') + '</div></div></div>' +
      '<div class="fld"><label>Referencia / autorización</label><input id="mvRef" type="text" placeholder="Ej: autorizado por, recepción de compra…"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="mvOk">Registrar</button></div>');
    function tgl() { $('#mvSalBox').style.display = $('#mvT').value === 'Salida' ? '' : 'none'; }
    tgl(); $('#mvT').addEventListener('change', tgl);
    var mvParaEl = $('#mvPara'); if (mvParaEl) mvParaEl.addEventListener('change', function () { var u = db.users.find(function (x) { return x.nombre === mvParaEl.value; }); if (u && u.area && db.af.cat.departamentos.indexOf(u.area) > -1) $('#mvDep').value = u.area; });
    $('#mvOk').addEventListener('click', function () {
      var artId = $('#mvA').value, tipo = $('#mvT').value, cant = +$('#mvC').value;
      if (!cant || cant < 1) { toast('Indica una cantidad válida.'); return; }
      if (tipo === 'Salida' && cant > afStock(artId)) { toast('No hay stock suficiente (disponible: ' + afStock(artId) + ').'); return; }
      var mov = { id: db.af.nextStock++, artId: artId, tipo: tipo, cant: cant, fecha: reqToday(), ref: $('#mvRef').value.trim(), por: me.nombre };
      if (tipo === 'Salida') { mov.para = $('#mvPara').value.trim(); mov.dep = $('#mvDep').value; }
      db.af.stock.push(mov);
      var c = afConsById(artId);
      afLog(tipo, artId, tipo + ' de ' + cant + ' ' + c.unidad + ' — ' + c.nombre + (mov.para ? ' → ' + mov.para : ''));
      saveDB(db); closeModal(); refreshNav(); afAlmacenRender(afAlmTipo); toast('Movimiento registrado. Nuevo stock: ' + afStock(artId) + '.');
    });
  }
  function afKardexModal(c) {
    if (!c) return;
    var movs = db.af.stock.filter(function (m) { return m.artId === c.id; }).sort(function (a, b) { return b.id - a.id; });
    modal('<button class="mod-x">✕</button><h3>Kardex · ' + esc(c.id) + '</h3><div style="font-weight:700;color:var(--navy);margin:2px 0 4px">' + esc(c.nombre) + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><span class="chip n">Stock: ' + afStock(c.id) + ' ' + esc(c.unidad) + '</span><span class="chip n">Mínimo: ' + c.minimo + '</span>' + (c.ubicacion ? '<span class="chip n">' + esc(c.ubicacion) + '</span>' : '') + '</div>' +
      '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Fecha</th><th>Tipo</th><th>Cant.</th><th>Detalle</th><th>Por</th></tr></thead><tbody>' +
      (movs.length ? movs.map(function (m) { return '<tr><td>' + fechaCorta(m.fecha) + '</td><td>' + (m.tipo === 'Entrada' ? '<span class="chip g">Entrada</span>' : m.tipo === 'Salida' ? '<span class="chip y">Salida</span>' : '<span class="chip n">Ajuste</span>') + '</td><td><b>' + (m.tipo === 'Salida' ? '-' : '+') + m.cant + '</b></td><td style="font-size:12.5px">' + esc((m.para ? m.para + (m.dep ? ' · ' + m.dep : '') + ' · ' : '') + (m.ref || '')) + '</td><td style="font-size:12.5px">' + esc(m.por) + '</td></tr>'; }).join('') : '<tr><td colspan="5"><div class="empty">Sin movimientos.</div></td></tr>') +
      '</tbody></table></div><div class="mod-actions">' + (!afCan('almacenMovimiento') ? '' : '<button class="btn-s" id="kxMov">Registrar movimiento</button>') + '<button class="btn-g mod-x">Cerrar</button></div>');
    var kxb = $('#kxMov'); if (kxb) kxb.addEventListener('click', function () { closeModal(); afMovModal(c); });
  }

  /* ---------- M4 · PROCURA ---------- */
  var afProcTab = 'sol';
  function rAfProcura() {
    resetContent();
    var html = afHero('Solicitud → aprobación → orden → recepción', 'Procura', 'Flujo de compras rastreable, vinculado a proveedores y al almacén.',
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (afCan('procuraCrear') ? '<button class="btn-g" id="afNewSol" style="background:#fff;color:var(--navy)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Nueva solicitud</button>' : '') + (afCan('procuraOrden') ? '<button class="btn-s" id="afNewProv" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">+ Proveedor</button>' : '') + '</div>');
    var TABS = [['sol', 'Solicitudes'], ['ord', 'Órdenes de compra'], ['prov', 'Proveedores'], ['aud', 'Auditoría']];
    html += '<div class="doccat" style="margin-bottom:14px">' + TABS.map(function (t) { return '<button data-afptab="' + t[0] + '" class="' + (afProcTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (afProcTab === 'sol') {
      var EST = { 'Borrador': 'n', 'Enviada': 'y', 'Aprobada': 'b', 'Rechazada': 'r', 'Comprada': 'b', 'Recibida': 'g', 'Cerrada': 'g' };
      html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>N°</th><th>Solicitante</th><th>Depto.</th><th>Ítems</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>' +
        (db.af.solicitudes.length ? db.af.solicitudes.slice().sort(function (a, b) { return b.id.localeCompare(a.id); }).map(function (s) { var u = byId(s.solicitante); return '<tr><td><b style="color:var(--navy)">' + esc(s.id) + '</b></td><td>' + esc(u ? u.nombre : '—') + '</td><td>' + esc(s.departamento) + '</td><td>' + s.items.length + '</td><td><span class="chip ' + (EST[s.estado] || 'n') + '">' + esc(s.estado) + '</span></td><td>' + fechaCorta(s.fecha) + '</td><td><button class="btn-s" data-afsol="' + s.id + '" style="font-size:12.5px;padding:6px 11px">Abrir</button></td></tr>'; }).join('') : '<tr><td colspan="7"><div class="empty">No hay solicitudes. Crea la primera con "Nueva solicitud".</div></td></tr>') +
        '</tbody></table></div></div>';
    } else if (afProcTab === 'ord') {
      html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>N°</th><th>Proveedor</th><th>Ítems</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>' +
        (db.af.ordenes.length ? db.af.ordenes.slice().sort(function (a, b) { return b.id.localeCompare(a.id); }).map(function (o) { var tot = o.items.reduce(function (s, i) { return s + (i.precio || 0) * i.cant; }, 0); return '<tr><td><b style="color:var(--navy)">' + esc(o.id) + '</b></td><td>' + esc(o.proveedor) + '</td><td>' + o.items.length + '</td><td>' + afMoney(tot) + '</td><td><span class="chip ' + (o.estado === 'Recibida' ? 'g' : 'b') + '">' + esc(o.estado) + '</span></td><td><button class="btn-s" data-aford="' + o.id + '" style="font-size:12.5px;padding:6px 11px">Abrir</button></td></tr>'; }).join('') : '<tr><td colspan="6"><div class="empty">No hay órdenes. Aprueba una solicitud para generar una orden de compra.</div></td></tr>') +
        '</tbody></table></div></div>';
    } else if (afProcTab === 'prov') {
      html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Razón social</th><th>RIF</th><th>Contacto</th><th>Condiciones</th></tr></thead><tbody>' +
        db.af.proveedores.map(function (p) { return '<tr><td><b style="color:var(--navy)">' + esc(p.razon) + '</b></td><td>' + esc(p.rif) + '</td><td>' + esc(p.contacto) + '</td><td>' + esc(p.condiciones) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    } else {
      var aud = db.af.audit || [];
      html += '<div class="card"><div class="note" style="margin:0 0 8px">Registro inmutable de toda acción del módulo (creaciones, aprobaciones, movimientos y bajas).</div>' +
        (aud.length ? aud.slice(0, 60).map(function (h) { return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #F4F6FA"><span class="chip n" style="flex:0 0 auto">' + esc(h.accion) + '</span><div style="flex:1;min-width:0"><div style="font-size:13.5px;color:var(--navy);font-weight:600">' + esc(h.detalle) + '</div><div style="font-size:12px;color:var(--muted2)">' + esc(fmtStamp(h.fecha)) + ' · ' + esc(h.por) + (h.entidad ? ' · ' + esc(h.entidad) : '') + '</div></div></div>'; }).join('') : '<div class="empty">Sin registros de auditoría todavía.</div>') + '</div>';
    }
    $('#content').innerHTML = html;
    $$('#content [data-afptab]').forEach(function (b) { b.addEventListener('click', function () { afProcTab = b.getAttribute('data-afptab'); rAfProcura(); }); });
    var ns = $('#afNewSol'); if (ns) ns.addEventListener('click', function () { afSolForm(); });
    var np = $('#afNewProv'); if (np) np.addEventListener('click', afProvForm);
    $$('#content [data-afsol]').forEach(function (b) { b.addEventListener('click', function () { afSolModal(db.af.solicitudes.find(function (s) { return s.id === b.getAttribute('data-afsol'); })); }); });
    $$('#content [data-aford]').forEach(function (b) { b.addEventListener('click', function () { afOrdenModal(db.af.ordenes.find(function (o) { return o.id === b.getAttribute('data-aford'); })); }); });
  }
  function afProvForm() {
    if (afBlock('procuraOrden')) return;
    modal('<button class="mod-x">✕</button><h3>Nuevo proveedor</h3>' +
      '<div class="fld"><label>Razón social *</label><input id="pvR" type="text"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:120px"><label>RIF</label><input id="pvRif" type="text" placeholder="J-00000000-0"></div><div class="fld" style="flex:1;min-width:150px"><label>Contacto</label><input id="pvC" type="text" placeholder="Correo o teléfono"></div></div>' +
      '<div class="fld"><label>Condiciones</label><input id="pvCond" type="text" placeholder="Ej: Contado / 30 días"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="pvOk">Guardar</button></div>');
    $('#pvOk').addEventListener('click', function () {
      var r = $('#pvR').value.trim(); if (!r) { toast('Indica la razón social.'); return; }
      db.af.proveedores.push({ id: db.af.nextProv++, razon: r, rif: $('#pvRif').value.trim(), contacto: $('#pvC').value.trim(), condiciones: $('#pvCond').value.trim() });
      afLog('Alta', '', 'Registró el proveedor ' + r); saveDB(db); closeModal(); afProcTab = 'prov'; rAfProcura(); toast('Proveedor guardado.');
    });
  }
  function afSolItemsEditor() {
    return '<div id="siList"></div><button class="btn-s" id="siAdd" style="margin-top:2px">+ Ítem</button>';
  }
  function afSolForm() {
    var items = [{ desc: '', artId: null, cant: 1 }];
    function draw() {
      modal('<button class="mod-x">✕</button><h3>Nueva solicitud de compra</h3>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="fld" style="flex:1;min-width:150px"><label>Departamento</label>' + afSelect('soDep', db.af.cat.departamentos, me.area && db.af.cat.departamentos.indexOf(me.area) > -1 ? me.area : 'Administración') + '</div></div>' +
        '<div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin:8px 0 6px">Ítems solicitados</div>' +
        items.map(function (it, i) { return '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px"><input data-sidesc="' + i + '" type="text" value="' + esc(it.desc) + '" placeholder="Artículo o descripción libre" style="flex:1;min-width:0;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 10px;font-size:13.5px;font-family:inherit"><input data-sicant="' + i + '" type="number" min="1" value="' + it.cant + '" style="width:74px;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 8px;font-size:13.5px;font-family:inherit">' + (items.length > 1 ? '<button class="btn-s btn-danger" data-sidel="' + i + '" style="padding:8px 10px">✕</button>' : '') + '</div>'; }).join('') +
        '<button class="btn-s" id="siAdd" style="margin-bottom:8px">+ Ítem</button>' +
        '<div class="fld"><label>Justificación *</label><textarea id="soJust" style="min-height:56px" placeholder="Por qué se necesita…"></textarea></div>' +
        '<div class="note" style="margin:0 0 6px">Si el ítem es de tecnología, al aprobarse se genera el requerimiento para el equipo de Sistemas.</div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="soOk">Enviar solicitud</button></div>', 'wide');
      function sync() { items.forEach(function (it, i) { var d = $('#modalHost [data-sidesc="' + i + '"]'); if (d) it.desc = d.value; var c = $('#modalHost [data-sicant="' + i + '"]'); if (c) it.cant = +c.value || 1; }); }
      $('#siAdd').addEventListener('click', function () { sync(); items.push({ desc: '', artId: null, cant: 1 }); draw(); });
      $$('#modalHost [data-sidel]').forEach(function (b) { b.addEventListener('click', function () { sync(); items.splice(+b.getAttribute('data-sidel'), 1); draw(); }); });
      $('#soOk').addEventListener('click', function () {
        sync();
        var valid = items.filter(function (it) { return it.desc.trim(); });
        if (!valid.length) { toast('Agrega al menos un ítem.'); return; }
        var just = $('#soJust').value.trim(); if (!just) { toast('Escribe la justificación.'); return; }
        valid.forEach(function (it) { var m = afConsById(''); it.artId = null; var found = db.af.consumibles.find(function (c) { return c.nombre.toLowerCase() === it.desc.trim().toLowerCase(); }); if (found) it.artId = found.id; });
        var id = afNewSolId();
        db.af.solicitudes.push({ id: id, solicitante: me.id, departamento: $('#soDep').value, items: valid, justificacion: just, estado: 'Enviada', fecha: reqToday(), aprobadoPor: null, aprobadoFecha: null, ordenId: null });
        afLog('Solicitud', id, 'Creó la solicitud de compra ' + id + ' (' + valid.length + ' ítem(s))');
        saveDB(db); closeModal(); refreshNav(); afProcTab = 'sol'; rAfProcura(); toast('Solicitud ' + id + ' enviada.');
      });
    }
    draw();
  }
  function afSolModal(s) {
    if (!s) return;
    var u = byId(s.solicitante);
    var puedeAprobar = afCan('procuraAprobar');
    var puedeOrden = afCan('procuraOrden');
    var itemsHtml = s.items.map(function (it) { return '<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #F2F6FB;font-size:13.5px"><span style="color:var(--navy)">' + esc(it.desc) + (it.artId ? ' <span class="chip n" style="font-size:10px">' + esc(it.artId) + '</span>' : '') + '</span><b>' + it.cant + '</b></div>'; }).join('');
    var acc = '';
    if (s.estado === 'Enviada' && puedeAprobar) acc = '<button class="btn-s btn-danger" id="soRech">Rechazar</button><button class="btn-g" id="soAprob">Aprobar</button>';
    else if (s.estado === 'Aprobada' && puedeOrden) acc = '<button class="btn-g" id="soOrden">Generar orden de compra</button>';
    else acc = '<button class="btn-g mod-x">Cerrar</button>';
    var EST = { 'Enviada': 'y', 'Aprobada': 'b', 'Rechazada': 'r', 'Comprada': 'b', 'Recibida': 'g', 'Cerrada': 'g' };
    modal('<button class="mod-x">✕</button><h3>' + esc(s.id) + ' <span style="margin-left:6px"><span class="chip ' + (EST[s.estado] || 'n') + '">' + esc(s.estado) + '</span></span></h3>' +
      '<div class="prow"><span class="k">Solicitante</span><span>' + esc(u ? u.nombre : '—') + '</span></div>' +
      '<div class="prow"><span class="k">Departamento</span><span>' + esc(s.departamento) + '</span></div>' +
      '<div class="prow"><span class="k">Fecha</span><span>' + fechaCorta(s.fecha) + '</span></div>' +
      (s.aprobadoPor ? '<div class="prow"><span class="k">Aprobada por</span><span>' + esc(s.aprobadoPor) + ' · ' + fechaCorta(s.aprobadoFecha) + '</span></div>' : '') +
      (s.ordenId ? '<div class="prow"><span class="k">Orden</span><span>' + esc(s.ordenId) + '</span></div>' : '') +
      '<div style="margin:12px 0 4px;font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Ítems</div>' + itemsHtml +
      '<div style="margin:12px 0 2px;font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Justificación</div><div style="font-size:13.5px;color:#33415C;line-height:1.55">' + esc(s.justificacion) + '</div>' +
      '<div class="mod-actions" style="flex-wrap:wrap">' + acc + '</div>');
    var b;
    if (b = $('#soAprob')) b.addEventListener('click', function () { s.estado = 'Aprobada'; s.aprobadoPor = me.nombre; s.aprobadoFecha = reqToday(); afLog('Aprobación', s.id, 'Aprobó la solicitud ' + s.id); saveDB(db); closeModal(); refreshNav(); rAfProcura(); toast('Solicitud aprobada.'); });
    if (b = $('#soRech')) b.addEventListener('click', function () { s.estado = 'Rechazada'; s.aprobadoPor = me.nombre; s.aprobadoFecha = reqToday(); afLog('Rechazo', s.id, 'Rechazó la solicitud ' + s.id); saveDB(db); closeModal(); refreshNav(); rAfProcura(); toast('Solicitud rechazada.'); });
    if (b = $('#soOrden')) b.addEventListener('click', function () { afOrdenForm(s); });
  }
  function afOrdenForm(s) {
    if (afBlock('procuraOrden')) return;
    var provs = db.af.proveedores;
    var items = s.items.map(function (it) { return { desc: it.desc, artId: it.artId, cant: it.cant, precio: 0 }; });
    function draw() {
      modal('<button class="mod-x">✕</button><h3>Orden de compra · desde ' + esc(s.id) + '</h3>' +
        '<div class="fld"><label>Proveedor *</label><select id="ocProv">' + provs.map(function (p) { return '<option value="' + p.id + '">' + esc(p.razon) + '</option>'; }).join('') + '</select></div>' +
        '<div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin:8px 0 6px">Ítems y precios (USD)</div>' +
        items.map(function (it, i) { return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span style="flex:1;font-size:13.5px;color:var(--navy)">' + esc(it.desc) + ' <span style="color:var(--muted2)">×' + it.cant + '</span></span><input data-ocp="' + i + '" type="number" min="0" step="1" value="' + it.precio + '" placeholder="P. unit." style="width:100px;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px;font-size:13.5px;font-family:inherit"></div>'; }).join('') +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="ocOk">Crear orden</button></div>', 'wide');
      $('#ocOk').addEventListener('click', function () {
        items.forEach(function (it, i) { var p = $('#modalHost [data-ocp="' + i + '"]'); if (p) it.precio = +p.value || 0; });
        var prov = provs.find(function (p) { return p.id === +$('#ocProv').value; });
        var id = afNewOrdenId();
        db.af.ordenes.push({ id: id, proveedor: prov.razon, provId: prov.id, items: items, moneda: 'USD', solicitudId: s.id, estado: 'Emitida', fecha: reqToday(), por: me.nombre });
        s.estado = 'Comprada'; s.ordenId = id;
        afLog('Orden de compra', id, 'Generó la orden ' + id + ' a ' + prov.razon + ' (desde ' + s.id + ')');
        saveDB(db); closeModal(); refreshNav(); afProcTab = 'ord'; rAfProcura(); toast('Orden ' + id + ' creada.');
      });
    }
    if (!provs.length) { toast('Primero registra un proveedor.'); return; }
    draw();
  }
  function afOrdenModal(o) {
    if (!o) return;
    var tot = o.items.reduce(function (s, i) { return s + (i.precio || 0) * i.cant; }, 0);
    var itemsHtml = o.items.map(function (it) { return '<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #F2F6FB;font-size:13.5px"><span style="color:var(--navy)">' + esc(it.desc) + ' <span style="color:var(--muted2)">×' + it.cant + '</span>' + (it.artId ? ' <span class="chip n" style="font-size:10px">' + esc(it.artId) + '</span>' : '') + '</span><b>' + afMoney((it.precio || 0) * it.cant) + '</b></div>'; }).join('');
    var acc = o.estado === 'Recibida' || !afCan('procuraRecibir') ? '<button class="btn-g mod-x">Cerrar</button>' : '<button class="btn-g" id="ocRecibir">Registrar recepción</button>';
    modal('<button class="mod-x">✕</button><h3>' + esc(o.id) + ' <span style="margin-left:6px"><span class="chip ' + (o.estado === 'Recibida' ? 'g' : 'b') + '">' + esc(o.estado) + '</span></span></h3>' +
      '<div class="prow"><span class="k">Proveedor</span><span>' + esc(o.proveedor) + '</span></div>' +
      '<div class="prow"><span class="k">Solicitud</span><span>' + esc(o.solicitudId || '—') + '</span></div>' +
      '<div class="prow"><span class="k">Fecha</span><span>' + fechaCorta(o.fecha) + '</span></div>' +
      '<div style="margin:12px 0 4px;font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Ítems</div>' + itemsHtml +
      '<div style="display:flex;justify-content:space-between;padding:10px 0 0;font-weight:800;color:var(--navy)"><span>Total</span><span>' + afMoney(tot) + '</span></div>' +
      (o.estado !== 'Recibida' ? '<div class="note" style="margin:10px 0 0">Al recibir: los ítems de almacén entran al stock automáticamente y los ítems de activo se registran como nuevos activos.</div>' : '') +
      '<div class="mod-actions">' + acc + '</div>');
    var rb = $('#ocRecibir'); if (rb) rb.addEventListener('click', function () { afRecibirOrden(o); });
  }
  function afRecibirOrden(o) {
    if (afBlock('procuraRecibir')) return;
    var creados = [];
    o.items.forEach(function (it) {
      if (it.artId) { db.af.stock.push({ id: db.af.nextStock++, artId: it.artId, tipo: 'Entrada', cant: it.cant, fecha: reqToday(), ref: 'Recepción ' + o.id, por: me.nombre }); creados.push(it.cant + ' → ' + it.artId); }
      else {
        for (var i = 0; i < it.cant; i++) { var id = afNewActivoId(); db.af.activos.push({ id: id, categoria: 'Otros', descripcion: it.desc, marca: '', modelo: '', serial: '', fechaCompra: reqToday(), costo: it.precio || 0, proveedor: o.proveedor, factura: '', sede: 'Depósito', area: 'PB - Almacén', departamento: 'Administración', userId: null, fechaAsig: null, estado: 'Disponible', estadoFisico: 'Nuevo', ultimoInv: null, creadoPor: me.nombre, obs: 'Alta automática por recepción ' + o.id }); creados.push('activo ' + id); }
      }
    });
    o.estado = 'Recibida'; o.recibidaFecha = reqToday();
    var s = db.af.solicitudes.find(function (x) { return x.id === o.solicitudId; }); if (s) s.estado = 'Cerrada';
    afLog('Recepción', o.id, 'Recibió la orden ' + o.id + ' (' + creados.join(', ') + ')');
    saveDB(db); closeModal(); refreshNav(); rAfProcura(); toast('Recepción registrada. Stock y activos actualizados.');
  }

  /* ---------- EMPLEADOS (admin/rrhh) ---------- */
  function rEmpleados() {
    resetContent();
    var sols = db.solicitudes.filter(function (s) { return s.estado === 'pendiente'; });
    var solsCard = sols.length ? '<div class="card" style="margin-bottom:16px"><h3>Solicitudes de cambio de datos</h3>' +
      sols.map(function (s) {
        var u = byId(s.userId);
        return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #EEF3F9;flex-wrap:wrap">' +
          '<div style="flex:1;min-width:220px"><div style="font-weight:700;color:var(--navy)">' + esc(u ? u.nombre : '—') + '</div><div style="font-size:13.5px;color:var(--muted)">' + esc(s.texto) + '</div><div style="font-size:12px;color:var(--muted2)">' + s.fecha + '</div></div>' +
          '<button class="btn-g" data-sol="' + s.id + '" style="font-size:13px;padding:8px 14px">Editar y resolver</button></div>';
      }).join('') + '</div>' : '';
    $('#content').innerHTML =
      solsCard +
      '<div class="toolrow"><span class="note" style="margin:0">Alta, baja y edición de cuentas. Toda cuenta requiere correo, teléfono y LinkedIn.</span><span class="sp"></span>' +
      '<button class="btn-g" id="btnAddEmp"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Agregar persona</button></div>' +
      '<div class="card" style="padding:6px 16px"><table class="tbl"><thead><tr><th>Nombre</th><th>Cargo</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>' +
      db.users.filter(function (u) { return perfilVisible(u) && u.role !== 'candidato'; }).map(function (u) {
        var enProceso = u.activo && u.offboard && Object.keys(u.offboard).some(function (k) { return u.offboard[k]; });
        var estadoChip = !u.activo ? '<span class="chip r">Inactivo</span>' : enProceso ? '<span class="chip y">En desincorporación</span>' : '<span class="chip g">Activo</span>';
        return '<tr><td><b style="color:var(--navy)">' + esc(u.nombre) + '</b><div style="font-size:12.5px;color:var(--muted2)">' + esc(u.email) + '</div></td><td>' + esc(u.cargo) + '</td><td>' + roleLabelOf(u.role) + '</td>' +
          '<td>' + estadoChip + '</td>' +
          '<td><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn-s" data-prof2="' + u.id + '">Perfil</button><button class="btn-s" data-editemp="' + u.id + '">Editar</button>' + (u.id !== me.id ? '<button class="btn-s' + (u.activo ? ' btn-danger' : '') + '" data-tgl="' + u.id + '">' + (!u.activo ? 'Reactivar' : (enProceso ? 'Continuar salida' : 'Desincorporar')) + '</button>' : '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>';
    $('#btnAddEmp').addEventListener('click', function () {
      var vacs = db.vacantes.filter(function (v) { return v.estado === 'abierta' && v.prioridad !== 'pausa'; });
      if (!vacs.length) { toast('No hay vacantes disponibles para cubrir. El administrador debe crear la vacante (no en pausa) en el Organigrama primero.'); return; }
      modal('<button class="mod-x">✕</button><h3>Agregar persona</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Solo se pueden crear usuarios sobre una vacante abierta. La vacante quedará cubierta.</p>' +
        '<div class="fld"><label>Vacante que ocupa</label><select id="neV">' + vacs.map(function (v) { var m = byId(v.managerId); return '<option value="' + v.id + '">' + esc(v.cargo) + ' — reporta a ' + esc(m ? m.nombre : '—') + '</option>'; }).join('') + '</select></div>' +
        '<div class="fld"><label>Nombre completo</label><input id="neN" type="text" placeholder="Nombre y apellido"></div>' +
        '<div class="fld"><label>Cédula</label><div style="display:flex;gap:8px"><span style="display:flex;align-items:center;justify-content:center;min-width:44px;border:1.5px solid #D9E2EF;border-radius:10px;background:#F1F5FB;color:var(--navy);font-weight:700">V-</span><input id="neCI" type="text" inputmode="numeric" placeholder="12345678" maxlength="9" style="flex:1"></div></div>' +
        '<div class="fld"><label>Perfil</label><select id="nePerfil">' + Object.keys(ROLE_LABEL).map(function (k) { return '<option value="' + k + '">' + ROLE_LABEL[k] + '</option>'; }).join('') + '</select><div class="note" style="margin:5px 0 0">Se sugiere según la vacante, pero puede cambiarse.</div></div>' +
        '<div class="fld"><label>Correo</label><input id="neE" type="email" placeholder="nombre@somosvepagos.com"></div>' +
        '<div class="fld"><label>Correo personal</label><input id="neEP" type="email" placeholder="nombre@gmail.com"></div>' +
        '<div class="fld"><label>Teléfono</label><input id="neT" type="tel" placeholder="+58 412 0000000"></div>' +
        '<div class="fld"><label>LinkedIn</label><input id="neL" type="url" placeholder="https://www.linkedin.com/in/…"></div>' +
        '<div class="fld"><label>Dirección</label><input id="neDir" type="text" placeholder="Urbanización, calle, ciudad"></div>' +
        '<div class="fld"><label>Persona de emergencia</label><input id="neEmN" type="text" placeholder="Nombre y parentesco"></div>' +
        '<div class="fld"><label>Contacto de emergencia</label><input id="neEmT" type="tel" placeholder="+58 412 0000000"></div>' +
        '<div class="fld"><label>Requerimientos del cargo</label><div class="note" style="margin:0 0 6px">Vienen preasignados según el <b>perfil</b>, agrupados por área responsable (RRHH, Sistemas, Mercadeo y su departamento). El sistema valida disponibilidad y enruta cada uno.</div></div>' +
        '<div class="fld" id="neTallaFld" style="display:none"><label>Talla de uniforme (franela)</label>' + afSelect('neTalla', ['XS', 'S', 'M', 'L', 'XL', 'XXL'], 'M') + '</div>' +
        '<div id="neDispBox"></div>' +
        '<div id="neAccPerfil"></div>' +
        '<div class="fld"><label>Accesos o herramientas adicionales (opcional)</label><div class="note" style="margin:0 0 6px">Solicita a la <b>gerente de Sistemas</b> o al <b>administrador</b> accesos que <b>correspondan al cargo</b>. Elige el <b>tipo</b> (Aplicativo, Drive, Herramienta o Permiso) y las opciones se ajustan a ese catálogo. Cada solicitud necesita una justificación y queda pendiente de aprobación.</div><div id="neAccRows"></div><button type="button" class="btn-s" id="neAccAdd" style="margin-top:6px">+ Solicitar acceso</button></div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="neOk">Crear cuenta</button></div>', 'wide');
      var neReqs = [];
      function reqSeleccion() {
        return neReqs.map(function (s) { return /uniforme|franela/i.test(s) ? 'Uniforme — Franela talla ' + ($('#neTalla') ? $('#neTalla').value : 'M') : s; });
      }
      function pintarDisp() {
        var tallaFld = $('#neTallaFld'); if (tallaFld) tallaFld.style.display = neReqs.some(function (s) { return /uniforme|franela/i.test(s); }) ? '' : 'none';
        var sel = reqSeleccion();
        if (!sel.length) { $('#neDispBox').innerHTML = '<div class="note" style="color:#B26A00">Este cargo no tiene requerimientos preasignados. Edítalos en el Organigrama → Vacante.</div>'; return; }
        var areaChip = { sistemas: '<span class="chip b" style="font-size:10px">Sistemas</span>', mercadeo: '<span class="chip" style="font-size:10px;background:#F1EAFB;color:#8A5CD1">Mercadeo</span>', administracion: '<span class="chip n" style="font-size:10px">Administración</span>' };
        var inv = [], ges = [];
        sel.forEach(function (s) { var d = afReqDisponibilidad(s), area = afReqArea(s); (d.estado === 'disp' || d.estado === 'sin' ? inv : ges).push({ s: s, d: d, area: area }); });
        var html = '';
        if (inv.length) {
          var rows = inv.map(function (it) {
            var chip = it.d.estado === 'disp' ? '<span class="chip g">Disponible · ' + esc(it.d.detalle) + '</span>' : '<span class="chip r">Sin stock → se pedirá a Procura</span>';
            return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #F2F6FB"><div style="flex:1;min-width:0;font-size:13px;color:var(--navy);font-weight:600">' + esc(it.s) + ' ' + (areaChip[it.area] || '') + '</div>' + chip + '</div>';
          }).join('');
          html += '<div class="card" style="margin:0 0 6px;background:#F8FAFD"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin-bottom:4px">Disponibilidad en inventario</div>' + rows + '<div class="note" style="margin:8px 0 0">Equipos y consumibles que se validan contra el inventario. Lo que no haya en stock generará una solicitud automática en Procura.</div></div>';
        }
        if (ges.length) {
          var rows2 = ges.map(function (it) {
            var lbl = (it.d.detalle && it.d.detalle !== 'Sin control de inventario') ? it.d.detalle : ('Lo gestiona ' + (AF_AREA_LBL[it.area] || it.area));
            return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #F2F6FB"><div style="flex:1;min-width:0;font-size:13px;color:var(--navy);font-weight:600">' + esc(it.s) + ' ' + (areaChip[it.area] || '') + '</div><span class="chip n">' + esc(lbl) + '</span></div>';
          }).join('');
          html += '<div class="card" style="margin:0 0 6px;background:#F8FAFD"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin-bottom:4px">Gestión y accesos (sin inventario)</div>' + rows2 + '<div class="note" style="margin:8px 0 0">Estos ítems no dependen de stock: contrato, nómina, correos y accesos los gestiona directamente el área responsable (RRHH / Administración, Sistemas o Mercadeo).</div></div>';
        }
        $('#neDispBox').innerHTML = html;
      }
      function pintarReq() {
        var vv = db.vacantes.find(function (x) { return x.id === +$('#neV').value; });
        var pf = (vv && vv.perfil) || 'interno';
        var pfEl = $('#nePerfil'); if (pfEl) pfEl.value = pf;
        neReqs = (vv && vv.requerimientos && vv.requerimientos.length) ? vv.requerimientos.slice() : reqOnboardFor(pf);
        pintarPerfilAcc(pf);
        pintarDisp();
      }
      function pintarPerfilAcc(pf) {
        var box = $('#neAccPerfil'); if (!box) return;
        var acc = reqAccPerfil(pf); var tools = acc.apps.concat(acc.drives, acc.herramientas);
        var perms = perfilPermLabels(pf);
        if (!tools.length && !perms.length) { box.innerHTML = '<div class="note" style="margin:8px 0 0">Este perfil no tiene accesos ni permisos preconfigurados.</div>'; return; }
        function chips(arr, cls) { return arr.map(function (s) { return '<span class="chip ' + cls + '" style="font-size:10.5px;margin:2px 3px 2px 0">' + esc(s) + '</span>'; }).join(''); }
        box.innerHTML = '<div class="card" style="margin:8px 0 0;background:#F8FAFD"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin-bottom:6px">Acceso que ya trae este perfil</div>' +
          (tools.length ? '<div style="margin-bottom:6px"><div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:2px">Aplicativos, drives y herramientas</div>' + chips(tools, 'b') + '</div>' : '') +
          (perms.length ? '<div><div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:2px">Permisos</div>' + chips(perms, 'g') + '</div>' : '') +
          '<div class="note" style="margin:8px 0 0">Se asignan automáticamente. Abajo solo solicita lo <b>adicional</b> que no esté en esta lista.</div></div>';
      }
      var ACC_TIPOS = [['Aplicativo', 'app'], ['Drive', 'drive'], ['Herramienta', 'herramienta'], ['Permiso', 'permiso']];
      function wireAccDel() { $$('#neAccRows [data-accdel]').forEach(function (b) { b.onclick = function () { b.closest('.acc-row').remove(); }; }); }
      var neAccAdd = $('#neAccAdd'); if (neAccAdd) neAccAdd.addEventListener('click', function () { $('#neAccRows').insertAdjacentHTML('beforeend', accRowHtml()); wireAccDel(); wireAccTipo($('#neAccRows')); });
      pintarReq();
      $('#neV').addEventListener('change', pintarReq);
      var tsel = $('#neTalla'); if (tsel) tsel.addEventListener('change', pintarDisp);
      $('#neCI').addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); });
      $('#neOk').addEventListener('click', function () {
        var n = $('#neN').value.trim(), em = $('#neE').value.trim(), t = $('#neT').value.trim(), l = $('#neL').value.trim();
        var ci = $('#neCI') ? $('#neCI').value.trim().replace(/\D/g, '') : '';
        if (!n || !em || !t || !l) { toast('Nombre, correo, teléfono y LinkedIn son obligatorios.'); return; }
        if (!ci || ci.length < 6) { toast('Ingresa una cédula válida (solo números, mínimo 6 dígitos).'); return; }
        var v = db.vacantes.find(function (x) { return x.id === +$('#neV').value; });
        var mgr = byId(v.managerId);
        var perfilFijo = ($('#nePerfil') ? $('#nePerfil').value : '') || (v && v.perfil) || 'interno';
        var seleccion = reqSeleccion();
        var reqs = seleccion.map(function (s, i) { return { id: i + 1, texto: s, entregado: false }; });
        var accSolic = $$('#neAccRows .acc-row').map(function (row) {
          return { tipo: row.querySelector('[data-acct]').value, nombre: row.querySelector('[data-accn]').value.trim(), justificacion: row.querySelector('[data-accj]').value.trim() };
        }).filter(function (a) { return a.nombre && a.justificacion; });
        var accPerfil = reqAccPerfil(perfilFijo);
        var nuevoId = db.nextUserId++;
        db.users.push({ id: nuevoId, nombre: n, cedula: ci, cargo: v.cargo, area: mgr ? mgr.area : 'Por asignar', equipo: mgr ? mgr.equipo : null, role: perfilFijo, managerId: v.managerId, email: em, emailPersonal: ($('#neEP') ? $('#neEP').value.trim() : ''), telefono: t, linkedin: l, direccion: ($('#neDir') ? $('#neDir').value.trim() : ''), emergNombre: ($('#neEmN') ? $('#neEmN').value.trim() : ''), emergTelefono: ($('#neEmT') ? $('#neEmT').value.trim() : ''), ciudad: 'Caracas', activo: true, password: 'vepagos2026', requerimientos: reqs, nextReqId: reqs.length + 1, accesosExtra: { drives: accPerfil.drives.slice(), apps: accPerfil.apps.slice(), herramientas: accPerfil.herramientas.slice(), otros: [] }, accesosSolicitados: accSolic.map(function (a, i) { return { id: i + 1, tipo: a.tipo, nombre: a.nombre, justificacion: a.justificacion, estado: 'pendiente', fecha: reqToday() }; }) });
        var nuevo = byId(nuevoId);
        logHist(nuevo, 'Cuenta creada sobre la vacante "' + v.cargo + '"' + (reqs.length ? ' con ' + reqs.length + ' requerimiento(s) de equipo' : ''));
        var accAuto = accPerfil.drives.concat(accPerfil.apps, accPerfil.herramientas);
        if (accAuto.length) { logHist(nuevo, 'Accesos autorizados automáticamente por el perfil ' + roleLabelOf(perfilFijo) + ': ' + accAuto.join(', ')); db.pendientes.push({ id: db.nextPendId++, userId: nuevoId, tipo: 'acceso', titulo: 'Accesos autorizados: ' + accAuto.join(', '), detalle: 'Por tu perfil (' + roleLabelOf(perfilFijo) + ') se te autorizaron ' + accAuto.length + ' acceso(s): ' + accAuto.join(', ') + '.', estado: 'abierto', fecha: reqToday(), por: me.nombre, respuesta: '' }); }
        v.estado = 'cubierta'; v.cubiertaPor = n;
        // Enrutar por área y validar disponibilidad
        var sinStock = [], ruteados = {}, notif = {};
        seleccion.forEach(function (s) {
          var d = afReqDisponibilidad(s), area = afReqArea(s), rec = afAreaRecipient(area);
          var eq = { id: db.nextEquipId++, empId: nuevoId, empNombre: n, texto: s, clase: afReqClase(s), area: area, disponible: d.estado === 'disp', estado: 'pendiente', fecha: reqToday(), creadoEl: nowStamp(), asignadoA: rec.resp ? rec.resp.id : null, mgrId: rec.mgr ? rec.mgr.id : null };
          db.equipReqs.push(eq);
          ruteados[area] = (ruteados[area] || 0) + 1;
          if (rec.resp) { (notif[rec.resp.id] = notif[rec.resp.id] || { u: rec.resp, items: [] }).items.push(s); if (rec.mgr && rec.mgr.id !== rec.resp.id) notif[rec.mgr.id] = notif[rec.mgr.id] || { u: rec.mgr, items: [], esMgr: true }; }
          if (d.estado === 'sin') sinStock.push(s);
        });
        // Solicitud automática en Procura por lo no disponible
        var solId = null;
        if (sinStock.length) {
          solId = afNewSolId();
          db.af.solicitudes.push({ id: solId, solicitante: me.id, departamento: 'Administración', items: sinStock.map(function (s) { return { desc: s + ' — para ' + n + ' (' + v.cargo + ')', artId: null, cant: 1 }; }), justificacion: 'Equipamiento de ingreso de ' + n + ' (' + v.cargo + '). Ítems sin disponibilidad en inventario.', estado: 'Enviada', fecha: reqToday(), aprobadoPor: null, aprobadoFecha: null, ordenId: null, origen: 'ingreso' });
          if (db.af && db.af.audit) afLog('Solicitud', solId, 'Solicitud automática de equipamiento para ' + n + ' (' + sinStock.length + ' ítem sin stock)');
        }
        // Notificar a cada responsable
        Object.keys(notif).forEach(function (uid) { var x = notif[uid]; if (x.items.length) logHist(x.u, 'Requerimientos de equipamiento para ' + n + ' (' + v.cargo + '): ' + x.items.join(', '), me.nombre); });
        // Solicitudes de accesos adicionales → gerente de Sistemas / administrador
        var accCreadas = 0;
        if (accSolic.length) {
          var apId = (db.aprobadores && (db.aprobadores.sistemas || db.aprobadores.ti)) || 1;
          var TLBL = { app: 'Aplicativo', drive: 'Drive', herramienta: 'Herramienta', permiso: 'Permiso' };
          accSolic.forEach(function (a) {
            db.pendientes.push({ id: db.nextPendId++, userId: apId, tipo: 'acceso', titulo: 'Acceso solicitado: ' + a.nombre + ' — ' + n + ' (' + v.cargo + ')', detalle: (TLBL[a.tipo] || a.tipo) + ' para ' + n + ', ' + v.cargo + '. Justificación: ' + a.justificacion, estado: 'abierto', fecha: reqToday(), por: me.nombre, respuesta: '' });
            accCreadas++;
          });
          logHist(nuevo, me.nombre + ' solicitó ' + accCreadas + ' acceso(s) adicional(es) a la gerencia de Sistemas: ' + accSolic.map(function (a) { return a.nombre; }).join(', '), me.nombre);
          var apU = byId(apId); if (apU) logHist(apU, 'Solicitud de ' + accCreadas + ' acceso(s) adicional(es) para ' + n + ' (' + v.cargo + '), pendiente de aprobación.', me.nombre);
        }
        saveDB(db); closeModal(); refreshNav(); rEmpleados();
        var msg = 'Cuenta creada (clave temporal: vepagos2026).';
        var areasTxt = Object.keys(ruteados).map(function (a) { return ruteados[a] + ' a ' + (AF_AREA_LBL[a] || a); });
        if (areasTxt.length) msg += ' Requerimientos: ' + areasTxt.join(', ') + '.';
        if (solId) msg += ' Solicitud ' + solId + ' creada en Procura.';
        if (accCreadas) msg += ' ' + accCreadas + ' acceso(s) adicional(es) enviados a Sistemas para aprobación.';
        toast(msg);
      });
    });
    $('#content').addEventListener('click', function (e) {
      var cr = e.target.closest('[data-clavereset]');
      if (cr) {
        var rq = db.claveReqs.find(function (x) { return x.id === +cr.getAttribute('data-clavereset'); });
        if (!rq) return;
        var u3 = byId(rq.userId);
        if (!u3) { toast('La cuenta ya no existe.'); return; }
        var temp = 'VP' + Math.floor(1000 + Math.random() * 9000);
        modal('<button class="mod-x">✕</button><h3>Restaurar clave — ' + esc(u3.nombre) + '</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Se asignará una contraseña temporal que ' + esc(u3.nombre.split(' ')[0]) + ' deberá cambiar al ingresar. Puedes editarla antes de confirmar.</p>' +
          '<div class="fld"><label>Contraseña temporal</label><input id="ckPw" type="text" value="' + temp + '"></div>' +
          '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="ckOk">Restaurar y resolver</button></div>');
        $('#ckOk').addEventListener('click', function () {
          var pw = $('#ckPw').value.trim(); if (!pw) { toast('Escribe una contraseña temporal.'); return; }
          u3.password = pw; u3.mustChangePass = true;
          rq.estado = 'resuelta'; rq.resueltoEl = nowStamp(); rq.resueltoPor = me.nombre; rq.tempPass = pw;
          logHist(u3, 'Capital Humano restauró su contraseña (clave temporal asignada)', me.nombre);
          logHist(me, 'Restauró la contraseña de ' + u3.nombre + ' (clave temporal asignada)');
          saveDB(db); closeModal(); refreshNav(); if (current === 'empleados') rEmpleados(); if (current === 'claves') rClaves(); toast('Clave restaurada. Comparte la contraseña temporal con ' + esc(u3.nombre.split(' ')[0]) + ': ' + pw);
        });
        return;
      }
      var cd = e.target.closest('[data-clavedismiss]');
      if (cd) {
        var rq2 = db.claveReqs.find(function (x) { return x.id === +cd.getAttribute('data-clavedismiss'); });
        if (rq2) { rq2.estado = 'descartada'; rq2.resueltoEl = nowStamp(); rq2.resueltoPor = me.nombre; var uu = byId(rq2.userId); if (uu) logHist(uu, 'Solicitud de restauración de contraseña descartada por ' + me.nombre, me.nombre); logHist(me, 'Descartó la solicitud de restauración de contraseña de ' + (uu ? uu.nombre : rq2.nombre)); saveDB(db); refreshNav(); rEmpleados(); toast('Solicitud descartada.'); }
        return;
      }
      var so = e.target.closest('[data-sol]');
      if (so) {
        var s = db.solicitudes.find(function (x) { return x.id === +so.getAttribute('data-sol'); });
        var u2 = byId(s.userId);
        modal('<button class="mod-x">✕</button><h3>Editar datos — ' + esc(u2.nombre) + '</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Solicitud: “' + esc(s.texto) + '”</p>' +
          '<div class="fld"><label>Teléfono</label><input id="edT" type="tel" value="' + esc(u2.telefono) + '"></div>' +
          '<div class="fld"><label>LinkedIn</label><input id="edL" type="url" value="' + esc(u2.linkedin) + '"></div>' +
          '<div class="fld"><label>Ciudad</label><input id="edC" type="text" value="' + esc(u2.ciudad) + '"></div>' +
          '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="edOk">Guardar y resolver</button></div>');
        $('#edOk').addEventListener('click', function () {
          u2.telefono = $('#edT').value.trim(); u2.linkedin = $('#edL').value.trim(); u2.ciudad = $('#edC').value.trim();
          logHist(u2, 'Datos actualizados por Capital Humano (solicitud resuelta)');
          s.estado = 'resuelta'; saveDB(db); closeModal(); rEmpleados(); toast('Datos actualizados y solicitud resuelta.');
        });
        return;
      }
      var p = e.target.closest('[data-prof2]'), t = e.target.closest('[data-tgl]'), ed = e.target.closest('[data-editemp]');
      if (p) profileModal(byId(+p.getAttribute('data-prof2')));
      if (ed) { editEmpleadoModal(byId(+ed.getAttribute('data-editemp'))); return; }
      if (t) { var u = byId(+t.getAttribute('data-tgl')); if (u.activo) { desincorporarModal(u); } else { u.activo = true; u.offboard = {}; var cerradas = db.vacantes.filter(function (v) { return v.origenUserId === u.id && v.estado === 'abierta'; }); db.vacantes = db.vacantes.filter(function (v) { return !(v.origenUserId === u.id && v.estado === 'abierta'); }); if (cerradas.length) logHist(u, 'Reactivado: se cerró la vacante de su cargo'); logHist(u, 'Cuenta reactivada'); saveDB(db); rEmpleados(); toast('Cuenta reactivada. ' + esc(u.nombre) + ' puede volver a ingresar.'); } }
    });
    /* ===== Modal Editar Empleado ===== */
    function editEmpleadoModal(u) {
      if (!u) return;
      var perfilOpts = Object.keys(ROLE_LABEL).map(function (k) { return '<option value="' + k + '"' + (k === u.role ? ' selected' : '') + '>' + ROLE_LABEL[k] + '</option>'; }).join('');
      modal('<button class="mod-x">✕</button><h3>Editar empleado</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Modifica los datos de <b>' + esc(u.nombre) + '</b>. Los cambios se guardan al confirmar.</p>' +
        '<div class="fld"><label>Nombre completo</label><input id="edNom" type="text" value="' + esc(u.nombre) + '"></div>' +
        '<div class="fld"><label>Cédula</label><div style="display:flex;gap:8px"><span style="display:flex;align-items:center;justify-content:center;min-width:44px;border:1.5px solid #D9E2EF;border-radius:10px;background:#F1F5FB;color:var(--navy);font-weight:700">V-</span><input id="edCi" type="text" inputmode="numeric" value="' + esc(u.cedula || '') + '" placeholder="12345678" maxlength="9" style="flex:1"></div></div>' +
        '<div class="fld"><label>Perfil / Rol</label><select id="edRol">' + perfilOpts + '</select></div>' +
        '<div class="fld"><label>Cargo</label><input id="edCargo" type="text" value="' + esc(u.cargo || '') + '"></div>' +
        '<div class="fld"><label>Correo corporativo</label><input id="edEmail" type="email" value="' + esc(u.email || '') + '"></div>' +
        '<div class="fld"><label>Correo personal</label><input id="edEmailP" type="email" value="' + esc(u.emailPersonal || '') + '"></div>' +
        '<div class="fld"><label>Teléfono</label><input id="edTel" type="tel" value="' + esc(u.telefono || '') + '"></div>' +
        '<div class="fld"><label>LinkedIn</label><input id="edLin" type="url" value="' + esc(u.linkedin || '') + '"></div>' +
        '<div class="fld"><label>Ciudad</label><input id="edCiudad" type="text" value="' + esc(u.ciudad || '') + '"></div>' +
        '<div class="fld"><label>Dirección</label><input id="edDirec" type="text" value="' + esc(u.direccion || '') + '"></div>' +
        '<div class="fld"><label>Persona de emergencia</label><input id="edEmN" type="text" value="' + esc(u.emergNombre || '') + '"></div>' +
        '<div class="fld"><label>Contacto de emergencia</label><input id="edEmT" type="tel" value="' + esc(u.emergTelefono || '') + '"></div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="edEmpOk">Guardar cambios</button></div>', 'wide');
      $('#edCi').addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); });
      $('#edEmpOk').addEventListener('click', function () {
        var nom = $('#edNom').value.trim();
        var ci = $('#edCi').value.trim().replace(/\D/g, '');
        var rol = $('#edRol').value;
        var cargo = $('#edCargo').value.trim();
        var email = $('#edEmail').value.trim();
        if (!nom) { toast('El nombre es obligatorio.'); return; }
        if (!ci || ci.length < 6) { toast('Ingresa una cédula válida (mínimo 6 dígitos).'); return; }
        if (!email) { toast('El correo corporativo es obligatorio.'); return; }
        var changes = [];
        if (u.nombre !== nom) { changes.push('Nombre: ' + u.nombre + ' → ' + nom); u.nombre = nom; }
        if ((u.cedula || '') !== ci) { changes.push('Cédula: ' + (u.cedula || 'sin') + ' → ' + ci); u.cedula = ci; }
        if (u.role !== rol) { changes.push('Perfil: ' + roleLabelOf(u.role) + ' → ' + roleLabelOf(rol)); u.role = rol; }
        if ((u.cargo || '') !== cargo) { changes.push('Cargo: ' + (u.cargo || 'sin') + ' → ' + cargo); u.cargo = cargo; }
        if ((u.email || '') !== email) { changes.push('Correo: ' + (u.email || 'sin') + ' → ' + email); u.email = email; }
        u.emailPersonal = $('#edEmailP').value.trim();
        u.telefono = $('#edTel').value.trim();
        u.linkedin = $('#edLin').value.trim();
        u.ciudad = $('#edCiudad').value.trim();
        u.direccion = $('#edDirec').value.trim();
        u.emergNombre = $('#edEmN').value.trim();
        u.emergTelefono = $('#edEmT').value.trim();
        if (changes.length) logHist(u, 'Datos editados por ' + me.nombre + ': ' + changes.join('; '), me.nombre);
        saveDB(db); closeModal(); rEmpleados();
        toast('Datos de ' + esc(nom) + ' actualizados.');
      });
    }
  }

  /* ---------- DESINCORPORACIÓN (offboarding) ---------- */
  var OFFBOARD_ITEMS = [
    { key: 'accesos', label: 'Retiro de accesos a sistemas', hint: 'Eureka, SAC, drives compartidos, herramientas asignadas' },
    { key: 'correo', label: 'Desactivación de correo corporativo', hint: 'Cierre y redirección de la cuenta @somosvepagos.com' },
    { key: 'tarjeta', label: 'Devolución de tarjeta / carnet de ingreso', hint: 'Carnet institucional y accesos físicos' },
    { key: 'uniforme', label: 'Devolución de uniforme', hint: 'Franelas, chaqueta y material de imagen' },
    { key: 'activos', label: 'Devolución de activos fijos y equipos', hint: 'Laptop, POS de demo, teléfono, otros seriales' },
    { key: 'huella', label: 'Eliminación de huella / biométrico', hint: 'Retiro del control de asistencia' },
    { key: 'finiquito', label: 'Carta de egreso y finiquito', hint: 'Documento de cierre laboral firmado' }
  ];
  function reabrirVacantePorSalida(u) {
    if (!u.cargo) return false;
    var ya = db.vacantes.some(function (v) { return v.estado === 'abierta' && v.origenUserId === u.id; });
    if (ya) return false;
    db.vacantes.push({
      id: db.nextVacId++, cargo: u.cargo, managerId: u.managerId || 1, perfil: u.role,
      fecha: new Date().toISOString().slice(0, 10), estado: 'abierta',
      requerimientos: (u.requerimientos || []).map(function (r) { return r.texto; }),
      origenUserId: u.id, origenNombre: u.nombre
    });
    return true;
  }
  function afReingresarPorSalida(u) {
    var mios = (db.af && db.af.activos ? db.af.activos : []).filter(function (a) { return a.userId === u.id && a.estado !== 'De baja'; });
    mios.forEach(function (a) {
      a.userId = null; a.fechaAsig = null; a.estado = 'Disponible';
      var acta = afCrearActa(a, u, 'Devolución por desincorporación', 'Reingreso al inventario por salida de ' + u.nombre);
      afAddMov(a, 'Devolución por desincorporación', 'de ' + u.nombre, acta.id);
      afLog('Devolución', a.id, 'Reingreso de ' + a.id + ' (' + a.descripcion + ') al inventario por desincorporación de ' + u.nombre);
      logHist(u, 'Devolvió el activo ' + a.descripcion + ' (' + a.id + ') por desincorporación — acta ' + acta.id, me.nombre);
    });
    return mios;
  }
  function desincorporarModal(u) {
    u.offboard = u.offboard || {};
    var ITEMS = reqOffboardFor(u.role);
    var misActivos = (db.af && db.af.activos ? db.af.activos : []).filter(function (a) { return a.userId === u.id && a.estado !== 'De baja'; });
    function rows() {
      return ITEMS.map(function (it) {
        return '<label style="display:flex;align-items:flex-start;gap:11px;padding:11px 0;border-bottom:1px solid #EEF3F9;cursor:pointer">' +
          '<input type="checkbox" data-ob="' + it.key + '"' + (u.offboard[it.key] ? ' checked' : '') + ' style="accent-color:#00CE7C;width:18px;height:18px;margin:2px 0 0;flex:0 0 auto">' +
          '<span style="flex:1"><span style="font-weight:700;color:var(--navy);font-size:14px">' + it.label + '</span><span style="display:block;font-size:12.5px;color:var(--muted)">' + it.hint + '</span></span></label>';
      }).join('');
    }
    function done() { return ITEMS.filter(function (it) { return u.offboard[it.key]; }).length; }
    var MOTIVOS = [
      { key: 'renuncia', label: 'Renuncia voluntaria', hint: 'LOTTT Art. 81 · carta de renuncia formal a la junta directiva' },
      { key: 'mutuo', label: 'Mutuo acuerdo / negociación', hint: 'LOTTT Art. 76 · convenio firmado, se recomienda homologar en Inspectoría' },
      { key: 'despido', label: 'Despido justificado', hint: 'LOTTT Art. 79 · con causal debidamente documentada' }
    ];
    u.offboardMotivo = u.offboardMotivo || '';
    function motivosHtml() {
      return '<div style="display:flex;flex-direction:column;gap:8px;margin:2px 0 4px">' + MOTIVOS.map(function (mo) {
        var on = u.offboardMotivo === mo.key;
        return '<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid ' + (on ? '#00CE7C' : '#E3EAF3') + ';background:' + (on ? '#F0FBF6' : '#fff') + ';border-radius:11px;cursor:pointer"><input type="radio" name="obMot" data-obmot="' + mo.key + '"' + (on ? ' checked' : '') + ' style="accent-color:#00CE7C;width:17px;height:17px;margin:1px 0 0;flex:0 0 auto"><span style="flex:1"><span style="font-weight:700;color:var(--navy);font-size:13.5px">' + mo.label + '</span><span style="display:block;font-size:12px;color:var(--muted)">' + mo.hint + '</span></span></label>';
      }).join('') + '</div>';
    }
    modal('<button class="mod-x">✕</button><h3>Desincorporación — ' + esc(u.nombre) + '</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:4px 0 4px">Completa el proceso de salida conforme a la LOTTT. Al confirmar, la cuenta se desactiva y <b>' + esc(u.nombre.split(' ')[0]) + ' no podrá volver a ingresar</b>.</p>' +
      '<div style="font-size:11.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:12px 0 6px">Motivo del egreso</div>' + motivosHtml() +
      '<div style="font-size:11.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:14px 0 2px">Checklist de revisión crítica antes del egreso</div>' +
      '<div id="obList">' + rows() + '</div>' +
      (misActivos.length ? '<div class="card" style="margin-top:12px;border-left:4px solid #2A6FDB;background:#F6F9FE"><div style="font-weight:700;color:var(--navy);font-size:13.5px;margin-bottom:6px">Activos asignados que reingresan al inventario (' + misActivos.length + ')</div>' + misActivos.map(function (a) { return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #EEF3F9"><div style="flex:1;min-width:0;font-size:13px;color:var(--navy)"><b>' + esc(a.id) + '</b> · ' + esc(a.descripcion) + '</div><span class="chip n" style="font-size:10px">' + esc(a.categoria) + '</span></div>'; }).join('') + '<div class="note" style="margin:8px 0 0">Al confirmar, estos equipos vuelven a <b>Activos fijos</b> como <b>Disponible</b> con un movimiento “Devolución por desincorporación” y su acta.</div></div>' : '') +
      '<div id="obCount" style="font-size:13px;color:var(--muted);margin-top:8px"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button>' +
      '<button class="btn-s" id="obSave">Guardar avance</button>' +
      '<button class="btn-g btn-danger" id="obConfirm">Confirmar desincorporación</button></div>');
    function refreshCount() {
      var c = done(); $('#obCount').innerHTML = c + ' de ' + ITEMS.length + ' pasos completados' + (c === ITEMS.length ? ' · <b style="color:#00874f">Proceso completo</b>' : '');
    }
    refreshCount();
    document.querySelectorAll('#modalHost [data-obmot]').forEach(function (rb) {
      rb.addEventListener('change', function () { u.offboardMotivo = rb.getAttribute('data-obmot'); logHist(u, 'Motivo de egreso registrado: ' + (MOTIVOS.filter(function (m) { return m.key === u.offboardMotivo; })[0] || {}).label); saveDB(db); });
    });
    document.querySelectorAll('#modalHost [data-ob]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var eraVacio = !Object.keys(u.offboard).some(function (k) { return u.offboard[k]; });
        u.offboard[cb.getAttribute('data-ob')] = cb.checked;
        if (eraVacio && cb.checked) { logHist(u, 'Inició proceso de desincorporación'); if (reabrirVacantePorSalida(u)) logHist(u, 'Su cargo (' + u.cargo + ') se reabrió como vacante'); }
        saveDB(db); refreshCount();
      });
    });
    $('#obSave').addEventListener('click', function () { saveDB(db); closeModal(); if (current === 'empleados') rEmpleados(); toast('Avance de desincorporación guardado.'); });
    $('#obConfirm').addEventListener('click', function () {
      if (!u.offboardMotivo) { toast('Selecciona el motivo del egreso.'); return; }
      u.activo = false; u.offboardFecha = new Date().toISOString().slice(0, 10);
      logHist(u, 'Desincorporación confirmada (' + ((MOTIVOS.filter(function (m) { return m.key === u.offboardMotivo; })[0] || {}).label || 'motivo no indicado') + ') — acceso revocado');
      var reing = afReingresarPorSalida(u);
      if (reabrirVacantePorSalida(u)) logHist(u, 'Su cargo (' + u.cargo + ') quedó abierto como vacante');
      saveDB(db); closeModal(); rEmpleados();
      toast(esc(u.nombre) + ' fue desincorporado. Su acceso quedó revocado.' + (reing.length ? ' ' + reing.length + ' activo(s) reingresaron al inventario.' : ''));
    });
  }

  /* ---------- CONFIGURACIÓN · PERFILES ---------- */
  function perfilCount(key) { return db.users.filter(function (u) { return u.activo && u.role === key; }).length; }
  function rPerfiles() {
    resetContent();
    $('#content').innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">Cargando perfiles...</div>';
    /* Cargar desde API */
    window.SV_API.getPerfiles().then(function (perfiles) {
      if (perfiles.error) { $('#content').innerHTML = '<div class="card" style="padding:20px;color:red">Error cargando perfiles: ' + esc(perfiles.error) + '</div>'; return; }
      var html = '<div class="card" style="margin-bottom:16px"><div class="toolrow" style="margin:0"><div><h3 style="margin:0">Perfiles del sistema</h3><div class="note" style="margin:4px 0 0;max-width:640px">Define los tipos de perfil y qué permisos base hereda cada uno. Los perfiles marcados como <b>del sistema</b> no se pueden eliminar. Un perfil nuevo hereda todos los permisos del perfil base que elijas; luego se afinan.</div></div><span class="sp"></span><button class="btn-g" id="pfNew"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Nuevo perfil</button></div></div>';
      html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Perfil</th><th>Hereda de</th><th>Personas</th><th>Descripción</th><th></th></tr></thead><tbody>' +
        perfiles.map(function (p) {
          var baseP = p.base_key ? perfiles.find(function (x) { return x.key === p.base_key; }) : null;
          var base = baseP ? baseP.label : (p.base_key || '\u2014');
          return '<tr><td><b style="color:var(--navy)">' + esc(p.label) + '</b>' + (p.sistema ? ' <span class="chip n" style="font-size:10px">Sistema</span>' : ' <span class="chip b" style="font-size:10px">Personalizado</span>') + '</td>' +
            '<td style="font-size:13px;color:var(--muted)">' + esc(base) + '</td>' +
            '<td>' + perfilCount(p.key) + '</td>' +
            '<td style="font-size:12.5px;color:#33415C;max-width:320px">' + esc(p.descripcion || '') + '</td>' +
            '<td><div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn-s" data-pfedit="' + esc(p.key) + '" style="font-size:12.5px;padding:6px 11px">Editar</button>' +
            (p.sistema ? '' : '<button class="btn-s btn-danger" data-pfdel="' + esc(p.key) + '" style="font-size:12.5px;padding:6px 11px">Eliminar</button>') + '</div></td></tr>';
        }).join('') + '</tbody></table></div></div>';
      $('#content').innerHTML = html;
      $('#pfNew').addEventListener('click', function () { perfilForm(null, perfiles); });
      $$('#content [data-pfedit]').forEach(function (b) { b.addEventListener('click', function () {
        var p = perfiles.find(function (x) { return x.key === b.getAttribute('data-pfedit'); });
        perfilForm(p, perfiles);
      }); });
      $$('#content [data-pfdel]').forEach(function (b) { b.addEventListener('click', function () {
        var pk = b.getAttribute('data-pfdel');
        var p = perfiles.find(function (x) { return x.key === pk; });
        if (!p) return;
        if (perfilCount(p.key) > 0) { toast('No puedes eliminar un perfil con personas asignadas. Reas\u00edgnalas primero.'); return; }
        window.SV_API.deletePerfil(pk).then(function (res) {
          if (res.error) { toast(res.error); return; }
          db.perfiles = db.perfiles.filter(function (x) { return x.key !== pk; });
          saveDB(db); rPerfiles(); toast('Perfil "' + p.label + '" eliminado.');
        });
      }); });
    });
  }
  function perfilForm(p, apiPerfiles) {
    var edit = !!p; p = p || {};
    var bases = (apiPerfiles || []).filter(function (x) { return x.key !== p.key; });
    Promise.all([
      window.SV_API.getPantallas(),
      edit ? window.SV_API.getPantallasPerfil(p.key) : Promise.resolve([]),
      edit ? window.SV_API.getPermisosPerfil(p.key) : Promise.resolve([])
    ]).then(function (results) {
      var allScreens = results[0].error ? [] : results[0];
      var curMenuIds = results[1].error ? [] : results[1];
      var curPermKeys = results[2].error ? [] : results[2];
      var menuItems = allScreens.filter(function (s) { return s.id !== 'inicio' && s.id !== 'perfil' && !s.padre_id; });
      var GRP = { personal: 'Tu espacio', gestion: 'Seguimiento del equipo', config: 'Configuraci\u00f3n' };
      var menusHtml = ['personal', 'gestion', 'config'].map(function (gk) {
        var items = menuItems.filter(function (s) { return s.grupo === gk; });
        if (!items.length) return '';
        return '<div style="font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted2);margin:10px 0 2px">' + GRP[gk] + '</div>' + items.map(function (s) {
          var checked = curMenuIds.indexOf(s.id) > -1;
          return '<label style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #F2F6FB;cursor:pointer"><input type="checkbox" data-pmmenu="' + s.id + '"' + (checked ? ' checked' : '') + ' style="accent-color:#00CE7C;width:17px;height:17px;flex:0 0 auto"><span style="flex:1;font-size:13.5px;color:var(--navy);font-weight:600">' + esc(s.titulo) + '</span></label>';
        }).join('');
      }).join('');
      var permsHtml = ['Activos y procura', 'Almac\u00e9n y activos', 'Otros m\u00f3dulos'].map(function (g) {
        var items = PERMISOS.filter(function (x) { return x.grupo === g; });
        if (!items.length) return '';
        return '<div style="font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted2);margin:10px 0 2px">' + esc(g) + '</div>' + items.map(function (x) {
          var checked = curPermKeys.indexOf(x.key) > -1;
          return '<label style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #F2F6FB;cursor:pointer"><input type="checkbox" data-pmperm="' + x.key + '"' + (checked ? ' checked' : '') + ' style="accent-color:#00CE7C;width:17px;height:17px;margin:2px 0 0;flex:0 0 auto"><span style="flex:1"><span style="font-weight:700;color:var(--navy);font-size:13.5px">' + esc(x.label) + '</span><span style="display:block;font-size:12px;color:var(--muted)">' + esc(x.desc) + '</span></span></label>';
        }).join('');
      }).join('');
      modal('<button class="mod-x">\u2715</button><h3>' + (edit ? 'Editar perfil' : 'Nuevo perfil') + '</h3>' +
        '<div class="fld"><label>Nombre del perfil *</label><input id="pfLabel" type="text" value="' + esc(p.label || '') + '" placeholder="Ej: Analista Senior"></div>' +
        '<div class="fld"><label>Hereda permisos de</label><select id="pfBase"' + (edit && p.sistema ? ' disabled' : '') + '><option value="">\u2014 Sin herencia (permisos propios) \u2014</option>' +
          bases.map(function (x) { return '<option value="' + esc(x.key) + '"' + (p.base_key === x.key ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select>' +
          '<div class="note" style="margin:4px 0 0">Punto de partida: al elegir una base, marca abajo lo que este perfil ve y puede hacer.</div></div>' +
        '<div class="fld"><label>Descripci\u00f3n</label><textarea id="pfDesc" style="min-height:60px" placeholder="Qu\u00e9 hace este perfil y qu\u00e9 puede ver">' + esc(p.descripcion || '') + '</textarea></div>' +
        '<div style="font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:16px 0 2px">Men\u00fas que ve este perfil</div>' +
        '<div class="note" style="margin:0 0 4px">Marca a qu\u00e9 secciones del portal tiene acceso. Inicio y Mi perfil siempre est\u00e1n disponibles.</div>' + menusHtml +
        '<div style="font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:16px 0 2px">Permisos y aprobaciones</div>' +
        '<div class="note" style="margin:0 0 4px">Qu\u00e9 puede hacer y aprobar dentro de los m\u00f3dulos. ' + (edit && p.key === 'admin' ? '<b>El Administrador siempre tiene acceso total.</b>' : 'Estos permisos aplican a todas las personas con este perfil.') + '</div>' + permsHtml +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="pfOk">' + (edit ? 'Guardar cambios' : 'Crear perfil') + '</button></div>', 'wide');
      $('#pfOk').addEventListener('click', function () {
        var label = $('#pfLabel').value.trim(); if (!label) { toast('Escribe el nombre del perfil.'); return; }
        var baseKey = $('#pfBase').value || null;
        var desc = $('#pfDesc').value.trim();
        var menus = $$('#modalHost [data-pmmenu]').filter(function (cb) { return cb.checked; }).map(function (cb) { return cb.getAttribute('data-pmmenu'); });
        var expanded = menus.slice();
        menus.forEach(function (mid) {
          allScreens.filter(function (s) { return s.padre_id === mid; }).forEach(function (child) {
            if (expanded.indexOf(child.id) < 0) expanded.push(child.id);
          });
        });
        if (expanded.indexOf('inicio') < 0) expanded.push('inicio');
        if (expanded.indexOf('perfil') < 0) expanded.push('perfil');
        var permKeys = $$('#modalHost [data-pmperm]').filter(function (cb) { return cb.checked; }).map(function (cb) { return cb.getAttribute('data-pmperm'); });
        if (edit) {
          Promise.all([
            window.SV_API.updatePerfil(p.key, { label: label, base_key: baseKey, descripcion: desc }),
            window.SV_API.setPantallasPerfil(p.key, expanded),
            window.SV_API.setPermisosPerfil(p.key, permKeys)
          ]).then(function (res) {
            if (res[0].error) { toast(res[0].error); return; }
            var lp = getPerfil(p.key);
            if (lp) { lp.label = label; if (!lp.sistema) lp.base = baseKey; lp.desc = desc; lp.menus = expanded; saveDB(db); }
            closeModal(); if (me) { $('#meRol').textContent = roleLabelOf(me.role); $('#pillRol').textContent = roleLabelOf(me.role); }
            rPerfiles(); toast('Perfil actualizado.');
          });
        } else {
          var key = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 20) || ('perfil' + Date.now());
          window.SV_API.createPerfil({ key: key, label: label, descripcion: desc, base_key: baseKey }).then(function (res) {
            if (res.error) { toast(res.error); return; }
            return Promise.all([
              window.SV_API.setPantallasPerfil(key, expanded),
              window.SV_API.setPermisosPerfil(key, permKeys)
            ]).then(function () {
              db.perfiles.push({ key: key, label: label, desc: desc, base: baseKey, sistema: false, menus: expanded, permisos: {} });
              permKeys.forEach(function (pk) { db.perfiles[db.perfiles.length - 1].permisos[pk] = true; });
              saveDB(db);
              closeModal(); rPerfiles(); toast('Perfil creado.');
            });
          });
        }
      });
    });
  }

  /* ---------- CONFIGURACIÓN · ACCESOS Y PERMISOS ---------- */
  var accesosQ = '';
  function permisosDe(u) { return PERMISOS.filter(function (p) { return u.accesosPermisos && u.accesosPermisos[p.key]; }); }
  function rAccesos() {
    resetContent();
    var html = '<div class="card" style="margin-bottom:14px"><h3 style="margin:0 0 4px">Accesos y permisos por persona</h3><div class="note" style="margin:0;max-width:700px">Además de lo que ve cada perfil por defecto, aquí puedes dar <b>accesos y permisos adicionales</b> a una persona específica. Ejemplo: que solo una coordinadora de Finanzas pueda <b>ver y validar las procuras</b>.</div></div>';
    var pend = accSolicPendientes();
    if (pend.length) {
      html += '<div class="card" style="margin-bottom:14px;border-left:4px solid #FF9F45">' +
        '<div class="toolrow" style="margin:0 0 6px"><h3 style="margin:0;display:flex;align-items:center;gap:8px"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FF9F45" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Solicitudes de permiso pendientes</h3><span class="sp"></span><span class="chip y">' + pend.length + '</span></div>' +
        '<div class="note" style="margin:0 0 8px">Accesos solicitados al crear o gestionar personas. Apruébalos para sumarlos a los accesos adicionales de la persona, o recházalos.</div>' +
        pend.map(function (x) {
          return '<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #EEF3F9;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:220px"><div style="font-weight:700;color:var(--navy)">' + esc(x.a.nombre) + ' <span class="chip n" style="font-size:10px">' + esc(ACC_TLBL[x.a.tipo] || x.a.tipo) + '</span></div>' +
            '<div style="font-size:12.5px;color:var(--muted)">' + esc(x.u.nombre) + ' · ' + esc(x.u.cargo || '') + '</div>' +
            '<div style="font-size:12.5px;color:var(--muted);margin-top:2px"><b>Justificación:</b> ' + esc(x.a.justificacion || '—') + '</div></div>' +
            '<div style="display:flex;gap:6px"><button class="btn-g" data-accok="' + x.u.id + ':' + x.a.id + '" style="font-size:12.5px;padding:7px 13px">Aprobar</button>' +
            '<button class="btn-s btn-danger" data-accno="' + x.u.id + ':' + x.a.id + '" style="font-size:12.5px;padding:7px 12px">Rechazar</button></div></div>';
        }).join('') + '</div>';
    }
    html += '<div class="card" style="margin-bottom:12px"><div style="position:relative"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" style="position:absolute;left:11px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg><input id="acQ" type="text" value="' + esc(accesosQ) + '" placeholder="Buscar por nombre, cargo o área…" style="width:100%;border:1.5px solid #D9E2EF;border-radius:10px;padding:9px 11px 9px 34px;font-family:inherit;font-size:13.5px"></div></div>';
    var q = accesosQ.toLowerCase();
    var list = db.users.filter(function (u) { return u.activo && u.role !== 'candidato'; })
      .filter(function (u) { return !q || [u.nombre, u.cargo, u.area].join(' ').toLowerCase().indexOf(q) > -1; })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Nombre</th><th>Cargo</th><th>Perfil</th><th>Permisos adicionales</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (u) {
        var ps = permisosDe(u);
        var chips = ps.length ? ps.map(function (p) { return '<span class="chip b" style="font-size:10.5px;margin:1px 2px">' + esc(p.label) + '</span>'; }).join('') : '<span style="color:var(--muted2);font-size:12.5px">Solo los de su perfil</span>';
        return '<tr><td><b style="color:var(--navy)">' + esc(u.nombre) + '</b><div style="font-size:12px;color:var(--muted2)">' + esc(u.email) + '</div></td><td style="font-size:13px">' + esc(u.cargo || '') + '<div style="font-size:12px;color:var(--muted2)">' + esc(u.area || '') + '</div></td><td>' + esc(roleLabelOf(u.role)) + '</td><td style="max-width:340px">' + chips + acExtraChip(u) + '</td><td><button class="btn-s" data-acperm="' + u.id + '" style="font-size:12.5px;padding:6px 11px">Permisos</button></td></tr>';
      }).join('') : '<tr><td colspan="5"><div class="empty">No hay personas que coincidan.</div></td></tr>') +
      '</tbody></table></div></div>';
    $('#content').innerHTML = html;
    var qi = $('#acQ'); qi.addEventListener('input', function () { accesosQ = qi.value; var pos = qi.selectionStart; rAccesos(); var n = $('#acQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
    $$('#content [data-acperm]').forEach(function (b) { b.addEventListener('click', function () { permisosModal(byId(+b.getAttribute('data-acperm'))); }); });
    $$('#content [data-accok]').forEach(function (b) { b.addEventListener('click', function () { accResolver(b.getAttribute('data-accok'), true); }); });
    $$('#content [data-accno]').forEach(function (b) { b.addEventListener('click', function () { accResolver(b.getAttribute('data-accno'), false); }); });
  }
  function accResolver(ref, aprobar) {
    var parts = ref.split(':'), u = byId(+parts[0]); if (!u) return;
    var a = (u.accesosSolicitados || []).find(function (x) { return x.id === +parts[1]; }); if (!a || a.estado !== 'pendiente') return;
    var BUCKET = { app: 'apps', drive: 'drives', herramienta: 'herramientas', permiso: 'otros' };
    a.estado = aprobar ? 'aprobado' : 'rechazado'; a.resueltoPor = me.nombre; a.resueltoEl = nowStamp();
    if (aprobar) {
      u.accesosExtra = u.accesosExtra || { drives: [], apps: [], herramientas: [], otros: [] };
      var bk = BUCKET[a.tipo] || 'otros'; u.accesosExtra[bk] = u.accesosExtra[bk] || [];
      if (u.accesosExtra[bk].indexOf(a.nombre) < 0) u.accesosExtra[bk].push(a.nombre);
    }
    (db.pendientes || []).forEach(function (p) { if (p.tipo === 'acceso' && p.estado === 'abierto' && p.titulo && p.titulo.indexOf(a.nombre) > -1 && p.titulo.indexOf(u.nombre) > -1) { p.estado = aprobar ? 'resuelto' : 'rechazado'; p.respuesta = (aprobar ? 'Aprobado' : 'Rechazado') + ' por ' + me.nombre; } });
    if (aprobar) { db.pendientes.push({ id: db.nextPendId++, userId: u.id, tipo: 'acceso', titulo: 'Acceso autorizado: ' + a.nombre, detalle: me.nombre + ' te autorizó el acceso "' + a.nombre + '" (' + (ACC_TLBL[a.tipo] || a.tipo) + ').', estado: 'abierto', fecha: reqToday(), por: me.nombre, respuesta: '' }); }
    logHist(u, me.nombre + (aprobar ? ' aprobó' : ' rechazó') + ' el acceso solicitado: ' + a.nombre + ' (' + (ACC_TLBL[a.tipo] || a.tipo) + ')', me.nombre);
    saveDB(db); refreshNav(); rAccesos(); toast('Acceso "' + a.nombre + '" ' + (aprobar ? 'aprobado' : 'rechazado') + '.');
  }
  function acExtraCount(u) { var e = u.accesosExtra || {}; return (e.drives || []).length + (e.apps || []).length + (e.herramientas || []).length + (e.otros || []).length; }
  function acExtraChip(u) { var n = acExtraCount(u); return n ? '<span class="chip n" style="font-size:10.5px;margin:1px 2px">' + n + ' acceso(s) extra</span>' : ''; }
  function acExtraTa(id, label, ph, arr) { return '<div class="fld" style="margin-top:8px"><label style="font-size:12.5px">' + label + '</label><textarea id="' + id + '" rows="2" placeholder="' + ph + '" style="width:100%;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-family:inherit;font-size:13px;resize:vertical">' + esc((arr || []).join('\n')) + '</textarea></div>'; }
  function acCatalog() { var r = db.recursos || {}; return { drives: (r.drives || []).map(function (x) { return x.nombre; }), apps: (r.apps || []).map(function (x) { return x.nombre; }), emails: (r.emails || []).map(function (x) { return x.nombre; }), herramientas: (r.herramientas || []).map(function (x) { return x.nombre; }) }; }
  function acProfileAuthSet(u) { var set = {}; (reqOnboardFor(u.role) || []).forEach(function (x) { set[x.toLowerCase()] = 1; }); (u.requerimientos || []).forEach(function (r) { if (r.texto) set[r.texto.toLowerCase()] = 1; }); return set; }
  function acBucketHtml(u, bucket, label, authSet) {
    var cat = acCatalog()[bucket] || [];
    var catL = cat.map(function (c) { return c.toLowerCase(); });
    var have = ((u.accesosExtra || {})[bucket] || []);
    var haveL = have.map(function (s) { return s.toLowerCase(); });
    var rows = cat.map(function (n) {
      var prof = !!authSet[n.toLowerCase()];
      var checked = prof || haveL.indexOf(n.toLowerCase()) > -1;
      return '<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F2F6FB;cursor:' + (prof ? 'default' : 'pointer') + '">' +
        '<input type="checkbox" data-acx="' + bucket + '" value="' + esc(n) + '"' + (checked ? ' checked' : '') + (prof ? ' disabled' : '') + ' style="accent-color:#00CE7C;width:17px;height:17px;flex:0 0 auto">' +
        '<span style="flex:1;font-size:13.5px;color:var(--navy);font-weight:600">' + esc(n) + '</span>' +
        (prof ? '<span class="chip g" style="font-size:10px">Ya autorizado (perfil)</span>' : '') + '</label>';
    }).join('');
    var extras = have.filter(function (s) { return catL.indexOf(s.toLowerCase()) < 0; });
    return '<div class="fld" style="margin-top:12px"><label style="font-size:12.5px">' + label + '</label>' +
      (rows || '<div class="note" style="margin:2px 0">No hay elementos en el catálogo. Agrégalos en Aplicativos y drives.</div>') +
      '<input data-acxother="' + bucket + '" type="text" placeholder="Agregar otro que no esté en la lista (separa con comas)" value="' + esc(extras.join(', ')) + '" style="width:100%;margin-top:8px;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-family:inherit;font-size:13px"></div>';
  }
  function permisosModal(u) {
    if (!u) return;
    u.accesosPermisos = u.accesosPermisos || {};
    modal('<button class="mod-x">✕</button><h3>Permisos de ' + esc(u.nombre) + '</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:4px 0 10px">' + esc(u.cargo || '') + (u.area ? ' · ' + esc(u.area) : '') + ' · <b>' + esc(roleLabelOf(u.role)) + '</b>. Marca los accesos adicionales que tendrá esta persona por encima de su perfil.</p>' +
      ['Activos y procura', 'Almacén y activos', 'Otros módulos'].map(function (g) {
        var items = PERMISOS.filter(function (p) { return p.grupo === g; });
        if (!items.length) return '';
        return '<div style="font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:14px 0 2px">' + esc(g) + '</div>' + items.map(function (p) {
          return '<label style="display:flex;align-items:flex-start;gap:11px;padding:11px 0;border-bottom:1px solid #EEF3F9;cursor:pointer">' +
            '<input type="checkbox" data-perm="' + p.key + '"' + (u.accesosPermisos[p.key] ? ' checked' : '') + ' style="accent-color:#00CE7C;width:18px;height:18px;margin:2px 0 0;flex:0 0 auto">' +
            '<span style="flex:1"><span style="font-weight:700;color:var(--navy);font-size:14px">' + esc(p.label) + '</span><span style="display:block;font-size:12.5px;color:var(--muted)">' + esc(p.desc) + '</span></span></label>';
        }).join('');
      }).join('') +
      '<div style="font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:16px 0 2px">Accesos adicionales</div>' +
      '<div class="note" style="margin:0 0 4px">Marca los accesos del catálogo que tendrá esta persona. Los que ya vienen <b>autorizados por su perfil</b> aparecen marcados y no se pueden quitar aquí; el resto puedes concederlos por esta vía.</div>' +
      acBucketHtml(u, 'drives', 'Drives autorizados', acProfileAuthSet(u)) +
      acBucketHtml(u, 'apps', 'Aplicativos autorizados', acProfileAuthSet(u)) +
      acBucketHtml(u, 'herramientas', 'Herramientas adicionales', acProfileAuthSet(u)) +
      acExtraTa('acOtros', 'Permisos adicionales', 'Cualquier otro permiso o nota', (u.accesosExtra || {}).otros) +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="permOk">Guardar permisos</button></div>', 'wide');
    $('#permOk').addEventListener('click', function () {
      var nuevos = {};
      $$('#modalHost [data-perm]').forEach(function (cb) { if (cb.checked) nuevos[cb.getAttribute('data-perm')] = true; });
      u.accesosPermisos = nuevos;
      function rd(id) { var el = document.getElementById(id); return el ? el.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) : []; }
      function readBucket(bucket) {
        var picked = [];
        $$('#modalHost [data-acx="' + bucket + '"]').forEach(function (cb) { if (cb.checked && !cb.disabled && picked.indexOf(cb.value) < 0) picked.push(cb.value); });
        var oth = $('#modalHost [data-acxother="' + bucket + '"]'); if (oth) oth.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) { if (picked.indexOf(s) < 0) picked.push(s); });
        return picked;
      }
      var prev = u.accesosExtra || { drives: [], apps: [], herramientas: [], otros: [] };
      u.accesosExtra = { drives: readBucket('drives'), apps: readBucket('apps'), herramientas: readBucket('herramientas'), otros: rd('acOtros') };
      var nuevos2 = [];
      ['drives', 'apps', 'herramientas'].forEach(function (bk) { (u.accesosExtra[bk] || []).forEach(function (s) { if ((prev[bk] || []).map(function (x) { return x.toLowerCase(); }).indexOf(s.toLowerCase()) < 0) nuevos2.push(s); }); });
      if (nuevos2.length) { db.pendientes.push({ id: db.nextPendId++, userId: u.id, tipo: 'acceso', titulo: 'Acceso autorizado: ' + nuevos2.join(', '), detalle: me.nombre + ' te autorizó ' + nuevos2.length + ' acceso(s) adicional(es): ' + nuevos2.join(', ') + '.', estado: 'abierto', fecha: reqToday(), por: me.nombre, respuesta: '' }); }
      var resumen = permisosDe(u).map(function (p) { return p.label; });
      logHist(u, 'Permisos y accesos actualizados por ' + me.nombre + ': ' + (resumen.length ? resumen.join(', ') : 'sin permisos adicionales') + (acExtraCount(u) ? ' · ' + acExtraCount(u) + ' acceso(s) extra' : '') + (nuevos2.length ? ' · nuevos: ' + nuevos2.join(', ') : ''), me.nombre);
      saveDB(db); closeModal(); refreshNav(); rAccesos(); toast('Permisos de ' + u.nombre.split(' ')[0] + ' actualizados.');
    });
  }

  /* ---------- CONFIGURACIÓN · APLICATIVOS, DRIVES Y HERRAMIENTAS ---------- */
  var recTab = 'apps';
  var REC_META = { apps: { t: 'Aplicativos', sing: 'aplicativo' }, drives: { t: 'Drives', sing: 'drive' }, herramientas: { t: 'Herramientas', sing: 'herramienta' }, emails: { t: 'Emails autorizados', sing: 'email' } };
  function rRecursos() {
    resetContent();
    db.recursos = db.recursos || { apps: [], drives: [], herramientas: [], emails: [] };
    if (!db.recursos.emails) db.recursos.emails = [];
    var TABS = [['apps', 'Aplicativos internos'], ['drives', 'Drives Autorizados'], ['herramientas', 'Herramientas adicionales'], ['emails', 'Emails autorizados']];
    var html = '<div class="card" style="margin-bottom:14px"><div class="toolrow" style="margin:0"><div><h3 style="margin:0">Aplicativos, drives y herramientas</h3><div class="note" style="margin:4px 0 0;max-width:680px">Catálogo central de los aplicativos, drives y herramientas de la empresa: nombre, descripción y enlace. Esta lista alimenta los accesos que se autorizan a cada persona.</div></div><span class="sp"></span><button class="btn-g" id="recNew"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Agregar</button></div></div>';
    html += '<div class="doccat" style="margin-bottom:14px">' + TABS.map(function (t) { return '<button data-rectab="' + t[0] + '" class="' + (recTab === t[0] ? 'on' : '') + '">' + t[1] + ' <span class="chip n" style="font-size:10px">' + (db.recursos[t[0]] || []).length + '</span></button>'; }).join('') + '</div>';
    var list = db.recursos[recTab] || [];
    html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Nombre</th><th>Descripción</th><th>Enlace</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (r, i) {
        var link = r.link ? '<a href="' + esc(r.link) + '" target="_blank" rel="noopener" style="color:var(--green);font-weight:600;word-break:break-all">' + esc(r.link) + '</a>' : '<span style="color:var(--muted2)">—</span>';
        return '<tr><td><b style="color:var(--navy)">' + esc(r.nombre) + '</b></td><td style="font-size:13px;color:#33415C;max-width:360px">' + esc(r.desc || '') + '</td><td style="font-size:12.5px">' + link + '</td><td><div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn-s" data-recedit="' + i + '" style="font-size:12.5px;padding:6px 11px">Editar</button><button class="btn-s btn-danger" data-recdel="' + i + '" style="font-size:12.5px;padding:6px 11px">Eliminar</button></div></td></tr>';
      }).join('') : '<tr><td colspan="4"><div class="empty">Aún no hay ' + esc(REC_META[recTab].t.toLowerCase()) + '. Usa "Agregar".</div></td></tr>') +
      '</tbody></table></div></div>';
    $('#content').innerHTML = html;
    $('#recNew').addEventListener('click', function () { recForm(null); });
    $$('#content [data-rectab]').forEach(function (b) { b.addEventListener('click', function () { recTab = b.getAttribute('data-rectab'); rRecursos(); }); });
    $$('#content [data-recedit]').forEach(function (b) { b.addEventListener('click', function () { recForm(+b.getAttribute('data-recedit')); }); });
    $$('#content [data-recdel]').forEach(function (b) { b.addEventListener('click', function () {
      var i = +b.getAttribute('data-recdel'); var r = db.recursos[recTab][i]; if (!r) return;
      db.recursos[recTab].splice(i, 1); saveDB(db); rRecursos(); toast('"' + r.nombre + '" eliminado.');
    }); });
  }
  function recForm(idx) {
    var edit = idx != null; var r = edit ? db.recursos[recTab][idx] : { nombre: '', desc: '', link: '' };
    modal('<button class="mod-x">✕</button><h3>' + (edit ? 'Editar' : 'Nuevo') + ' ' + esc(REC_META[recTab].sing) + '</h3>' +
      '<div class="fld"><label>Nombre *</label><input id="recN" type="text" value="' + esc(r.nombre) + '" placeholder="Ej: ' + (recTab === 'drives' ? 'Drive Finanzas' : recTab === 'apps' ? 'Eureka' : 'AnyDesk') + '"></div>' +
      '<div class="fld"><label>Descripción</label><textarea id="recD" style="min-height:56px" placeholder="Para qué sirve y quién lo usa">' + esc(r.desc || '') + '</textarea></div>' +
      '<div class="fld"><label>Enlace (opcional)</label><input id="recL" type="url" value="' + esc(r.link || '') + '" placeholder="https://…"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="recOk">' + (edit ? 'Guardar cambios' : 'Agregar') + '</button></div>');
    $('#recOk').addEventListener('click', function () {
      var n = $('#recN').value.trim(); if (!n) { toast('Escribe el nombre.'); return; }
      var data = { nombre: n, desc: $('#recD').value.trim(), link: $('#recL').value.trim() };
      if (edit) db.recursos[recTab][idx] = data; else db.recursos[recTab].push(data);
      saveDB(db); closeModal(); rRecursos(); toast(edit ? 'Actualizado.' : 'Agregado.');
    });
  }

  /* ---------- ADMINISTRACIÓN · ACCESOS FRECUENTES ---------- */
  function rAdminFrec() {
    resetContent();
    /* Recopilar herramientas únicas de TODOS los usuarios (fuente real) */
    var seen = {};
    var allTools = [];
    var TIPO_LABEL = { app: 'Aplicativo interno', ext: 'Aplicativo externo', drive: 'Drive autorizado', link: 'Aplicativo externo' };
    db.users.forEach(function (u) {
      if (!u.herramientas) return;
      u.herramientas.forEach(function (h) {
        var key = h.nombre.toLowerCase();
        if (!seen[key]) {
          seen[key] = true;
          allTools.push({ nombre: h.nombre, url: h.url || '', tipo: h.tipo || 'link' });
        }
      });
    });
    var html = '<div class="card" style="margin-bottom:14px"><div class="toolrow" style="margin:0"><div><h3 style="margin:0">Accesos frecuentes</h3><div class="note" style="margin:4px 0 0;max-width:680px">Modifica el nombre y enlace de los aplicativos, drives y herramientas. Los cambios se reflejan en todos los usuarios que los tengan asignados.</div></div></div></div>';
    html += '<div class="card" style="padding:6px 16px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Nombre</th><th>Tipo</th><th>Enlace</th><th></th></tr></thead><tbody>' +
      (allTools.length ? allTools.map(function (t, gi) {
        var link = t.url ? '<a href="' + esc(t.url) + '" target="_blank" rel="noopener" style="color:var(--green);font-weight:600;word-break:break-all">' + esc(t.url) + '</a>' : '<span style="color:var(--muted2)">—</span>';
        return '<tr><td><b style="color:var(--navy)">' + esc(t.nombre) + '</b></td><td style="font-size:13px;color:#33415C">' + esc(TIPO_LABEL[t.tipo] || t.tipo) + '</td><td style="font-size:12.5px">' + link + '</td><td><button class="btn-s" data-adminedit="' + gi + '" style="font-size:12.5px;padding:6px 11px">Editar</button></td></tr>';
      }).join('') : '<tr><td colspan="4"><div class="empty">No hay aplicativos o herramientas registrados.</div></td></tr>') +
      '</tbody></table></div></div>';
    $('#content').innerHTML = html;
    $$('#content [data-adminedit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var gi = +b.getAttribute('data-adminedit');
        var t = allTools[gi]; if (!t) return;
        adminFrecEdit(t.nombre, t.url);
      });
    });
  }
  function adminFrecEdit(oldNombre, oldUrl) {
    modal('<button class="mod-x">✕</button><h3>Editar acceso frecuente</h3>' +
      '<div class="fld"><label>Nombre *</label><input id="afeN" type="text" value="' + esc(oldNombre) + '" placeholder="Nombre del aplicativo"></div>' +
      '<div class="fld"><label>Enlace (URL)</label><input id="afeL" type="url" value="' + esc(oldUrl || '') + '" placeholder="https://…"></div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="afeOk">Guardar cambios</button></div>');
    $('#afeOk').addEventListener('click', function () {
      var newNombre = $('#afeN').value.trim();
      if (!newNombre) { toast('Escribe el nombre.'); return; }
      var newLink = $('#afeL').value.trim();
      /* Propagar a TODOS los usuarios que tengan esta herramienta */
      db.users.forEach(function (u) {
        if (!u.herramientas) return;
        u.herramientas.forEach(function (h) {
          if (h.nombre.toLowerCase() === oldNombre.toLowerCase()) {
            h.nombre = newNombre;
            h.url = newLink;
          }
        });
      });
      /* También actualizar en db.recursos si existe ahí */
      if (db.recursos) {
        ['apps', 'drives', 'herramientas'].forEach(function (tipo) {
          (db.recursos[tipo] || []).forEach(function (r) {
            if (r.nombre.toLowerCase() === oldNombre.toLowerCase()) {
              r.nombre = newNombre;
              r.link = newLink;
            }
          });
        });
      }
      saveDB(db);
      closeModal();
      renderShell();
      rAdminFrec();
      toast('Acceso frecuente actualizado.');
    });
  }

  /* ---------- ADMINISTRACIÓN · SOMOS VEPAGOS ---------- */
  var adminSomosTab = 'intro';
  function somosDefaults() {
    return {
      intro: 'Desde 2019 hacemos que cobrar sea simple para los comercios de Venezuela. Ofrecemos puntos de venta procesados por Credicard, Platco y Banesco, con soporte los 365 días del año. Nuestra promesa: hacer crecer tu negocio.',
      juridico: 'Nuestro nombre jurídico es Consultora Alca, C.A. · VEPAGOS es nuestro nombre comercial.',
      stats: [
        { valor: '2019', label: 'Año de fundación' },
        { valor: '7 años', label: 'Operando en Venezuela' },
        { valor: '+80.000', label: 'Clientes atendidos' },
        { valor: '+50.000', label: 'Clientes activos' },
        { valor: '15', label: 'Bancos aliados' }
      ],
      servicios: [
        'Transacciones ilimitadas, sin topes ni comisiones por transacción',
        'Conectividad 4G + Wi-Fi con SIM incluida (Digitel o Movistar): el cliente elige una',
        'Soporte 365 días con atención local real',
        'Garantía y reemplazo: el equipo siempre cubierto',
        'Sin cuota de instalación ni permanencia'
      ],
      beneficios: [
        'Cobra con tarjetas nacionales e internacionales y NFC (según modelo)',
        'Atención personalizada por WhatsApp y visitas en sitio',
        'Reposición y reemplazo de equipos con garantía',
        'Acompañamiento de un asesor durante toda la relación',
        'Cobertura en todo el país: Caracas, Maracaibo, Valencia y más'
      ],
      tarifa: 'desde $1,66 al día por comercio — una tarifa diaria, todo incluido. El monto varía según el plan contratado, siempre con transacciones ilimitadas.',
      tarifaItems: [
        'Sin comisión por transacción',
        'Sin cuota de instalación ni permanencia',
        'Un solo pago diario, sin sorpresas a fin de mes',
        'Cómo se cobra: por domiciliación de cuenta, en bolívares a la tasa legal vigente del BCV. Sin efectivo ni gestiones manuales'
      ],
      hitos: [
        '2019 — Nace VEPAGOS (Consultora Alca, C.A.)',
        'Representantes UROVO en Venezuela',
        'Alianzas con Credicard, Platco y Banesco',
        '+80.000 clientes atendidos en todo el país',
        'Red de fuerza de ventas a nivel nacional'
      ],
      redes: [
        { nombre: 'Instagram', handle: '@vepagos', url: 'https://www.instagram.com/vepagos/?hl=es' },
        { nombre: 'Facebook', handle: '/vepagos', url: 'https://www.facebook.com/vepagos/?locale=es_LA' },
        { nombre: 'LinkedIn', handle: '/company/vepagos', url: 'https://www.linkedin.com/company/vepagos/?viewAsMember=true' },
        { nombre: 'Google Reviews', handle: 'Reseñas de clientes', url: 'https://www.google.com/search?q=VEPAGOS+rese%C3%B1as' },
        { nombre: 'Página web', handle: 'www.vepagos.com', url: 'https://www.vepagos.com' }
      ]
    };
  }
  function getSomosConfig() {
    if (!db.somosConfig) db.somosConfig = somosDefaults();
    var d = somosDefaults();
    Object.keys(d).forEach(function (k) { if (db.somosConfig[k] === undefined) db.somosConfig[k] = d[k]; });
    return db.somosConfig;
  }
  function rAdminSomos() {
    resetContent();
    var cfg = getSomosConfig();
    var TABS = [
      ['intro', 'Introducción'],
      ['stats', 'Estadísticas'],
      ['servicios', 'Servicios POS'],
      ['beneficios', 'Beneficios'],
      ['tarifa', 'Tarifa'],
      ['hitos', 'Hitos'],
      ['redes', 'Redes sociales'],
      ['modelos', 'Modelos POS']
    ];
    var html = '<div class="card" style="margin-bottom:14px"><div class="toolrow" style="margin:0"><div><h3 style="margin:0">Somos VEPAGOS</h3><div class="note" style="margin:4px 0 0;max-width:680px">Gestiona el contenido del panel "Somos VEPAGOS". Los cambios se reflejan para todos los usuarios.</div></div></div></div>';
    html += '<div class="doccat" style="margin-bottom:14px">' + TABS.map(function (t) { return '<button data-somostab="' + t[0] + '" class="' + (adminSomosTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    html += '<div id="adminSomosBody"></div>';
    $('#content').innerHTML = html;
    $$('#content [data-somostab]').forEach(function (b) { b.addEventListener('click', function () { adminSomosTab = b.getAttribute('data-somostab'); rAdminSomos(); }); });
    renderAdminSomosTab(cfg);
  }
  function renderAdminSomosTab(cfg) {
    var body = $('#adminSomosBody');
    if (adminSomosTab === 'intro') {
      body.innerHTML = '<div class="card"><h3 style="margin:0 0 12px">Texto de introducción</h3>' +
        '<div class="fld"><label>Descripción principal</label><textarea id="asIntro" style="min-height:100px">' + esc(cfg.intro) + '</textarea></div>' +
        '<div class="fld"><label>Texto jurídico</label><textarea id="asJuridico" style="min-height:60px">' + esc(cfg.juridico) + '</textarea></div>' +
        '<div class="mod-actions" style="justify-content:flex-start"><button class="btn-g" id="asIntroOk">Guardar cambios</button></div></div>';
      $('#asIntroOk').addEventListener('click', function () {
        cfg.intro = $('#asIntro').value.trim(); cfg.juridico = $('#asJuridico').value.trim();
        saveDB(db); toast('Introducción actualizada.'); rAdminSomos();
      });
    } else if (adminSomosTab === 'stats') {
      body.innerHTML = '<div class="card"><h3 style="margin:0 0 4px">Estadísticas</h3><div class="note" style="margin:0 0 14px">Las cifras que se muestran en las tarjetas del panel.</div>' +
        '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Valor</th><th>Etiqueta</th><th></th></tr></thead><tbody>' +
        cfg.stats.map(function (s, i) {
          return '<tr><td><b style="color:var(--navy)">' + esc(s.valor) + '</b></td><td>' + esc(s.label) + '</td><td><button class="btn-s" data-editstat="' + i + '" style="font-size:12.5px;padding:6px 11px">Editar</button></td></tr>';
        }).join('') +
        '</tbody></table></div></div>';
      $$('#adminSomosBody [data-editstat]').forEach(function (b) { b.addEventListener('click', function () {
        var i = +b.getAttribute('data-editstat'); var s = cfg.stats[i];
        modal('<button class="mod-x">✕</button><h3>Editar estadística</h3>' +
          '<div class="fld"><label>Valor *</label><input id="asV" type="text" value="' + esc(s.valor) + '"></div>' +
          '<div class="fld"><label>Etiqueta *</label><input id="asL" type="text" value="' + esc(s.label) + '"></div>' +
          '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="asStatOk">Guardar</button></div>');
        $('#asStatOk').addEventListener('click', function () {
          var v = $('#asV').value.trim(), l = $('#asL').value.trim();
          if (!v || !l) { toast('Completa ambos campos.'); return; }
          cfg.stats[i] = { valor: v, label: l }; saveDB(db); closeModal(); rAdminSomos(); toast('Estadística actualizada.');
        });
      }); });
    } else if (adminSomosTab === 'servicios') {
      body.innerHTML = '<div class="card"><h3 style="margin:0 0 4px">Qué incluye el servicio del POS</h3><div class="note" style="margin:0 0 14px">Lista de características del servicio. Un elemento por línea.</div>' +
        '<div class="fld"><textarea id="asSrv" style="min-height:140px">' + esc(cfg.servicios.join('\n')) + '</textarea></div>' +
        '<div class="mod-actions" style="justify-content:flex-start"><button class="btn-g" id="asSrvOk">Guardar cambios</button></div></div>';
      $('#asSrvOk').addEventListener('click', function () {
        cfg.servicios = $('#asSrv').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        saveDB(db); toast('Servicios actualizados.'); rAdminSomos();
      });
    } else if (adminSomosTab === 'beneficios') {
      body.innerHTML = '<div class="card"><h3 style="margin:0 0 4px">Beneficios para el cliente</h3><div class="note" style="margin:0 0 14px">Lista de beneficios. Un elemento por línea.</div>' +
        '<div class="fld"><textarea id="asBen" style="min-height:140px">' + esc(cfg.beneficios.join('\n')) + '</textarea></div>' +
        '<div class="mod-actions" style="justify-content:flex-start"><button class="btn-g" id="asBenOk">Guardar cambios</button></div></div>';
      $('#asBenOk').addEventListener('click', function () {
        cfg.beneficios = $('#asBen').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        saveDB(db); toast('Beneficios actualizados.'); rAdminSomos();
      });
    } else if (adminSomosTab === 'tarifa') {
      body.innerHTML = '<div class="card"><h3 style="margin:0 0 4px">Tarifa y Plan Regular</h3><div class="note" style="margin:0 0 14px">Texto principal de la tarifa y sus puntos.</div>' +
        '<div class="fld"><label>Descripción de la tarifa</label><textarea id="asTar" style="min-height:80px">' + esc(cfg.tarifa) + '</textarea></div>' +
        '<div class="fld"><label>Puntos de la tarifa (uno por línea)</label><textarea id="asTarI" style="min-height:120px">' + esc(cfg.tarifaItems.join('\n')) + '</textarea></div>' +
        '<div class="mod-actions" style="justify-content:flex-start"><button class="btn-g" id="asTarOk">Guardar cambios</button></div></div>';
      $('#asTarOk').addEventListener('click', function () {
        cfg.tarifa = $('#asTar').value.trim();
        cfg.tarifaItems = $('#asTarI').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        saveDB(db); toast('Tarifa actualizada.'); rAdminSomos();
      });
    } else if (adminSomosTab === 'hitos') {
      body.innerHTML = '<div class="card"><h3 style="margin:0 0 4px">Nuestros hitos</h3><div class="note" style="margin:0 0 14px">Lista de logros e hitos de la empresa. Un elemento por línea.</div>' +
        '<div class="fld"><textarea id="asHit" style="min-height:140px">' + esc(cfg.hitos.join('\n')) + '</textarea></div>' +
        '<div class="mod-actions" style="justify-content:flex-start"><button class="btn-g" id="asHitOk">Guardar cambios</button></div></div>';
      $('#asHitOk').addEventListener('click', function () {
        cfg.hitos = $('#asHit').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        saveDB(db); toast('Hitos actualizados.'); rAdminSomos();
      });
    } else if (adminSomosTab === 'redes') {
      body.innerHTML = '<div class="card"><h3 style="margin:0 0 4px">Redes sociales</h3><div class="note" style="margin:0 0 14px">Links a las redes sociales y sitio web de la empresa.</div>' +
        '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Nombre</th><th>Handle</th><th>URL</th><th></th></tr></thead><tbody>' +
        cfg.redes.map(function (r, i) {
          return '<tr><td><b style="color:var(--navy)">' + esc(r.nombre) + '</b></td><td>' + esc(r.handle) + '</td><td style="font-size:12.5px"><a href="' + esc(r.url) + '" target="_blank" rel="noopener" style="color:var(--green);font-weight:600;word-break:break-all">' + esc(r.url) + '</a></td><td><button class="btn-s" data-editred="' + i + '" style="font-size:12.5px;padding:6px 11px">Editar</button></td></tr>';
        }).join('') +
        '</tbody></table></div></div>';
      $$('#adminSomosBody [data-editred]').forEach(function (b) { b.addEventListener('click', function () {
        var i = +b.getAttribute('data-editred'); var r = cfg.redes[i];
        modal('<button class="mod-x">✕</button><h3>Editar red social</h3>' +
          '<div class="fld"><label>Nombre *</label><input id="asRN" type="text" value="' + esc(r.nombre) + '"></div>' +
          '<div class="fld"><label>Handle</label><input id="asRH" type="text" value="' + esc(r.handle) + '"></div>' +
          '<div class="fld"><label>URL *</label><input id="asRU" type="url" value="' + esc(r.url) + '"></div>' +
          '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="asRedOk">Guardar</button></div>');
        $('#asRedOk').addEventListener('click', function () {
          var n = $('#asRN').value.trim(), u = $('#asRU').value.trim();
          if (!n || !u) { toast('Nombre y URL son requeridos.'); return; }
          cfg.redes[i] = { nombre: n, handle: $('#asRH').value.trim(), url: u };
          saveDB(db); closeModal(); rAdminSomos(); toast('Red social actualizada.');
        });
      }); });
    } else if (adminSomosTab === 'modelos') {
      var POS = db.somosPOS || window.SV_SEED.POS_CATALOGO || [];
      var SWL = { credicard: 'Credicard', platco: 'Platco', banesco: 'Banesco' };
      body.innerHTML = '<div class="card"><div class="toolrow" style="margin:0 0 14px"><div><h3 style="margin:0">Modelos disponibles para la venta</h3><div class="note" style="margin:4px 0 0">Gestiona el catálogo de terminales POS.</div></div><span class="sp"></span><button class="btn-g" id="apAdd"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Agregar modelo</button></div>' +
        '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Imagen</th><th>Nombre</th><th>Etiqueta</th><th>Plataforma</th><th>Descripción</th><th></th></tr></thead><tbody>' +
        (POS.length ? POS.map(function (p, i) {
          return '<tr><td><div data-previmg="' + i + '" style="width:48px;height:48px;border-radius:10px;border:1px solid #EEF3F9;background:#fff url(\'' + esc(p.img) + '\') center/contain no-repeat;cursor:pointer" title="Click para ampliar"></div></td><td><b style="color:var(--navy)">' + esc(p.name) + '</b></td><td>' + esc(p.tag) + '</td><td><span style="font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;background:#E7FAF1;color:#00874f">' + esc(SWL[p.sw] || p.sw) + '</span></td><td style="font-size:12.5px;color:#33415C">' + esc(p.sub) + '</td><td style="white-space:nowrap"><button class="btn-s" data-editpos="' + i + '" style="font-size:12.5px;padding:6px 11px">Editar</button> <button class="btn-s" data-delpos="' + i + '" style="font-size:12.5px;padding:6px 11px;color:#E0447B;border-color:#E0447B">Eliminar</button></td></tr>';
        }).join('') : '<tr><td colspan="6"><div class="empty">No hay modelos registrados.</div></td></tr>') +
        '</tbody></table></div></div>';
      $$('#adminSomosBody [data-previmg]').forEach(function (d) { d.addEventListener('click', function () {
        var i = +d.getAttribute('data-previmg'); var p = POS[i]; if (!p) return;
        modal('<button class="mod-x">✕</button><h3 style="margin-bottom:12px">' + esc(p.name) + '</h3><div style="text-align:center"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" style="max-width:100%;max-height:420px;object-fit:contain;border-radius:12px;border:1px solid #EEF3F9"></div>');
      }); });
      $$('#adminSomosBody [data-editpos]').forEach(function (b) { b.addEventListener('click', function () {
        var i = +b.getAttribute('data-editpos'); var p = POS[i]; if (!p) return;
        modal('<button class="mod-x">✕</button><h3>Editar modelo POS</h3>' +
          '<div class="fld"><label>Nombre *</label><input id="apN" type="text" value="' + esc(p.name) + '"></div>' +
          '<div class="fld"><label>Etiqueta (tag)</label><input id="apT" type="text" value="' + esc(p.tag) + '" placeholder="Ej: Smart POS, Más ligero"></div>' +
          '<div class="fld"><label>Descripción</label><input id="apS" type="text" value="' + esc(p.sub) + '"></div>' +
          '<div class="fld"><label>Especificaciones (una por línea)</label><textarea id="apB" style="min-height:80px">' + esc(p.bullets.join('\n')) + '</textarea></div>' +
          '<div class="fld"><label>Plataforma</label><select id="apSW" style="padding:8px 12px;border:1px solid var(--line);border-radius:10px;font-size:14px"><option value="credicard"' + (p.sw === 'credicard' ? ' selected' : '') + '>Credicard</option><option value="platco"' + (p.sw === 'platco' ? ' selected' : '') + '>Platco</option><option value="banesco"' + (p.sw === 'banesco' ? ' selected' : '') + '>Banesco</option></select></div>' +
          '<div class="fld"><label>Imagen del modelo</label>' +
            '<div style="display:flex;gap:10px;align-items:flex-start">' +
              '<div id="apImgPrev" style="width:120px;height:120px;border-radius:12px;border:1px solid #EEF3F9;background:#fff url(\'' + esc(p.img) + '\') center/contain no-repeat;cursor:pointer;flex:0 0 auto" title="Click para ampliar"></div>' +
              '<div style="flex:1;display:flex;flex-direction:column;gap:8px">' +
                '<input id="apI" type="hidden" value="' + esc(p.img) + '">' +
                '<label for="apFile" class="btn-s" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;text-align:center;justify-content:center"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>Subir imagen</label>' +
                '<input id="apFile" type="file" accept="image/*" style="display:none">' +
                '<div id="apFileNote" class="note" style="margin:0;font-size:11.5px"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="apOk">Guardar</button></div>', 'wide');
        document.getElementById('apI').addEventListener('input', function () {
          var v = this.value.trim();
          document.getElementById('apImgPrev').style.backgroundImage = v ? 'url(\'' + v + '\')' : 'none';
        });
        document.getElementById('apFile').addEventListener('change', function () {
          var file = this.files[0]; if (!file) return;
          if (!file.type.startsWith('image/')) { toast('Solo se permiten imágenes.'); return; }
          if (file.size > 2 * 1024 * 1024) { toast('La imagen no debe superar 2 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function (e) {
            var dataUri = e.target.result;
            document.getElementById('apI').value = dataUri;
            document.getElementById('apImgPrev').style.backgroundImage = 'url(\'' + dataUri + '\')';
            document.getElementById('apFileNote').textContent = file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB) — cargada';
          };
          reader.readAsDataURL(file);
        });
        document.getElementById('apImgPrev').addEventListener('click', function () {
          var src = document.getElementById('apI').value.trim(); if (!src) return;
          var overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
          overlay.innerHTML = '<img src="' + esc(src) + '" style="max-width:90vw;max-height:85vh;object-fit:contain;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.4)">';
          overlay.addEventListener('click', function () { overlay.remove(); });
          document.body.appendChild(overlay);
        });
        $('#apOk').addEventListener('click', function () {
          var n = $('#apN').value.trim();
          if (!n) { toast('El nombre es requerido.'); return; }
          if (!db.somosPOS) db.somosPOS = JSON.parse(JSON.stringify(window.SV_SEED.POS_CATALOGO || []));
          db.somosPOS[i] = {
            name: n,
            tag: $('#apT').value.trim(),
            sub: $('#apS').value.trim(),
            bullets: $('#apB').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean),
            sw: $('#apSW').value,
            img: $('#apI').value.trim()
          };
          saveDB(db); closeModal(); rAdminSomos(); toast('Modelo actualizado.');
        });
      }); });
      /* Agregar nuevo modelo */
      $('#apAdd').addEventListener('click', function () {
        if (!db.somosPOS) db.somosPOS = JSON.parse(JSON.stringify(window.SV_SEED.POS_CATALOGO || []));
        db.somosPOS.push({ name: 'Nuevo modelo', tag: 'POS', sub: '', bullets: [], sw: 'credicard', img: '' });
        saveDB(db); rAdminSomos(); toast('Modelo agregado. Edita sus datos.');
      });
      /* Eliminar modelo */
      $$('#adminSomosBody [data-delpos]').forEach(function (b) { b.addEventListener('click', function () {
        var i = +b.getAttribute('data-delpos'); var p = POS[i]; if (!p) return;
        modal('<button class="mod-x">✕</button><h3>Eliminar modelo</h3>' +
          '<p style="color:#33415C;font-size:14px;margin:8px 0 16px">¿Seguro que deseas eliminar <b>' + esc(p.name) + '</b>? Esta acción no se puede deshacer.</p>' +
          '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-s" id="apDelOk" style="color:#fff;background:#E0447B;border-color:#E0447B">Sí, eliminar</button></div>');
        $('#apDelOk').addEventListener('click', function () {
          if (!db.somosPOS) db.somosPOS = JSON.parse(JSON.stringify(window.SV_SEED.POS_CATALOGO || []));
          db.somosPOS.splice(i, 1);
          saveDB(db); closeModal(); rAdminSomos(); toast('Modelo eliminado.');
        });
      }); });
    }
  }

  /* ---------- ADMINISTRACIÓN · ENCUESTAS ---------- */
  function rAdminEnc() {
    resetContent();
    var encs = (db.encuestas || []).slice().sort(function (a, b) { return b.id - a.id; });
    var html = '<div class="card"><div class="toolrow" style="margin:0 0 14px"><div><h3 style="margin:0">Encuestas</h3><div class="note" style="margin:4px 0 0">Gestiona las encuestas del equipo. Configura vigencia, cierra o elimina.</div></div><span class="sp"></span><button class="btn-g" id="aeAdd"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Nueva encuesta</button></div>' +
      '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Título</th><th>Preguntas</th><th>Estado</th><th>Vigencia</th><th>Respuestas</th><th></th></tr></thead><tbody>' +
      (encs.length ? encs.map(function (e, idx) {
        var exp = encExpirada(e);
        var estado = e.estado === 'cerrada' ? '<span class="chip n">Cerrada</span>' : (exp ? '<span class="chip y">Expirada</span>' : '<span class="chip g">Activa</span>');
        var vig = !e.vigenciaDias || e.vigenciaDias <= 0 ? 'Permanente' : e.vigenciaDias + ' días' + (exp ? ' (vencida)' : '');
        var resp = (e.respuestas || []).length;
        return '<tr><td><b style="color:var(--navy)">' + esc(e.titulo) + '</b></td><td>' + (e.preguntas || []).length + '</td><td>' + estado + '</td><td style="font-size:13px">' + vig + '</td><td>' + resp + '</td><td style="white-space:nowrap">' +
          '<button class="btn-s" data-aev="' + e.id + '" style="font-size:12.5px;padding:6px 11px">Vigencia</button> ' +
          (e.estado !== 'cerrada' ? '<button class="btn-s" data-aec="' + e.id + '" style="font-size:12.5px;padding:6px 11px">Cerrar</button> ' : '<button class="btn-s" data-aeo="' + e.id + '" style="font-size:12.5px;padding:6px 11px">Abrir</button> ') +
          '<button class="btn-s" data-aed="' + e.id + '" style="font-size:12.5px;padding:6px 11px;color:#E0447B;border-color:#E0447B">Eliminar</button></td></tr>';
      }).join('') : '<tr><td colspan="6"><div class="empty">No hay encuestas registradas.</div></td></tr>') +
      '</tbody></table></div></div>';
    $('#content').innerHTML = html;
    /* Nueva encuesta */
    $('#aeAdd').addEventListener('click', function () { encPlantillaPicker(); });
    /* Vigencia */
    $$('#content [data-aev]').forEach(function (b) { b.addEventListener('click', function () {
      var e = db.encuestas.find(function (x) { return x.id === +b.getAttribute('data-aev'); }); if (!e) return;
      modal('<button class="mod-x">✕</button><h3>Vigencia de encuesta</h3>' +
        '<p style="color:#33415C;font-size:14px;margin:4px 0 12px"><b>' + esc(e.titulo) + '</b></p>' +
        '<div class="fld"><label>Días de vigencia (0 = permanente)</label><input id="aeVD" type="number" min="0" value="' + (e.vigenciaDias || 0) + '"></div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="aeVOk">Guardar</button></div>');
      $('#aeVOk').addEventListener('click', function () {
        e.vigenciaDias = Math.max(0, parseInt($('#aeVD').value, 10) || 0);
        if (!e.fechaCreacion) e.fechaCreacion = e.desde || e.fecha || reqToday();
        saveDB(db); closeModal(); rAdminEnc(); toast('Vigencia actualizada.');
      });
    }); });
    /* Cerrar */
    $$('#content [data-aec]').forEach(function (b) { b.addEventListener('click', function () {
      var e = db.encuestas.find(function (x) { return x.id === +b.getAttribute('data-aec'); }); if (!e) return;
      e.estado = 'cerrada'; saveDB(db); rAdminEnc(); toast('Encuesta cerrada.');
    }); });
    /* Abrir */
    $$('#content [data-aeo]').forEach(function (b) { b.addEventListener('click', function () {
      var e = db.encuestas.find(function (x) { return x.id === +b.getAttribute('data-aeo'); }); if (!e) return;
      e.estado = 'activa'; saveDB(db); rAdminEnc(); toast('Encuesta reabierta.');
    }); });
    /* Eliminar */
    $$('#content [data-aed]').forEach(function (b) { b.addEventListener('click', function () {
      var e = db.encuestas.find(function (x) { return x.id === +b.getAttribute('data-aed'); }); if (!e) return;
      modal('<button class="mod-x">✕</button><h3>Eliminar encuesta</h3>' +
        '<p style="color:#33415C;font-size:14px;margin:8px 0 16px">¿Seguro que deseas eliminar <b>' + esc(e.titulo) + '</b>? Se perderán todas las respuestas.</p>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-s" id="aeDelOk" style="color:#fff;background:#E0447B;border-color:#E0447B">Sí, eliminar</button></div>');
      $('#aeDelOk').addEventListener('click', function () {
        db.encuestas = db.encuestas.filter(function (x) { return x.id !== e.id; });
        saveDB(db); closeModal(); refreshNav(); rAdminEnc(); toast('Encuesta eliminada.');
      });
    }); });
  }

  /* ---------- ADMINISTRACIÓN · COMUNICACIONES ---------- */
  function rAdminCom() {
    resetContent();
    window.SV_API.getPerfiles().then(function (perfiles) {
      function lbl(pk) {
        if (!pk || pk === '_todos') return 'Todos los perfiles';
        var p = perfiles.find(function (x) { return x.key === pk; });
        return p ? p.label : pk;
      }
      var coms = (db.comunicaciones || []).slice().sort(function (a, b) { return (a.fecha < b.fecha ? 1 : -1) || (b.id - a.id); });
      var totalUsers = db.users.filter(function (u) { return u.role !== 'candidato'; }).length;
      var html = '<div class="card"><div class="toolrow" style="margin:0 0 14px"><div><h3 style="margin:0">Comunicaciones internas</h3><div class="note" style="margin:4px 0 0">Gestiona los anuncios para el equipo. Configura vigencia o elimina.</div></div><span class="sp"></span><button class="btn-g" id="acAdd"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>Nueva comunicación</button></div>' +
        '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Título</th><th>Público</th><th>Publicado por</th><th>Fecha</th><th>Vigencia</th><th>Leídas</th><th></th></tr></thead><tbody>' +
        (coms.length ? coms.map(function (c) {
          var exp = comExpirada(c);
          var vig = !c.vigenciaDias || c.vigenciaDias <= 0 ? 'Permanente' : c.vigenciaDias + ' días' + (exp ? ' (vencida)' : '');
          var leidas = (c.leidoPor || []).length;
          return '<tr><td><b style="color:var(--navy)">' + esc(c.titulo) + '</b></td><td><span class="chip b" style="font-size:11.5px">' + esc(lbl(c.perfilDestino)) + '</span></td><td>' + esc(c.por) + '</td><td style="white-space:nowrap">' + fechaCorta(c.fecha) + '</td><td style="font-size:13px">' + vig + '</td><td>' + leidas + ' de ' + totalUsers + '</td><td style="white-space:nowrap">' +
            '<button class="btn-s" data-acv="' + c.id + '" style="font-size:12.5px;padding:6px 11px">Vigencia</button> ' +
            '<button class="btn-s" data-acd="' + c.id + '" style="font-size:12.5px;padding:6px 11px;color:#E0447B;border-color:#E0447B">Eliminar</button></td></tr>';
        }).join('') : '<tr><td colspan="7"><div class="empty">No hay comunicaciones registradas.</div></td></tr>') +
        '</tbody></table></div></div>';
      $('#content').innerHTML = html;
    /* Nueva comunicación */
    $('#acAdd').addEventListener('click', function () {
      window.SV_API.getPerfiles().then(function (perfiles) {
        var pfOpts = perfiles.map(function (p) { return '<option value="' + esc(p.key) + '">' + esc(p.label) + '</option>'; }).join('');
        var attach = { nombre: null, data: null };
        modal('<button class="mod-x">✕</button><h3>Nueva comunicación interna</h3>' +
          '<p style="color:var(--muted);font-size:14px;margin:4px 0 10px">Publica un anuncio para el equipo.</p>' +
          '<div class="fld"><label>Título</label><input id="coT" type="text" placeholder="Ej: Nuevo horario de la sede"></div>' +
          '<div class="fld"><label>Público objetivo</label><select id="coPerfil"><option value="_todos">✦ Todos los perfiles</option>' + pfOpts + '</select></div>' +
          '<div class="fld"><label>Contenido</label><textarea id="coB" placeholder="Escribe el anuncio." style="min-height:120px"></textarea></div>' +
          '<div class="fld"><label>Días de vigencia (0 = permanente)</label><input id="coVig" type="number" min="0" value="0"></div>' +
          '<div class="fld"><label>Adjunto (opcional)</label><div style="display:flex;align-items:center;gap:10px"><button type="button" class="btn-s" id="coAdjBtn">Adjuntar archivo</button><span id="coAdjName" style="font-size:13px;color:var(--muted)">Ningún archivo</span></div></div>' +
          '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="coOk">Publicar</button></div>', 'wide');
        $('#coAdjBtn').addEventListener('click', function () { var inp = document.createElement('input'); inp.type = 'file'; inp.onchange = function () { var f = inp.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { attach.nombre = f.name; attach.data = rd.result; $('#coAdjName').textContent = f.name; }; rd.readAsDataURL(f); }; inp.click(); });
        $('#coOk').addEventListener('click', function () {
          var t = $('#coT').value.trim(), b = $('#coB').value.trim(), pd = $('#coPerfil').value;
          if (t.length < 3) { toast('Escribe un título.'); return; }
          if (b.length < 10) { toast('Escribe el contenido.'); return; }
          var vig = Math.max(0, parseInt($('#coVig').value, 10) || 0);
          db.comunicaciones.push({ id: db.nextComId++, titulo: t, cuerpo: b, por: me.nombre, fecha: reqToday(), adjuntoNombre: attach.nombre, adjunto: attach.data, leidoPor: [me.id], vigenciaDias: vig, perfilDestino: pd });
          saveDB(db); closeModal(); refreshNav(); rAdminCom(); toast('Comunicación publicada.');
        });
      });
    });
    /* Vigencia */
    $$('#content [data-acv]').forEach(function (b) { b.addEventListener('click', function () {
      var c = db.comunicaciones.find(function (x) { return x.id === +b.getAttribute('data-acv'); }); if (!c) return;
      modal('<button class="mod-x">✕</button><h3>Vigencia de comunicación</h3>' +
        '<p style="color:#33415C;font-size:14px;margin:4px 0 12px"><b>' + esc(c.titulo) + '</b></p>' +
        '<div class="fld"><label>Días de vigencia (0 = permanente)</label><input id="acVD" type="number" min="0" value="' + (c.vigenciaDias || 0) + '"></div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="acVOk">Guardar</button></div>');
      $('#acVOk').addEventListener('click', function () {
        c.vigenciaDias = Math.max(0, parseInt($('#acVD').value, 10) || 0);
        saveDB(db); closeModal(); rAdminCom(); toast('Vigencia actualizada.');
      });
    }); });
    /* Eliminar */
    $$('#content [data-acd]').forEach(function (b) { b.addEventListener('click', function () {
      var c = db.comunicaciones.find(function (x) { return x.id === +b.getAttribute('data-acd'); }); if (!c) return;
      modal('<button class="mod-x">✕</button><h3>Eliminar comunicación</h3>' +
        '<p style="color:#33415C;font-size:14px;margin:8px 0 16px">¿Seguro que deseas eliminar <b>' + esc(c.titulo) + '</b>?</p>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-s" id="acDelOk" style="color:#fff;background:#E0447B;border-color:#E0447B">Sí, eliminar</button></div>');
      $('#acDelOk').addEventListener('click', function () {
        db.comunicaciones = db.comunicaciones.filter(function (x) { return x.id !== c.id; });
        saveDB(db); closeModal(); refreshNav(); rAdminCom(); toast('Comunicación eliminada.');
      });
    }); });
    }); // end getPerfiles
  }

  /* ---------- CONFIGURACIÓN · REQUERIMIENTOS ---------- */
  var reqCfg = { fase: 'onboarding', depto: 'General' };
  function reqSlug(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 16) || ('k' + Date.now()); }
  function rRequerimientos() {
    resetContent();
    var FASES = [['onboarding', 'Onboarding (ingreso)'], ['offboard', 'Desincorporación (salida)']];
    if (reqCfg.fase === 'modalidad') reqCfg.fase = 'onboarding';
    var isMod = reqCfg.fase === 'modalidad';
    var deptos = reqPerfKeys();
    if (deptos.indexOf(reqCfg.depto) < 0) reqCfg.depto = 'General';
    var html = '<div class="card" style="margin-bottom:14px"><h3 style="margin:0 0 4px">Requerimientos por perfil y departamento</h3><div class="note" style="margin:0;max-width:720px">Elige <b>qué configurar</b> (ingreso o salida) y luego el <b>perfil</b>. Los requerimientos de ingreso se organizan por el <b>departamento responsable</b> (RRHH, Sistemas, Mercadeo y su departamento). Lo que un perfil no defina hereda de <b>General</b>.</div></div>';
    html += '<div style="font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:0 0 6px">1 · ¿Qué quieres configurar?</div>';
    html += '<div class="doccat" style="margin-bottom:16px">' + FASES.map(function (f) { return '<button data-reqfase="' + f[0] + '" class="' + (reqCfg.fase === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div>';
    html += '<div class="card" style="margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<div style="font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);flex-basis:100%">2 · Perfil</div>' +
      '<select id="reqPick" style="flex:1;min-width:240px;border:1.5px solid #D9E2EF;border-radius:10px;padding:10px 12px;font-family:inherit;font-size:14px;font-weight:600;color:var(--navy)">' +
        deptos.map(function (d) { var own = d === 'General' || (reqCfg.fase === 'onboarding' ? !!Object.keys(reqOnbGroups(d)).length : (db.reqCatalogo.offboard[d] && db.reqCatalogo.offboard[d].length)); return '<option value="' + esc(d) + '"' + (reqCfg.depto === d ? ' selected' : '') + '>' + esc(reqLabelOf(d)) + (own ? '' : ' (hereda de General)') + '</option>'; }).join('') +
      '</select>' +
    '</div>';
    html += '<div id="reqEditor"></div>';
    $('#content').innerHTML = html;
    $$('#content [data-reqfase]').forEach(function (b) { b.addEventListener('click', function () { reqCfg.fase = b.getAttribute('data-reqfase'); rRequerimientos(); }); });
    var pick = $('#reqPick'); if (pick) pick.addEventListener('change', function () { reqCfg.depto = pick.value; rRequerimientos(); });
    renderReqEditor();
  }
  function renderReqEditor() {
    var fase = reqCfg.fase, depto = reqCfg.depto;
    if (fase === 'onboarding') {
      var head = '<div style="font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:0 0 6px">3 · Requerimientos de ingreso — ' + esc(reqLabelOf(depto)) + '</div>';
      head += '<div class="note" style="margin:0 0 12px;max-width:720px">Un requerimiento por línea, dentro del <b>departamento que lo entrega</b>. Al crear a una persona con este perfil se preasignan todos y se validan contra el inventario.</div>';
      head += REQ_AREAS.map(function (a) {
        var hereda = reqAreaHereda(depto, a.key);
        var list = reqAreaList(depto, a.key);
        return '<div class="card" style="margin-bottom:12px"><div class="toolrow" style="margin:0 0 6px"><h3 style="margin:0;font-size:16px">' + esc(a.label) + '</h3><span class="sp"></span>' +
          (hereda ? '<span class="chip y">Hereda de General</span>' : '') + '</div>' +
          '<div class="note" style="margin:0 0 8px">' + esc(a.hint) + '</div>' +
          '<textarea data-reqta="' + a.key + '" style="width:100%;min-height:120px;border:1.5px solid #D9E2EF;border-radius:10px;padding:11px 13px;font-family:inherit;font-size:13.5px;line-height:1.7;resize:vertical">' + esc(list.join('\n')) + '</textarea></div>';
      }).join('');
      head += '<div style="font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:18px 0 6px">4 · Aplicativos y drives — acceso automático</div>';
      head += '<div class="note" style="margin:0 0 10px;max-width:720px">Marca los aplicativos, drives y herramientas que se <b>autorizan automáticamente</b> en el perfil de la persona al crearla con este perfil. Aparecen en su ficha (Accesos y permisos), en su historial y como notificación.</div>';
      head += [['drives', 'Drives'], ['apps', 'Aplicativos'], ['herramientas', 'Herramientas']].map(function (b) {
        var cat = acCatalog()[b[0]] || [];
        var sel = reqAccList(depto, b[0]).map(function (s) { return s.toLowerCase(); });
        var heredaB = depto !== 'General' && !((reqAccGroups(depto)[b[0]] || []).length);
        var rows = cat.length ? cat.map(function (n) {
          return '<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F2F6FB;cursor:pointer"><input type="checkbox" data-reqacc="' + b[0] + '" value="' + esc(n) + '"' + (sel.indexOf(n.toLowerCase()) > -1 ? ' checked' : '') + ' style="accent-color:#00CE7C;width:17px;height:17px;flex:0 0 auto"><span style="flex:1;font-size:13.5px;color:var(--navy);font-weight:600">' + esc(n) + '</span></label>';
        }).join('') : '<div class="note" style="margin:2px 0">No hay elementos en el catálogo. Agrégalos en Aplicativos y drives.</div>';
        return '<div class="card" style="margin-bottom:12px"><div class="toolrow" style="margin:0 0 6px"><h3 style="margin:0;font-size:16px">' + b[1] + '</h3><span class="sp"></span>' + (heredaB ? '<span class="chip y">Hereda de General</span>' : '') + '</div>' + rows + '</div>';
      }).join('');
      head += '<div class="mod-actions" style="justify-content:flex-start;margin-top:4px"><button class="btn-g" id="reqOnbSave">Guardar requerimientos</button>' + (depto !== 'General' ? '<button class="btn-s" id="reqOnbReset">Volver a heredar de General</button>' : '') + '</div>';
      $('#reqEditor').innerHTML = head;
      $('#reqOnbSave').addEventListener('click', function () {
        var groups = {};
        REQ_AREAS.forEach(function (a) {
          var ta = $('#reqEditor [data-reqta="' + a.key + '"]');
          groups[a.key] = ta ? ta.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) : [];
        });
        db.reqCatalogo.onboarding[depto] = groups;
        var acc = { drives: [], apps: [], herramientas: [] };
        ['drives', 'apps', 'herramientas'].forEach(function (bk) { $$('#reqEditor [data-reqacc="' + bk + '"]').forEach(function (cb) { if (cb.checked) acc[bk].push(cb.value); }); });
        db.reqCatalogo.accesos = db.reqCatalogo.accesos || {}; db.reqCatalogo.accesos[depto] = acc;
        saveDB(db); toast('Requerimientos de ' + reqLabelOf(depto) + ' guardados.');
        rRequerimientos();
      });
      var rr = $('#reqOnbReset'); if (rr) rr.addEventListener('click', function () { delete db.reqCatalogo.onboarding[depto]; if (db.reqCatalogo.accesos) delete db.reqCatalogo.accesos[depto]; saveDB(db); toast(reqLabelOf(depto) + ' vuelve a heredar de General.'); rRequerimientos(); });
    } else {
      var hereda = depto !== 'General' && !((db.reqCatalogo.offboard[depto] || []).length);
      var head = '<div style="font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2);margin:0 0 6px">3 · Pasos de desincorporación</div><div class="card"><div class="toolrow" style="margin:0 0 8px"><h3 style="margin:0">' + esc(reqLabelOf(depto)) + '</h3><span class="sp"></span>' +
        (hereda ? '<span class="chip y">Hereda de General</span>' : '') + '</div>';
      var items = (db.reqCatalogo.offboard[depto] && db.reqCatalogo.offboard[depto].length) ? db.reqCatalogo.offboard[depto] : (db.reqCatalogo.offboard['General'] || []);
      head += '<div class="note" style="margin:0 0 8px">Cada paso tiene un título y una aclaratoria. Estos son los pasos que Capital Humano marca al desincorporar a una persona con este perfil.</div><div id="reqObRows">' +
        items.map(reqObRowHtml).join('') + '</div>' +
        '<button class="btn-s" id="reqObAdd" style="margin-top:8px">+ Paso</button>' +
        '<div class="mod-actions" style="justify-content:flex-start;margin-top:12px"><button class="btn-g" id="reqObSave">Guardar pasos</button>' + (depto !== 'General' ? '<button class="btn-s" id="reqObReset">Volver a heredar de General</button>' : '') + '</div>';
      head += '</div>';
      $('#reqEditor').innerHTML = head;
      $('#reqObAdd').addEventListener('click', function () {
        var cur = readReqObRows(); cur.push({ key: '', label: '', hint: '' });
        $('#reqObRows').innerHTML = cur.map(reqObRowHtml).join(''); wireReqObDel();
      });
      wireReqObDel();
      $('#reqObSave').addEventListener('click', function () {
        var rows = readReqObRows().filter(function (r) { return r.label; }).map(function (r) { return { key: r.key || reqSlug(r.label), label: r.label, hint: r.hint }; });
        if (!rows.length) { toast('Agrega al menos un paso.'); return; }
        db.reqCatalogo.offboard[depto] = rows; saveDB(db); toast('Pasos de ' + reqLabelOf(depto) + ' guardados.'); rRequerimientos();
      });
      var ro = $('#reqObReset'); if (ro) ro.addEventListener('click', function () { delete db.reqCatalogo.offboard[depto]; saveDB(db); toast(reqLabelOf(depto) + ' vuelve a heredar de General.'); rRequerimientos(); });
    }
  }
  function reqObRowHtml(it) {
    return '<div class="reqob-row" data-obkey="' + esc(it.key || '') + '" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px">' +
      '<div style="flex:1;display:flex;flex-direction:column;gap:6px">' +
      '<input data-obl type="text" value="' + esc(it.label || '') + '" placeholder="Título del paso (ej: Devolución de uniforme)" style="border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-family:inherit;font-size:13.5px">' +
      '<input data-obh type="text" value="' + esc(it.hint || '') + '" placeholder="Aclaratoria (opcional)" style="border:1.5px solid #EEF3F9;border-radius:9px;padding:7px 11px;font-family:inherit;font-size:12.5px;color:#5b6b86"></div>' +
      '<button class="btn-s btn-danger" data-obdel style="padding:8px 10px">✕</button></div>';
  }
  function readReqObRows() {
    return $$('#reqObRows .reqob-row').map(function (row) {
      return { key: row.getAttribute('data-obkey'), label: row.querySelector('[data-obl]').value.trim(), hint: row.querySelector('[data-obh]').value.trim() };
    });
  }
  function wireReqObDel() {
    $$('#reqObRows [data-obdel]').forEach(function (b) { b.addEventListener('click', function () {
      var cur = readReqObRows(); var idx = $$('#reqObRows .reqob-row').indexOf(b.closest('.reqob-row'));
      cur.splice(idx, 1); $('#reqObRows').innerHTML = cur.map(reqObRowHtml).join(''); wireReqObDel();
    }); });
  }

  function reqPickerHtml() {
    function chips(arr) { return arr.map(function (n) { return '<button type="button" data-reqadd="' + esc(n) + '" style="font-size:12px;padding:5px 10px;border:1.5px solid #D9E2EF;border-radius:999px;background:#fff;color:var(--navy);font-family:inherit;cursor:pointer">+ ' + esc(n) + '</button>'; }).join(''); }
    var cats = (db.af && db.af.cat ? db.af.cat.categorias : []);
    var consN = []; (db.af ? db.af.consumibles : []).forEach(function (c) { if (consN.indexOf(c.nombre) < 0) consN.push(c.nombre); });
    var acc = ['Correo corporativo', 'Acceso a Eureka', 'Acceso a SAC', 'Foto profesional institucional', 'Teléfono corporativo', 'Línea telefónica / SIM', 'Uniforme'];
    function grupo(t, inner) { return '<div style="font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted2);margin:0 0 6px">' + t + '</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">' + inner + '</div>'; }
    return '<details style="margin:0 0 10px"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--green);padding:8px 0;list-style:none">+ Agregar desde el catálogo (activos, consumibles y accesos)</summary><div class="card" style="background:#F8FAFD;margin:8px 0 0;padding:12px 14px">' +
      grupo('Activos fijos (por categoría)', chips(cats)) +
      grupo('Consumibles / almacén', consN.length ? chips(consN) : '<span class="note" style="margin:0">Aún no hay consumibles cargados en el almacén.</span>') +
      grupo('Accesos y servicios', chips(acc)) +
      '<div class="note" style="margin:2px 0 0">Toca un ítem para agregarlo. Al usar los nombres del catálogo de <b>Activos y procura</b>, el sistema los cruza con el stock real de almacén y con los activos fijos disponibles.</div></div></details>';
  }
  /* ---------- CONTRATOS (control laboral) ---------- */
  var CONTRATO_LABEL = { prueba: 'Mes de prueba', primero: 'Primer contrato', segundo: 'Segundo contrato', indefinido: 'Contrato indefinido' };
  var CONTRATO_NEXT = { prueba: 'primero', primero: 'segundo', segundo: 'indefinido' };
  var EVAL_ROLES = [{ k: 'jefe', t: 'Jefe inmediato' }, { k: 'gerente', t: 'Gerente de área' }, { k: 'rrhh', t: 'Capital Humano' }];
  var EVAL_PREGUNTAS = [
    { id: 'desempeno', t: '¿Cómo calificas su desempeño general?', tipo: 'opcion', ops: ['Excelente', 'Bueno', 'Regular', 'Deficiente'] },
    { id: 'objetivos', t: '¿Cumple con los objetivos y metas de su cargo?', tipo: 'opcion', ops: ['Siempre', 'Casi siempre', 'A veces', 'Rara vez'] },
    { id: 'actitud', t: 'Actitud, compromiso y trabajo en equipo', tipo: 'opcion', ops: ['Excelente', 'Buena', 'Regular', 'Deficiente'] },
    { id: 'responsabilidad', t: 'Puntualidad y responsabilidad', tipo: 'opcion', ops: ['Excelente', 'Buena', 'Regular', 'Deficiente'] },
    { id: 'fortalezas', t: 'Principales fortalezas', tipo: 'texto', ph: '¿Qué destaca de esta persona?' },
    { id: 'mejoras', t: 'Áreas de mejora', tipo: 'texto', ph: '¿En qué debería enfocarse para crecer?' },
    { id: 'renueva', t: 'Recomendación final: ¿renovar el contrato?', tipo: 'opcion', ops: ['Sí renovar', 'No renovar'], clave: true },
    { id: 'comentario', t: 'Comentario adicional (opcional)', tipo: 'texto', ph: 'Cualquier observación para el expediente', opcional: true }
  ];
  function today() { return new Date().toISOString().slice(0, 10); }
  function daysUntil(dateStr) { return Math.round((new Date(dateStr + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000); }
  function contratoAlarma(u) {
    var c = u.contrato;
    if (!c || !c.fin || c.etapa === 'indefinido' || !u.activo) return null;
    var d = daysUntil(c.fin);
    if (d <= 14) return { dias: d };
    return null;
  }
  function gerenteDeArea(u) {
    var cur = u, guard = 0;
    while (cur && cur.managerId && guard < 15) {
      var m = byId(cur.managerId); if (!m) break;
      if (m.role === 'gerente') return m.id;
      cur = m; guard++;
    }
    return null;
  }
  function evalsDe(u) { return db.evaluaciones.filter(function (e) { return e.userId === u.id && e.cicloFin === u.contrato.fin; }); }
  function evalRolElegible(u, rol) {
    if (rol === 'rrhh') return me.role === 'rrhh' || me.role === 'admin';
    if (rol === 'jefe') return me.id === u.managerId;
    if (rol === 'gerente') return me.id === gerenteDeArea(u);
    return false;
  }
  function fechaCorta(s) { if (!s) return '—'; var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }

  function rContratos() {
    resetContent();
    var scoped = me.role === 'gerente';
    var teamIds = scoped ? subtree(me.id).map(function (u) { return u.id; }) : null;
    var list = db.users.filter(function (u) {
      if (!u.activo || u.role === 'candidato' || !u.contrato) return false;
      if (scoped) return teamIds.indexOf(u.id) > -1;
      return true;
    });
    var alarmas = list.filter(contratoAlarma);
    // ordenar: alarmas primero (por urgencia), luego el resto
    list.sort(function (a, b) {
      var aa = contratoAlarma(a), ba = contratoAlarma(b);
      if (aa && ba) return aa.dias - ba.dias;
      if (aa) return -1; if (ba) return 1;
      return 0;
    });
    function estadoChip(u) {
      var c = u.contrato;
      if (c.etapa === 'indefinido') return '<span class="chip g">Fijo</span>';
      var al = contratoAlarma(u);
      if (al) return al.dias < 0 ? '<span class="chip r">Vencido hace ' + Math.abs(al.dias) + ' d</span>' : '<span class="chip y">Renovar en ' + al.dias + ' d</span>';
      var d = daysUntil(c.fin);
      return '<span class="chip n">' + d + ' d restantes</span>';
    }
    var alarmCard = alarmas.length
      ? '<div class="card" style="margin-bottom:16px;border:1px solid #F3C7C7;background:#FEF6F6">' +
        '<h3 style="color:#B4232A">Renovaciones que requieren atención (' + alarmas.length + ')</h3>' +
        '<div class="note" style="margin:2px 0 8px">Contratos que vencen en 2 semanas o menos. Cada persona necesita la evaluación de su jefe inmediato, su gerente de área y Capital Humano.</div>' +
        alarmas.map(function (u) {
          var evs = evalsDe(u), done = evs.length;
          return '<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #F3DADA;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:220px"><b style="color:var(--navy)">' + esc(u.nombre) + '</b><div style="font-size:12.5px;color:var(--muted)">' + esc(u.cargo) + ' · ' + CONTRATO_LABEL[u.contrato.etapa] + '</div></div>' +
            estadoChip(u) +
            '<span class="chip ' + (done >= 3 ? 'g' : 'n') + '">' + done + '/3 evaluaciones</span>' +
            '<button class="btn-g" data-contrato="' + u.id + '" style="font-size:13px;padding:7px 13px">Abrir</button></div>';
        }).join('') + '</div>'
      : '';
    $('#content').innerHTML =
      alarmCard +
      '<div class="card" style="padding:6px 16px"><table class="tbl"><thead><tr><th>Persona</th><th>Etapa</th><th>Inicio</th><th>Fin</th><th>Estado</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (u) {
        var c = u.contrato;
        return '<tr><td><b style="color:var(--navy)">' + esc(u.nombre) + '</b><div style="font-size:12.5px;color:var(--muted2)">' + esc(u.cargo) + '</div></td>' +
          '<td>' + CONTRATO_LABEL[c.etapa] + '</td><td>' + fechaCorta(c.inicio) + '</td><td>' + (c.fin ? fechaCorta(c.fin) : '—') + '</td>' +
          '<td>' + estadoChip(u) + '</td>' +
          '<td style="white-space:nowrap"><button class="btn-s" data-contrato="' + u.id + '">Ver contrato</button></td></tr>';
      }).join('') : '<tr><td colspan="6" class="empty">No hay contratos para mostrar.</td></tr>') +
      '</tbody></table></div>';
    $('#content').addEventListener('click', function (e) {
      var b = e.target.closest('[data-contrato]'); if (!b) return;
      contratoModal(byId(+b.getAttribute('data-contrato')));
    });
  }

  function contratoModal(u) {
    var c = u.contrato;
    var evs = evalsDe(u);
    var al = contratoAlarma(u);
    var puedeProcesar = (me.role === 'rrhh' || me.role === 'admin') && c.etapa !== 'indefinido';
    var jefe = u.managerId ? byId(u.managerId) : null;
    var gerId = gerenteDeArea(u);
    var gerente = gerId ? byId(gerId) : null;
    function respHtml(e) {
      return EVAL_PREGUNTAS.map(function (q) {
        var v = e.respuestas ? e.respuestas[q.id] : (q.id === 'renueva' ? (e.renueva ? 'Sí renovar' : 'No renovar') : (q.id === 'comentario' ? e.comentario : ''));
        if (!v) return '';
        if (q.clave) return '<div style="margin:3px 0"><span class="chip ' + (v === 'Sí renovar' ? 'g' : 'r') + '">' + esc(v) + '</span></div>';
        return '<div style="margin:3px 0;font-size:12.5px"><span style="color:var(--muted2)">' + esc(q.t) + '</span> — <b style="color:#33415C;font-weight:600">' + esc(v) + '</b></div>';
      }).join('');
    }
    function evalRow(role) {
      var mine = evs.find(function (e) { return e.rol === role.k; });
      var elegible = evalRolElegible(u, role.k) && !mine && c.etapa !== 'indefinido';
      var quien = role.k === 'jefe' ? (jefe ? jefe.nombre : 'Sin jefe asignado') : role.k === 'gerente' ? (gerente ? gerente.nombre : 'Sin gerente de área') : 'Capital Humano';
      var body;
      if (mine) {
        body = '<div style="font-size:12.5px;color:var(--muted2);margin-bottom:3px">' + esc(mine.evaluadorNombre) + ' · ' + mine.fecha + '</div>' + respHtml(mine);
      } else if (elegible) {
        body = '<div data-evalform="' + role.k + '" style="margin-top:6px">' +
          EVAL_PREGUNTAS.map(function (q) {
            var head = '<div style="font-size:13px;font-weight:600;color:var(--navy);margin:9px 0 5px">' + q.t + (q.opcional ? '' : ' <span style="color:#E5484D">*</span>') + '</div>';
            if (q.tipo === 'opcion') {
              return head + '<div style="display:flex;flex-wrap:wrap;gap:6px" data-q="' + q.id + '">' +
                q.ops.map(function (op) { return '<button type="button" class="eopt" data-v="' + esc(op) + '" style="font-size:12.5px;padding:6px 12px;border:1.5px solid #D9E2EF;border-radius:20px;background:#fff;color:#33415C;cursor:pointer;font-family:inherit">' + esc(op) + '</button>'; }).join('') +
                '</div>';
            }
            return head + '<textarea data-q="' + q.id + '" placeholder="' + esc(q.ph || '') + '" style="width:100%;min-height:52px;border:1.5px solid #D9E2EF;border-radius:9px;padding:8px 11px;font-size:13px;font-family:inherit;resize:vertical"></textarea>';
          }).join('') +
          '<div style="margin-top:10px"><button class="btn-g" data-esave style="font-size:12.5px;padding:8px 14px" disabled>Guardar evaluación</button></div></div>';
      } else {
        body = '<span class="chip n">Pendiente</span>';
      }
      return '<div style="padding:12px 0;border-bottom:1px solid #EEF3F9">' +
        '<div style="display:flex;justify-content:space-between;gap:8px"><span style="font-weight:700;color:var(--navy);font-size:13.5px">' + role.t + (mine ? ' <span class="chip ' + (mine.renueva ? 'g' : 'r') + '" style="margin-left:4px">' + (mine.renueva ? 'Sí' : 'No') + '</span>' : '') + '</span><span style="font-size:12.5px;color:var(--muted)">' + esc(quien) + '</span></div>' +
        '<div style="margin-top:5px">' + body + '</div></div>';
    }
    var evalCard = c.etapa === 'indefinido'
      ? '<div class="note" style="margin-top:10px">Este contrato es indefinido (fijo). No requiere renovación ni evaluación.</div>'
      : '<div style="margin-top:14px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin-bottom:2px">Encuesta de renovación</div>' +
        EVAL_ROLES.map(evalRow).join('') + '</div>';
    // historial completo (todos los ciclos)
    var allEvs = db.evaluaciones.filter(function (e) { return e.userId === u.id; }).sort(function (a, b) { return b.fecha < a.fecha ? -1 : 1; });
    var histHtml = allEvs.length
      ? '<div style="margin-top:14px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin-bottom:4px">Historial de evaluaciones</div>' +
        allEvs.map(function (e) {
          var rl = EVAL_ROLES.find(function (r) { return r.k === e.rol; });
          return '<div style="padding:9px 0;border-bottom:1px solid #F2F6FB;font-size:13px"><div style="display:flex;gap:8px;align-items:center">' + (e.renueva ? '<span class="chip g">Sí</span>' : '<span class="chip r">No</span>') +
            '<b style="color:var(--navy)">' + (rl ? rl.t : e.rol) + '</b> · ' + esc(e.evaluadorNombre) + ' <span style="color:var(--muted2)">(' + CONTRATO_LABEL[e.etapaEvaluada] + ', ' + e.fecha + ')</span></div>' +
            '<div style="margin-top:4px">' + respHtml(e) + '</div></div>';
        }).join('') + '</div>'
      : '<div class="note" style="margin-top:12px">Aún no hay evaluaciones registradas.</div>';
    var procesarHtml = puedeProcesar
      ? '<div class="mod-actions" style="flex-wrap:wrap"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cerrar</button>' +
        '<button class="btn-s btn-danger" id="ctNo">No renovar (desincorporar)</button>' +
        '<button class="btn-g" id="ctSi">Renovar → ' + CONTRATO_LABEL[CONTRATO_NEXT[c.etapa]] + '</button></div>'
      : '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cerrar</button></div>';
    modal('<button class="mod-x">✕</button><h3>Contrato — ' + esc(u.nombre) + '</h3>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 2px">' +
        '<span class="chip ' + (c.etapa === 'indefinido' ? 'g' : 'y') + '">' + CONTRATO_LABEL[c.etapa] + '</span>' +
        (c.fin ? '<span class="chip n">Inicio ' + fechaCorta(c.inicio) + '</span><span class="chip n">Fin ' + fechaCorta(c.fin) + '</span>' : '<span class="chip n">Desde ' + fechaCorta(c.inicio) + '</span>') +
        (al ? (al.dias < 0 ? '<span class="chip r">Vencido hace ' + Math.abs(al.dias) + ' días</span>' : '<span class="chip y">Renovar en ' + al.dias + ' días</span>') : '') +
      '</div>' +
      evalCard + histHtml + procesarHtml, 'wide');
    // wire evaluation forms
    document.querySelectorAll('#modalHost [data-evalform]').forEach(function (form) {
      var rol = form.getAttribute('data-evalform');
      var answers = {};
      var saveBtn = form.querySelector('[data-esave]');
      function checkComplete() {
        var ok = EVAL_PREGUNTAS.every(function (q) { return q.opcional || (answers[q.id] && String(answers[q.id]).trim()); });
        saveBtn.disabled = !ok;
      }
      form.querySelectorAll('.eopt').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var group = btn.closest('[data-q]'); var qid = group.getAttribute('data-q');
          group.querySelectorAll('.eopt').forEach(function (b2) { b2.style.background = '#fff'; b2.style.color = '#33415C'; b2.style.borderColor = '#D9E2EF'; });
          var isNo = btn.getAttribute('data-v') === 'No renovar';
          btn.style.background = isNo ? '#E5484D' : '#00CE7C'; btn.style.color = '#fff'; btn.style.borderColor = 'transparent';
          answers[qid] = btn.getAttribute('data-v'); checkComplete();
        });
      });
      form.querySelectorAll('textarea[data-q]').forEach(function (ta) {
        ta.addEventListener('input', function () { answers[ta.getAttribute('data-q')] = ta.value; checkComplete(); });
      });
      saveBtn.addEventListener('click', function () {
        db.evaluaciones.push({
          id: db.nextEvalId++, userId: u.id, cicloFin: u.contrato.fin, etapaEvaluada: u.contrato.etapa,
          rol: rol, evaluadorId: me.id, evaluadorNombre: me.nombre,
          renueva: answers.renueva === 'Sí renovar',
          respuestas: answers, comentario: answers.comentario || '', fecha: today()
        });
        logHist(u, 'Evaluación de renovación registrada por ' + me.nombre + ' (' + rol + ')');
        saveDB(db); closeModal(); contratoModal(u); toast('Evaluación registrada.');
      });
    });
    var ctSi = $('#ctSi');
    if (ctSi) ctSi.addEventListener('click', function () {
      var evs2 = evalsDe(u);
      if (evs2.length < 3 && !confirm('Aún no están las 3 evaluaciones (' + evs2.length + '/3). ¿Renovar de todas formas?')) return;
      var next = CONTRATO_NEXT[c.etapa];
      var inicio = today();
      var fin = null;
      if (next !== 'indefinido') {
        var d = new Date(); d.setMonth(d.getMonth() + (next === 'primero' ? 6 : 6)); fin = d.toISOString().slice(0, 10);
      }
      u.contrato = { etapa: next, inicio: inicio, fin: fin };
      logHist(u, 'Contrato renovado a: ' + CONTRATO_LABEL[next]);
      saveDB(db); closeModal(); rContratos();
      toast('Contrato renovado a: ' + CONTRATO_LABEL[next] + '.');
    });
    var ctNo = $('#ctNo');
    if (ctNo) ctNo.addEventListener('click', function () {
      closeModal(); desincorporarModal(u);
    });
  }

  /* ---------- EMAIL MARKETING ---------- */
  function rMarketing() {
    resetContent();
    $('#content').innerHTML =
      '<div class="card" style="margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:240px"><h3 style="margin-bottom:4px">Conecta tu herramienta de email</h3><div class="note" style="margin:0">Esta sección se integrará con Mailchimp (u otra herramienta) en el sistema real. Aquí gestionas borradores y ves el historial.</div></div>' +
        '<button class="btn-g" id="btnConnect">Conectar Mailchimp</button></div>' +
      '<div class="toolrow"><h3 style="margin:0;font-size:16.5px;color:var(--navy)">Campañas</h3><span class="sp"></span><button class="btn-s" id="btnNewCamp">+ Nueva campaña</button></div>' +
      '<div class="card" style="padding:6px 16px"><table class="tbl"><thead><tr><th>Campaña</th><th>Audiencia</th><th>Estado</th><th>Aperturas</th></tr></thead><tbody>' +
      db.campanas.map(function (c) {
        return '<tr><td><b style="color:var(--navy)">' + esc(c.nombre) + '</b><div style="font-size:12.5px;color:var(--muted2)">' + esc(c.asunto) + ' · ' + c.fecha + '</div></td><td>' + esc(c.audiencia) + '</td>' +
          '<td>' + (c.estado === 'enviada' ? '<span class="chip g">Enviada</span>' : '<span class="chip y">Borrador</span>') + '</td><td>' + c.aperturas + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    $('#btnConnect').addEventListener('click', function () { toast('En el sistema real esto abre la conexión con Mailchimp.'); });
    $('#btnNewCamp').addEventListener('click', function () {
      modal('<button class="mod-x">✕</button><h3>Nueva campaña (borrador)</h3>' +
        '<div class="fld"><label>Nombre</label><input id="ncN" type="text" placeholder="Ej: Promo agosto"></div>' +
        '<div class="fld"><label>Asunto del correo</label><input id="ncA" type="text" placeholder="Asunto"></div>' +
        '<div class="fld"><label>Audiencia</label><select id="ncAu"><option>Clientes activos</option><option>Comercios prospecto</option><option>Candidatos</option><option>Fuerza de ventas</option></select></div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="ncOk">Guardar borrador</button></div>');
      $('#ncOk').addEventListener('click', function () {
        var n = $('#ncN').value.trim(); if (!n) return;
        db.campanas.unshift({ id: db.nextCampId++, nombre: n, asunto: $('#ncA').value.trim(), audiencia: $('#ncAu').value, estado: 'borrador', fecha: new Date().toISOString().slice(0, 10), aperturas: '—' });
        saveDB(db); closeModal(); rMarketing(); toast('Borrador guardado.');
      });
    });
  }

  /* ---------- MI PERFIL ---------- */
  var perfilTab = 'resumen';
  var perfilTarget = null;
  function permisoFormRow(p, i) {
    p = p || {};
    return '<div class="permRow" data-pi="' + i + '" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;border:1px solid var(--line);border-radius:11px;padding:10px 12px;margin-bottom:8px">' +
      '<div class="fld" style="flex:1;min-width:140px;margin:0"><label>Tipo</label><select class="pmTipo">' + Object.keys(PERMISO_TIPOS).map(function (k) { return '<option value="' + k + '"' + (p.tipo === k ? ' selected' : '') + '>' + PERMISO_TIPOS[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld" style="width:120px;margin:0"><label>Salida/entrada</label><select class="pmDir"><option value="salida"' + (p.dir !== 'entrada' ? ' selected' : '') + '>Sale a las</option><option value="entrada"' + (p.dir === 'entrada' ? ' selected' : '') + '>Entra a las</option></select></div>' +
      '<div class="fld" style="width:110px;margin:0"><label>Hora</label><input class="pmHora" type="time" value="' + esc(p.hora || '') + '"></div>' +
      '<div class="fld" style="flex:1;min-width:120px;margin:0"><label>Nota (opcional)</label><input class="pmNota" type="text" value="' + esc(p.nota || '') + '" placeholder="Ej: lunes y miércoles"></div>' +
      '<button type="button" class="btn-s pmDel" title="Quitar" style="color:#B23A6E">✕</button>' +
    '</div>';
  }
  function openHorarioModal(u) {
    var h = horarioDe(u);
    u.permisos = u.permisos || [];
    modal('<button class="mod-x">✕</button><h3>Horario y permisos</h3>' +
      '<p style="color:var(--muted);font-size:14px;margin:4px 0 12px;line-height:1.55">Define el horario de <b>' + esc(u.nombre) + '</b>. El estándar de oficina es de 8:00 a.m. a 5:00 p.m. Los equipos que entran a las 9:00 a.m. se configuran aquí. Se tolera una llegada hasta 15 minutos después de la hora de entrada.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">' +
        '<button type="button" class="btn-s" id="horStd">Estándar 8:00 – 5:00</button>' +
        '<button type="button" class="btn-s" id="hor9">Equipo 9:00 – 6:00</button>' +
      '</div>' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap">' +
        '<div class="fld" style="flex:1;min-width:150px"><label>Hora de entrada</label><input id="horE" type="time" value="' + esc(h.entrada) + '"></div>' +
        '<div class="fld" style="flex:1;min-width:150px"><label>Hora de salida</label><input id="horS" type="time" value="' + esc(h.salida) + '"></div>' +
      '</div>' +
      '<div style="border-top:1px solid #EEF3F9;margin-top:6px;padding-top:12px">' +
        '<div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin-bottom:8px">Permisos especiales (lactancia, estudios, citas…)</div>' +
        '<div id="permList">' + u.permisos.map(function (p, i) { return permisoFormRow(p, i); }).join('') + '</div>' +
        '<button type="button" class="btn-s" id="permAdd"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M12 5v14M5 12h14"></path></svg>Agregar permiso</button>' +
      '</div>' +
      '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="horSave">Guardar</button></div>');
    var std = $('#horStd'); if (std) std.addEventListener('click', function () { $('#horE').value = '08:00'; $('#horS').value = '17:00'; });
    var h9 = $('#hor9'); if (h9) h9.addEventListener('click', function () { $('#horE').value = '09:00'; $('#horS').value = '18:00'; });
    var pl = $('#permList');
    function bindDel() { $$('#permList .pmDel').forEach(function (b) { b.onclick = function () { b.closest('.permRow').remove(); }; }); }
    bindDel();
    var pa = $('#permAdd'); if (pa) pa.addEventListener('click', function () { var d = document.createElement('div'); d.innerHTML = permisoFormRow({}, pl.children.length); pl.appendChild(d.firstChild); bindDel(); });
    var sv = $('#horSave'); if (sv) sv.addEventListener('click', function () {
      var e = $('#horE').value, s = $('#horS').value;
      if (!e || !s) { toast('Indica la hora de entrada y de salida.'); return; }
      u.horaEntrada = e; u.horaSalida = s;
      u.permisos = $$('#permList .permRow').map(function (row) {
        return { tipo: row.querySelector('.pmTipo').value, dir: row.querySelector('.pmDir').value, hora: row.querySelector('.pmHora').value, nota: row.querySelector('.pmNota').value.trim() };
      }).filter(function (p) { return p.hora || p.nota; });
      logHist(u, 'Horario de trabajo actualizado: ' + horaFmt(e) + ' – ' + horaFmt(s) + (u.permisos.length ? ' · ' + u.permisos.length + ' permiso(s)' : ''));
      saveDB(db); closeModal(); rPerfil(); toast('Horario y permisos actualizados.');
    });
  }

  function descargarPoliticasHorario() {
    var css = 'body{font-family:"Segoe UI",Arial,sans-serif;color:#1B2A4A;max-width:760px;margin:40px auto;padding:0 32px;line-height:1.6}' +
      'h1{color:#123C8C;font-size:26px;margin:0 0 4px}.sub{color:#5A6B85;font-size:14px;margin:0 0 24px}' +
      'h2{color:#123C8C;font-size:17px;margin:26px 0 6px;border-bottom:2px solid #E3ECF9;padding-bottom:5px}' +
      'ul{margin:6px 0 0;padding-left:20px}li{margin:4px 0}.tag{display:inline-block;background:#E8F3ED;color:#1F8A5B;font-weight:700;font-size:12px;padding:2px 9px;border-radius:20px}' +
      '.foot{margin-top:34px;border-top:1px solid #E3ECF9;padding-top:12px;color:#8494AD;font-size:12px}@media print{body{margin:0}}';
    var body =
      '<h1>Políticas de horario laboral</h1><p class="sub">VEPAGOS — Consultora Alca, C.A. · Capital Humano</p>' +
      '<h2>1. Jornada de trabajo</h2><ul>' +
        '<li>La jornada administrativa estándar es de <b>lunes a viernes, 8:00 a.m. a 5:00 p.m.</b></li>' +
        '<li>Algunos equipos tienen un horario de entrada a las <b>9:00 a.m.</b>, definido por la dirección y reflejado en tu perfil.</li>' +
        '<li>Tu horario específico aparece en <b>Mi perfil → Cargo → Horario de trabajo</b> y en el módulo de Asistencia.</li></ul>' +
      '<h2>2. Puntualidad y tolerancia</h2><ul>' +
        '<li>Se considera <b>llegada tarde</b> cuando se registra la entrada <b>más de 15 minutos</b> después de la hora asignada.</li>' +
        '<li>La marcación se realiza por el control de acceso y el inicio de sesión en Desk Time.</li>' +
        '<li>Las tardanzas reiteradas generan un pendiente de justificación con Capital Humano.</li></ul>' +
      '<h2>3. Hora de almuerzo</h2><ul>' +
        '<li>La jornada incluye <b>una (1) hora de almuerzo</b>.</li>' +
        '<li>El horario de almuerzo se coordina dentro de cada equipo para no dejar el área sin cobertura.</li></ul>' +
      '<h2>4. Ausencias justificadas</h2><ul>' +
        '<li>Una ausencia es <b>justificada</b> cuando existe un <b>permiso o reposo aprobado</b> que cubre el día (cita médica, reposo, permiso especial).</li>' +
        '<li>Solicita el permiso con anticipación desde <b>Solicitudes</b> y adjunta el soporte cuando aplique.</li>' +
        '<li>Las ausencias <b>sin justificativo</b> quedan registradas y pueden afectar tu evaluación.</li></ul>' +
      '<h2>5. Permisos especiales</h2><ul>' +
        '<li>Permisos recurrentes (lactancia, estudios, citas médicas periódicas) se cargan en tu perfil e indican la hora de entrada o salida.</li>' +
        '<li>El permiso de lactancia se otorga conforme a la ley y se coordina con Capital Humano.</li></ul>' +
      '<h2>6. Vacaciones</h2><ul>' +
        '<li>Las vacaciones se solicitan desde <b>Solicitudes</b> y, una vez aprobadas, se reflejan automáticamente en Asistencia como “En vacaciones”.</li>' +
        '<li>Tu saldo de días tomados y pendientes está disponible en tu perfil.</li></ul>' +
      '<div class="foot">Documento informativo del portal Somos VEPAGOS. Ante cualquier duda, contacta a Capital Humano. Generado el ' + new Date().toLocaleDateString('es-VE') + '.</div>';
    var html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Políticas de horario — VEPAGOS</title><style>' + css + '</style></head><body>' + body + '</body></html>';
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'Politicas-de-horario-VEPAGOS.html';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Políticas de horario descargadas.');
  }

  function descargarHistorial(u) {
    if (!u) return;
    var hist = u.historial || [];
    var P = function (n) { return (n < 10 ? '0' : '') + n; };
    function stamp(iso) { var d = new Date(iso); return isNaN(d) ? '' : (P(d.getDate()) + '/' + P(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + P(d.getHours()) + ':' + P(d.getMinutes())); }
    var css = 'body{font-family:"Segoe UI",Arial,sans-serif;color:#1B2A4A;max-width:760px;margin:36px auto;padding:0 32px}' +
      'h1{color:#123C8C;font-size:23px;margin:0 0 2px}.sub{color:#5A6B85;font-size:13.5px;margin:0 0 20px}' +
      'table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;text-transform:uppercase;letter-spacing:.5px;font-size:11px;color:#7C8AA0;border-bottom:2px solid #E3ECF9;padding:8px 10px}' +
      'td{padding:9px 10px;border-bottom:1px solid #EEF3F9;vertical-align:top}tr:nth-child(even) td{background:#FAFCFF}' +
      '.foot{margin-top:26px;color:#8494AD;font-size:11.5px}@media print{body{margin:0}}';
    var rows = hist.length ? hist.map(function (h) {
      return '<tr><td style="white-space:nowrap;color:#5A6B85">' + stamp(h.fecha) + '</td><td style="color:#1B2A4A">' + esc(h.texto) + '</td><td style="white-space:nowrap;color:#5A6B85">' + esc(h.por || '') + '</td></tr>';
    }).join('') : '<tr><td colspan="3" style="color:#8494AD">Sin movimientos registrados.</td></tr>';
    var body = '<h1>Historial — ' + esc(u.nombre) + '</h1><p class="sub">' + esc(u.cargo || '') + (u.area ? ' · ' + esc(u.area) : '') + ' · ' + hist.length + ' movimiento(s)</p>' +
      '<table><thead><tr><th>Fecha</th><th>Movimiento</th><th>Registrado por</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="foot">Historial exportado desde Somos VEPAGOS por ' + esc(me.nombre) + ' el ' + stamp(new Date().toISOString()) + '.</div>';
    var html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Historial ' + esc(u.nombre) + '</title><style>' + css + '</style></head><body>' + body + '</body></html>';
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'Historial - ' + String(u.nombre).replace(/[^\wáéíóúñÁÉÍÓÚÑ\- ]/g, '') + '.html';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Historial de ' + u.nombre.split(' ')[0] + ' descargado.');
  }

  function emergenciasModal() {
    var emp = (window.SV_SEED && SV_SEED.EMERGENCIA) || {};
    var poliza = {
      empresa: 'Seguros Caracas · Grupo VEPAGOS (Consultora Alca, C.A.)',
      producto: 'Póliza colectiva de HCM (Hospitalización, Cirugía y Maternidad)',
      numero: 'HCM-ALCA-2026-00417',
      cobertura: '$20.000 por persona / año',
      caracteristicas: [
        'Cobertura de emergencias, hospitalización, cirugía y maternidad.',
        'Atención en clínicas de la red nacional sin desembolso (carta aval).',
        'Emergencias cubiertas 24/7, incluye accidentes laborales.',
        'Titular + carga familiar directa registrada en Capital Humano.',
        'Baremo de emergencia activable las 24 horas por la línea de la aseguradora.'
      ],
      noCubre: ['Tratamientos estéticos no reconstructivos', 'Enfermedades preexistentes no declaradas', 'Gastos sin autorización previa fuera de emergencia']
    };
    var mePers = me;
    var pasos = [
      'Mantén la calma y evalúa si hay riesgo de vida. Si lo hay, llama primero a emergencias (911).',
      'Comunícate con la línea 24/7 de la aseguradora e indica el número de póliza para activar la carta aval.',
      'Acude a una clínica de la red; presenta tu cédula y el número de póliza.',
      'Avisa a Capital Humano lo antes posible para acompañar el caso y la carga familiar.',
      'Conserva informes y facturas para cualquier reembolso o seguimiento.'
    ];
    function sec(t, ico, col, bg) { return '<div style="display:flex;align-items:center;gap:9px;margin:16px 0 8px"><span style="width:30px;height:30px;border-radius:9px;background:' + bg + ';color:' + col + ';display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span><h3 style="margin:0;font-size:15px">' + t + '</h3></div>'; }
    function contacto(nombre, dato, sub) { return '<div style="display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid #F2F6FB"><div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy);font-size:13.5px">' + esc(nombre) + '</div>' + (sub ? '<div style="font-size:12px;color:var(--muted2)">' + esc(sub) + '</div>' : '') + '</div><a href="tel:' + esc(String(dato).replace(/[^0-9+]/g, '')) + '" style="font-weight:800;color:#FF7A1A;font-size:14px;white-space:nowrap">' + esc(dato) + '</a></div>'; }
    var rrhh = db.users.find(function (u) { return u.role === 'rrhh' && u.activo; });
    var body = '<button class="mod-x">✕</button>' +
      '<div style="display:flex;align-items:center;gap:11px;margin-bottom:4px"><span style="width:38px;height:38px;border-radius:11px;background:#FFE9D6;color:#FF7A1A;display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path></svg></span><h3 style="margin:0">Emergencias</h3></div>' +
      '<p style="color:var(--muted);font-size:14px;margin:0 0 6px">Qué hacer ante una emergencia, tu cobertura de salud y los contactos clave.</p>' +
      '<div style="background:#FFF6EE;border:1px solid #FCD9B6;border-radius:12px;padding:12px 14px;margin:10px 0"><div style="font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#C15A00;margin-bottom:2px">Emergencia con riesgo de vida</div><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><span style="color:#33415C;font-size:13.5px">Llama de inmediato a los servicios de emergencia</span><a href="tel:911" style="background:#E5484D;color:#fff;font-weight:800;border-radius:10px;padding:8px 16px;font-size:15px">911</a></div></div>' +
      sec('Qué hacer paso a paso', '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>', '#2A6FDB', '#EAF1FD') +
      '<ol style="margin:0;padding-left:20px;color:#33415C;font-size:13.8px;line-height:1.7">' + pasos.map(function (p) { return '<li style="margin-bottom:4px">' + esc(p) + '</li>'; }).join('') + '</ol>' +
      sec('Tu cobertura de salud (HCM)', '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path>', '#1F8A5B', '#E7F6EE') +
      '<div style="border:1px solid var(--line);border-radius:12px;padding:12px 14px">' +
        '<div class="prow"><span class="k" style="min-width:130px;color:var(--muted);font-weight:600">Empresa aseguradora</span><span style="flex:1;color:var(--navy);font-weight:700">' + esc(poliza.empresa) + '</span></div>' +
        '<div class="prow"><span class="k" style="min-width:130px;color:var(--muted);font-weight:600">Producto</span><span style="flex:1;color:var(--navy)">' + esc(poliza.producto) + '</span></div>' +
        '<div class="prow"><span class="k" style="min-width:130px;color:var(--muted);font-weight:600">N° de póliza</span><span style="flex:1;color:var(--navy);font-weight:700">' + esc(poliza.numero) + '</span></div>' +
        '<div class="prow"><span class="k" style="min-width:130px;color:var(--muted);font-weight:600">Suma asegurada</span><span style="flex:1;color:#00874f;font-weight:800">' + esc(poliza.cobertura) + '</span></div>' +
      '</div>' +
      '<div style="font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--muted2);margin:12px 0 6px">Qué cubre y características</div>' +
      '<div style="display:flex;flex-direction:column;gap:5px">' + poliza.caracteristicas.map(function (c) { return '<div style="display:flex;gap:9px;align-items:flex-start;font-size:13.5px;color:#33415C"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00B871" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto;margin-top:2px"><path d="M20 6L9 17l-5-5"></path></svg>' + esc(c) + '</div>'; }).join('') + '</div>' +
      '<div style="font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--muted2);margin:12px 0 6px">Qué no cubre</div>' +
      '<div style="display:flex;flex-direction:column;gap:5px">' + poliza.noCubre.map(function (c) { return '<div style="display:flex;gap:9px;align-items:flex-start;font-size:13.5px;color:#33415C"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B23A6E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto;margin-top:2px"><path d="M18 6 6 18M6 6l12 12"></path></svg>' + esc(c) + '</div>'; }).join('') + '</div>' +
      sec('Contactos de emergencia', '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"></path>', '#8A5CD1', '#F1EAFB') +
      contacto('Emergencias nacionales', '911', 'Policía · Bomberos · Ambulancia') +
      contacto('Línea 24/7 aseguradora — Seguros Caracas', '0500-2255000', 'Activación de carta aval · indica tu N° de póliza') +
      contacto('Ambulancia privada', '0212-5555911', 'Traslados de emergencia red HCM') +
      (rrhh ? contacto('Capital Humano — ' + rrhh.nombre, rrhh.telefono || '0212-0000000', 'Acompañamiento del caso') : '') +
      (mePers.emergNombre || mePers.emergTelefono ? contacto('Tu contacto personal — ' + (mePers.emergNombre || '—'), mePers.emergTelefono || '—', 'Registrado en tu perfil') : '<div style="font-size:12.5px;color:var(--muted2);margin-top:8px">Tip: registra tu contacto de emergencia personal en tu perfil para que aparezca aquí.</div>') +
      '<div class="mod-actions"><button class="btn-g mod-x" style="background:#FF7A1A">Cerrar</button></div>';
    modal(body, 'wide');
  }

  function rPerfil() { var other = !!(perfilTarget && perfilTarget.id !== me.id); rPerfilFor(perfilTarget || me, other); }
  function rPerfilFor(me, viewingOther) {
    resetContent();
    me.checklist = me.checklist || {};
    var equipoBlock = '';
    if (me.role === 'ventas') {
      var coord = me.cargaCoordId ? byId(me.cargaCoordId) : null;
      var asist = me.cargaAsistId ? byId(me.cargaAsistId) : null;
      function cargaRow(label, u) {
        return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #EEF3F9">' +
          '<div style="flex:1"><div style="font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">' + label + '</div>' +
          (u ? '<div style="font-weight:700;color:var(--navy);margin-top:2px">' + esc(u.nombre) + '</div><div style="font-size:13px;color:var(--muted)">' + esc(u.email) + (u.telefono ? ' · ' + esc(u.telefono) : '') + '</div>'
             : '<div style="font-size:14px;color:var(--muted);margin-top:2px">Pendiente de asignación</div>') +
          '</div>' + (u ? '<span class="chip g">Asignado</span>' : '<span class="chip y">Pendiente</span>') + '</div>';
      }
      var subs = db.subvendedores.filter(function (s) { return s.ownerId === me.id; });
      var principal = me.vendedorPrincipalId ? byId(me.vendedorPrincipalId) : null;
      var alm = me.almacenes || [];
      var principalRow = '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #EEF3F9">' +
        '<div style="flex:1"><div style="font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Vendedor principal</div>' +
        (principal ? '<div style="font-weight:700;color:var(--navy);margin-top:2px">' + esc(principal.nombre) + '</div><div style="font-size:13px;color:var(--muted)">' + esc(principal.email) + (principal.telefono ? ' · ' + esc(principal.telefono) : '') + '</div>'
                   : '<div style="font-size:14px;color:var(--muted);margin-top:2px">No aplica — eres vendedor principal</div>') +
        '</div>' + (principal ? '<span class="chip n">Subvendedor</span>' : '<span class="chip g">Principal</span>') + '</div>';
      equipoBlock =
        '<div class="card" style="max-width:640px;margin-top:16px"><h3>Tu equipo de carga</h3>' +
        '<div class="note" style="margin-bottom:4px">Las personas encargadas de tus cargas. Las asigna tu gerente de Fuerza de Ventas.</div>' +
        cargaRow('Coordinador de carga', coord) + cargaRow('Asistente de carga', asist) + principalRow + '</div>' +
        '<div class="card" style="max-width:560px;margin-top:16px"><h3>Almacenes asignados</h3>' +
        '<div class="note" style="margin-bottom:8px">Almacenes autorizados para tus cargas. Los asigna tu gerente.</div>' +
        (alm.length ? '<div style="display:flex;flex-wrap:wrap;gap:8px">' + alm.map(function (a) { return '<span class="chip g">' + esc(a) + '</span>'; }).join('') + '</div>' : '<div class="empty">Aún no tienes almacenes asignados.</div>') + '</div>' +
        '<div class="card" style="max-width:560px;margin-top:16px"><div class="toolrow"><h3 style="margin:0">Mis vendedores</h3><span class="sp"></span><button class="btn-g" id="btnAddSub">Reportar vendedor</button></div>' +
        '<div class="note" style="margin-bottom:6px">Si tienes vendedores por debajo de ti, repórtalos aquí. VEPAGOS debe autorizar el acceso a almacenes para cada uno.</div>' +
        (subs.length ? subs.map(function (s) {
          return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #EEF3F9">' +
            '<div style="flex:1"><div style="font-weight:700;color:var(--navy)">' + esc(s.nombre) + '</div><div style="font-size:13px;color:var(--muted)">C.I. ' + esc(s.cedula) + ' · ' + esc(s.telefono) + '</div></div>' +
            (s.estado === 'autorizado' ? '<span class="chip g">Almacén autorizado</span>' : '<span class="chip y">En espera de autorización</span>') + '</div>';
        }).join('') : '<div class="empty">Aún no has reportado vendedores.</div>') + '</div>';
    }
    var activosCard = '<div class="card" style="max-width:640px;margin-top:16px"><h3>Tus activos fijos</h3><div class="note" style="margin:2px 0 4px">Equipos y bienes bajo tu responsabilidad, incluida la entrega de tu ingreso. Los gestiona Capital Humano.</div>' + activosHtml(me.id) + '</div>' + reqCardHtml(me, false);
    var cargoCard = '<div class="card" style="max-width:640px;margin-top:16px"><h3>Tu cargo</h3>' +
      '<div style="font-size:20px;font-weight:800;color:var(--navy);letter-spacing:-.3px;margin-top:2px">' + esc(me.cargo || 'Sin cargo asignado') + '</div>' +
      (me.ingreso ? '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px;font-size:13.5px"><span style="color:var(--muted)">Ingreso: <b style="color:var(--navy)">' + fechaCorta(me.ingreso) + '</b></span><span style="color:var(--muted)">Antigüedad: <b style="color:var(--navy)">' + antiguedadTxt(me) + '</b></span></div>' : '') +
      roleInfoHtml(me, true) +
      '<div style="border-top:1px solid #EEF3F9;margin-top:14px;padding-top:14px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
          '<div><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Horario de trabajo</div>' +
          '<div style="font-size:18px;font-weight:800;color:var(--navy);margin-top:3px">' + horarioTxt(me) + '</div>' +
          '<div class="note" style="margin-top:2px">' + (horarioDe(me).custom ? 'Horario personalizado' : 'Horario estándar de oficina') + '</div></div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn-s" id="pfHorPol"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"></path></svg>Políticas de horario</button>' +
          (adminEsViewer() ? '<button class="btn-s" id="pfHorEdit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>Modificar horario</button>' : '') +
          '</div>' +
        '</div>' +
        (permisosActivos(me).length ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">' + permisosActivos(me).map(function (p) { return '<span class="chip" style="background:#F1EAFB;color:#8A5CD1">' + esc(permisoTxt(p)) + '</span>'; }).join('') + '</div>' : '') +
        (!adminEsViewer() ? '<div class="note" style="margin-top:8px">Solo el administrador puede modificar tu horario.</div>' : '') +
      '</div>' +
    '</div>';
    var sup = me.managerId ? byId(me.managerId) : null;
    var supCard = '<div class="card" style="max-width:640px;margin-top:16px"><h3>Tu supervisor inmediato</h3>' +
      (sup
        ? '<div class="prof" style="margin-top:4px;flex-wrap:wrap;gap:12px">' + avatarHtml(sup, 44, 15) + '<div style="flex:1;min-width:160px"><div class="pn">' + esc(sup.nombre) + '</div><div class="pc">' + esc(sup.cargo) + '</div></div><button class="btn-s" data-supprof="' + sup.id + '">Ver tarjeta de contacto</button></div>'
        : '<div class="empty">Aún no tienes un supervisor asignado.</div>') + '</div>';
    var locked = viewingOther ? false : (me.perfilBloqueado && me.role !== 'admin');
    var dis = locked ? ' disabled' : '';

    var tabs = [{ id: 'resumen', t: 'Resumen' }, { id: 'induccion', t: 'Onboarding' }, { id: 'datos', t: 'Datos personales' }, { id: 'cargo', t: 'Cargo' }, { id: 'activos', t: 'Activos' }, { id: 'herramientas', t: 'Herramientas' }, { id: 'historial', t: 'Historial' }];
    if (me.role === 'ventas') tabs.push({ id: 'equipo', t: 'Mi equipo' });
    if (!tabs.some(function (t) { return t.id === perfilTab; })) perfilTab = 'resumen';

    var prog = db.progreso[me.id] || {};
    var cmods = (ONB[myOnboardingKey()] || ONB.interno).modulos;
    var cForm = cmods.map(function (m) { return { label: m.t, done: !!prog[m.id], type: 'ind' }; });
    cForm.push({ label: 'Foto profesional', done: !!me.foto, type: 'foto' });
    var cAdmin = [{ label: 'Email corporativo listo', key: 'emailCorp' }, { label: 'Firma de email configurada', key: 'firma' }, { label: 'Carnet institucional entregado', key: 'carnet' }, { label: 'Huella registrada', key: 'huella' }, { label: 'Firma de contrato', key: 'contrato' }, { label: 'Entrega de documentos', key: 'documentos' }].map(function (x) { return { label: x.label, done: !!me.checklist[x.key], type: 'manual', key: x.key }; });
    var cAll = cForm.concat(cAdmin);
    var cDone = cAll.filter(function (i) { return i.done; }).length;
    var cPct = Math.round(cDone / cAll.length * 100);
    var chkSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>';
    function chkRow(it) {
      var box = '<span class="clk-box' + (it.done ? ' on' : '') + '">' + (it.done ? chkSvg : '') + '</span>';
      var right = it.type === 'ind' ? (it.done ? '<span class="chip g">Completada</span>' : '<button class="btn-s" data-goind style="font-size:12px;padding:5px 11px">Empezar</button>')
        : it.type === 'foto' ? (it.done ? '<span class="chip g">Lista</span>' : '<button class="btn-s" data-gofoto style="font-size:12px;padding:5px 11px">Subir</button>')
        : (it.done ? '<span class="chip g">Confirmado</span>' : '<span class="chip n">Pendiente</span>');
      return '<div class="chkrow' + (it.done ? ' done' : '') + '">' + box + '<div style="flex:1"><div class="chk-t">' + it.label + '</div></div>' + right + '</div>';
    }
    var checklistCard = '<div class="card" style="max-width:640px;margin-top:16px">' +
      '<div class="toolrow"><h3 style="margin:0">Tu checklist de inducción</h3><span class="sp"></span><span style="font-weight:800;color:var(--navy);font-size:15px">' + cDone + '/' + cAll.length + '</span></div>' +
      '<div class="note" style="margin:2px 0 10px">Todo lo que necesitas para estar 100% listo en VEPAGOS.</div>' +
      '<div class="progress"><i style="width:' + cPct + '%"></i></div>' +
      '<div style="font-size:12.5px;color:' + (cPct === 100 ? '#00874f' : 'var(--muted2)') + ';margin-top:7px;font-weight:700">' + (cPct === 100 ? '¡Completaste tu inducción!' : cPct + '% completado') + '</div>' +
      '<div class="chk-h">Formación e inducción</div>' + cForm.map(chkRow).join('') +
      '<div class="chk-h">Trámites administrativos</div>' +
      '<div class="note" style="margin:-4px 0 8px;font-size:12px">Estos los confirma Capital Humano durante tu acompañamiento, a medida que se van cumpliendo.</div>' +
      cAdmin.map(chkRow).join('') +
      '</div>';

    var datosCard = '<div class="card" style="max-width:640px;margin-top:16px"><h3>Datos de contacto</h3>' +
      '<div class="note" style="margin:2px 0 10px">Usa la misma foto de tu LinkedIn para mantener coherencia.</div>' +
      '<div class="fld"><label>Correo</label><input id="pfE" type="email" value="' + esc(me.email) + '" disabled></div>' +
      '<div class="fld"><label>Teléfono</label><input id="pfT" type="tel" value="' + esc(me.telefono) + '"' + dis + '></div>' +
      '<div class="fld"><label>LinkedIn</label><input id="pfL" type="url" value="' + esc(me.linkedin) + '"' + dis + '></div>' +
      '<div class="fld"><label>Ciudad</label><input id="pfC" type="text" value="' + esc(me.ciudad) + '"' + dis + '></div>' +
      '<div class="fld"><label>Cumpleaños</label>' + (locked
        ? '<input type="text" value="' + esc(me.cumple ? cumpleTxt(me.cumple) : 'No indicado') + '" disabled>'
        : '<input id="pfB" type="date" value="' + (me.cumple ? '2000-' + me.cumple : '') + '">') + '</div>' +
      '<div style="margin:14px 0 8px;font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2)">Contacto de emergencia</div>' +
      '<div class="fld"><label>Persona de contacto</label><input id="pfEmN" type="text" value="' + esc(me.emergNombre || '') + '"' + dis + ' placeholder="Nombre y parentesco (ej: Ana Pérez — esposa)"></div>' +
      '<div class="fld"><label>Número de emergencia</label><input id="pfEmT" type="tel" value="' + esc(me.emergTelefono || '') + '"' + dis + ' placeholder="0412-0000000"></div>' +
      (locked
        ? '<div class="note" style="margin-top:2px">Tus datos están protegidos. Para modificarlos, envía una solicitud al administrador.</div><div class="mod-actions" style="justify-content:flex-start"><button class="btn-s" id="pfReq">Solicitar cambio de datos</button></div>'
        : '<div class="note" style="margin-top:2px">Al completar y guardar tus datos quedarán protegidos. Después, cualquier cambio requiere una solicitud de modificación.</div><div class="mod-actions" style="justify-content:flex-start"><button class="btn-g" id="pfOk">Guardar cambios</button></div>') + '</div>';

    var herrList = me.herramientas || [];
    var accFrec = me.accesosFrec || [];
    var TOOL_META = {
      app: { label: 'Aplicativo interno', ico: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect>', color: '#00B871', bg: 'rgba(0,184,113,.12)' },
      ext: { label: 'Aplicativo externo', ico: '<circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"></path>', color: '#7C5CFC', bg: 'rgba(124,92,252,.12)' },
      drive: { label: 'Drive autorizado', ico: '<path d="M6 2 2 9l4 7h8l4-7-4-7z"></path><path d="M2 9h20"></path><path d="m6 2 4 7"></path>', color: '#2A6FDB', bg: 'rgba(42,111,219,.12)' },
      link: { label: 'Aplicativo externo', ico: '<circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"></path>', color: '#7C5CFC', bg: 'rgba(124,92,252,.12)' }
    };
    function tmeta(t) { return TOOL_META[t.tipo] || TOOL_META.link; }
    function toolRow(t) {
      var m2 = tmeta(t), openable = t.url && t.url !== '#', fav = accFrec.indexOf(t.id) > -1;
      return '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #EEF3F9">' +
        '<input type="checkbox" data-fav="' + t.id + '"' + (fav ? ' checked' : '') + ' title="Marcar como acceso frecuente (máx 3)" style="width:18px;height:18px;accent-color:#00CE7C;margin:0;flex:0 0 auto;cursor:pointer">' +
        '<span style="width:40px;height:40px;border-radius:11px;background:' + m2.bg + ';color:' + m2.color + ';display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + m2.ico + '</svg></span>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--navy)">' + esc(t.nombre) + (fav ? ' <span class="chip g" style="vertical-align:1px">Frecuente</span>' : '') + '</div><div style="font-size:12.5px;color:var(--muted)">' + m2.label + '</div></div>' +
        (openable ? '<a href="' + esc(t.url) + '" target="_blank" rel="noopener" class="chip g" style="text-decoration:none">Abrir →</a>' : '<span class="chip n">Próximamente</span>') +
      '</div>';
    }
    var favList = accFrec.map(function (id) { return herrList.find(function (t) { return t.id === id; }); }).filter(Boolean);
    var frecCard = '<div class="card" style="max-width:640px;margin-top:16px">' +
      '<div class="toolrow"><h3 style="margin:0">Accesos frecuentes</h3><span class="sp"></span><span class="chip ' + (favList.length >= 3 ? 'y' : 'n') + '">' + favList.length + '/3</span></div>' +
      '<div class="note" style="margin:2px 0 10px">Tus accesos directos. Marca hasta 3 con el check en la lista de abajo; también aparecen en el menú lateral.</div>' +
      (favList.length ? '<div style="display:flex;flex-wrap:wrap;gap:10px">' + favList.map(function (t) {
        var m2 = tmeta(t), openable = t.url && t.url !== '#';
        return '<a href="' + esc(openable ? t.url : '#') + '"' + (openable ? ' target="_blank" rel="noopener"' : '') + ' style="display:flex;align-items:center;gap:10px;border:1.5px solid ' + m2.color + '40;background:' + m2.bg + ';border-radius:12px;padding:11px 15px;text-decoration:none;min-width:170px">' +
          '<span style="color:' + m2.color + ';flex:0 0 auto"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + m2.ico + '</svg></span>' +
          '<span style="font-weight:700;color:var(--navy);font-size:14px">' + esc(t.nombre) + '</span></a>';
      }).join('') + '</div>' : '<div class="empty" style="padding:12px">Aún no eliges accesos frecuentes. Marca el check en tus herramientas.</div>') +
    '</div>';
    var herrCard = frecCard + '<div class="card" style="max-width:640px;margin-top:16px"><h3>Tus herramientas</h3>' +
      '<div class="note" style="margin:2px 0 10px">Aplicativos internos, aplicativos externos y drives autorizados por VEPAGOS. Marca hasta 3 como accesos frecuentes. Los asigna Capital Humano, tu gerente o el administrador.</div>' +
      (herrList.length ? (function () {
        var groups = [
          { t: 'Aplicativos internos', match: function (x) { return (x.tipo || 'link') === 'app'; } },
          { t: 'Aplicativos externos', match: function (x) { return x.tipo === 'ext' || x.tipo === 'link' || (!x.tipo); } },
          { t: 'Drives autorizados', match: function (x) { return x.tipo === 'drive'; } }
        ];
        return groups.map(function (grp) {
          var items = herrList.filter(grp.match);
          if (!items.length) return '';
          return '<div style="margin-top:6px"><div style="font-size:11.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted2);margin:10px 0 2px">' + grp.t + '</div>' + items.map(toolRow).join('') + '</div>';
        }).join('');
      })() : '<div class="empty">Aún no tienes herramientas asignadas. Tu equipo te las irá agregando.</div>') + '</div>';

    var histItems = (me.historial || []);
    function histTime(iso) {
      var d = new Date(iso); var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }
    var histCard = '<div class="card" style="max-width:640px;margin-top:16px"><div class="toolrow" style="margin:0 0 4px"><h3 style="margin:0">Historial del perfil</h3><span class="sp"></span>' +
      (adminEsViewer() && histItems.length ? '<button class="btn-s" id="pfHistDl" data-histuid="' + me.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5M12 15V3"></path></svg>Descargar historial</button>' : '') + '</div>' +
      '<div class="note" style="margin:2px 0 12px">Registro de cambios y actualizaciones de tu perfil: datos, foto, herramientas, contrato, activos y trámites.</div>' +
      (histItems.length ? '<div style="position:relative;padding-left:20px">' +
        '<div style="position:absolute;left:5px;top:4px;bottom:4px;width:2px;background:#E6ECF4"></div>' +
        histItems.map(function (h) {
          return '<div style="position:relative;padding:0 0 14px 0"><span style="position:absolute;left:-19px;top:3px;width:10px;height:10px;border-radius:50%;background:var(--green);border:2px solid #fff;box-shadow:0 0 0 1px #CDE9DA"></span>' +
            '<div style="font-size:13.5px;color:var(--navy);font-weight:600">' + esc(h.texto) + '</div>' +
            '<div style="font-size:12px;color:var(--muted2);margin-top:1px">' + histTime(h.fecha) + ' · ' + esc(h.por) + '</div></div>';
        }).join('') + '</div>'
        : '<div class="empty">Aún no hay movimientos registrados en tu perfil.</div>') + '</div>';

    var supR = me.managerId ? byId(me.managerId) : null;
    function pfHead(ico, bg, col, t, tab, action) { return '<div class="pf-ch"><span class="ic" style="background:' + bg + ';color:' + col + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg></span><h3>' + t + '</h3><span class="sp"></span>' + (action ? '<button class="btn-s" data-gototab="' + tab + '" style="font-size:12px;padding:6px 12px">' + action + '</button>' : '') + '</div>'; }
    function pfLine(k, v) { return '<div class="pf-line"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
    var resumenDatos = '<div class="pf-card">' + pfHead('<rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-10 6L2 7"></path>', '#EAF1FD', '#2A6FDB', 'Datos de contacto', 'datos', 'Editar') +
      pfLine('Correo', esc(me.email)) + pfLine('Teléfono', esc(me.telefono || '—')) + pfLine('Ciudad', esc(me.ciudad || '—')) +
      pfLine('Cumpleaños', me.cumple ? esc(cumpleTxt(me.cumple)) : '—') +
      pfLine('Emergencia', me.emergNombre ? esc(me.emergNombre) + (me.emergTelefono ? ' · ' + esc(me.emergTelefono) : '') : '<span style="color:var(--muted2);font-weight:500">Sin registrar</span>') +
    '</div>';
    var resumenCargo = '<div class="pf-card">' + pfHead('<rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>', '#E7F6EE', '#1F8A5B', 'Cargo y supervisor', 'cargo', 'Ver') +
      '<div style="font-size:18px;font-weight:800;color:var(--navy);letter-spacing:-.3px">' + esc(me.cargo || 'Sin cargo asignado') + '</div>' +
      '<div class="note" style="margin:2px 0 10px">' + esc(me.area || '') + '</div>' +
      (me.ingreso ? '<div style="display:flex;gap:14px;flex-wrap:wrap;padding:8px 0 10px;font-size:13px"><span style="color:var(--muted)">Ingreso: <b style="color:var(--navy)">' + fechaCorta(me.ingreso) + '</b></span><span style="color:var(--muted)">Antigüedad: <b style="color:var(--navy)">' + antiguedadTxt(me) + '</b></span></div>' : '') +
      '<div style="display:flex;align-items:center;gap:9px;border-top:1px solid #F2F6FB;padding:11px 0;margin-bottom:1px"><span style="width:34px;height:34px;border-radius:10px;background:#EAF1FD;color:#2A6FDB;display:flex;align-items:center;justify-content:center;flex:0 0 auto"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span><div><div style="font-size:10.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2)">Horario de trabajo</div><div style="font-weight:700;color:var(--navy);font-size:14px">' + horarioTxt(me) + '</div></div></div>' +
      (supR ? '<div style="display:flex;align-items:center;gap:11px;border-top:1px solid #F2F6FB;padding-top:12px">' + avatarHtml(supR, 40, 14) + '<div style="min-width:0"><div style="font-size:10.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted2)">Supervisor</div><div style="font-weight:700;color:var(--navy);font-size:14px">' + esc(supR.nombre) + '</div><div style="font-size:12.5px;color:var(--muted)">' + esc(supR.cargo) + '</div></div></div>' : '<div class="note" style="border-top:1px solid #F2F6FB;padding-top:12px">Sin supervisor asignado.</div>') +
    '</div>';
    var resumenInd = '<div class="pf-card">' + pfHead('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>', '#E7FAF1', '#00874f', 'Tu onboarding', 'induccion', cPct === 100 ? 'Repasar' : 'Continuar') +
      '<div style="display:flex;align-items:center;gap:12px"><div class="progress" style="flex:1"><i style="width:' + cPct + '%"></i></div><b style="color:var(--navy);white-space:nowrap">' + cDone + '/' + cAll.length + '</b></div>' +
      '<div style="font-size:12.5px;color:' + (cPct === 100 ? '#00874f' : 'var(--muted2)') + ';margin-top:9px;font-weight:700">' + (cPct === 100 ? '¡Inducción completa! 🎉' : cPct + '% completado') + '</div>' +
    '</div>';
    var resumenAcc = '<div class="pf-card">' + pfHead('<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect>', '#F1EAFB', '#8A5CD1', 'Accesos frecuentes', 'herramientas', 'Gestionar') +
      (favList.length ? '<div style="display:flex;flex-wrap:wrap;gap:9px">' + favList.map(function (t) {
        var m2 = tmeta(t), openable = t.url && t.url !== '#';
        return '<a href="' + esc(openable ? t.url : '#') + '"' + (openable ? ' target="_blank" rel="noopener"' : '') + ' style="display:flex;align-items:center;gap:9px;border:1.5px solid ' + m2.color + '40;background:' + m2.bg + ';border-radius:11px;padding:9px 13px;text-decoration:none"><span style="color:' + m2.color + '"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + m2.ico + '</svg></span><span style="font-weight:700;color:var(--navy);font-size:13.5px">' + esc(t.nombre) + '</span></a>';
      }).join('') + '</div>' : '<div class="note">Aún no eliges accesos frecuentes. Ve a Herramientas y marca hasta 3.</div>') +
    '</div>';
    var ultMovs = (me.historial || []).slice(0, 3);
    var resumenHist = '<div class="pf-card">' + pfHead('<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>', '#EEF2F8', '#334', 'Últimos movimientos', 'historial', 'Ver todo') +
      (ultMovs.length ? ultMovs.map(function (h) { return '<div style="display:flex;gap:11px;padding:8px 0;border-bottom:1px solid #F2F6FB"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);margin-top:6px;flex:0 0 auto;box-shadow:0 0 0 4px rgba(0,206,124,.14)"></span><div style="flex:1"><div style="font-size:13.5px;color:var(--navy);font-weight:600;line-height:1.4">' + esc(h.texto) + '</div><div style="font-size:12px;color:var(--muted2);margin-top:1px">' + histTime(h.fecha) + '</div></div></div>'; }).join('') : '<div class="note">Sin movimientos recientes.</div>') +
    '</div>';
    var resumenCard =
      '<div class="pf-grid">' + resumenDatos + resumenCargo + '</div>' +
      '<div class="pf-grid">' + resumenInd + resumenAcc + '</div>' +
      '<div style="margin-top:16px">' + resumenHist + '</div>';

    var tabBody = perfilTab === 'resumen' ? resumenCard
      : perfilTab === 'induccion' ? checklistCard
      : perfilTab === 'datos' ? datosCard
      : perfilTab === 'cargo' ? (supCard + cargoCard)
      : perfilTab === 'activos' ? activosCard
      : perfilTab === 'herramientas' ? herrCard
      : perfilTab === 'historial' ? histCard
      : equipoBlock;

    var TAB_ICO = {
      resumen: '<path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 14h7v7H3z"></path>',
      induccion: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>',
      datos: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a8 8 0 0 1 16 0v1"></path>',
      cargo: '<rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
      activos: '<rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path>',
      herramientas: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.1-2.1z"></path>',
      historial: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
      equipo: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>'
    };
    var heroAva = me.foto ? '<img class="pf-ava" src="' + esc(me.foto) + '" alt="">' : '<div class="pf-ava">' + initials(me.nombre) + '</div>';
    var heroBadges = '<span class="pf-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>' + esc(ROLE_LABEL[me.role]) + '</span>' +
      (me.area ? '<span class="pf-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path></svg>' + esc(me.area) + '</span>' : '') +
      (me.ingreso ? '<span class="pf-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M8 2v4M16 2v4M3 10h18"></path></svg>Desde ' + fechaCorta(me.ingreso) + '</span>' : '');

    $('#content').innerHTML =
      (viewingOther ? '<div style="margin-bottom:12px;display:flex;align-items:center;gap:10px"><button class="btn-s" id="pfBack"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>Volver al directorio</button><span style="color:var(--muted2);font-size:13px">Estás viendo el perfil de <b style="color:var(--navy)">' + esc(me.nombre) + '</b></span></div>' : '') +
      '<div class="pf-hero">' +
        '<div class="pf-avawrap">' + heroAva + '<button class="pf-cam" id="pfFoto" title="' + (me.foto ? 'Cambiar foto' : 'Subir foto') + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></button></div>' +
        '<div class="pf-id"><div class="pf-name">' + esc(me.nombre) + '</div><div class="pf-role">' + esc(me.cargo || 'Sin cargo asignado') + '</div><div class="pf-badges">' + heroBadges + '</div></div>' +
        '<button id="pfEmerg" style="position:relative;z-index:2;align-self:flex-start;display:inline-flex;align-items:center;gap:8px;background:#FF7A1A;color:#fff;border:none;border-radius:12px;padding:11px 16px;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 6px 16px rgba(255,122,26,.35)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path></svg>Emergencias</button>' +
      '</div>' +
      '<div class="pf-tabs">' + tabs.map(function (t) { return '<button class="pf-tab' + (t.id === perfilTab ? ' on' : '') + '" data-tab="' + t.id + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (TAB_ICO[t.id] || '') + '</svg>' + t.t + '</button>'; }).join('') + '</div>' +
      tabBody;

    if (viewingOther) { $('#pageTitle').textContent = me.nombre; var bk = $('#pfBack'); if (bk) bk.addEventListener('click', function () { perfilTarget = null; go('directorio'); }); }
    $$('#content .pf-tab').forEach(function (b) { b.addEventListener('click', function () { perfilTab = b.getAttribute('data-tab'); rPerfil(); }); });
    $$('#content [data-gototab]').forEach(function (b) { b.addEventListener('click', function () { perfilTab = b.getAttribute('data-gototab'); rPerfil(); }); });
    var horBtn = $('#pfHorEdit');
    if (horBtn) horBtn.addEventListener('click', function () { openHorarioModal(me); });
    var polBtn = $('#pfHorPol');
    if (polBtn) polBtn.addEventListener('click', descargarPoliticasHorario);
    var histDl = $('#pfHistDl');
    if (histDl) histDl.addEventListener('click', function () { descargarHistorial(byId(+histDl.getAttribute('data-histuid'))); });
    $$('#content [data-fav]').forEach(function (cb) { cb.addEventListener('change', function () {
      var id = +cb.getAttribute('data-fav');
      me.accesosFrec = me.accesosFrec || [];
      var i = me.accesosFrec.indexOf(id);
      if (i > -1) { me.accesosFrec.splice(i, 1); }
      else { if (me.accesosFrec.length >= 3) { cb.checked = false; toast('Puedes elegir un máximo de 3 accesos frecuentes.'); return; } me.accesosFrec.push(id); }
      saveDB(db); renderShell(); rPerfil();
    }); });
    $$('#content [data-chk]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-chk'); me.checklist[k] = !me.checklist[k]; saveDB(db); rPerfil(); }); });
    $$('#content [data-goind]').forEach(function (b) { b.addEventListener('click', function () { go('onboarding'); }); });
    var sp = $('#content [data-supprof]'); if (sp) sp.addEventListener('click', function () { profileModal(byId(+sp.getAttribute('data-supprof'))); });
    var ecb = $('#content [data-editcargo]'); if (ecb) ecb.addEventListener('click', function () { editCargoModal(me); });
    var gf = $('#content [data-gofoto]'); if (gf) gf.addEventListener('click', function () { pickPhoto(function (d) { me.foto = d; logHist(me, 'Foto de perfil actualizada'); saveDB(db); renderShell(); rPerfil(); toast('Foto de perfil actualizada.'); }); });
    var ok = $('#pfOk');
    if (ok) ok.addEventListener('click', function () {
      me.telefono = $('#pfT').value.trim(); me.linkedin = $('#pfL').value.trim(); me.ciudad = $('#pfC').value.trim();
      me.emergNombre = ($('#pfEmN') || {}).value ? $('#pfEmN').value.trim() : me.emergNombre;
      me.emergTelefono = ($('#pfEmT') || {}).value ? $('#pfEmT').value.trim() : me.emergTelefono;
      var b = $('#pfB'); if (b && b.value) me.cumple = b.value.slice(5);
      logHist(me, 'Actualizó sus datos personales', me.nombre);
      if (me.role === 'admin') { saveDB(db); toast('Perfil actualizado.'); return; }
      var completo = me.telefono && me.linkedin && me.ciudad;
      if (completo) {
        me.perfilBloqueado = true; saveDB(db); rPerfil();
        toast('Datos guardados y protegidos. Para futuros cambios, solicita una modificación.');
      } else {
        saveDB(db);
        toast('Datos guardados. Complétalos todos para protegerlos; luego los cambios requerirán solicitud.');
      }
    });
    var rq = $('#pfReq');
    if (rq) rq.addEventListener('click', function () {
      modal('<button class="mod-x">✕</button><h3>Solicitar cambio de datos</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">Describe qué dato quieres cambiar y el valor nuevo. El administrador procesará tu solicitud.</p>' +
        '<div class="fld"><label>Solicitud</label><textarea id="sqT" rows="3" style="width:100%;border:1.5px solid #D9E2EF;border-radius:10px;padding:10px 12px;font-family:inherit;font-size:14px;resize:vertical" placeholder="Ej: Cambiar mi teléfono a 0414-1234567"></textarea></div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="sqOk">Enviar solicitud</button></div>');
      $('#sqOk').addEventListener('click', function () {
        var t = $('#sqT').value.trim(); if (!t) return;
        db.solicitudes.push({ id: db.nextSolId++, userId: me.id, texto: t, fecha: new Date().toISOString().slice(0, 10), estado: 'pendiente' });
        logHist(me, 'Envió una solicitud de cambio de datos');
        saveDB(db); closeModal(); toast('Solicitud enviada al administrador.');
      });
    });
    $('#pfFoto').addEventListener('click', function () {
      pickPhoto(function (dataUrl) {
        me.foto = dataUrl; logHist(me, 'Foto de perfil actualizada'); saveDB(db); renderShell(); rPerfil(); toast('Foto de perfil actualizada.');
      });
    });
    var eb2 = $('#pfEmerg'); if (eb2) eb2.addEventListener('click', emergenciasModal);
    var myAv = document.querySelector('#content .prof .avatar');
    if (me.foto && myAv) {
      myAv.style.cursor = 'zoom-in';
      myAv.title = 'Ver foto en grande';
      myAv.addEventListener('click', function () { photoZoom(me); });
    }
    var addSub = $('#btnAddSub');
    if (addSub) addSub.addEventListener('click', function () {
      modal('<button class="mod-x">✕</button><h3>Reportar vendedor</h3><p style="color:var(--muted);font-size:14px;margin:4px 0 8px">VEPAGOS revisará el reporte y autorizará su acceso a almacenes. Todos los campos son obligatorios.</p>' +
        '<div class="fld"><label>Nombre completo *</label><input id="svN" type="text" required></div>' +
        '<div class="fld"><label>Cédula *</label><div style="display:flex;gap:8px"><span style="display:flex;align-items:center;justify-content:center;min-width:44px;border:1.5px solid #D9E2EF;border-radius:10px;background:#F6F9FC;font-weight:800;color:var(--navy)">V-</span><input id="svC" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="12345678" maxlength="9" style="flex:1" required></div></div>' +
        '<div class="fld"><label>Teléfono *</label><div style="display:flex;gap:8px"><select id="svTP" style="width:110px;flex:0 0 auto"><option>0412</option><option>0414</option><option>0424</option><option>0416</option><option>0426</option><option>0212</option></select><input id="svT" type="tel" inputmode="numeric" pattern="[0-9]*" placeholder="0000000" maxlength="7" style="flex:1" required></div></div>' +
        '<div class="mod-actions"><button class="btn-s" onclick="document.getElementById(\'modalHost\').innerHTML=\'\'">Cancelar</button><button class="btn-g" id="svOk">Reportar</button></div>');
      $('#svC').addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); });
      $('#svT').addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); });
      $('#svOk').addEventListener('click', function () {
        var n = $('#svN').value.trim(), c = $('#svC').value.trim(), t = $('#svT').value.trim();
        if (!n) { toast('El nombre es obligatorio.'); return; }
        if (c.length < 6) { toast('Ingresa una cédula válida (solo números).'); return; }
        if (t.length !== 7) { toast('El teléfono debe tener 7 dígitos después del prefijo.'); return; }
        db.subvendedores.push({ id: db.nextSubId++, ownerId: me.id, nombre: n, cedula: 'V-' + c, telefono: $('#svTP').value + '-' + t, estado: 'pendiente', fecha: new Date().toISOString().slice(0, 10) });
        saveDB(db); closeModal(); rPerfil(); toast('Vendedor reportado. Queda en espera de autorización.');
      });
    });
  }

  /* ---------- init ---------- */
  renderLoginChips();
  $('#viewApp').classList.remove('on'); $('#viewLogin').style.display = 'grid';
})();
