const HttpError = require('../../shared/domain/http-error');

class Sale {
  static IGV_RATE = 0.18;
  static IGV_FACTOR = 1 + Sale.IGV_RATE;

  constructor({ userId, items }) {
    this.userId = Number(userId);
    this.items = Sale.normalizeItems(items);
    this.details = [];
    this.amounts = null;
  }

  static normalizeItems(items) {
    if (!Array.isArray(items) || !items.length) {
      throw new HttpError('La venta debe incluir productos.', 400);
    }

    const grouped = new Map();
    for (const item of items) {
      const productId = Number(item.productoId || item.producto_id || item.id_producto);
      const quantity = Number(item.cantidad);
      if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
        throw new HttpError('Detalle de venta invalido.', 400);
      }
      grouped.set(productId, (grouped.get(productId) || 0) + quantity);
    }

    return [...grouped].map(([productId, quantity]) => ({ productId, quantity }));
  }

  applyProductPricing(products) {
    const productsById = new Map(products.map((product) => [Number(product.id), product]));
    const unavailable = [];

    this.details = this.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product || product.estado !== 'activo') {
        unavailable.push({ productoId: item.productId, motivo: 'Producto no disponible.' });
        return null;
      }
      if (Number(product.stock_actual) < item.quantity) {
        unavailable.push({
          productoId: item.productId,
          sku: product.sku,
          nombre: product.nombre,
          stockDisponible: Number(product.stock_actual),
          cantidadSolicitada: item.quantity,
          motivo: 'Stock insuficiente.'
        });
      }

      const unitPriceCents = Sale.toCents(product.precio);
      return {
        ...item,
        sku: product.sku,
        nombre: product.nombre,
        unitPriceCents,
        lineTotalCents: unitPriceCents * item.quantity
      };
    }).filter(Boolean);

    if (unavailable.length) {
      throw new HttpError('Stock insuficiente o producto no disponible.', 400, unavailable);
    }

    const totalCents = this.details.reduce((sum, detail) => sum + detail.lineTotalCents, 0);
    const subtotalCents = Math.round(totalCents / Sale.IGV_FACTOR);
    const igvCents = totalCents - subtotalCents;
    this.amounts = Object.freeze({ totalCents, subtotalCents, igvCents });
    return this;
  }

  get financialBreakdown() {
    if (!this.amounts) throw new HttpError('La venta no tiene precios aplicados.', 500);
    return {
      total: Sale.toDecimal(this.amounts.totalCents),
      subtotal: Sale.toDecimal(this.amounts.subtotalCents),
      igv: Sale.toDecimal(this.amounts.igvCents)
    };
  }

  static toCents(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new HttpError('Precio de producto invalido.', 400);
    return Math.round(number * 100);
  }

  static toDecimal(cents) {
    return (cents / 100).toFixed(2);
  }
}

module.exports = Sale;
