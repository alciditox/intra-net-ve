import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import usersRoutes from './routes/users.routes';
import perfilesRoutes from './routes/perfiles.routes';
import pantallasRoutes from './routes/pantallas.routes';
import permisosRoutes from './routes/permisos.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir archivos estáticos del portal (frontend)
const portalPath = process.env.PORTAL_PATH || path.join(__dirname, '..', '..', 'portal');
app.use(express.static(portalPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/perfiles', perfilesRoutes);
app.use('/api/pantallas', pantallasRoutes);
app.use('/api/permisos', permisosRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback — sirve index.html para cualquier ruta no-API
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(portalPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`\n  🟢  Servidor Somos VEPAGOS corriendo en http://localhost:${PORT}`);
  console.log(`  📁  Sirviendo frontend desde: ${portalPath}`);
  console.log(`  🔗  API disponible en http://localhost:${PORT}/api\n`);
});

export default app;
