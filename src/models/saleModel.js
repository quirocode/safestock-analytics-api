const db = require('../config/db');

async function listSales({ limit, offset }) {
  const result = await db.query(
    `SELECT
       v.id,
       v.fecha,
       v.subtotal,
       v.igv,
       v.total,
       u.id AS usuario_id,
       u.nombres AS usuario_nombres,
       u.apellidos AS usuario_apellidos,
       u.correo AS usuario_correo,
       COALESCE(
         json_agg(
           json_build_object(
             'id', vd.id,
             'productoId', p.id,
             'sku', p.sku,
             'nombre', p.nombre,
             'cantidad', vd.cantidad,
             'precioUnitario', vd.precio_unitario,
             'subtotal', vd.subtotal
           )
           ORDER BY vd.id ASC
         ) FILTER (WHERE vd.id IS NOT NULL),
         '[]'
       ) AS detalles
     FROM ventas v
     INNER JOIN usuarios u ON u.id = v.id_usuario
     LEFT JOIN ventas_detalle vd ON vd.id_venta = v.id
     LEFT JOIN productos p ON p.id = vd.id_producto
     GROUP BY v.id, u.id
     ORDER BY v.fecha DESC, v.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

module.exports = {
  listSales,
  pool: db.pool
};
