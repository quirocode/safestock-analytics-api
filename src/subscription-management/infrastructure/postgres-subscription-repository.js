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
  async countActiveUsers(organizationId) {
    const result = await this.database.query(
      `SELECT COUNT(*)::int AS total FROM usuarios WHERE organizacion_id = $1 AND estado = 'activo'`, [organizationId]
    );
    return result.rows[0].total;
  }
}
module.exports = PostgresSubscriptionRepository;
