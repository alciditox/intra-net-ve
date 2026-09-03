import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/documentos — listar (filtro opcional por categoría)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cat = req.query.categoria as string | undefined;
    let sql = 'SELECT * FROM documentos';
    const params: any[] = [];
    if (cat) { sql += ' WHERE categoria_id = ?'; params.push(cat); }
    sql += ' ORDER BY fecha DESC, id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Documentos list error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/documentos/categorias — listar categorías de documentos
router.get('/categorias', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM categorias_documento ORDER BY orden ASC');
    res.json(rows);
  } catch (err) {
    console.error('Categorias list error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/documentos/:id
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM documentos WHERE id = ?', [req.params.id]);
    const arr = rows as any[];
    if (!arr.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(arr[0]);
  } catch (err) {
    console.error('Documento get error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/documentos
router.post('/', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoria_id, nombre, archivo_url, es_real, prompt_texto, fecha, creado_por, departamento, equipo, descripcion } = req.body;
    if (!categoria_id || !nombre) { res.status(400).json({ error: 'categoria_id y nombre son requeridos' }); return; }
    const [result] = await pool.execute(
      `INSERT INTO documentos (categoria_id, nombre, archivo_url, es_real, prompt_texto, fecha, creado_por, departamento, equipo, descripcion)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [categoria_id, nombre, archivo_url || null, es_real ? 1 : 0, prompt_texto || null, fecha || null, creado_por || null, departamento || null, equipo || null, descripcion || null]
    );
    res.status(201).json({ id: (result as any).insertId, message: 'Documento creado' });
  } catch (err) {
    console.error('Documento create error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/documentos/:id
router.put('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ['categoria_id', 'nombre', 'archivo_url', 'es_real', 'prompt_texto', 'fecha', 'creado_por', 'departamento', 'equipo', 'descripcion'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (!fields.length) { res.status(400).json({ error: 'No hay campos para actualizar' }); return; }
    values.push(req.params.id);
    await pool.execute(`UPDATE documentos SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Documento actualizado' });
  } catch (err) {
    console.error('Documento update error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/documentos/:id
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM documentos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Documento eliminado' });
  } catch (err) {
    console.error('Documento delete error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
