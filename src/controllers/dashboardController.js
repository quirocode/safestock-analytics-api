const dashboardService = require('../services/dashboardService');

async function getSummary(req, res, next) {
  try {
    const resumen = await dashboardService.getSummary();
    res.status(200).json({ resumen });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummary
};
