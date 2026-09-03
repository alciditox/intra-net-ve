import { pool } from '../src/config/db';

async function migrate() {
  console.log('Migrando tabla emergencias_info y columnas medicas...');

  // 1. Columnas en usuarios
  try {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN tipo_sangre VARCHAR(10) NULL AFTER cumple;`);
  } catch (e: any) {
    if (!e.message.includes('Duplicate column')) console.log('tipo_sangre:', e.message);
  }
  try {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN alergias VARCHAR(255) NULL AFTER tipo_sangre;`);
  } catch (e: any) {
    if (!e.message.includes('Duplicate column')) console.log('alergias:', e.message);
  }
  try {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN condicion_medica VARCHAR(255) NULL AFTER alergias;`);
  } catch (e: any) {
    if (!e.message.includes('Duplicate column')) console.log('condicion_medica:', e.message);
  }
  try {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN emerg_nombre VARCHAR(120) NULL AFTER condicion_medica;`);
  } catch (e: any) {
    if (!e.message.includes('Duplicate column')) console.log('emerg_nombre:', e.message);
  }
  try {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN emerg_telefono VARCHAR(30) NULL AFTER emerg_nombre;`);
  } catch (e: any) {
    if (!e.message.includes('Duplicate column')) console.log('emerg_telefono:', e.message);
  }

  // 2. Tabla emergencias_info
  await pool.query(`
    CREATE TABLE IF NOT EXISTS emergencias_info (
      id                   INT PRIMARY KEY DEFAULT 1,
      riesgo_telefono      VARCHAR(50) NOT NULL DEFAULT '911',
      riesgo_texto         VARCHAR(255) NOT NULL DEFAULT 'Llama de inmediato a los servicios de emergencia',
      pasos                JSON NOT NULL,
      aseguradora_empresa  VARCHAR(255) NOT NULL,
      aseguradora_producto VARCHAR(255) NOT NULL,
      aseguradora_poliza   VARCHAR(100) NOT NULL,
      aseguradora_suma     VARCHAR(100) NOT NULL,
      cobertura_items      JSON NOT NULL,
      no_cubre_items       JSON NOT NULL,
      contactos            JSON NOT NULL,
      updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  // 3. Seed inicial de emergencias_info si está vacía
  const [rows]: any = await pool.query(`SELECT id FROM emergencias_info WHERE id = 1`);
  if (rows.length === 0) {
    const defaultData = {
      riesgo_telefono: '911',
      riesgo_texto: 'Llama de inmediato a los servicios de emergencia',
      pasos: JSON.stringify([
        'Mantén la calma y evalúa si hay riesgo de vida. Si lo hay, llama primero a emergencias (911).',
        'Comunícate con la línea 24/7 de la aseguradora e indica el número de póliza para activar la carta aval.',
        'Acude a una clínica de la red; presenta tu cédula y el número de póliza.',
        'Avisa a Capital Humano lo antes posible para acompañar el caso y la carga familiar.',
        'Conserva informes y facturas para cualquier reembolso o seguimiento.'
      ]),
      aseguradora_empresa: 'Seguros Caracas · Grupo VEPAGOS (Consultora Alca, C.A.)',
      aseguradora_producto: 'Póliza colectiva de HCM (Hospitalización, Cirugía y Maternidad)',
      aseguradora_poliza: 'HCM-ALCA-2026-00417',
      aseguradora_suma: '$20.000 por persona / año',
      cobertura_items: JSON.stringify([
        'Cobertura de emergencias, hospitalización, cirugía y maternidad.',
        'Atención en clínicas de la red nacional sin desembolso (carta aval).',
        'Emergencias cubiertas 24/7, incluye accidentes laborales.',
        'Titular + carga familiar directa registrada en Capital Humano.',
        'Baremo de emergencia activable las 24 horas por la línea de la aseguradora.'
      ]),
      no_cubre_items: JSON.stringify([
        'Tratamientos estéticos no reconstructivos',
        'Enfermedades preexistentes no declaradas',
        'Gastos sin autorización previa fuera de emergencia'
      ]),
      contactos: JSON.stringify([
        { nombre: 'Emergencias nacionales', dato: '911', sub: 'Policía · Bomberos · Ambulancia' },
        { nombre: 'Línea 24/7 aseguradora — Seguros Caracas', dato: '0500-2255000', sub: 'Activación de carta aval · indica tu N° de póliza' },
        { nombre: 'Ambulancia privada', dato: '0212-5555911', sub: 'Traslados de emergencia red HCM' }
      ])
    };

    await pool.query(
      `INSERT INTO emergencias_info (id, riesgo_telefono, riesgo_texto, pasos, aseguradora_empresa, aseguradora_producto, aseguradora_poliza, aseguradora_suma, cobertura_items, no_cubre_items, contactos)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        defaultData.riesgo_telefono,
        defaultData.riesgo_texto,
        defaultData.pasos,
        defaultData.aseguradora_empresa,
        defaultData.aseguradora_producto,
        defaultData.aseguradora_poliza,
        defaultData.aseguradora_suma,
        defaultData.cobertura_items,
        defaultData.no_cubre_items,
        defaultData.contactos
      ]
    );
    console.log('✅ Datos iniciales de emergencias_info insertados.');
  }

  // 4. Registrar pantalla adminemergencias
  await pool.query(`
    INSERT IGNORE INTO pantallas (id, titulo, grupo, padre_id, icono, href_externo, orden)
    VALUES ('adminemergencias', 'Emergencias', 'personal', 'adminmenu', NULL, NULL, 8);
  `);
  await pool.query(`
    INSERT IGNORE INTO perfil_pantallas (perfil_key, pantalla_id)
    VALUES ('admin', 'adminemergencias');
  `);

  console.log('✅ Migración de emergencias completada con éxito.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Error migrando emergencias:', err);
  process.exit(1);
});
