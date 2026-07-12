const express = require('express');
class SubscriptionRoutes {
  constructor({ controller, authentication }) {
    this.router = express.Router();
    this.router.get('/planes', controller.list);
    this.router.get('/actual', authentication.authenticate, controller.active);
  }
}
module.exports = SubscriptionRoutes;
