import { Router, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getBaseChain } from '../services/menu.service';

const router = Router();

// GET /api/perfiles — listar perfiles
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM perfiles ORDER BY orden'
    );
    res.json(rows);
  } catch (err) {
    console.error('Perfiles list error:', err);
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
    console.error('Perfil get error:', err);
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
    console.error('Perfil update error:', err);
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
    console.error('Perfil create error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
