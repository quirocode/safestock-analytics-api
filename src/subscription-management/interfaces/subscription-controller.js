class SubscriptionController {
  constructor(service) { this.service = service; this.list = this.list.bind(this); this.active = this.active.bind(this); }
  async list(req, res, next) { try { res.json(await this.service.listPlans()); } catch (error) { next(error); } }
  async active(req, res, next) { try { res.json((await this.service.getActivePlan(req.user.organizationId)).toJSON()); } catch (error) { next(error); } }
}
module.exports = SubscriptionController;
