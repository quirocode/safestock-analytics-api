const HttpError = require('../../shared/domain/http-error');
const InventoryMovement = require('../domain/inventory-movement');

class InventoryService {
  constructor(repository) { this.repository = repository; }
  listStock() { return this.repository.listStock(); }
  async listMovements(query) {
    const pagination = { limit: Math.min(Number(query.limit) || 100, 500), offset: Number(query.offset) || 0 };
    return { movimientos: await this.repository.listMovements(pagination), pagination };
  }
  createMovement(userId, payload) {
    const movement = new InventoryMovement({
      productId: payload.productoId || payload.producto_id,
      type: payload.tipoMovimiento || payload.tipo_movimiento,
      quantity: payload.cantidad, userId, reason: payload.motivo
    }).assertValid();
    return this.repository.registerMovement(movement);
  }
  async bulkAdjust(userId, payload) {
    if (!Array.isArray(payload.ajustes) || !payload.ajustes.length) throw new HttpError('Se requiere al menos un ajuste.', 400);
    const movements = payload.ajustes.map((item) => new InventoryMovement({
      productId: item.productoId || item.producto_id, type: 'AJUSTE',
      quantity: item.stock ?? item.stock_actual, userId, reason: item.motivo || payload.motivo
    }).assertValid());
    return this.repository.bulkAdjust(movements);
  }
}
module.exports = InventoryService;
