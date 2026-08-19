import { Router, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getScreensForProfile, setScreensForProfile } from '../services/menu.service';

const router = Router();

// GET /api/pantallas — listar todas las pantallas
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM pantallas ORDER BY grupo, orden'
    );
    res.json(rows);
  } catch (err) {
    console.error('Pantallas list error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/pantallas/perfil/:key — pantallas de un perfil
router.get('/perfil/:key', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const screens = await getScreensForProfile(req.params.key);
    res.json(screens);
  } catch (err) {
    console.error('Pantallas perfil error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/pantallas/perfil/:key — asignar pantallas a un perfil (solo admin)
router.put('/perfil/:key', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pantallas } = req.body;
    if (!Array.isArray(pantallas)) {
      res.status(400).json({ error: 'pantallas debe ser un array de IDs' });
      return;
    }

    await setScreensForProfile(req.params.key, pantallas);
    res.json({ message: 'Pantallas actualizadas para el perfil' });
  } catch (err) {
    console.error('Pantallas perfil update error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/pantallas — crear pantalla (solo admin)
router.post('/', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, titulo, grupo, padre_id, icono, href_externo, orden } = req.body;
    if (!id || !titulo || !grupo) {
      res.status(400).json({ error: 'id, titulo y grupo son requeridos' });
      return;
    }

    await pool.execute(
      'INSERT INTO pantallas (id, titulo, grupo, padre_id, icono, href_externo, orden) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, titulo, grupo, padre_id || null, icono || null, href_externo || null, orden || 0]
    );
    res.status(201).json({ message: 'Pantalla creada' });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Ya existe una pantalla con ese ID' });
      return;
    }
    console.error('Pantalla create error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/pantallas/:id — modificar pantalla (solo admin)
router.put('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { titulo, grupo, padre_id, icono, href_externo, orden } = req.body;
    const fields: string[] = [];
    const values: any[] = [];

    if (titulo !== undefined) { fields.push('titulo = ?'); values.push(titulo); }
    if (grupo !== undefined) { fields.push('grupo = ?'); values.push(grupo); }
    if (padre_id !== undefined) { fields.push('padre_id = ?'); values.push(padre_id || null); }
    if (icono !== undefined) { fields.push('icono = ?'); values.push(icono); }
    if (href_externo !== undefined) { fields.push('href_externo = ?'); values.push(href_externo || null); }
    if (orden !== undefined) { fields.push('orden = ?'); values.push(orden); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(req.params.id);
    await pool.execute(`UPDATE pantallas SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Pantalla actualizada' });
  } catch (err) {
    console.error('Pantalla update error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/pantallas/:id — eliminar pantalla (solo admin)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM pantallas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Pantalla eliminada' });
  } catch (err) {
    console.error('Pantalla delete error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
