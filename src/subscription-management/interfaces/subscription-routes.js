const express = require('express');
class SubscriptionRoutes {
  constructor({ controller, authentication }) {
    this.router = express.Router();
    this.router.get('/planes', controller.list);
    this.router.get('/actual', authentication.authenticate, controller.active);
    this.router.put('/actual', authentication.authenticate, controller.changeCurrentPlan);
    this.router.put('/current-plan', authentication.authenticate, controller.changeCurrentPlan);
  }
}
module.exports = SubscriptionRoutes;
