const db = require('../config/db');

async function findByEmail(correo) {
  const result = await db.query(
    `SELECT
       u.id,
       u.correo,
       u.password_hash,
       u.nombres,
       u.apellidos,
       u.estado,
       u.rol_id,
       r.nombre AS rol_nombre
     FROM usuarios u
     INNER JOIN roles r ON r.id = u.rol_id
     WHERE u.correo = $1
     LIMIT 1`,
    [correo]
  );

  return result.rows[0] || null;
}

async function findById(id) {
  const result = await db.query(
    `SELECT
       u.id,
       u.correo,
       u.nombres,
       u.apellidos,
       u.estado,
       u.rol_id,
       r.nombre AS rol_nombre
     FROM usuarios u
     INNER JOIN roles r ON r.id = u.rol_id
     WHERE u.id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateLastAccess(id) {
  await db.query(
    'UPDATE usuarios SET ultimo_acceso_en = NOW(), actualizado_en = NOW() WHERE id = $1',
    [id]
  );
}

async function updateProfile(id, { nombres, apellidos }) {
  const result = await db.query(
    `UPDATE usuarios
     SET nombres = $2,
         apellidos = $3,
         actualizado_en = NOW()
     WHERE id = $1
       AND estado = 'activo'
     RETURNING id, correo, nombres, apellidos, estado, rol_id`,
    [id, nombres, apellidos]
  );

  return result.rows[0] || null;
}

async function findAllWithoutPasswords() {
  const result = await db.query(
    `SELECT
       u.id,
       u.correo,
       u.nombres,
       u.apellidos,
       u.estado,
       u.rol_id,
       r.nombre AS rol_nombre,
       u.ultimo_acceso_en,
       u.creado_en,
       u.actualizado_en
     FROM usuarios u
     INNER JOIN roles r ON r.id = u.rol_id
     ORDER BY u.apellidos ASC, u.nombres ASC`,
    []
  );

  return result.rows;
}

module.exports = {
  findByEmail,
  findById,
  updateLastAccess,
  updateProfile,
  findAllWithoutPasswords
};
