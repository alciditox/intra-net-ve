import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { Perfil, Pantalla, MenuGroup, MenuItem, MenuResponse } from '../types';

/**
 * Obtiene la cadena de herencia de un perfil (el perfil + sus bases).
 * Ej: 'director' → ['director', 'gerente']
 * Usa CTE recursiva para obtener toda la cadena en una sola query.
 */
export async function getBaseChain(perfilKey: string): Promise<string[]> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `WITH RECURSIVE chain AS (
        SELECT \`key\`, base_key, 1 AS depth FROM perfiles WHERE \`key\` = ?
        UNION ALL
        SELECT p.\`key\`, p.base_key, c.depth + 1
        FROM perfiles p
        INNER JOIN chain c ON p.\`key\` = c.base_key
        WHERE c.depth < 6
      )
      SELECT \`key\` FROM chain ORDER BY depth`,
      [perfilKey]
    );
    return (rows as RowDataPacket[]).map(r => r.key);
  } catch {
    // Fallback para MySQL < 8 sin soporte CTE
    const chain: string[] = [perfilKey];
    let current = perfilKey;
    let guard = 0;
    while (guard++ < 6) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT base_key FROM perfiles WHERE `key` = ?',
        [current]
      );
      if (rows.length === 0 || !rows[0].base_key) break;
      const base = rows[0].base_key as string;
      if (chain.includes(base)) break;
      chain.push(base);
      current = base;
    }
    return chain;
  }
}

/**
 * Obtiene las pantallas visibles para un usuario, resolviendo:
 * 1. Pantallas asignadas a su perfil + cadena de herencia
 * 2. Pantallas habilitadas por permisos individuales del usuario
 * 3. Pantallas habilitadas por permisos del perfil
 */
export async function getMenuForUser(
  userId: number,
  perfilKey: string,
  tieneReportes: boolean,
  esAprobador: boolean
): Promise<MenuResponse> {
  const chain = await getBaseChain(perfilKey);
  const isAdmin = perfilKey === 'admin';

  // 1. Pantallas del perfil (por cadena de herencia)
  let pantallasIds: Set<string> = new Set();

  if (isAdmin) {
    // Admin ve todo
    const [all] = await pool.execute<RowDataPacket[]>('SELECT id FROM pantallas');
    (all as RowDataPacket[]).forEach(r => pantallasIds.add(r.id));
  } else {
    // Pantallas por perfil + herencia
    const placeholders = chain.map(() => '?').join(',');
    const [byProfile] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT pantalla_id FROM perfil_pantallas WHERE perfil_key IN (${placeholders})`,
      chain
    );
    (byProfile as RowDataPacket[]).forEach(r => pantallasIds.add(r.pantalla_id));

    // 2. Pantallas por permisos individuales del usuario
    const [userPerms] = await pool.execute<RowDataPacket[]>(
      `SELECT pc.nav FROM permisos_usuario pu 
       JOIN permisos_catalogo pc ON pu.clave = pc.clave 
       WHERE pu.usuario_id = ? AND pc.nav IS NOT NULL`,
      [userId]
    );
    (userPerms as RowDataPacket[]).forEach(r => pantallasIds.add(r.nav));

    // 3. Pantallas por permisos del perfil
    const [profilePerms] = await pool.execute<RowDataPacket[]>(
      `SELECT pc.nav FROM permisos_perfil pp 
       JOIN permisos_catalogo pc ON pp.clave = pc.clave 
       WHERE pp.perfil_key IN (${placeholders}) AND pc.nav IS NOT NULL`,
      chain
    );
    (profilePerms as RowDataPacket[]).forEach(r => pantallasIds.add(r.nav));

    // 4. Si tiene reportes directos o es aprobador, habilitar solequipo
    if (tieneReportes || esAprobador) {
      pantallasIds.add('solequipo');
    }

    // Siempre incluir inicio y perfil
    pantallasIds.add('inicio');
    pantallasIds.add('perfil');
  }

  // Obtener todas las pantallas del sistema
  const [allScreens] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM pantallas ORDER BY orden'
  );
  const pantallas = allScreens as Pantalla[];

  // Filtrar las que puede ver el usuario
  const visibles = pantallas.filter(p => pantallasIds.has(p.id));

  // Construir estructura de grupos
  const [groups] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM nav_groups ORDER BY orden'
  );

  // Separar pantallas padre e hijas
  const padres = visibles.filter(p => !p.padre_id);
  const hijas = visibles.filter(p => p.padre_id);

  const menuGroups: MenuGroup[] = (groups as RowDataPacket[]).map(g => {
    const items: MenuItem[] = padres
      .filter(p => {
        // Asistencia goes to 'personal' for non-manager roles
        if (p.id === 'asistencia' && p.grupo === 'gestion') {
          const esGerente = chain.includes('gerente') || perfilKey === 'admin' || perfilKey === 'rrhh';
          return esGerente ? g.id === 'gestion' : g.id === 'personal';
        }
        return p.grupo === g.id;
      })
      .map(p => {
        const children = hijas.filter(h => h.padre_id === p.id);
        return {
          id: p.id,
          title: p.titulo,
          icon: p.icono,
          href: p.href_externo,
          sub: children.length > 0 ? children.map(c => ({
            id: c.id,
            title: c.titulo,
            icon: null,
            href: null,
            sub: null,
          })) : null,
        };
      });
    return {
      id: g.id,
      title: g.titulo,
      items,
    };
  }).filter(g => g.items.length > 0);

  // Badges — counts for sidebar badges
  const badges: Record<string, number> = {};

  return { groups: menuGroups, badges };
}

/**
 * Obtiene las pantallas asignadas a un perfil específico (sin herencia)
 */
export async function getScreensForProfile(perfilKey: string): Promise<string[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT pantalla_id FROM perfil_pantallas WHERE perfil_key = ? ORDER BY pantalla_id',
    [perfilKey]
  );
  return (rows as RowDataPacket[]).map(r => r.pantalla_id);
}

/**
 * Asigna pantallas a un perfil (reemplaza las existentes)
 */
export async function setScreensForProfile(perfilKey: string, pantallaIds: string[]): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM perfil_pantallas WHERE perfil_key = ?', [perfilKey]);
    for (const pid of pantallaIds) {
      await conn.execute(
        'INSERT INTO perfil_pantallas (perfil_key, pantalla_id) VALUES (?, ?)',
        [perfilKey, pid]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Verifica si un usuario tiene reportes directos activos
 */
export async function userHasReports(userId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM usuarios WHERE supervisor_id = ? AND activo = 1 LIMIT 1',
    [userId]
  );
  return rows.length > 0;
}

/**
 * Verifica si un usuario es aprobador en algún paso
 */
export async function userIsApprover(userId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM pasos_aprobacion WHERE responsable_id = ? LIMIT 1',
    [userId]
  );
  return rows.length > 0;
}
