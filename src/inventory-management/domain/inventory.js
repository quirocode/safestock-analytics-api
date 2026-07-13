const HttpError = require('../../shared/domain/http-error');

class Inventory {
  constructor({ previousStock, currentStock, productName, sku }) {
    this.previousStock = Number(previousStock);
    this.currentStock = Number(currentStock);
    this.productName = String(productName || '').trim();
    this.sku = String(sku || '').trim();
    if (!Number.isInteger(this.previousStock) || !Number.isInteger(this.currentStock) || this.currentStock < 0) {
      throw new HttpError('Estado de inventario inválido.', 500);
    }
  }

  reachedZero() {
    return this.previousStock > 0 && this.currentStock === 0;
  }

  createZeroStockAlert() {
    if (!this.reachedZero()) return null;
    return {
      type: 'STOCK_CERO',
      severity: 'CRITICA',
      description: `⚠️ URGENTE: El producto ${this.productName}/${this.sku} ha llegado a Stock 0. Reposición inmediata requerida.`
    };
  }
}

module.exports = Inventory;
