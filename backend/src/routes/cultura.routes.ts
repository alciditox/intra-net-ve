import { Router, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';

const router = Router();

// GET /api/cultura — obtener la configuración de cultura organizacional
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM cultura_organizacional WHERE id = 1 LIMIT 1'
    );

    if (rows.length === 0) {
      // Fallback si la tabla está vacía
      res.json({
        id: 1,
        proposito_titulo: '“Hacer crecer tu negocio.”',
        proposito_desc: 'No es un eslogan pegado en la pared. Es la vara con la que medimos cada decisión: si ayuda a que un comercio venda más, vamos por ahí. Es la promesa que le hacemos al cliente y el trabajo de todos los que formamos VEPAGOS.',
        mision: 'Facilitar el cobro electrónico a cada comercio de Venezuela con tecnología confiable y soporte cercano.',
        vision: 'Ser el aliado de pagos preferido del comercio venezolano.',
        valores: [],
        flywheel: [],
        perks: []
      });
      return;
    }

    const row = rows[0] as any;
    function safeParseJSON(val: any, fallback: any[] = []): any {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return val || fallback;
    }
    res.json({
      id: row.id,
      proposito_titulo: row.proposito_titulo,
      proposito_desc: row.proposito_desc,
      mision: row.mision,
      vision: row.vision,
      valores: safeParseJSON(row.valores),
      flywheel: safeParseJSON(row.flywheel),
      perks: safeParseJSON(row.perks),
      updated_at: row.updated_at
    });
  } catch (err) {
    logger.error('Cultura get error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/cultura — actualizar configuración de cultura organizacional (solo admin)
router.put('/', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { proposito_titulo, proposito_desc, mision, vision, valores, flywheel, perks } = req.body;
    const fields: string[] = [];
    const values: any[] = [];

    if (proposito_titulo !== undefined) { fields.push('proposito_titulo = ?'); values.push(proposito_titulo); }
    if (proposito_desc !== undefined) { fields.push('proposito_desc = ?'); values.push(proposito_desc); }
    if (mision !== undefined) { fields.push('mision = ?'); values.push(mision); }
    if (vision !== undefined) { fields.push('vision = ?'); values.push(vision); }
    if (valores !== undefined) { fields.push('valores = ?'); values.push(JSON.stringify(valores)); }
    if (flywheel !== undefined) { fields.push('flywheel = ?'); values.push(JSON.stringify(flywheel)); }
    if (perks !== undefined) { fields.push('perks = ?'); values.push(JSON.stringify(perks)); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No se enviaron campos para actualizar' });
      return;
    }

    // UPSERT: si la fila id=1 no existe, la crea
    const setCols = fields.join(', ');
    const colNames = fields.map(f => f.split(' = ')[0]).join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    await pool.execute(
      `INSERT INTO cultura_organizacional (id, ${colNames})
       VALUES (1, ${placeholders})
       ON DUPLICATE KEY UPDATE ${setCols}`,
      [...values, ...values]
    );

    res.json({ message: 'Cultura organizacional actualizada exitosamente' });
  } catch (err: any) {
    logger.error('Cultura update error', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
