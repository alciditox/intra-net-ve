import { Router, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { authMiddleware } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/emergencias — obtener la información institucional de emergencias y póliza HCM
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM emergencias_info WHERE id = 1 LIMIT 1'
    );

    if (rows.length === 0) {
      res.json({
        id: 1,
        riesgo_telefono: '911',
        riesgo_texto: 'Llama de inmediato a los servicios de emergencia',
        pasos: [
          'Mantén la calma y evalúa si hay riesgo de vida. Si lo hay, llama primero a emergencias (911).',
          'Comunícate con la línea 24/7 de la aseguradora e indica el número de póliza para activar la carta aval.',
          'Acude a una clínica de la red; presenta tu cédula y el número de póliza.',
          'Avisa a Capital Humano lo antes posible para acompañar el caso y la carga familiar.',
          'Conserva informes y facturas para cualquier reembolso o seguimiento.'
        ],
        aseguradora_empresa: 'Seguros Caracas · Grupo VEPAGOS (Consultora Alca, C.A.)',
        aseguradora_producto: 'Póliza colectiva de HCM (Hospitalización, Cirugía y Maternidad)',
        aseguradora_poliza: 'HCM-ALCA-2026-00417',
        aseguradora_suma: '$20.000 por persona / año',
        cobertura_items: [
          'Cobertura de emergencias, hospitalización, cirugía y maternidad.',
          'Atención en clínicas de la red nacional sin desembolso (carta aval).',
          'Emergencias cubiertas 24/7, incluye accidentes laborales.',
          'Titular + carga familiar directa registrada en Capital Humano.',
          'Baremo de emergencia activable las 24 horas por la línea de la aseguradora.'
        ],
        no_cubre_items: [
          'Tratamientos estéticos no reconstructivos',
          'Enfermedades preexistentes no declaradas',
          'Gastos sin autorización previa fuera de emergencia'
        ],
        contactos: [
          { nombre: 'Emergencias nacionales', dato: '911', sub: 'Policía · Bomberos · Ambulancia' },
          { nombre: 'Línea 24/7 aseguradora — Seguros Caracas', dato: '0500-2255000', sub: 'Activación de carta aval · indica tu N° de póliza' },
          { nombre: 'Ambulancia privada', dato: '0212-5555911', sub: 'Traslados de emergencia red HCM' }
        ]
      });
      return;
    }

    const row = rows[0] as any;
    res.json({
      id: row.id,
      riesgo_telefono: row.riesgo_telefono || '911',
      riesgo_texto: row.riesgo_texto || 'Llama de inmediato a los servicios de emergencia',
      pasos: typeof row.pasos === 'string' ? JSON.parse(row.pasos) : (row.pasos || []),
      aseguradora_empresa: row.aseguradora_empresa || '',
      aseguradora_producto: row.aseguradora_producto || '',
      aseguradora_poliza: row.aseguradora_poliza || '',
      aseguradora_suma: row.aseguradora_suma || '',
      cobertura_items: typeof row.cobertura_items === 'string' ? JSON.parse(row.cobertura_items) : (row.cobertura_items || []),
      no_cubre_items: typeof row.no_cubre_items === 'string' ? JSON.parse(row.no_cubre_items) : (row.no_cubre_items || []),
      contactos: typeof row.contactos === 'string' ? JSON.parse(row.contactos) : (row.contactos || []),
      updated_at: row.updated_at
    });
  } catch (err) {
    console.error('Emergencias get error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/emergencias — actualizar información institucional de emergencias (admin o rrhh)
router.put('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.perfil !== 'admin' && req.user?.perfil !== 'rrhh') {
      res.status(403).json({ error: 'Solo administradores o Talento Humano pueden modificar esta información' });
      return;
    }

    const {
      riesgo_telefono,
      riesgo_texto,
      pasos,
      aseguradora_empresa,
      aseguradora_producto,
      aseguradora_poliza,
      aseguradora_suma,
      cobertura_items,
      no_cubre_items,
      contactos
    } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (riesgo_telefono !== undefined) { fields.push('riesgo_telefono = ?'); values.push(riesgo_telefono); }
    if (riesgo_texto !== undefined) { fields.push('riesgo_texto = ?'); values.push(riesgo_texto); }
    if (pasos !== undefined) { fields.push('pasos = ?'); values.push(JSON.stringify(pasos)); }
    if (aseguradora_empresa !== undefined) { fields.push('aseguradora_empresa = ?'); values.push(aseguradora_empresa); }
    if (aseguradora_producto !== undefined) { fields.push('aseguradora_producto = ?'); values.push(aseguradora_producto); }
    if (aseguradora_poliza !== undefined) { fields.push('aseguradora_poliza = ?'); values.push(aseguradora_poliza); }
    if (aseguradora_suma !== undefined) { fields.push('aseguradora_suma = ?'); values.push(aseguradora_suma); }
    if (cobertura_items !== undefined) { fields.push('cobertura_items = ?'); values.push(JSON.stringify(cobertura_items)); }
    if (no_cubre_items !== undefined) { fields.push('no_cubre_items = ?'); values.push(JSON.stringify(no_cubre_items)); }
    if (contactos !== undefined) { fields.push('contactos = ?'); values.push(JSON.stringify(contactos)); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No se enviaron campos para actualizar' });
      return;
    }

    values.push(1); // WHERE id = 1
    await pool.execute(
      `UPDATE emergencias_info SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Información de emergencias actualizada exitosamente' });
  } catch (err) {
    console.error('Emergencias put error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
