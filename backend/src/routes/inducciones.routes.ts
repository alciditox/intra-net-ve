import { Router, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';

const router = Router();

// GET /api/inducciones — listar todas las rutas de inducción
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ir.*, p.label as perfil_label
       FROM inducciones_rutas ir
       LEFT JOIN perfiles p ON ir.perfil_key = p.\`key\`
       ORDER BY ir.id`
    );
    res.json(rows);
  } catch (err) {
    logger.error('Inducciones list error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/inducciones/perfil/:key — ruta de inducción para un perfil específico
router.get('/perfil/:key', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // First try specific profile, then fallback to '_todos' (universal)
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM inducciones_rutas WHERE perfil_key IN (?, ?) AND activa = 1 ORDER BY FIELD(perfil_key, ?, ?)',
      [req.params.key, '_todos', req.params.key, '_todos']
    );
    if (rows.length === 0) {
      res.json([]);
      return;
    }
    // Return all matching routes as an array, parse JSON modules for each
    const rutas = rows.map((r: any) => {
      r.modulos = typeof r.modulos === 'string' ? JSON.parse(r.modulos) : r.modulos;
      return r;
    });
    res.json(rutas);
  } catch (err) {
    logger.error('Inducciones perfil error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/inducciones/progreso/mio — progreso del usuario autenticado en BD
router.get('/progreso/mio', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT modulo_id, aprobado, puntaje_pct, completado_el FROM inducciones_progreso WHERE usuario_id = ?',
      [req.user!.userId]
    );
    res.json(rows);
  } catch (err) {
    logger.error('Error fetching my induction progress', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/inducciones/progreso/todos — todos los progresos (para HR/Admin/Entrenador)
router.get('/progreso/todos', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ip.*, u.nombre as usuario_nombre, u.cargo, u.perfil_key
       FROM inducciones_progreso ip
       JOIN usuarios u ON ip.usuario_id = u.id`
    );
    res.json(rows);
  } catch (err) {
    logger.error('Error fetching all induction progress', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/inducciones/progreso — registrar módulo completado/aprobado en BD
router.post('/progreso', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { modulo_id, puntaje_pct } = req.body;
    if (!modulo_id) {
      res.status(400).json({ error: 'modulo_id es requerido' });
      return;
    }
    const pct = typeof puntaje_pct === 'number' ? puntaje_pct : 100;
    await pool.execute(
      `INSERT INTO inducciones_progreso (usuario_id, modulo_id, aprobado, puntaje_pct)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE aprobado = 1, puntaje_pct = VALUES(puntaje_pct), completado_el = CURRENT_TIMESTAMP`,
      [req.user!.userId, modulo_id, pct]
    );
    res.status(200).json({ success: true, message: 'Módulo registrado como aprobado' });
  } catch (err) {
    logger.error('Error saving induction progress', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/inducciones/:id — detalle de una ruta
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ir.*, p.label as perfil_label
       FROM inducciones_rutas ir
       LEFT JOIN perfiles p ON ir.perfil_key = p.\`key\`
       WHERE ir.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    const ruta = rows[0];
    ruta.modulos = typeof ruta.modulos === 'string' ? JSON.parse(ruta.modulos) : ruta.modulos;
    res.json(ruta);
  } catch (err) {
    logger.error('Inducciones detail error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/inducciones — crear ruta de inducción (solo admin)
router.post('/', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { perfil_key, titulo, modulos } = req.body;
    if (!perfil_key || !titulo) {
      res.status(400).json({ error: 'perfil_key y titulo son requeridos' });
      return;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO inducciones_rutas (perfil_key, titulo, modulos) VALUES (?, ?, ?)',
      [perfil_key, titulo, JSON.stringify(modulos || [])]
    );
    res.status(201).json({ id: result.insertId, message: 'Ruta de inducción creada' });
  } catch (err: any) {
    logger.error('Inducciones create error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/inducciones/:id — actualizar ruta (solo admin)
router.put('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { titulo, modulos, activa, perfil_key } = req.body;
    const fields: string[] = [];
    const values: any[] = [];

    if (titulo !== undefined) { fields.push('titulo = ?'); values.push(titulo); }
    if (modulos !== undefined) { fields.push('modulos = ?'); values.push(JSON.stringify(modulos)); }
    if (activa !== undefined) { fields.push('activa = ?'); values.push(activa ? 1 : 0); }
    if (perfil_key !== undefined) { fields.push('perfil_key = ?'); values.push(perfil_key); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(req.params.id);
    await pool.execute(`UPDATE inducciones_rutas SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Ruta actualizada' });
  } catch (err: any) {
    logger.error('Inducciones update error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/inducciones/:id — eliminar ruta (solo admin)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM inducciones_rutas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ruta eliminada' });
  } catch (err) {
    logger.error('Inducciones delete error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
