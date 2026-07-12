const HttpError = require('../../shared/domain/http-error');
const InventoryRepositoryPort = require('../domain/inventory-repository-port');

class PostgresInventoryRepository extends InventoryRepositoryPort {
  constructor(database) { super(); this.database = database; }

  async listStock() {
    const result = await this.database.query(
      `SELECT id, sku, nombre, stock_actual, stock_minimo, estado FROM productos ORDER BY nombre`
    );
    return result.rows;
  }

  async listMovements({ limit, offset }) {
    const result = await this.database.query(
      `SELECT hi.id, hi.tipo_movimiento, hi.cantidad, hi.fecha_hora, hi.motivo,
              p.id AS producto_id, p.sku AS producto_sku, p.nombre AS producto_nombre,
              u.id AS usuario_id, u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos
       FROM historial_inventario hi JOIN productos p ON p.id=hi.producto_id
       JOIN usuarios u ON u.id=hi.usuario_id
       ORDER BY hi.fecha_hora DESC, hi.id DESC LIMIT $1 OFFSET $2`, [limit, offset]
    );
    return result.rows;
  }

  async registerMovement(movement, clientOverride = null) {
    const execute = async (client) => {
      const productResult = await client.query(
        'SELECT id, sku, nombre, stock_actual, estado FROM productos WHERE id=$1 FOR UPDATE', [movement.productId]
      );
      const product = productResult.rows[0];
      if (!product || product.estado !== 'activo') throw new HttpError('Producto no encontrado o inactivo.', 404);
      const current = Number(product.stock_actual);
      const next = movement.type === 'ENTRADA' ? current + movement.quantity
        : movement.type === 'SALIDA' ? current - movement.quantity : movement.quantity;
      if (next < 0) throw new HttpError('Stock insuficiente.', 400);
      const updated = await client.query(
        `UPDATE productos SET stock_actual=$2, actualizado_en=NOW() WHERE id=$1
         RETURNING id, sku, nombre, stock_actual, stock_minimo`, [movement.productId, next]
      );
      const loggedQuantity = movement.type === 'AJUSTE' ? Math.abs(next - current) || 1 : movement.quantity;
      const log = await client.query(
        `INSERT INTO historial_inventario(producto_id,tipo_movimiento,cantidad,usuario_id,motivo)
         VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [movement.productId, movement.type, loggedQuantity, movement.userId, movement.reason]
      );
      return { producto: updated.rows[0], movimiento: log.rows[0] };
    };
    return clientOverride ? execute(clientOverride) : this.database.transaction(execute);
  }

  async bulkAdjust(movements) {
    return this.database.transaction(async (client) => {
      const results = [];
      for (const movement of movements) results.push(await this.registerMovement(movement, client));
      return results;
    });
  }
}
module.exports = PostgresInventoryRepository;
