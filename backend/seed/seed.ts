/**
 * Seed script — carga el esquema y los datos de datos/*.json en MySQL.
 * Ejecutar: npm run seed
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
  charset: 'utf8mb4' as const,
};

const DATOS_DIR = path.join(__dirname, '..', '..', 'datos');

async function seed() {
  console.log('🔄 Conectando a MySQL...');
  const conn = await mysql.createConnection(DB_CONFIG);

  // 1. Ejecutar esquema
  console.log('📋 Creando esquema...');
  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  await conn.query(schemaSql);
  await conn.query('USE intranet_vepagos');
  console.log('   ✅ Esquema creado');

  // 2. Cargar perfiles
  console.log('👤 Cargando perfiles...');
  const perfilesData = JSON.parse(fs.readFileSync(path.join(DATOS_DIR, 'perfiles.json'), 'utf-8'));

  // Insert perfiles without base_key first (to avoid FK issues)
  const perfilesNoBases = perfilesData.perfiles.filter((p: any) => !p.base);
  const perfilesConBases = perfilesData.perfiles.filter((p: any) => p.base);

  for (const [i, p] of perfilesNoBases.entries()) {
    await conn.execute(
      'INSERT IGNORE INTO perfiles (`key`, label, base_key, orden) VALUES (?, ?, NULL, ?)',
      [p.key, p.label, i + 1]
    );
  }
  for (const [i, p] of perfilesConBases.entries()) {
    await conn.execute(
      'INSERT IGNORE INTO perfiles (`key`, label, base_key, orden) VALUES (?, ?, ?, ?)',
      [p.key, p.label, p.base, perfilesNoBases.length + i + 1]
    );
  }
  console.log(`   ✅ ${perfilesData.perfiles.length} perfiles cargados`);

  // 3. Cargar permisos catálogo
  console.log('🔐 Cargando catálogo de permisos...');
  const permNavMap: Record<string, string> = {
    procuraVer: 'activos', procuraCrear: 'activos', procuraAprobar: 'activos',
    procuraOrden: 'activos', procuraRecibir: 'activos',
    almacenVer: 'activos', almacenMover: 'activos', almacenCrear: 'activos',
    activosGestionar: 'activos',
    verContratos: 'contratos', verEmpleados: 'empleados',
    verEncuestas: 'encuestas', notifEquipo: 'solequipo',
  };
  for (const p of perfilesData.permisos) {
    await conn.execute(
      'INSERT IGNORE INTO permisos_catalogo (clave, grupo, label, descripcion, nav) VALUES (?, ?, ?, ?, ?)',
      [p.clave, p.grupo, p.label, p.desc, permNavMap[p.clave] || null]
    );
  }
  console.log(`   ✅ ${perfilesData.permisos.length} permisos cargados`);

  // 4. Cargar pantallas (menú items) desde la definición NAV del prototipo
  console.log('📺 Cargando pantallas (menú)...');
  const NAV_ITEMS = [
    { id: 'inicio', g: 'personal', t: 'Inicio', orden: 1, ico: '<path d="M3 10.5L12 3l9 7.5"></path><path d="M5 9.5V21h14V9.5"></path>' },
    { id: 'metas', g: 'personal', t: 'Metas', orden: 2, ico: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle>' },
    { id: 'somos', g: 'personal', t: 'Somos VEPAGOS', orden: 3, ico: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8h.01"></path><path d="M11 12h1v4h1"></path>' },
    { id: 'cultura', g: 'personal', t: 'Cultura organizacional', orden: 4, ico: '<path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"></path>' },
    { id: 'docs', g: 'personal', t: 'Biblioteca', orden: 5, ico: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>' },
    { id: 'solicitudes', g: 'personal', t: 'Solicitudes', orden: 6, ico: '<path d="M22 12h-6l-2 3h-4l-2-3H2"></path><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>' },
    { id: 'pendientes', g: 'personal', t: 'Notificaciones', orden: 7, ico: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path>' },
    { id: 'onboarding', g: 'personal', t: 'Inducciones', orden: 8, ico: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="M22 4L12 14.01l-3-3"></path>' },
    { id: 'asistencia', g: 'gestion', t: 'Asistencia', orden: 9, ico: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M8 2v4M16 2v4M3 10h18"></path><path d="m9 16 2 2 4-4"></path>' },
    { id: 'perfil', g: 'personal', t: 'Mi perfil', orden: 10, ico: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a8 8 0 0 1 16 0v1"></path>' },
    { id: 'solequipo', g: 'gestion', t: 'Notificaciones del equipo', orden: 1, ico: '<path d="M9 11l3 3 8-8"></path><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"></path>' },
    { id: 'org', g: 'gestion', t: 'Organigrama', orden: 2, ico: '<rect x="9" y="2" width="6" height="5" rx="1"></rect><rect x="2" y="17" width="6" height="5" rx="1"></rect><rect x="16" y="17" width="6" height="5" rx="1"></rect><path d="M12 7v5M5 17v-3h14v3"></path>' },
    { id: 'directorio', g: 'gestion', t: 'Directorio', orden: 3, ico: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>' },
    { id: 'ventasmenu', g: 'gestion', t: 'Ventas', orden: 4, ico: '<path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path>' },
    { id: 'induccionequipo', g: 'gestion', t: 'Onboarding del equipo', orden: 5, ico: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>' },
    { id: 'empleados', g: 'gestion', t: 'Empleados', orden: 6, ico: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h6"></path>' },
    { id: 'claves', g: 'gestion', t: 'Restauración de claves', orden: 7, ico: '<rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>' },
    { id: 'activos', g: 'gestion', t: 'Activos y procura', orden: 8, ico: '<path d="M20 7h-3V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path><path d="M9 7V4h6v3"></path>' },
    { id: 'encuestas', g: 'gestion', t: 'Encuestas', orden: 10, ico: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>' },
    { id: 'contratos', g: 'gestion', t: 'Contratos', orden: 11, ico: '<path d="M9 12h6M9 16h6M9 8h6"></path><path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path>' },
    { id: 'perfiles', g: 'config', t: 'Perfiles', orden: 1, ico: '<circle cx="9" cy="7" r="4"></circle><path d="M3 21v-1a6 6 0 0 1 12 0v1"></path><path d="M16 11l2 2 4-4"></path>' },
    { id: 'requerimientos', g: 'config', t: 'Requerimientos', orden: 2, ico: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>' },
    { id: 'accesos', g: 'config', t: 'Accesos y permisos', orden: 3, ico: '<rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><circle cx="12" cy="16" r="1"></circle>' },
    { id: 'recursos', g: 'config', t: 'Aplicativos y drives', orden: 4, ico: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect>' },
    // Subpantallas (hijas)
    { id: 'metas2026', g: 'personal', t: 'Metas 2026', orden: 1, padre: 'metas', ico: null },
    { id: 'metasvision', g: 'personal', t: 'Visión', orden: 2, padre: 'metas', ico: null },
    { id: 'metashist', g: 'personal', t: 'Histórico', orden: 3, padre: 'metas', ico: null },
    { id: 'ventasfv', g: 'gestion', t: 'Fuerza de ventas', orden: 1, padre: 'ventasmenu', ico: null },
    { id: 'ventasbancos', g: 'gestion', t: 'Bancos', orden: 2, padre: 'ventasmenu', ico: null },
    { id: 'afpanel', g: 'gestion', t: 'Panel general', orden: 1, padre: 'activos', ico: null },
    { id: 'afactivos', g: 'gestion', t: 'Activos fijos', orden: 2, padre: 'activos', ico: null },
    { id: 'aftech', g: 'gestion', t: 'Almacén de tecnología', orden: 3, padre: 'activos', ico: null },
    { id: 'afalmacen', g: 'gestion', t: 'Almacén consumibles', orden: 4, padre: 'activos', ico: null },
    { id: 'afmercadeo', g: 'gestion', t: 'Almacén Mercadeo', orden: 5, padre: 'activos', ico: null },
    { id: 'afprocura', g: 'gestion', t: 'Procura', orden: 6, padre: 'activos', ico: null },
    // Externos
    { id: 'eureka', g: 'personal', t: 'Eureka', orden: 99, ico: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect>', href: 'https://eureka.vepagos.com/login' },
    { id: 'sac', g: 'personal', t: 'SAC', orden: 100, ico: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>', href: 'https://solicitudes.vepagos.com/login' },
    // Administración (solo admin)
    { id: 'adminmenu', g: 'personal', t: 'Administración', orden: 1, ico: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>' },
    { id: 'adminfrec', g: 'personal', t: 'Accesos frecuentes', orden: 1, padre: 'adminmenu', ico: null },
    { id: 'adminsomos', g: 'personal', t: 'Somos VEPAGOS', orden: 2, padre: 'adminmenu', ico: null },
    { id: 'adminenc', g: 'personal', t: 'Encuestas', orden: 3, padre: 'adminmenu', ico: null },
    { id: 'admincom', g: 'personal', t: 'Comunicaciones', orden: 4, padre: 'adminmenu', ico: null },
    { id: 'admininducciones', g: 'personal', t: 'Inducciones', orden: 5, padre: 'adminmenu', ico: null },
  ];

  // Insert parent items first (no padre), then children
  const parents = NAV_ITEMS.filter((n: any) => !n.padre);
  const children = NAV_ITEMS.filter((n: any) => n.padre);

  for (const n of parents) {
    await conn.execute(
      'INSERT IGNORE INTO pantallas (id, titulo, grupo, padre_id, icono, href_externo, orden) VALUES (?, ?, ?, NULL, ?, ?, ?)',
      [n.id, n.t, n.g, n.ico, (n as any).href || null, n.orden]
    );
  }
  for (const n of children) {
    await conn.execute(
      'INSERT IGNORE INTO pantallas (id, titulo, grupo, padre_id, icono, href_externo, orden) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [n.id, n.t, n.g, (n as any).padre, n.ico, (n as any).href || null, n.orden]
    );
  }
  console.log(`   ✅ ${NAV_ITEMS.length} pantallas cargadas`);

  // 5. Cargar menús por perfil (solo si la tabla está vacía — no sobrescribe datos editados)
  console.log('📋 Cargando menús por perfil...');
  const [existingMenus] = await conn.execute('SELECT 1 FROM perfil_pantallas LIMIT 1') as any;
  if (existingMenus.length === 0) {
    const MENUS_POR_PERFIL: Record<string, string[]> = {
      admin: NAV_ITEMS.map((n: any) => n.id),
      director: ['inicio','metas','somos','cultura','docs','solicitudes','pendientes','onboarding','perfil','solequipo','org','directorio','ventasmenu','asistencia','contratos'],
      gerente: ['inicio','metas','somos','cultura','docs','solicitudes','pendientes','onboarding','perfil','solequipo','org','directorio','asistencia','contratos'],
      gerenteop: ['inicio','metas','somos','cultura','docs','solicitudes','pendientes','onboarding','perfil','solequipo','org','directorio','ventasmenu','asistencia','contratos'],
      coordinador: ['inicio','somos','cultura','docs','solicitudes','pendientes','onboarding','asistencia','perfil','solequipo','activos'],
      rrhh: ['inicio','somos','cultura','docs','solicitudes','pendientes','onboarding','perfil','solequipo','org','directorio','induccionequipo','empleados','claves','activos','asistencia','encuestas','contratos'],
      interno: ['inicio','somos','cultura','docs','solicitudes','pendientes','onboarding','asistencia','perfil'],
      inces: ['inicio','somos','cultura','docs','solicitudes','pendientes','onboarding','asistencia','perfil'],
    };
    for (const [perfilKey, menuIds] of Object.entries(MENUS_POR_PERFIL)) {
      for (const pantallaId of menuIds) {
        await conn.execute(
          'INSERT IGNORE INTO perfil_pantallas (perfil_key, pantalla_id) VALUES (?, ?)',
          [perfilKey, pantallaId]
        );
        const children = NAV_ITEMS.filter((n: any) => n.padre === pantallaId);
        for (const child of children) {
          await conn.execute(
            'INSERT IGNORE INTO perfil_pantallas (perfil_key, pantalla_id) VALUES (?, ?)',
            [perfilKey, child.id]
          );
        }
      }
    }
    console.log('   ✅ Menús por perfil cargados (seed inicial)');
  } else {
    console.log('   ⏭️  perfil_pantallas ya tiene datos, no se sobrescribe');
  }

  // 6. Cargar usuarios
  console.log('👥 Cargando usuarios...');
  const usuariosData = JSON.parse(fs.readFileSync(path.join(DATOS_DIR, 'usuarios.json'), 'utf-8'));
  const pw = await bcrypt.hash('vepagos2026', 10);

  // First pass: insert users without supervisor_id
  // Generate cédula for users that don't have one in the JSON
  for (const u of usuariosData.usuarios) {
    const cedula = u.cedula || String(10000000 + u.id);
    await conn.execute(
      `INSERT IGNORE INTO usuarios (id, nombre, cargo, area, perfil_key, supervisor_id, email, cedula, password_hash, telefono, ciudad, cumple, es_ancla_equipo, nombre_equipo, activo)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id, u.nombre, u.cargo || '', u.area || '', u.perfil,
        u.email, cedula, pw, u.telefono || null,
        u.ciudad || null, u.cumple || null,
        u.equipo ? 1 : 0, u.equipo || null, u.activo ? 1 : 0
      ]
    );
  }
  // Second pass: set supervisor_id (only if the supervisor exists)
  const userIds = new Set(usuariosData.usuarios.map((u: any) => u.id));
  for (const u of usuariosData.usuarios) {
    if (u.supervisor_id && userIds.has(u.supervisor_id)) {
      await conn.execute(
        'UPDATE usuarios SET supervisor_id = ? WHERE id = ?',
        [u.supervisor_id, u.id]
      );
    } else if (u.supervisor_id) {
      console.log(`   ⚠️  Usuario ${u.id} (${u.nombre}): supervisor_id ${u.supervisor_id} no existe, omitido`);
    }
  }
  console.log(`   ✅ ${usuariosData.usuarios.length} usuarios cargados`);

  // 7. Cargar pasos de aprobación y solicitudes
  console.log('📝 Cargando catálogo de solicitudes...');
  const solData = JSON.parse(fs.readFileSync(path.join(DATOS_DIR, 'solicitudes-catalogo.json'), 'utf-8'));

  for (const p of solData.pasos_aprobacion) {
    await conn.execute(
      'INSERT IGNORE INTO pasos_aprobacion (clave, titulo, dinamico) VALUES (?, ?, ?)',
      [p.clave, p.titulo, p.dinamico ? 1 : 0]
    );
  }

  for (const dept of solData.departamentos) {
    await conn.execute(
      'INSERT IGNORE INTO solicitud_departamentos (id, nombre, descripcion, color, flujo) VALUES (?, ?, ?, ?, ?)',
      [dept.id, dept.nombre, dept.descripcion || null, dept.color || null, JSON.stringify(dept.flujo)]
    );
    if (dept.categorias) {
      for (const cat of dept.categorias) {
        const [catResult] = await conn.execute(
          'INSERT INTO solicitud_categorias (departamento_id, nombre, orden) VALUES (?, ?, ?)',
          [dept.id, cat.nombre, cat.orden || 0]
        ) as any;
        const catId = catResult.insertId;
        if (cat.tipos) {
          for (const tipo of cat.tipos) {
            await conn.execute(
              'INSERT INTO solicitud_tipos (categoria_id, nombre, flujo, pide_rango, genera_documento, activo) VALUES (?, ?, ?, ?, ?, 1)',
              [catId, tipo.nombre || tipo, tipo.flujo ? JSON.stringify(tipo.flujo) : null, tipo.pide_rango ? 1 : 0, tipo.genera_documento ? 1 : 0]
            );
          }
        }
      }
    }
  }
  console.log('   ✅ Catálogo de solicitudes cargado');

  // 8. Cargar biblioteca
  console.log('📚 Cargando biblioteca...');
  const biblioData = JSON.parse(fs.readFileSync(path.join(DATOS_DIR, 'biblioteca.json'), 'utf-8'));

  for (const [i, cat] of biblioData.categorias.entries()) {
    await conn.execute(
      'INSERT IGNORE INTO categorias_documento (id, nombre, descripcion, es_personal, orden) VALUES (?, ?, ?, ?, ?)',
      [cat.id, cat.nombre, cat.descripcion || null, cat.es_personal ? 1 : 0, i]
    );
    // Perfiles que ven esta categoría
    for (const perfKey of cat.perfiles) {
      // Check if perfil exists
      const [exists] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT 1 FROM perfiles WHERE `key` = ?',
        [perfKey]
      );
      if ((exists as any[]).length > 0) {
        await conn.execute(
          'INSERT IGNORE INTO categorias_documento_perfiles (categoria_id, perfil_key) VALUES (?, ?)',
          [cat.id, perfKey]
        );
      }
    }
  }
  console.log(`   ✅ ${biblioData.categorias.length} categorías de biblioteca cargadas`);

  // 9. Cargar inducciones
  console.log('🎓 Cargando inducciones...');
  const inducPath = path.join(DATOS_DIR, 'inducciones.json');
  if (fs.existsSync(inducPath)) {
    const inducData = JSON.parse(fs.readFileSync(inducPath, 'utf-8'));
    const rutas = inducData.rutas || inducData;
    if (Array.isArray(rutas)) {
      for (const ruta of rutas) {
        const perfilKey = ruta.perfil || ruta.perfil_key;
        // Verify perfil exists
        const [exists] = await conn.execute<mysql.RowDataPacket[]>(
          'SELECT 1 FROM perfiles WHERE `key` = ?',
          [perfilKey]
        );
        if ((exists as any[]).length > 0) {
          await conn.execute(
            'INSERT INTO inducciones (perfil_key, titulo, modulos) VALUES (?, ?, ?)',
            [perfilKey, ruta.titulo || ruta.nombre || 'Inducción', JSON.stringify(ruta.modulos || [])]
          );
        }
      }
    }
    console.log('   ✅ Inducciones cargadas');
  } else {
    console.log('   ⏭️  No se encontró inducciones.json, omitido');
  }

  // 10. Cargar documentos (biblioteca)
  console.log('📄 Cargando documentos...');
  const docsPath = path.join(DATOS_DIR, 'documentos.json');
  if (fs.existsSync(docsPath)) {
    const docsData = JSON.parse(fs.readFileSync(docsPath, 'utf-8'));
    for (const d of docsData.documentos) {
      await conn.execute(
        `INSERT INTO documentos (categoria_id, nombre, archivo_url, es_real, prompt_texto, fecha, creado_por, departamento, equipo, descripcion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.categoria_id, d.nombre, d.archivo_url || null, d.es_real ? 1 : 0,
         d.prompt_texto || null, d.fecha || null, d.creado_por || null,
         d.departamento || null, d.equipo || null, d.descripcion || null]
      );
    }
    console.log(`   ✅ ${docsData.documentos.length} documentos cargados`);
  }

  // 11. Cargar vacantes
  console.log('💼 Cargando vacantes...');
  const vacPath = path.join(DATOS_DIR, 'vacantes.json');
  if (fs.existsSync(vacPath)) {
    const vacData = JSON.parse(fs.readFileSync(vacPath, 'utf-8'));
    for (const v of vacData.vacantes) {
      const mgrExists = v.manager_id ? userIds.has(v.manager_id) : false;
      await conn.execute(
        'INSERT INTO vacantes (cargo, manager_id, perfil_key, fecha, estado) VALUES (?, ?, ?, ?, ?)',
        [v.cargo, mgrExists ? v.manager_id : null, v.perfil_key || null, v.fecha || null, v.estado || 'abierta']
      );
    }
    console.log(`   ✅ ${vacData.vacantes.length} vacantes cargadas`);
  }

  // 12. Cargar candidatos
  console.log('👤 Cargando candidatos...');
  const candPath = path.join(DATOS_DIR, 'candidatos.json');
  if (fs.existsSync(candPath)) {
    const candData = JSON.parse(fs.readFileSync(candPath, 'utf-8'));
    for (const c of candData.candidatos) {
      await conn.execute(
        'INSERT INTO candidatos (nombre, email, telefono, linkedin, ciudad, experiencia, etapa, fecha, nota) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [c.nombre, c.email || null, c.telefono || null, c.linkedin || null, c.ciudad || null, c.experiencia || null, c.etapa || 'nuevo', c.fecha || null, c.nota || null]
      );
    }
    console.log(`   ✅ ${candData.candidatos.length} candidatos cargados`);
  }

  // 13. Cargar activos fijos
  console.log('🏗️  Cargando activos fijos...');
  const afPath = path.join(DATOS_DIR, 'activos-fijos.json');
  if (fs.existsSync(afPath)) {
    const afData = JSON.parse(fs.readFileSync(afPath, 'utf-8'));
    // Catálogos auxiliares
    const catTables: Record<string, string> = {
      categorias: 'af_cat_categorias', sedes: 'af_cat_sedes', areas: 'af_cat_areas',
      departamentos: 'af_cat_departamentos', estados: 'af_cat_estados', unidades: 'af_cat_unidades'
    };
    for (const [key, table] of Object.entries(catTables)) {
      const items = afData.catalogos[key] || [];
      for (const [i, nombre] of items.entries()) {
        await conn.execute(`INSERT IGNORE INTO ${table} (nombre, orden) VALUES (?, ?)`, [nombre, i]);
      }
    }
    console.log('   ✅ Catálogos auxiliares cargados');
    // Activos
    for (const a of afData.activos) {
      const aUserId = a.usuario_id && userIds.has(a.usuario_id) ? a.usuario_id : null;
      await conn.execute(
        `INSERT IGNORE INTO af_activos (id, categoria, descripcion, marca, modelo, serial, fecha_compra, costo, proveedor, factura, sede, area, departamento, usuario_id, fecha_asig, estado, estado_fisico, ultimo_inv, creado_por, obs)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [a.id, a.categoria, a.descripcion, a.marca, a.modelo, a.serial, a.fecha_compra, a.costo, a.proveedor, a.factura, a.sede, a.area, a.departamento, aUserId, a.fecha_asig, a.estado, a.estado_fisico, a.ultimo_inv, a.creado_por, a.obs || '']
      );
    }
    console.log(`   ✅ ${afData.activos.length} activos cargados`);
    // Consumibles
    for (const c of afData.consumibles) {
      await conn.execute(
        'INSERT IGNORE INTO af_consumibles (id, nombre, unidad, minimo, ubicacion, almacen) VALUES (?,?,?,?,?,?)',
        [c.id, c.nombre, c.unidad, c.minimo, c.ubicacion, c.almacen]
      );
    }
    console.log(`   ✅ ${afData.consumibles.length} consumibles cargados`);
    // Movimientos
    for (const m of afData.movimientos) {
      await conn.execute(
        'INSERT INTO af_movimientos (articulo_id, tipo, cantidad, fecha, referencia, por, departamento, para) VALUES (?,?,?,?,?,?,?,?)',
        [m.articulo_id, m.tipo, m.cantidad, m.fecha, m.referencia, m.por, m.departamento || null, m.para || null]
      );
    }
    console.log(`   ✅ ${afData.movimientos.length} movimientos de stock cargados`);
    // Proveedores
    for (const p of afData.proveedores) {
      await conn.execute(
        'INSERT INTO af_proveedores (razon, rif, contacto, condiciones) VALUES (?,?,?,?)',
        [p.razon, p.rif, p.contacto, p.condiciones]
      );
    }
    console.log(`   ✅ ${afData.proveedores.length} proveedores cargados`);
    // Solicitudes de compra
    for (const s of afData.solicitudes_compra) {
      const sUserId = s.solicitante_id && userIds.has(s.solicitante_id) ? s.solicitante_id : null;
      await conn.execute(
        'INSERT IGNORE INTO af_solicitudes_compra (id, solicitante_id, departamento, items, justificacion, estado, fecha, aprobado_por, aprobado_fecha) VALUES (?,?,?,?,?,?,?,?,?)',
        [s.id, sUserId, s.departamento, JSON.stringify(s.items), s.justificacion, s.estado, s.fecha, s.aprobado_por || null, s.aprobado_fecha || null]
      );
    }
    console.log(`   ✅ ${afData.solicitudes_compra.length} solicitudes de compra cargadas`);
  }

  // 14. Cargar metas y KPIs
  console.log('🎯 Cargando metas y KPIs...');
  const metasPath = path.join(DATOS_DIR, 'metas.json');
  if (fs.existsSync(metasPath)) {
    const metasData = JSON.parse(fs.readFileSync(metasPath, 'utf-8'));
    // Config
    await conn.execute(
      'INSERT INTO metas_config (vision, norte, updated) VALUES (?, ?, ?)',
      [metasData.config.vision, metasData.config.norte, metasData.config.updated]
    );
    // Objetivos
    for (const [i, o] of metasData.objetivos.entries()) {
      await conn.execute(
        'INSERT INTO metas_objetivos (titulo, descripcion, metrica, plazo, orden) VALUES (?,?,?,?,?)',
        [o.titulo, o.descripcion, o.metrica, o.plazo, i]
      );
    }
    console.log(`   ✅ ${metasData.objetivos.length} objetivos cargados`);
    // KPIs
    for (const [i, k] of metasData.kpis.entries()) {
      await conn.execute(
        'INSERT INTO metas_kpis (nombre, actual, meta, direccion, orden) VALUES (?,?,?,?,?)',
        [k.nombre, k.actual, k.meta, k.direccion, i]
      );
    }
    console.log(`   ✅ ${metasData.kpis.length} KPIs cargados`);
    // Histórico
    for (const [i, h] of metasData.historico.entries()) {
      await conn.execute(
        'INSERT INTO metas_historico (area_key, area, color, bg, intro, columnas, filas, orden) VALUES (?,?,?,?,?,?,?,?)',
        [h.area_key, h.area, h.color, h.bg, h.intro, JSON.stringify(h.columnas), JSON.stringify(h.filas), i]
      );
    }
    console.log(`   ✅ ${metasData.historico.length} dashboards históricos cargados`);
  }

  // 12. Cargar inducciones
  console.log('🎓 Cargando rutas de inducción...');
  const [existingInd] = await conn.execute('SELECT 1 FROM inducciones_rutas LIMIT 1') as any;
  if (existingInd.length === 0) {
    const indData = JSON.parse(fs.readFileSync(path.join(DATOS_DIR, 'inducciones.json'), 'utf-8'));
    for (const [perfilKey, ruta] of Object.entries(indData.rutas)) {
      const r = ruta as any;
      await conn.execute(
        'INSERT IGNORE INTO inducciones_rutas (perfil_key, titulo, modulos) VALUES (?, ?, ?)',
        [perfilKey, r.titulo, JSON.stringify(r.modulos)]
      );
    }
    console.log(`   ✅ ${Object.keys(indData.rutas).length} rutas de inducción cargadas`);
  } else {
    console.log('   ⏭️  inducciones_rutas ya tiene datos, no se sobrescribe');
  }
  console.log('\n🎉 ¡Seed completado exitosamente!\n');
  console.log('   Base de datos: intranet_vepagos');
  console.log('   phpMyAdmin:    http://localhost:8080/phpmyadmin\n');

  await conn.end();
}

seed().catch(err => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
