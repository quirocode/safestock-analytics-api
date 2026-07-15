const SubscriptionRepositoryPort = require('../domain/subscription-repository-port');

class PostgresSubscriptionRepository extends SubscriptionRepositoryPort {
  constructor(database) { super(); this.database = database; }
  async listPlans() {
    return (await this.database.query('SELECT * FROM planes_suscripcion WHERE activo = TRUE ORDER BY precio_mensual')).rows;
  }
  async findByOrganizationId(organizationId) {
    const result = await this.database.query(
      `SELECT p.*, o.id AS organizacion_id, o.nombre_comercial, o.estado AS organizacion_estado,
              o.suscripcion_inicia_en, o.suscripcion_vence_en
       FROM organizaciones o JOIN planes_suscripcion p ON p.id = o.plan_suscripcion_id
       WHERE o.id = $1 AND p.activo = TRUE`, [organizationId]
    );
    return result.rows[0] || null;
  }
  async changeOrganizationPlan({ organizationId, planCode }) {
    const result = await this.database.query(
      `WITH selected_plan AS (
         SELECT id FROM planes_suscripcion
         WHERE codigo = $2 AND activo = TRUE
       ),
       updated_organization AS (
         UPDATE organizaciones
         SET plan_suscripcion_id = (SELECT id FROM selected_plan),
             suscripcion_inicia_en = COALESCE(suscripcion_inicia_en, CURRENT_DATE),
             actualizado_en = NOW()
         WHERE id = $1
           AND EXISTS (SELECT 1 FROM selected_plan)
         RETURNING id, nombre_comercial, estado, suscripcion_inicia_en, suscripcion_vence_en, plan_suscripcion_id
       )
       SELECT p.*, u.id AS organizacion_id, u.nombre_comercial, u.estado AS organizacion_estado,
              u.suscripcion_inicia_en, u.suscripcion_vence_en
       FROM updated_organization u
       JOIN planes_suscripcion p ON p.id = u.plan_suscripcion_id`,
      [organizationId, planCode]
    );
    return result.rows[0] || null;
  }
  async countActiveUsers(organizationId) {
    const result = await this.database.query(
      `SELECT COUNT(*)::int AS total FROM usuarios WHERE organizacion_id = $1 AND estado = 'activo'`, [organizationId]
    );
    return result.rows[0].total;
  }
}
module.exports = PostgresSubscriptionRepository;
