const HttpError = require('../../shared/domain/http-error');
const Sale = require('../domain/sale');

class SalesProcessingService {
  constructor({ repository, receiptGenerator, subscriptionService }) {
    this.repository = repository;
    this.receiptGenerator = receiptGenerator;
    this.subscriptionService = subscriptionService;
  }

  async register(userId, organizationId, payload) {
    const plan = await this.subscriptionService.getActivePlan(organizationId);
    const sale = new Sale({
      userId,
      plan,
      items: payload.productos || payload.items || payload.detalles
    });
    const products = await this.repository.findProductsForSale(sale.items);
    sale.applyProductPricing(products);
    return this.repository.register(sale);
  }

  async list(query) {
    const pagination = {
      limit: Math.min(Number(query.limit) || 100, 500),
      offset: Number(query.offset) || 0,
      from: query.fechaDesde || query.fecha_desde || null,
      to: query.fechaHasta || query.fecha_hasta || null,
      status: query.estado || null
    };
    return { ventas: await this.repository.list(pagination), pagination };
  }

  async cancel(id, userId, organizationId, payload) {
    const plan = await this.subscriptionService.getActivePlan(organizationId);
    const reason = Sale.cancellationReason(plan, payload.motivo);
    return this.repository.cancel(id, userId, reason);
  }

  async receipt(id) {
    const sale = await this.repository.findById(id);
    if (!sale) throw new HttpError('Venta no encontrada.', 404);
    return this.receiptGenerator.generate(sale);
  }
}

module.exports = SalesProcessingService;
