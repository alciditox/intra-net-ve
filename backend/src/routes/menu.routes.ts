import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getMenuForUser, userHasReports, userIsApprover } from '../services/menu.service';
import logger from '../utils/logger';

const router = Router();

// GET /api/menu — menú del usuario autenticado, resuelto por backend
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const tieneReportes = await userHasReports(req.user.userId);
    const esAprobador = await userIsApprover(req.user.userId);

    const menu = await getMenuForUser(
      req.user.userId,
      req.user.perfil,
      tieneReportes,
      esAprobador
    );

    res.json(menu);
  } catch (err) {
    logger.error('Menu error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
