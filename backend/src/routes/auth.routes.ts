import { Router, Response } from 'express';
import { login, getUserById } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getAllPermsForUser } from '../services/permission.service';
import { getBaseChain } from '../services/menu.service';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password, cedula } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Correo y contraseña son requeridos' });
      return;
    }

    const result = await login(email, password, cedula);
    if (!result) {
      res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      return;
    }

    res.json(result);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me — perfil del usuario autenticado
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Get role label
    const [perfilRows] = await pool.execute<RowDataPacket[]>(
      'SELECT label FROM perfiles WHERE `key` = ?',
      [user.perfil_key]
    );
    const perfilLabel = perfilRows.length > 0 ? perfilRows[0].label : user.perfil_key;

    // Get permissions
    const permisos = await getAllPermsForUser(user.id, user.perfil_key);

    // Get base chain
    const chain = await getBaseChain(user.perfil_key);

    // Check if has reports
    const [reportsRows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM usuarios WHERE supervisor_id = ? AND activo = 1 LIMIT 1',
      [user.id]
    );
    const tieneReportes = reportsRows.length > 0;

    res.json({
      ...user,
      perfilLabel,
      permisos,
      roleChain: chain,
      tieneReportes,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
