const db = require('../config/db');

async function findActive() {
  const result = await db.query(
    `SELECT
       id,
       sku,
       nombre,
       categoria,
       precio,
       stock_actual,
       estado,
       creado_en,
       actualizado_en
     FROM productos
     WHERE estado = 'activo'
     ORDER BY nombre ASC`,
    []
  );

  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT
       id,
       sku,
       nombre,
       categoria,
       precio,
       stock_actual,
       estado,
       creado_en,
       actualizado_en
     FROM productos
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateById(id, { nombre, categoria, precio }) {
  const result = await db.query(
    `UPDATE productos
     SET nombre = $2,
         categoria = $3,
         precio = $4,
         actualizado_en = NOW()
     WHERE id = $1
     RETURNING
       id,
       sku,
       nombre,
       categoria,
       precio,
       stock_actual,
       estado,
       creado_en,
       actualizado_en`,
    [id, nombre, categoria, precio]
  );

  return result.rows[0] || null;
}

module.exports = {
  findActive,
  findById,
  updateById
};
