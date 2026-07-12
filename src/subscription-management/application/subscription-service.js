const HttpError = require('../../shared/domain/http-error');
const SubscriptionPlan = require('../domain/subscription-plan');

class SubscriptionService {
  constructor(repository) { this.repository = repository; }
  async listPlans() { return (await this.repository.listPlans()).map((row) => new SubscriptionPlan(row).toJSON()); }
  async getActivePlan(organizationId) {
    const row = await this.repository.findByOrganizationId(organizationId);
    if (!row) throw new HttpError('La organización no tiene una suscripción activa.', 403);
    if (row.organizacion_estado !== 'activo') throw new HttpError('La organización está suspendida.', 403);
    if (row.suscripcion_vence_en && new Date(row.suscripcion_vence_en) <= new Date()) throw new HttpError('La suscripción ha vencido.', 403);
    return new SubscriptionPlan(row);
  }
  async assertUserCapacity(organizationId) {
    const plan = await this.getActivePlan(organizationId);
    plan.assertUserCapacity(await this.repository.countActiveUsers(organizationId));
    return plan;
  }
  async assertFeature(organizationId, feature) {
    const plan = await this.getActivePlan(organizationId); plan.assertFeature(feature); return plan;
  }
}
module.exports = SubscriptionService;
