import { Router, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getAllUsers, getUserById, hashPassword } from '../services/auth.service';

const router = Router();

// GET /api/users — listar usuarios
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/users/:id — un usuario
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await getUserById(parseInt(req.params.id));
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error('User get error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/users — crear usuario (solo admin)
router.post('/', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nombre, cargo, area, perfil_key, supervisor_id, email, cedula, password, telefono, linkedin, ciudad, cumple } = req.body;
    if (!nombre || !email || !password || !perfil_key) {
      res.status(400).json({ error: 'nombre, email, password y perfil_key son requeridos' });
      return;
    }

    const pw = await hashPassword(password);
    const [result] = await pool.execute(
      `INSERT INTO usuarios (nombre, cargo, area, perfil_key, supervisor_id, email, cedula, password_hash, telefono, linkedin, ciudad, cumple)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, cargo || '', area || '', perfil_key, supervisor_id || null, email.toLowerCase(), cedula || null, pw, telefono || null, linkedin || null, ciudad || null, cumple || null]
    );

    res.status(201).json({ id: (result as any).insertId, message: 'Usuario creado' });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
      return;
    }
    console.error('User create error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/users/:id — actualizar usuario (solo admin)
router.put('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { nombre, cargo, area, perfil_key, supervisor_id, email, cedula, telefono, linkedin, ciudad, cumple, activo } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (nombre !== undefined) { fields.push('nombre = ?'); values.push(nombre); }
    if (cargo !== undefined) { fields.push('cargo = ?'); values.push(cargo); }
    if (area !== undefined) { fields.push('area = ?'); values.push(area); }
    if (perfil_key !== undefined) { fields.push('perfil_key = ?'); values.push(perfil_key); }
    if (supervisor_id !== undefined) { fields.push('supervisor_id = ?'); values.push(supervisor_id); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email.toLowerCase()); }
    if (cedula !== undefined) { fields.push('cedula = ?'); values.push(cedula); }
    if (telefono !== undefined) { fields.push('telefono = ?'); values.push(telefono); }
    if (linkedin !== undefined) { fields.push('linkedin = ?'); values.push(linkedin); }
    if (ciudad !== undefined) { fields.push('ciudad = ?'); values.push(ciudad); }
    if (cumple !== undefined) { fields.push('cumple = ?'); values.push(cumple); }
    if (activo !== undefined) { fields.push('activo = ?'); values.push(activo ? 1 : 0); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id);
    await pool.execute(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
