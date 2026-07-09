const alertService = require('../services/alertService');

async function listStockAlerts(req, res, next) {
  try {
    const alertas = await alertService.listStockAlerts();
    res.status(200).json({ alertas });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listStockAlerts
};
