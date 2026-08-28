import { Router, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

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
    console.error('Inducciones list error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/inducciones/perfil/:key — ruta de inducción para un perfil específico
router.get('/perfil/:key', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM inducciones_rutas WHERE perfil_key = ? AND activa = 1',
      [req.params.key]
    );
    if (rows.length === 0) {
      res.json(null);
      return;
    }
    const ruta = rows[0];
    ruta.modulos = typeof ruta.modulos === 'string' ? JSON.parse(ruta.modulos) : ruta.modulos;
    res.json(ruta);
  } catch (err) {
    console.error('Inducciones perfil error:', err);
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
    console.error('Inducciones detail error:', err);
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
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Ya existe una ruta para ese perfil' });
      return;
    }
    console.error('Inducciones create error:', err);
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
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Ya existe una ruta para ese perfil' });
      return;
    }
    console.error('Inducciones update error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/inducciones/:id — eliminar ruta (solo admin)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM inducciones_rutas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ruta eliminada' });
  } catch (err) {
    console.error('Inducciones delete error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
