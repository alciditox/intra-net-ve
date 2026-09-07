import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';

const router = Router();

// GET /api/candidatos
router.get('/', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM candidatos ORDER BY fecha DESC');
    res.json(rows);
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// POST /api/candidatos
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nombre, email, telefono, linkedin, ciudad, experiencia, etapa, fecha, nota } = req.body;
    if (!nombre) { res.status(400).json({ error: 'nombre es requerido' }); return; }
    const [result] = await pool.execute(
      'INSERT INTO candidatos (nombre, email, telefono, linkedin, ciudad, experiencia, etapa, fecha, nota) VALUES (?,?,?,?,?,?,?,?,?)',
      [nombre, email || null, telefono || null, linkedin || null, ciudad || null, experiencia || null, etapa || 'nuevo', fecha || null, nota || null]
    );
    res.status(201).json({ id: (result as any).insertId, message: 'Candidato creado' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// PUT /api/candidatos/:id
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields: string[] = []; const values: any[] = [];
    for (const k of ['nombre', 'email', 'telefono', 'linkedin', 'ciudad', 'experiencia', 'etapa', 'fecha', 'nota']) {
      if (req.body[k] !== undefined) { fields.push(`${k} = ?`); values.push(req.body[k]); }
    }
    if (!fields.length) { res.status(400).json({ error: 'No hay campos' }); return; }
    values.push(req.params.id);
    await pool.execute(`UPDATE candidatos SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Candidato actualizado' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// DELETE /api/candidatos/:id
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM candidatos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Candidato eliminado' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

export default router;
