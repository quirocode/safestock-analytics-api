const AnalyticsRepositoryPort = require('../domain/analytics-repository-port');

class PostgresAnalyticsRepository extends AnalyticsRepositoryPort {
  constructor(database, timeZone) {
    super();
    this.database = database;
    this.timeZone = timeZone;
  }

  async summary() {
    const result = await this.database.query(
      `WITH bounds AS (
         SELECT
           (((NOW() AT TIME ZONE $1)::date)::timestamp AT TIME ZONE $1) AS start_at,
           ((((NOW() AT TIME ZONE $1)::date + 1)::timestamp) AT TIME ZONE $1) AS end_at
       ),
       sales AS (
         SELECT
           COALESCE(SUM(total) FILTER (WHERE estado = 'REGISTRADA'), 0)::numeric(12, 2) AS total_ventas_hoy,
           COUNT(*) FILTER (WHERE estado = 'REGISTRADA')::int AS transacciones_hoy
         FROM ventas, bounds
         WHERE fecha >= start_at AND fecha < end_at
       ),
       stock AS (
         SELECT COUNT(*)::int AS productos_bajo_stock
         FROM productos
         WHERE estado = 'activo' AND stock_actual <= stock_minimo
       )
       SELECT * FROM sales CROSS JOIN stock`,
      [this.timeZone]
    );
    return result.rows[0];
  }

  async lowStock() {
    const result = await this.database.query(
      `SELECT nombre, sku, stock_actual AS cantidad_restante, stock_minimo
       FROM productos
       WHERE estado = 'activo' AND stock_actual <= stock_minimo
       ORDER BY stock_actual, nombre`
    );
    return result.rows;
  }

  async suspicious() {
    const result = await this.database.query(
      `SELECT id, tipo, entidad, entidad_id, descripcion, severidad, fecha_hora
       FROM eventos_auditoria
       ORDER BY fecha_hora DESC
       LIMIT 20`
    );
    return result.rows;
  }

  async advanced(days = 30) {
    const result = await this.database.query(
      `WITH dates AS (
         SELECT generate_series(
           CURRENT_DATE - ($1::int - 1),
           CURRENT_DATE,
           INTERVAL '1 day'
         )::date AS sale_date
       ),
       daily AS (
         SELECT
           (fecha AT TIME ZONE $2)::date AS sale_date,
           COALESCE(SUM(total) FILTER (WHERE estado = 'REGISTRADA'), 0)::numeric(12, 2) AS total,
           COUNT(*) FILTER (WHERE estado = 'REGISTRADA')::int AS transactions
         FROM ventas
         WHERE (fecha AT TIME ZONE $2)::date >= CURRENT_DATE - ($1::int - 1)
         GROUP BY (fecha AT TIME ZONE $2)::date
       ),
       top_products AS (
         SELECT
           p.sku,
           p.nombre,
           SUM(vd.cantidad)::int AS cantidad,
           SUM(vd.subtotal)::numeric(12, 2) AS monto
         FROM ventas_detalle vd
         JOIN ventas v ON v.id = vd.id_venta
         JOIN productos p ON p.id = vd.id_producto
         WHERE v.estado = 'REGISTRADA'
           AND (v.fecha AT TIME ZONE $2)::date >= CURRENT_DATE - ($1::int - 1)
         GROUP BY p.id
         ORDER BY cantidad DESC
         LIMIT 10
       )
       SELECT
         COALESCE((
           SELECT json_agg(
             json_build_object(
               'fecha', d.sale_date,
               'total', COALESCE(x.total, 0),
               'transacciones', COALESCE(x.transactions, 0)
             ) ORDER BY d.sale_date
           )
           FROM dates d
           LEFT JOIN daily x USING (sale_date)
         ), '[]') AS series,
         COALESCE((SELECT json_agg(top_products) FROM top_products), '[]') AS top_products`,
      [days, this.timeZone]
    );
    return result.rows[0];
  }

  async salesReport({ from, to }) {
    const result = await this.database.query(
      `SELECT v.id, v.fecha, v.estado, v.subtotal, v.igv, v.total, u.correo AS cajero
       FROM ventas v
       JOIN usuarios u ON u.id = v.id_usuario
       WHERE ($1::date IS NULL OR v.fecha >= $1::date)
         AND ($2::date IS NULL OR v.fecha < $2::date + INTERVAL '1 day')
       ORDER BY v.fecha DESC`,
      [from || null, to || null]
    );
    return result.rows;
  }
}

module.exports = PostgresAnalyticsRepository;
