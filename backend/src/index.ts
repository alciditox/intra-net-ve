import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger';

import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import usersRoutes from './routes/users.routes';
import perfilesRoutes from './routes/perfiles.routes';
import pantallasRoutes from './routes/pantallas.routes';
import permisosRoutes from './routes/permisos.routes';
import documentosRoutes from './routes/documentos.routes';
import vacantesRoutes from './routes/vacantes.routes';
import candidatosRoutes from './routes/candidatos.routes';
import activosRoutes from './routes/activos.routes';
import metasRoutes from './routes/metas.routes';
import induccionesRoutes from './routes/inducciones.routes';
import culturaRoutes from './routes/cultura.routes';
import emergenciasRoutes from './routes/emergencias.routes';
import pool from './config/database';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ───────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Deshabilitado para permitir inline scripts del portal
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Rate Limiting en autenticación ───────────────────────
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,             // máx 10 intentos por minuto por IP
  message: { error: 'Demasiados intentos de autenticación. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Servir archivos estáticos del portal (frontend)
const portalPath = process.env.PORTAL_PATH || path.join(__dirname, '..', '..', 'portal');
app.use(express.static(portalPath));

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/perfiles', perfilesRoutes);
app.use('/api/pantallas', pantallasRoutes);
app.use('/api/permisos', permisosRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/vacantes', vacantesRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api/activos', activosRoutes);
app.use('/api/metas', metasRoutes);
app.use('/api/inducciones', induccionesRoutes);
app.use('/api/cultura', culturaRoutes);
app.use('/api/emergencias', emergenciasRoutes);

// Health check profundo — verifica MySQL
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 AS ok');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (err) {
    logger.error('Health check falló: MySQL no disponible', { error: (err as Error).message });
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// SPA fallback — sirve index.html para cualquier ruta no-API
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(portalPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  logger.info(`Servidor Somos VEPAGOS corriendo en http://localhost:${PORT}`);
  logger.info(`Sirviendo frontend desde: ${portalPath}`);
  logger.info(`API disponible en http://localhost:${PORT}/api`);
});

export default app;

