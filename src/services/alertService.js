const alertModel = require('../models/alertModel');

async function listStockAlerts() {
  return alertModel.listLowStockProducts();
}

module.exports = {
  listStockAlerts
};
