const db = require('../config/db');

async function listCurrentStock() {
  const result = await db.query(
    `SELECT
       sku,
       nombre,
       stock_actual
     FROM productos
     ORDER BY nombre ASC`,
    []
  );

  return result.rows;
}

async function listMovements({ limit, offset }) {
  const result = await db.query(
    `SELECT
       hi.id,
       hi.tipo_movimiento,
       hi.cantidad,
       hi.fecha_hora,
       p.id AS producto_id,
       p.sku AS producto_sku,
       p.nombre AS producto_nombre,
       u.id AS usuario_id,
       u.nombres AS usuario_nombres,
       u.apellidos AS usuario_apellidos,
       u.correo AS usuario_correo
     FROM historial_inventario hi
     INNER JOIN productos p ON p.id = hi.producto_id
     INNER JOIN usuarios u ON u.id = hi.usuario_id
     ORDER BY hi.fecha_hora DESC, hi.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

module.exports = {
  listCurrentStock,
  listMovements
};
