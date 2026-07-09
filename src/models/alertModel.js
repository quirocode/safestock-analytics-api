const db = require('../config/db');

async function listLowStockProducts() {
  const result = await db.query(
    `SELECT
       nombre,
       sku,
       stock_actual AS cantidad_restante,
       stock_minimo
     FROM productos
     WHERE estado = 'activo'
       AND stock_actual <= stock_minimo
     ORDER BY stock_actual ASC, nombre ASC`,
    []
  );

  return result.rows;
}

module.exports = {
  listLowStockProducts
};
