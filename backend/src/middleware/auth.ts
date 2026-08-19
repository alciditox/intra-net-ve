import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, AuthenticatedRequest } from '../types';

export const JWT_SECRET = process.env.JWT_SECRET || 'vepagos_intranet_secret_2026';
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
