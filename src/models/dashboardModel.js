const db = require('../config/db');

async function getSummary({ timeZone }) {
  const result = await db.query(
    `WITH limites_dia AS (
       SELECT
         (((NOW() AT TIME ZONE $1)::date)::timestamp AT TIME ZONE $1) AS inicio,
         ((((NOW() AT TIME ZONE $1)::date + 1)::timestamp) AT TIME ZONE $1) AS fin
     ),
     ventas_hoy AS (
       SELECT
         COALESCE(SUM(v.total), 0)::NUMERIC(12, 2) AS total_ventas_hoy,
         COUNT(*)::INTEGER AS transacciones_hoy
       FROM ventas v
       CROSS JOIN limites_dia ld
       WHERE v.fecha >= ld.inicio
         AND v.fecha < ld.fin
     ),
     bajo_stock AS (
       SELECT COUNT(*)::INTEGER AS productos_bajo_stock
       FROM productos p
       WHERE p.estado = 'activo'
         AND p.stock_actual <= p.stock_minimo
     )
     SELECT
       vh.total_ventas_hoy,
       vh.transacciones_hoy,
       bs.productos_bajo_stock
     FROM ventas_hoy vh
     CROSS JOIN bajo_stock bs`,
    [timeZone]
  );

  return result.rows[0];
}

module.exports = {
  getSummary
};
