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

  async suspicious({ organizationId, threshold = 0 }) {
    const result = await this.database.query(
      `SELECT e.id::text, e.tipo,
              CASE e.severidad WHEN 'CRITICA' THEN 'CRITICA' ELSE 'MEDIA' END AS severidad,
              e.descripcion, e.fecha_hora, e.usuario_id,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos,
              u.correo AS usuario_correo, r.nombre AS usuario_rol, '{}'::jsonb AS metadata
       FROM eventos_auditoria e
       JOIN usuarios u ON u.id = e.usuario_id
       LEFT JOIN roles r ON r.id = u.rol_id
       LEFT JOIN ventas v ON e.entidad = 'VENTA' AND v.id = e.entidad_id
       WHERE u.organizacion_id = $1
         AND (
           e.tipo IN ('ANULACIONES_REPETIDAS_BAJO_MONTO', 'VENTA_REPETIDA_SKU', 'AJUSTES_NEGATIVOS_FRECUENTES', 'MOVIMIENTO_FUERA_DE_HORARIO')
           OR e.tipo IN ('ANULACION_VENTA', 'STOCK_CERO')
           OR (e.tipo = 'VENTA_MONTO_ELEVADO' AND COALESCE(v.total, 0) > $2)
         )
       ORDER BY e.fecha_hora DESC
       LIMIT 30`, [organizationId, threshold]
    );
    return result.rows;
  }

  async detectFraudPatterns({ organizationId, rules }) {
    await this.database.query(
      `WITH candidates AS (
         SELECT u.organizacion_id, v.anulada_por AS usuario_id,
                'ANULACIONES_REPETIDAS_BAJO_MONTO'::varchar AS tipo,
                'ALTA'::varchar AS severidad,
                'El usuario ' || u.nombres || ' ' || u.apellidos ||
                ' registra múltiples anulaciones de bajo monto en las últimas 24 horas.' AS descripcion,
                'USUARIO'::varchar AS entidad,
                v.anulada_por AS entidad_id
         FROM ventas v
         JOIN usuarios u ON u.id = v.anulada_por
         WHERE u.organizacion_id = $1 AND v.estado = 'ANULADA'
           AND v.anulada_en >= NOW() - INTERVAL '24 hours'
           AND v.total <= $2::numeric
         GROUP BY u.organizacion_id, v.anulada_por, u.nombres, u.apellidos
         HAVING COUNT(*) >= $3::int
       )
       INSERT INTO eventos_auditoria(tipo, entidad, entidad_id, usuario_id, descripcion, severidad)
       SELECT tipo, entidad, entidad_id, usuario_id, descripcion, 'CRITICA' FROM candidates c
       WHERE NOT EXISTS (
         SELECT 1 FROM eventos_auditoria e
         WHERE e.tipo = c.tipo AND e.usuario_id = c.usuario_id
           AND e.entidad = c.entidad AND e.entidad_id = c.entidad_id
           AND e.fecha_hora >= CURRENT_DATE
       )`,
      [organizationId, rules.lowAmountCancellationLimit, rules.lowAmountCancellationCount]
    );

    await this.database.query(
      `WITH candidates AS (
         SELECT u.organizacion_id, v.id_usuario AS usuario_id,
                'VENTA_REPETIDA_SKU'::varchar AS tipo,
                'MEDIA'::varchar AS severidad,
                'El usuario ' || u.nombres || ' ' || u.apellidos ||
                ' registra ventas repetidas del SKU ' || p.sku || ' en un intervalo corto.' AS descripcion,
                'PRODUCTO'::varchar AS entidad,
                p.id AS entidad_id
         FROM ventas v
         JOIN ventas_detalle vd ON vd.id_venta = v.id
         JOIN productos p ON p.id = vd.id_producto
         JOIN usuarios u ON u.id = v.id_usuario
         WHERE u.organizacion_id = $1 AND v.estado = 'REGISTRADA'
           AND v.fecha >= NOW() - INTERVAL '24 hours'
         GROUP BY u.organizacion_id, v.id_usuario, u.nombres, u.apellidos, p.id, p.sku,
                  date_bin(($2::text || ' minutes')::interval, v.fecha, TIMESTAMPTZ '2000-01-01')
         HAVING COUNT(DISTINCT v.id) >= $3::int
       )
       INSERT INTO eventos_auditoria(tipo, entidad, entidad_id, usuario_id, descripcion, severidad)
       SELECT tipo, entidad, entidad_id, usuario_id, descripcion, 'ADVERTENCIA' FROM candidates c
       WHERE NOT EXISTS (
         SELECT 1 FROM eventos_auditoria e
         WHERE e.tipo = c.tipo AND e.usuario_id = c.usuario_id
           AND e.entidad = c.entidad AND e.entidad_id = c.entidad_id
           AND e.fecha_hora >= CURRENT_DATE
       )`,
      [organizationId, rules.repeatedSkuWindowMinutes, rules.repeatedSkuSalesCount]
    );

    await this.database.query(
      `WITH candidates AS (
         SELECT u.organizacion_id, hi.usuario_id,
                'AJUSTES_NEGATIVOS_FRECUENTES'::varchar AS tipo,
                'ALTA'::varchar AS severidad,
                'El usuario ' || u.nombres || ' ' || u.apellidos ||
                ' registra ajustes negativos frecuentes de inventario.' AS descripcion,
                'USUARIO'::varchar AS entidad,
                hi.usuario_id AS entidad_id
         FROM historial_inventario hi
         JOIN usuarios u ON u.id = hi.usuario_id
         WHERE u.organizacion_id = $1
           AND hi.tipo_movimiento = 'AJUSTE'
           AND hi.variacion_stock < 0
           AND hi.fecha_hora >= NOW() - INTERVAL '24 hours'
         GROUP BY u.organizacion_id, hi.usuario_id, u.nombres, u.apellidos
         HAVING COUNT(*) >= $2::int
       )
       INSERT INTO eventos_auditoria(tipo, entidad, entidad_id, usuario_id, descripcion, severidad)
       SELECT tipo, entidad, entidad_id, usuario_id, descripcion, 'CRITICA' FROM candidates c
       WHERE NOT EXISTS (
         SELECT 1 FROM eventos_auditoria e
         WHERE e.tipo = c.tipo AND e.usuario_id = c.usuario_id
           AND e.entidad = c.entidad AND e.entidad_id = c.entidad_id
           AND e.fecha_hora >= CURRENT_DATE
       )`,
      [organizationId, rules.negativeAdjustmentCount]
    );

    await this.database.query(
      `WITH inventory_candidates AS (
         SELECT u.organizacion_id, hi.usuario_id,
                'MOVIMIENTO_FUERA_DE_HORARIO'::varchar AS tipo,
                'MEDIA'::varchar AS severidad,
                'El usuario ' || u.nombres || ' ' || u.apellidos ||
                ' realizó una operación sensible fuera del horario esperado.' AS descripcion,
                'INVENTARIO'::varchar AS entidad,
                hi.id AS entidad_id
         FROM historial_inventario hi
         JOIN usuarios u ON u.id = hi.usuario_id
         WHERE u.organizacion_id = $1
           AND hi.fecha_hora >= NOW() - INTERVAL '24 hours'
           AND EXTRACT(HOUR FROM hi.fecha_hora AT TIME ZONE $4) BETWEEN $2::int AND $3::int
           AND (hi.tipo_movimiento = 'SALIDA' OR (hi.tipo_movimiento = 'AJUSTE' AND hi.variacion_stock < 0))
       ),
       cancellation_candidates AS (
         SELECT u.organizacion_id, v.anulada_por AS usuario_id,
                'MOVIMIENTO_FUERA_DE_HORARIO'::varchar AS tipo,
                'MEDIA'::varchar AS severidad,
                'El usuario ' || u.nombres || ' ' || u.apellidos ||
                ' realizó una anulación fuera del horario esperado.' AS descripcion,
                'VENTA'::varchar AS entidad,
                v.id AS entidad_id
         FROM ventas v
         JOIN usuarios u ON u.id = v.anulada_por
         WHERE u.organizacion_id = $1 AND v.estado = 'ANULADA' AND v.anulada_en IS NOT NULL
           AND v.anulada_en >= NOW() - INTERVAL '24 hours'
           AND EXTRACT(HOUR FROM v.anulada_en AT TIME ZONE $4) BETWEEN $2::int AND $3::int
       )
       INSERT INTO eventos_auditoria(tipo, entidad, entidad_id, usuario_id, descripcion, severidad)
       SELECT tipo, entidad, entidad_id, usuario_id, descripcion, 'ADVERTENCIA' FROM inventory_candidates c
       WHERE NOT EXISTS (
         SELECT 1 FROM eventos_auditoria e
         WHERE e.tipo = c.tipo AND e.entidad = c.entidad AND e.entidad_id = c.entidad_id
       )
       UNION ALL
       SELECT tipo, entidad, entidad_id, usuario_id, descripcion, 'ADVERTENCIA' FROM cancellation_candidates c
       WHERE NOT EXISTS (
         SELECT 1 FROM eventos_auditoria e
         WHERE e.tipo = c.tipo AND e.entidad = c.entidad AND e.entidad_id = c.entidad_id
       )`,
      [organizationId, rules.sensitiveStartHour, rules.sensitiveEndHour, this.timeZone]
    );
  }

  async employeeRisk({ organizationId, from, to }) {
    const result = await this.database.query(
      `WITH organization_users AS (
         SELECT u.id, u.nombres, u.apellidos, u.correo, r.nombre AS rol
         FROM usuarios u JOIN roles r ON r.id = u.rol_id
         WHERE u.organizacion_id = $1
       ),
       low_cancellations AS (
         SELECT anulada_por AS usuario_id, COUNT(*)::int AS total
         FROM ventas
         WHERE estado = 'ANULADA' AND anulada_por IS NOT NULL
           AND anulada_en >= $2::date AND anulada_en < $3::date + INTERVAL '1 day'
           AND total <= 20
         GROUP BY anulada_por
       ),
       negative_adjustments AS (
         SELECT usuario_id, COUNT(*)::int AS total
         FROM historial_inventario
         WHERE tipo_movimiento = 'AJUSTE' AND variacion_stock < 0
           AND fecha_hora >= $2::date AND fecha_hora < $3::date + INTERVAL '1 day'
         GROUP BY usuario_id
       ),
       repeated_sku_groups AS (
         SELECT usuario_id, COUNT(*)::int AS total
         FROM (
           SELECT v.id_usuario AS usuario_id, vd.id_producto,
                  date_bin(INTERVAL '30 minutes', v.fecha, TIMESTAMPTZ '2000-01-01') AS bucket
           FROM ventas v JOIN ventas_detalle vd ON vd.id_venta = v.id
           WHERE v.estado = 'REGISTRADA'
             AND v.fecha >= $2::date AND v.fecha < $3::date + INTERVAL '1 day'
           GROUP BY v.id_usuario, vd.id_producto, bucket
           HAVING COUNT(DISTINCT v.id) >= 5
         ) grouped
         GROUP BY usuario_id
       ),
       off_hours AS (
         SELECT usuario_id, COUNT(*)::int AS total
         FROM (
           SELECT hi.usuario_id
           FROM historial_inventario hi
           WHERE hi.fecha_hora >= $2::date AND hi.fecha_hora < $3::date + INTERVAL '1 day'
             AND EXTRACT(HOUR FROM hi.fecha_hora AT TIME ZONE $4) BETWEEN 21 AND 23
             AND (hi.tipo_movimiento = 'SALIDA' OR (hi.tipo_movimiento = 'AJUSTE' AND hi.variacion_stock < 0))
           UNION ALL
           SELECT v.anulada_por AS usuario_id
           FROM ventas v
           WHERE v.estado = 'ANULADA' AND v.anulada_por IS NOT NULL
             AND v.anulada_en >= $2::date AND v.anulada_en < $3::date + INTERVAL '1 day'
             AND EXTRACT(HOUR FROM v.anulada_en AT TIME ZONE $4) BETWEEN 21 AND 23
         ) x
         GROUP BY usuario_id
       ),
       critical_alerts AS (
         SELECT e.usuario_id, COUNT(*)::int AS total
         FROM eventos_auditoria e
         JOIN usuarios u ON u.id = e.usuario_id
         WHERE u.organizacion_id = $1 AND e.severidad = 'CRITICA'
           AND e.fecha_hora >= $2::date AND e.fecha_hora < $3::date + INTERVAL '1 day'
         GROUP BY e.usuario_id
       )
       SELECT ou.id AS usuario_id, ou.nombres, ou.apellidos, ou.correo, ou.rol,
              COALESCE(lc.total, 0)::int AS anulaciones_repetidas,
              COALESCE(na.total, 0)::int AS ajustes_negativos,
              COALESCE(rs.total, 0)::int AS ventas_repetidas_sku,
              COALESCE(oh.total, 0)::int AS fuera_de_horario,
              COALESCE(ca.total, 0)::int AS alertas_criticas
       FROM organization_users ou
       LEFT JOIN low_cancellations lc ON lc.usuario_id = ou.id
       LEFT JOIN negative_adjustments na ON na.usuario_id = ou.id
       LEFT JOIN repeated_sku_groups rs ON rs.usuario_id = ou.id
       LEFT JOIN off_hours oh ON oh.usuario_id = ou.id
       LEFT JOIN critical_alerts ca ON ca.usuario_id = ou.id`,
      [organizationId, from, to, this.timeZone]
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
