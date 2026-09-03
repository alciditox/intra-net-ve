import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { generateToken } from '../middleware/auth';
import { Usuario, JwtPayload } from '../types';
import { RowDataPacket } from 'mysql2';

export async function login(email: string, password: string, cedula?: string): Promise<{ token: string; user: Omit<Usuario, 'password_hash'> } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
    [email.toLowerCase()]
  );

  if (rows.length === 0) return null;
  const user = rows[0] as Usuario;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  // Verify cedula — always required from the login form
  if (cedula) {
    const cleanCedula = cedula.replace(/[^0-9kK]/g, '');
    const userCedula = user.cedula ? String(user.cedula).replace(/[^0-9kK]/g, '') : '';
    if (!userCedula || cleanCedula !== userCedula) return null;
  } else {
    // If no cedula provided but user has one, reject
    if (user.cedula) return null;
  }

  const payload: JwtPayload = {
    userId: user.id,
    perfil: user.perfil_key,
    email: user.email,
  };

  const token = generateToken(payload);

  const { password_hash, ...safeUser } = user;
  return { token, user: safeUser };
}

export async function getUserById(id: number): Promise<Omit<Usuario, 'password_hash'> | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, nombre, cargo, area, perfil_key, supervisor_id, email, cedula, telefono, linkedin, ciudad, cumple, tipo_sangre, alergias, condicion_medica, emerg_nombre, emerg_telefono, es_ancla_equipo, nombre_equipo, activo, creado_en FROM usuarios WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  return rows[0] as Omit<Usuario, 'password_hash'>;
}

export async function getAllUsers(): Promise<Omit<Usuario, 'password_hash'>[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, nombre, cargo, area, perfil_key, supervisor_id, email, cedula, telefono, linkedin, ciudad, cumple, tipo_sangre, alergias, condicion_medica, emerg_nombre, emerg_telefono, es_ancla_equipo, nombre_equipo, activo, creado_en FROM usuarios ORDER BY id'
  );
  return rows as Omit<Usuario, 'password_hash'>[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
