class SubscriptionController {
  constructor(service) { this.service = service; this.list = this.list.bind(this); this.active = this.active.bind(this); this.changeCurrentPlan = this.changeCurrentPlan.bind(this); }
  async list(req, res, next) { try { res.json(await this.service.listPlans()); } catch (error) { next(error); } }
  async active(req, res, next) { try { res.json((await this.service.getActivePlan(req.user.organizationId)).toJSON()); } catch (error) { next(error); } }
  async changeCurrentPlan(req, res, next) {
    try {
      const plan = await this.service.changeCurrentPlan({ organizationId: req.user.organizationId, planCode: req.body.planCode });
      res.json({
        message: 'Plan actualizado correctamente.',
        plan: { ...plan.toJSON(), code: plan.code, name: plan.name, price: plan.monthlyPrice }
      });
    } catch (error) {
      next(error);
    }
  }
}
module.exports = SubscriptionController;
