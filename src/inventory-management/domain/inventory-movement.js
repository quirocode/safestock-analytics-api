const HttpError = require('../../shared/domain/http-error');

class InventoryMovement {
  constructor({ productId, type, quantity, userId, reason = null }) {
    this.productId = Number(productId);
    this.type = String(type || '').toUpperCase();
    this.quantity = Number(quantity);
    this.userId = Number(userId);
    this.reason = reason ? String(reason).trim() : null;
  }

  assertValid() {
    if (!Number.isInteger(this.productId) || this.productId <= 0) throw new HttpError('Producto invalido.', 400);
    if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(this.type)) throw new HttpError('Tipo de movimiento invalido.', 400);
    if (!Number.isInteger(this.quantity) || (this.type !== 'AJUSTE' && this.quantity <= 0) || (this.type === 'AJUSTE' && this.quantity < 0)) throw new HttpError('Cantidad invalida.', 400);
    return this;
  }
}
module.exports = InventoryMovement;
