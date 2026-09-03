import { Router, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

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
    res.json({
      id: row.id,
      proposito_titulo: row.proposito_titulo,
      proposito_desc: row.proposito_desc,
      mision: row.mision,
      vision: row.vision,
      valores: typeof row.valores === 'string' ? JSON.parse(row.valores) : (row.valores || []),
      flywheel: typeof row.flywheel === 'string' ? JSON.parse(row.flywheel) : (row.flywheel || []),
      perks: typeof row.perks === 'string' ? JSON.parse(row.perks) : (row.perks || []),
      updated_at: row.updated_at
    });
  } catch (err) {
    console.error('Cultura get error:', err);
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

    await pool.execute(
      `UPDATE cultura_organizacional SET ${fields.join(', ')} WHERE id = 1`,
      values
    );

    res.json({ message: 'Cultura organizacional actualizada exitosamente' });
  } catch (err: any) {
    console.error('Cultura update error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
