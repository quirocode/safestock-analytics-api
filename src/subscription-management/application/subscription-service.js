const HttpError = require('../../shared/domain/http-error');
const SubscriptionPlan = require('../domain/subscription-plan');

class SubscriptionService {
  constructor(repository) { this.repository = repository; }
  async listPlans() { return (await this.repository.listPlans()).map((row) => new SubscriptionPlan(row).toJSON()); }
  async getActivePlan(organizationId) {
    const row = await this.repository.findByOrganizationId(organizationId);
    if (!row) throw new HttpError('La organizaciÃ³n no tiene una suscripciÃ³n activa.', 403);
    if (row.organizacion_estado !== 'activo') throw new HttpError('La organizaciÃ³n estÃ¡ suspendida.', 403);
    if (row.suscripcion_vence_en && new Date(row.suscripcion_vence_en) <= new Date()) throw new HttpError('La suscripciÃ³n ha vencido.', 403);
    return new SubscriptionPlan(row);
  }
  async changeCurrentPlan({ organizationId, planCode }) {
    if (!organizationId) throw new HttpError('El usuario no tiene una organización asociada.', 400);
    const normalizedCode = String(planCode || '').trim().toUpperCase();
    if (!['EMPRENDEDOR', 'CRECIMIENTO', 'CORPORATIVO'].includes(normalizedCode)) {
      throw new HttpError('El plan solicitado no es válido.', 400);
    }
    const row = await this.repository.changeOrganizationPlan({ organizationId, planCode: normalizedCode });
    if (!row) throw new HttpError('No se pudo actualizar el plan de la organización.', 400);
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

