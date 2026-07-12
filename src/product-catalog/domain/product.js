const HttpError = require('../../shared/domain/http-error');

class Product {
  constructor({ id, sku, nombre, categoria = 'General', precio, stockActual = 0, stockMinimo = 10, estado = 'activo' }) {
    this.id = id;
    this.sku = String(sku || '').trim().toUpperCase();
    this.nombre = String(nombre || '').trim();
    this.categoria = String(categoria || 'General').trim();
    this.precio = Number(precio);
    this.stockActual = Number(stockActual);
    this.stockMinimo = Number(stockMinimo);
    this.estado = estado;
  }

  assertValid() {
    if (this.sku.length < 2) throw new HttpError('El SKU debe tener al menos 2 caracteres.', 400);
    if (this.nombre.length < 2) throw new HttpError('El nombre debe tener al menos 2 caracteres.', 400);
    if (!Number.isFinite(this.precio) || this.precio < 0) throw new HttpError('Precio invalido.', 400);
    if (![this.stockActual, this.stockMinimo].every(Number.isInteger) || this.stockActual < 0 || this.stockMinimo < 0) throw new HttpError('Stock invalido.', 400);
    return this;
  }
}

module.exports = Product;
