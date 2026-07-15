class SubscriptionRepositoryPort {
  async listPlans() { throw new Error('Not implemented'); }
  async findByOrganizationId() { throw new Error('Not implemented'); }
  async changeOrganizationPlan() { throw new Error('Not implemented'); }
  async countActiveUsers() { throw new Error('Not implemented'); }
}
module.exports = SubscriptionRepositoryPort;
