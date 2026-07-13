const HttpError = require('../../shared/domain/http-error');
const InventoryMovement = require('../domain/inventory-movement');
const Inventory = require('../domain/inventory');

class InventoryService {
  constructor(repository) { this.repository = repository; }
  listStock() { return this.repository.listStock(); }
  async listMovements(query) {
    const pagination = { limit: Math.min(Number(query.limit) || 100, 500), offset: Number(query.offset) || 0 };
    return { movimientos: await this.repository.listMovements(pagination), pagination };
  }
  async createMovement(userId, payload) {
    const movement = new InventoryMovement({
      productId: payload.productoId || payload.producto_id,
      type: payload.tipoMovimiento || payload.tipo_movimiento,
      quantity: payload.cantidad, userId, reason: payload.motivo
    }).assertValid();
    const result = await this.repository.registerMovement(movement);
    await this.registerZeroStockAlert(result, userId);
    return result;
  }
  async bulkAdjust(userId, payload) {
    if (!Array.isArray(payload.ajustes) || !payload.ajustes.length) throw new HttpError('Se requiere al menos un ajuste.', 400);
    const movements = payload.ajustes.map((item) => new InventoryMovement({
      productId: item.productoId || item.producto_id, type: 'AJUSTE',
      quantity: item.stock ?? item.stock_actual, userId, reason: item.motivo || payload.motivo
    }).assertValid());
    const results = await this.repository.bulkAdjust(movements);
    for (const result of results) await this.registerZeroStockAlert(result, userId);
    return results;
  }
  async registerZeroStockAlert(result, userId) {
    const product = result.producto;
    const alert = new Inventory({
      previousStock: result.stockAnterior,
      currentStock: product.stock_actual,
      productName: product.nombre,
      sku: product.sku
    }).createZeroStockAlert();
    if (alert) await this.repository.recordCriticalAlert({ ...alert, productId: product.id, userId });
  }
}
module.exports = InventoryService;
