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

  async suspicious(threshold = 0) {
    const result = await this.database.query(
      `SELECT e.id, e.tipo, e.entidad, e.entidad_id, e.descripcion, e.severidad, e.fecha_hora
       FROM eventos_auditoria e
       LEFT JOIN ventas v ON e.entidad = 'VENTA' AND v.id = e.entidad_id
       WHERE e.tipo <> 'VENTA_MONTO_ELEVADO' OR COALESCE(v.total, 0) > $1
       ORDER BY e.fecha_hora DESC
       LIMIT 20`, [threshold]
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

  async consolidated({ from, to, category, sku }) {
    const skuPattern = sku ? `%${sku}%` : '';
    const result = await this.database.query(
      `WITH dates AS (
         SELECT generate_series($1::date, $2::date, INTERVAL '1 day')::date AS report_date
       ),
       eligible_sales AS (
         SELECT v.id, v.fecha, v.total
         FROM ventas v
         WHERE v.estado = 'REGISTRADA'
           AND (v.fecha AT TIME ZONE $5)::date BETWEEN $1::date AND $2::date
           AND EXISTS (
             SELECT 1 FROM ventas_detalle vd
             JOIN productos p ON p.id = vd.id_producto
             WHERE vd.id_venta = v.id
               AND ($3 = '' OR LOWER(p.categoria) = LOWER($3))
               AND ($4 = '' OR p.sku ILIKE $4)
           )
       ),
       daily_sales AS (
         SELECT (fecha AT TIME ZONE $5)::date AS report_date,
                SUM(total)::numeric(14,2) AS total, COUNT(*)::int AS transactions
         FROM eligible_sales GROUP BY report_date
       ),
       top_products AS (
         SELECT p.sku, p.nombre, p.categoria, SUM(vd.cantidad)::int AS quantity,
                SUM(vd.subtotal)::numeric(14,2) AS amount
         FROM ventas_detalle vd
         JOIN eligible_sales v ON v.id = vd.id_venta
         JOIN productos p ON p.id = vd.id_producto
         WHERE ($3 = '' OR LOWER(p.categoria) = LOWER($3))
           AND ($4 = '' OR p.sku ILIKE $4)
         GROUP BY p.id, p.sku, p.nombre, p.categoria
         ORDER BY quantity DESC, amount DESC LIMIT 10
       ),
       daily_inventory AS (
         SELECT (hi.fecha_hora AT TIME ZONE $5)::date AS report_date,
                COALESCE(SUM(hi.variacion_stock), 0)::int AS net_variation
         FROM historial_inventario hi
         JOIN productos p ON p.id = hi.producto_id
         WHERE (hi.fecha_hora AT TIME ZONE $5)::date BETWEEN $1::date AND $2::date
           AND ($3 = '' OR LOWER(p.categoria) = LOWER($3))
           AND ($4 = '' OR p.sku ILIKE $4)
         GROUP BY report_date
       )
       SELECT
         COALESCE((SELECT SUM(total) FROM eligible_sales), 0)::numeric(14,2) AS accumulated_sales,
         COALESCE((SELECT COUNT(*) FROM eligible_sales), 0)::int AS transactions,
         COALESCE((SELECT SUM(net_variation) FROM daily_inventory), 0)::int AS net_inventory_variation,
         COALESCE((SELECT json_agg(json_build_object(
           'date', d.report_date, 'total', COALESCE(s.total, 0),
           'transactions', COALESCE(s.transactions, 0)
         ) ORDER BY d.report_date) FROM dates d LEFT JOIN daily_sales s USING(report_date)), '[]') AS sales_series,
         COALESCE((SELECT json_agg(top_products) FROM top_products), '[]') AS top_products,
         COALESCE((SELECT json_agg(json_build_object(
           'date', d.report_date, 'variation', COALESCE(i.net_variation, 0)
         ) ORDER BY d.report_date) FROM dates d LEFT JOIN daily_inventory i USING(report_date)), '[]') AS inventory_series`,
      [from, to, category || '', skuPattern, this.timeZone]
    );
    return result.rows[0];
  }

  async stockZeroAlerts({ afterId = 0, since }) {
    const result = await this.database.query(
      `SELECT e.id, e.descripcion AS message, e.severidad, e.fecha_hora,
              p.id AS producto_id, p.sku, p.nombre
       FROM eventos_auditoria e
       JOIN productos p ON p.id = e.entidad_id AND e.entidad = 'PRODUCTO'
       WHERE e.tipo = 'STOCK_CERO' AND e.id > $1
         AND ($2::timestamptz IS NULL OR e.fecha_hora >= $2::timestamptz)
       ORDER BY e.id ASC LIMIT 20`,
      [afterId, since || null]
    );
    return result.rows;
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
