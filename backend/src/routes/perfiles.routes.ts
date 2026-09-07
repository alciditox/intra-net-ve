import { Router, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getBaseChain } from '../services/menu.service';
import logger from '../utils/logger';

const router = Router();

// GET /api/perfiles — listar perfiles
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM perfiles ORDER BY orden'
    );
    res.json(rows);
  } catch (err) {
    logger.error('Perfiles list error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/perfiles/:key — un perfil con su cadena de herencia
router.get('/:key', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM perfiles WHERE `key` = ?',
      [req.params.key]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const chain = await getBaseChain(req.params.key);

    // Get assigned permissions
    const placeholders = chain.map(() => '?').join(',');
    const [perms] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT clave FROM permisos_perfil WHERE perfil_key IN (${placeholders})`,
      chain
    );

    res.json({
      ...rows[0],
      baseChain: chain,
      permisos: (perms as RowDataPacket[]).map(r => r.clave),
    });
  } catch (err) {
    logger.error('Perfil get error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/perfiles/:key — actualizar perfil (solo admin)
router.put('/:key', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { label, descripcion, base_key, orden } = req.body;
    const fields: string[] = [];
    const values: any[] = [];

    if (label !== undefined) { fields.push('label = ?'); values.push(label); }
    if (descripcion !== undefined) { fields.push('descripcion = ?'); values.push(descripcion); }
    if (base_key !== undefined) { fields.push('base_key = ?'); values.push(base_key || null); }
    if (orden !== undefined) { fields.push('orden = ?'); values.push(orden); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(req.params.key);
    await pool.execute(`UPDATE perfiles SET ${fields.join(', ')} WHERE \`key\` = ?`, values);
    res.json({ message: 'Perfil actualizado' });
  } catch (err) {
    logger.error('Perfil update error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/perfiles — crear perfil (solo admin)
router.post('/', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key, label, descripcion, base_key, orden } = req.body;
    if (!key || !label) {
      res.status(400).json({ error: 'key y label son requeridos' });
      return;
    }

    await pool.execute(
      'INSERT INTO perfiles (`key`, label, descripcion, base_key, sistema, orden) VALUES (?, ?, ?, ?, 0, ?)',
      [key, label, descripcion || null, base_key || null, orden || 0]
    );
    res.status(201).json({ message: 'Perfil creado' });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Ya existe un perfil con esa clave' });
      return;
    }
    logger.error('Perfil create error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/perfiles/:key — eliminar perfil (solo admin, no sistema)
router.delete('/:key', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if it's a system profile
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT sistema FROM perfiles WHERE `key` = ?',
      [req.params.key]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }
    if (rows[0].sistema) {
      res.status(400).json({ error: 'No se puede eliminar un perfil del sistema' });
      return;
    }
    // Check if any users are assigned
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM usuarios WHERE perfil_key = ? AND activo = 1 LIMIT 1',
      [req.params.key]
    );
    if (users.length > 0) {
      res.status(400).json({ error: 'No puedes eliminar un perfil con personas asignadas' });
      return;
    }
    await pool.execute('DELETE FROM perfiles WHERE `key` = ?', [req.params.key]);
    res.json({ message: 'Perfil eliminado' });
  } catch (err) {
    logger.error('Perfil delete error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
