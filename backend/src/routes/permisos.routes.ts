import { Router, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getPermsCatalog, getAllPermsForUser, grantPerm, revokePerm } from '../services/permission.service';
import logger from '../utils/logger';

const router = Router();

// GET /api/permisos/catalogo — catálogo de permisos
router.get('/catalogo', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const catalog = await getPermsCatalog();
    res.json(catalog);
  } catch (err) {
    logger.error('Permisos catalog error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/permisos/usuario/:id — permisos de un usuario
router.get('/usuario/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT perfil_key FROM usuarios WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const perms = await getAllPermsForUser(userId, userRows[0].perfil_key);

    // Also get individual permissions (to distinguish from inherited)
    const [individual] = await pool.execute<RowDataPacket[]>(
      'SELECT clave FROM permisos_usuario WHERE usuario_id = ?',
      [userId]
    );

    res.json({
      all: perms,
      individual: (individual as RowDataPacket[]).map(r => r.clave),
    });
  } catch (err) {
    logger.error('Permisos usuario error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/permisos/grant — conceder permiso (solo admin)
router.post('/grant', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { usuario_id, clave } = req.body;
    if (!usuario_id || !clave) {
      res.status(400).json({ error: 'usuario_id y clave son requeridos' });
      return;
    }

    await grantPerm(usuario_id, clave, req.user!.userId);
    res.json({ message: 'Permiso concedido' });
  } catch (err) {
    logger.error('Perm grant error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/permisos/revoke — revocar permiso (solo admin)
router.post('/revoke', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { usuario_id, clave } = req.body;
    if (!usuario_id || !clave) {
      res.status(400).json({ error: 'usuario_id y clave son requeridos' });
      return;
    }

    await revokePerm(usuario_id, clave);
    res.json({ message: 'Permiso revocado' });
  } catch (err) {
    logger.error('Perm revoke error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/permisos/perfil/:key — permisos asignados a un perfil
router.get('/perfil/:key', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT clave FROM permisos_perfil WHERE perfil_key = ?',
      [req.params.key]
    );
    res.json((rows as RowDataPacket[]).map(r => r.clave));
  } catch (err) {
    logger.error('Permisos perfil error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/permisos/perfil/:key — asignar permisos a un perfil (solo admin)
router.put('/perfil/:key', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { permisos } = req.body;
    if (!Array.isArray(permisos)) {
      res.status(400).json({ error: 'permisos debe ser un array de claves' });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM permisos_perfil WHERE perfil_key = ?', [req.params.key]);
      for (const clave of permisos) {
        await conn.execute(
          'INSERT INTO permisos_perfil (perfil_key, clave) VALUES (?, ?)',
          [req.params.key, clave]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ message: 'Permisos del perfil actualizados' });
  } catch (err) {
    logger.error('Permisos perfil update error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
