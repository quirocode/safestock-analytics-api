const HttpError = require('../../shared/domain/http-error');
const SaleRepositoryPort = require('../domain/sale-repository-port');
const Sale = require('../domain/sale');

class PostgresSaleRepository extends SaleRepositoryPort {
  constructor(database) {
    super();
    this.database = database;
  }

  async findProductsForSale(items) {
    const productIds = items.map((item) => item.productId);
    const result = await this.database.query(
      `SELECT id, sku, nombre, precio, stock_actual, estado
       FROM productos
       WHERE id = ANY($1::bigint[])`,
      [productIds]
    );
    return result.rows;
  }

  async register(sale) {
    const amounts = sale.financialBreakdown;
    return this.database.transaction(async (client) => {
      const productIds = sale.details.map((detail) => detail.productId);
      const locked = await client.query(
        `SELECT id, sku, nombre, precio, stock_actual, estado
         FROM productos
         WHERE id = ANY($1::bigint[])
         FOR UPDATE`,
        [productIds]
      );
      const lockedById = new Map(locked.rows.map((product) => [Number(product.id), product]));
      const conflicts = [];

      for (const detail of sale.details) {
        const product = lockedById.get(detail.productId);
        if (!product || product.estado !== 'activo' || Number(product.stock_actual) < detail.quantity) {
          conflicts.push({
            productoId: detail.productId,
            sku: product?.sku,
            nombre: product?.nombre,
            stockDisponible: Number(product?.stock_actual || 0),
            cantidadSolicitada: detail.quantity,
            motivo: 'Stock insuficiente o producto no disponible.'
          });
          continue;
        }
        if (Sale.toCents(product.precio) !== detail.unitPriceCents) {
          conflicts.push({
            productoId: detail.productId,
            sku: product.sku,
            motivo: 'El precio cambio durante el procesamiento. Reintenta la venta.'
          });
        }
      }

      if (conflicts.length) {
        throw new HttpError('La venta cambio durante el procesamiento.', 409, conflicts);
      }

      const inserted = await client.query(
        `INSERT INTO ventas(id_usuario, subtotal, igv, total, estado)
         VALUES($1, $2, $3, $4, 'REGISTRADA')
         RETURNING *`,
        [sale.userId, amounts.subtotal, amounts.igv, amounts.total]
      );
      const venta = inserted.rows[0];

      for (const detail of sale.details) {
        await client.query(
          `INSERT INTO ventas_detalle(id_venta, id_producto, cantidad, precio_unitario, subtotal)
           VALUES($1, $2, $3, $4, $5)`,
          [
            venta.id,
            detail.productId,
            detail.quantity,
            Sale.toDecimal(detail.unitPriceCents),
            Sale.toDecimal(detail.lineTotalCents)
          ]
        );
        const update = await client.query(
          `UPDATE productos
           SET stock_actual = stock_actual - $2, actualizado_en = NOW()
           WHERE id = $1 AND stock_actual >= $2`,
          [detail.productId, detail.quantity]
        );
        if (update.rowCount !== 1) throw new HttpError('No se pudo descontar el stock.', 400);
        await client.query(
          `INSERT INTO historial_inventario(producto_id, tipo_movimiento, cantidad, usuario_id, motivo)
           VALUES($1, 'VENTA', $2, $3, $4)`,
          [detail.productId, detail.quantity, sale.userId, `Venta #${venta.id}`]
        );
      }

      if (sale.isSuspicious()) {
        await client.query(
          `INSERT INTO eventos_auditoria(tipo, entidad, entidad_id, usuario_id, descripcion, severidad)
           VALUES('VENTA_MONTO_ELEVADO', 'VENTA', $1, $2, $3, 'ADVERTENCIA')`,
          [venta.id, sale.userId, `Venta por S/ ${amounts.total}; supera el umbral antifraude del plan.`]
        );
      }

      return this.findById(venta.id, client);
    });
  }

  async findById(id, client = this.database) {
    const result = await client.query(
      `SELECT v.*, u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos,
              u.correo AS usuario_correo,
              COALESCE(json_agg(json_build_object(
                'productoId', p.id, 'sku', p.sku, 'nombre', p.nombre,
                'cantidad', vd.cantidad, 'precioUnitario', vd.precio_unitario,
                'subtotal', vd.subtotal
              ) ORDER BY vd.id) FILTER(WHERE vd.id IS NOT NULL), '[]') AS detalles
       FROM ventas v
       JOIN usuarios u ON u.id = v.id_usuario
       LEFT JOIN ventas_detalle vd ON vd.id_venta = v.id
       LEFT JOIN productos p ON p.id = vd.id_producto
       WHERE v.id = $1
       GROUP BY v.id, u.id`,
      [id]
    );
    return result.rows[0] || null;
  }

  async list({ limit, offset, from, to, status }) {
    const values = [];
    const filters = [];
    if (from) { values.push(from); filters.push(`v.fecha >= $${values.length}::date`); }
    if (to) { values.push(to); filters.push(`v.fecha < $${values.length}::date + INTERVAL '1 day'`); }
    if (status) { values.push(status); filters.push(`v.estado = $${values.length}`); }
    values.push(limit, offset);
    const result = await this.database.query(
      `SELECT v.id, v.fecha, v.subtotal, v.igv, v.total, v.estado,
              v.motivo_anulacion, v.anulada_en, u.id AS usuario_id,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos,
              u.correo AS usuario_correo
       FROM ventas v JOIN usuarios u ON u.id = v.id_usuario
       ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
       ORDER BY v.fecha DESC, v.id DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    return result.rows;
  }

  async cancel(id, userId, reason) {
    return this.database.transaction(async (client) => {
      const result = await client.query('SELECT * FROM ventas WHERE id = $1 FOR UPDATE', [id]);
      const sale = result.rows[0];
      if (!sale) throw new HttpError('Venta no encontrada.', 404);
      if (sale.estado === 'ANULADA') throw new HttpError('La venta ya fue anulada.', 409);
      const details = await client.query('SELECT id_producto, cantidad FROM ventas_detalle WHERE id_venta = $1', [id]);
      for (const detail of details.rows) {
        await client.query('UPDATE productos SET stock_actual = stock_actual + $2, actualizado_en = NOW() WHERE id = $1', [detail.id_producto, detail.cantidad]);
        await client.query(
          `INSERT INTO historial_inventario(producto_id, tipo_movimiento, cantidad, usuario_id, motivo)
           VALUES($1, 'ENTRADA', $2, $3, $4)`,
          [detail.id_producto, detail.cantidad, userId, `Anulacion venta #${id}: ${reason}`]
        );
      }
      const updated = await client.query(
        `UPDATE ventas SET estado = 'ANULADA', motivo_anulacion = $2,
         anulada_por = $3, anulada_en = NOW() WHERE id = $1 RETURNING *`,
        [id, reason, userId]
      );
      await client.query(
        `INSERT INTO eventos_auditoria(tipo, entidad, entidad_id, usuario_id, descripcion, severidad)
         VALUES('ANULACION_VENTA', 'VENTA', $1, $2, $3, 'CRITICA')`,
        [id, userId, reason]
      );
      return updated.rows[0];
    });
  }
}

module.exports = PostgresSaleRepository;
