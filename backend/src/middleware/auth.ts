import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, AuthenticatedRequest } from '../types';

// JWT_SECRET DEBE estar definido; sin fallback inseguro.
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET no está definido en las variables de entorno.');
  console.error('   Defínelo en el archivo .env antes de iniciar el servidor.');
  process.exit(1);
}

export const JWT_SECRET: string = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = '24h';

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Middleware configurable que permite acceso solo a los perfiles indicados.
 * Uso: requireRole('admin', 'rrhh')
 */
export function requireRole(...roles: string[]) {
  return function (req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.user || !roles.includes(req.user.perfil)) {
      res.status(403).json({
        error: `Se requiere perfil: ${roles.join(' o ')}`
      });
      return;
    }
    next();
  };
}

/** Alias retrocompatible — solo admin */
export function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.perfil !== 'admin') {
    res.status(403).json({ error: 'Se requiere perfil de Administrador' });
    return;
  }
  next();
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
