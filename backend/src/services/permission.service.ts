import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { getBaseChain } from './menu.service';

/**
 * Verifica si un usuario tiene un permiso específico.
 * Evalúa: permisos individuales + permisos del perfil + herencia.
 */
export async function hasPerm(userId: number, perfilKey: string, clave: string): Promise<boolean> {
  // Admin siempre tiene todo
  if (perfilKey === 'admin') return true;

  // 1. Permiso individual del usuario
  const [userPerm] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM permisos_usuario WHERE usuario_id = ? AND clave = ?',
    [userId, clave]
  );
  if (userPerm.length > 0) return true;

  // 2. Permiso del perfil (con herencia)
  const chain = await getBaseChain(perfilKey);
  const placeholders = chain.map(() => '?').join(',');
  const [profilePerm] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 FROM permisos_perfil WHERE perfil_key IN (${placeholders}) AND clave = ?`,
    [...chain, clave]
  );
  return profilePerm.length > 0;
}

/**
 * Obtiene todos los permisos de un usuario (individuales + perfil + herencia)
 */
export async function getAllPermsForUser(userId: number, perfilKey: string): Promise<string[]> {
  if (perfilKey === 'admin') {
    const [all] = await pool.execute<RowDataPacket[]>('SELECT clave FROM permisos_catalogo');
    return (all as RowDataPacket[]).map(r => r.clave);
  }

  const perms: Set<string> = new Set();

  // Individual
  const [userPerms] = await pool.execute<RowDataPacket[]>(
    'SELECT clave FROM permisos_usuario WHERE usuario_id = ?',
    [userId]
  );
  (userPerms as RowDataPacket[]).forEach(r => perms.add(r.clave));

  // Perfil + herencia
  const chain = await getBaseChain(perfilKey);
  const placeholders = chain.map(() => '?').join(',');
  const [profilePerms] = await pool.execute<RowDataPacket[]>(
    `SELECT clave FROM permisos_perfil WHERE perfil_key IN (${placeholders})`,
    chain
  );
  (profilePerms as RowDataPacket[]).forEach(r => perms.add(r.clave));

  return Array.from(perms);
}

/**
 * Concede un permiso individual a un usuario
 */
export async function grantPerm(userId: number, clave: string, concedidoPor: number): Promise<void> {
  await pool.execute(
    'INSERT IGNORE INTO permisos_usuario (usuario_id, clave, concedido_por) VALUES (?, ?, ?)',
    [userId, clave, concedidoPor]
  );
}

/**
 * Revoca un permiso individual de un usuario
 */
export async function revokePerm(userId: number, clave: string): Promise<void> {
  await pool.execute(
    'DELETE FROM permisos_usuario WHERE usuario_id = ? AND clave = ?',
    [userId, clave]
  );
}

/**
 * Obtiene el catálogo de permisos
 */
export async function getPermsCatalog(): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM permisos_catalogo ORDER BY grupo, clave'
  );
  return rows as RowDataPacket[];
}
