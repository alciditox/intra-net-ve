import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, adminOnly, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';

const router = Router();

// ===== Catálogos auxiliares =====
// Map seguro de catálogos permitidos para evitar SQL injection por interpolación de tabla
const CATALOG_TABLES: Record<string, string> = {
  categorias: 'af_cat_categorias',
  sedes: 'af_cat_sedes',
  areas: 'af_cat_areas',
  departamentos: 'af_cat_departamentos',
  estados: 'af_cat_estados',
  unidades: 'af_cat_unidades',
};

router.get('/catalogos', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result: Record<string, any[]> = {};
    for (const [key, tableName] of Object.entries(CATALOG_TABLES)) {
      const [rows] = await pool.execute(`SELECT * FROM \`${tableName}\` ORDER BY orden, nombre`);
      result[key] = rows as any[];
    }
    res.json(result);
  } catch (err) { logger.error('Catalogos error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// ===== Activos fijos =====
router.get('/', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT a.*, u.nombre AS usuario_nombre FROM af_activos a
       LEFT JOIN usuarios u ON a.usuario_id = u.id ORDER BY a.id`
    );
    res.json(rows);
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

router.post('/', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = req.body;
    if (!b.id || !b.categoria || !b.descripcion) { res.status(400).json({ error: 'id, categoria y descripcion son requeridos' }); return; }
    await pool.execute(
      `INSERT INTO af_activos (id,categoria,descripcion,marca,modelo,serial,fecha_compra,costo,proveedor,factura,sede,area,departamento,usuario_id,fecha_asig,estado,estado_fisico,ultimo_inv,creado_por,obs)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.id, b.categoria, b.descripcion, b.marca||null, b.modelo||null, b.serial||null, b.fecha_compra||null, b.costo||null, b.proveedor||null, b.factura||null, b.sede||null, b.area||null, b.departamento||null, b.usuario_id||null, b.fecha_asig||null, b.estado||'Disponible', b.estado_fisico||null, b.ultimo_inv||null, b.creado_por||null, b.obs||'']
    );
    res.status(201).json({ id: b.id, message: 'Activo creado' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

router.put('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allowed = ['categoria','descripcion','marca','modelo','serial','fecha_compra','costo','proveedor','factura','sede','area','departamento','usuario_id','fecha_asig','estado','estado_fisico','ultimo_inv','creado_por','obs'];
    const fields: string[] = []; const values: any[] = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { fields.push(`${k} = ?`); values.push(req.body[k]); }
    }
    if (!fields.length) { res.status(400).json({ error: 'No hay campos' }); return; }
    values.push(req.params.id);
    await pool.execute(`UPDATE af_activos SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Activo actualizado' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM af_activos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Activo eliminado' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// ===== Consumibles =====
router.get('/consumibles', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const almacen = req.query.almacen as string | undefined;
    let sql = 'SELECT * FROM af_consumibles';
    const params: any[] = [];
    if (almacen) { sql += ' WHERE almacen = ?'; params.push(almacen); }
    sql += ' ORDER BY id';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

router.post('/consumibles', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, nombre, unidad, minimo, ubicacion, almacen } = req.body;
    if (!id || !nombre) { res.status(400).json({ error: 'id y nombre son requeridos' }); return; }
    await pool.execute('INSERT INTO af_consumibles (id,nombre,unidad,minimo,ubicacion,almacen) VALUES (?,?,?,?,?,?)',
      [id, nombre, unidad||'Unidad', minimo||0, ubicacion||null, almacen||'consumibles']);
    res.status(201).json({ id, message: 'Consumible creado' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// ===== Stock (movimientos) =====
router.get('/stock', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM af_movimientos ORDER BY fecha DESC, id DESC');
    res.json(rows);
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

router.post('/stock', authMiddleware, requireRole('admin', 'rrhh'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { articulo_id, tipo, cantidad, fecha, referencia, por, departamento, para } = req.body;
    if (!articulo_id || !tipo || !cantidad) { res.status(400).json({ error: 'articulo_id, tipo y cantidad son requeridos' }); return; }
    const [result] = await pool.execute(
      'INSERT INTO af_movimientos (articulo_id,tipo,cantidad,fecha,referencia,por,departamento,para) VALUES (?,?,?,?,?,?,?,?)',
      [articulo_id, tipo, cantidad, fecha||null, referencia||null, por||null, departamento||null, para||null]
    );
    res.status(201).json({ id: (result as any).insertId, message: 'Movimiento registrado' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// ===== Proveedores =====
router.get('/proveedores', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM af_proveedores ORDER BY razon');
    res.json(rows);
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

router.post('/proveedores', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { razon, rif, contacto, condiciones } = req.body;
    if (!razon) { res.status(400).json({ error: 'razon es requerido' }); return; }
    const [result] = await pool.execute('INSERT INTO af_proveedores (razon,rif,contacto,condiciones) VALUES (?,?,?,?)',
      [razon, rif||null, contacto||null, condiciones||null]);
    res.status(201).json({ id: (result as any).insertId, message: 'Proveedor creado' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

// ===== Solicitudes de compra =====
router.get('/solicitudes', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, u.nombre AS solicitante_nombre FROM af_solicitudes_compra s
       LEFT JOIN usuarios u ON s.solicitante_id = u.id ORDER BY s.fecha DESC`
    );
    res.json(rows);
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

router.post('/solicitudes', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, solicitante_id, departamento, items, justificacion, estado, fecha } = req.body;
    if (!id || !items) { res.status(400).json({ error: 'id e items son requeridos' }); return; }
    await pool.execute(
      'INSERT INTO af_solicitudes_compra (id,solicitante_id,departamento,items,justificacion,estado,fecha) VALUES (?,?,?,?,?,?,?)',
      [id, solicitante_id||null, departamento||null, JSON.stringify(items), justificacion||null, estado||'Enviada', fecha||null]
    );
    res.status(201).json({ id, message: 'Solicitud creada' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

router.put('/solicitudes/:id', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields: string[] = []; const values: any[] = [];
    for (const k of ['estado', 'aprobado_por', 'aprobado_fecha']) {
      if (req.body[k] !== undefined) { fields.push(`${k} = ?`); values.push(req.body[k]); }
    }
    if (!fields.length) { res.status(400).json({ error: 'No hay campos' }); return; }
    values.push(req.params.id);
    await pool.execute(`UPDATE af_solicitudes_compra SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Solicitud actualizada' });
  } catch (err) { logger.error('Error', { error: (err as Error).message }); res.status(500).json({ error: 'Error interno' }); }
});

export default router;
