import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';

const router = Router();

// GET /api/vacantes
router.get('/', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT v.*, u.nombre AS manager_nombre FROM vacantes v
       LEFT JOIN usuarios u ON v.manager_id = u.id ORDER BY v.fecha DESC`
    );
    res.json(rows);
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// POST /api/vacantes
router.post('/', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { cargo, manager_id, perfil_key, fecha, estado } = req.body;
    if (!cargo) { res.status(400).json({ error: 'cargo es requerido' }); return; }
    const [result] = await pool.execute(
      'INSERT INTO vacantes (cargo, manager_id, perfil_key, fecha, estado) VALUES (?,?,?,?,?)',
      [cargo, manager_id || null, perfil_key || null, fecha || null, estado || 'abierta']
    );
    res.status(201).json({ id: (result as any).insertId, message: 'Vacante creada' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// PUT /api/vacantes/:id
router.put('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields: string[] = []; const values: any[] = [];
    for (const k of ['cargo', 'manager_id', 'perfil_key', 'fecha', 'estado']) {
      if (req.body[k] !== undefined) { fields.push(`${k} = ?`); values.push(req.body[k]); }
    }
    if (!fields.length) { res.status(400).json({ error: 'No hay campos' }); return; }
    values.push(req.params.id);
    await pool.execute(`UPDATE vacantes SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Vacante actualizada' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// DELETE /api/vacantes/:id
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM vacantes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vacante eliminada' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

export default router;
