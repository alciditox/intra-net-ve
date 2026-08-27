import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/metas — todo junto
router.get('/', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [config] = await pool.execute('SELECT * FROM metas_config LIMIT 1');
    const [objetivos] = await pool.execute('SELECT * FROM metas_objetivos ORDER BY orden');
    const [kpis] = await pool.execute('SELECT * FROM metas_kpis ORDER BY orden');
    const [historico] = await pool.execute('SELECT * FROM metas_historico ORDER BY orden');
    res.json({
      config: (config as any[])[0] || null,
      objetivos,
      kpis,
      historico
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error interno' }); }
});

// PUT /api/metas/config
router.put('/config', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { vision, norte, updated } = req.body;
    const [existing] = await pool.execute('SELECT id FROM metas_config LIMIT 1');
    if ((existing as any[]).length) {
      const fields: string[] = []; const values: any[] = [];
      if (vision !== undefined) { fields.push('vision = ?'); values.push(vision); }
      if (norte !== undefined) { fields.push('norte = ?'); values.push(norte); }
      if (updated !== undefined) { fields.push('updated = ?'); values.push(updated); }
      if (fields.length) {
        values.push((existing as any[])[0].id);
        await pool.execute(`UPDATE metas_config SET ${fields.join(', ')} WHERE id = ?`, values);
      }
    } else {
      await pool.execute('INSERT INTO metas_config (vision, norte, updated) VALUES (?,?,?)',
        [vision || '', norte || '', updated || null]);
    }
    res.json({ message: 'Config actualizada' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error interno' }); }
});

// POST /api/metas/objetivos
router.post('/objetivos', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { titulo, descripcion, metrica, plazo, orden } = req.body;
    if (!titulo) { res.status(400).json({ error: 'titulo es requerido' }); return; }
    const [result] = await pool.execute(
      'INSERT INTO metas_objetivos (titulo,descripcion,metrica,plazo,orden) VALUES (?,?,?,?,?)',
      [titulo, descripcion||null, metrica||null, plazo||null, orden||0]
    );
    res.status(201).json({ id: (result as any).insertId, message: 'Objetivo creado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error interno' }); }
});

// PUT /api/metas/objetivos/:id
router.put('/objetivos/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields: string[] = []; const values: any[] = [];
    for (const k of ['titulo','descripcion','metrica','plazo','orden']) {
      if (req.body[k] !== undefined) { fields.push(`${k} = ?`); values.push(req.body[k]); }
    }
    if (!fields.length) { res.status(400).json({ error: 'No hay campos' }); return; }
    values.push(req.params.id);
    await pool.execute(`UPDATE metas_objetivos SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Objetivo actualizado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error interno' }); }
});

// DELETE /api/metas/objetivos/:id
router.delete('/objetivos/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM metas_objetivos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Objetivo eliminado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error interno' }); }
});

// POST /api/metas/kpis
router.post('/kpis', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nombre, actual, meta, direccion, orden } = req.body;
    if (!nombre) { res.status(400).json({ error: 'nombre es requerido' }); return; }
    const [result] = await pool.execute(
      'INSERT INTO metas_kpis (nombre,actual,meta,direccion,orden) VALUES (?,?,?,?,?)',
      [nombre, actual||null, meta||null, direccion||'up', orden||0]
    );
    res.status(201).json({ id: (result as any).insertId, message: 'KPI creado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error interno' }); }
});

// PUT /api/metas/kpis/:id
router.put('/kpis/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields: string[] = []; const values: any[] = [];
    for (const k of ['nombre','actual','meta','direccion','orden']) {
      if (req.body[k] !== undefined) { fields.push(`${k} = ?`); values.push(req.body[k]); }
    }
    if (!fields.length) { res.status(400).json({ error: 'No hay campos' }); return; }
    values.push(req.params.id);
    await pool.execute(`UPDATE metas_kpis SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'KPI actualizado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error interno' }); }
});

// DELETE /api/metas/kpis/:id
router.delete('/kpis/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM metas_kpis WHERE id = ?', [req.params.id]);
    res.json({ message: 'KPI eliminado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error interno' }); }
});

// PUT /api/metas/historico/:id
router.put('/historico/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields: string[] = []; const values: any[] = [];
    for (const k of ['area_key','area','color','bg','intro','orden']) {
      if (req.body[k] !== undefined) { fields.push(`${k} = ?`); values.push(req.body[k]); }
    }
    if (req.body.columnas !== undefined) { fields.push('columnas = ?'); values.push(JSON.stringify(req.body.columnas)); }
    if (req.body.filas !== undefined) { fields.push('filas = ?'); values.push(JSON.stringify(req.body.filas)); }
    if (!fields.length) { res.status(400).json({ error: 'No hay campos' }); return; }
    values.push(req.params.id);
    await pool.execute(`UPDATE metas_historico SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Histórico actualizado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error interno' }); }
});

export default router;
