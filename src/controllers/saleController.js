const saleService = require('../services/saleService');

async function registerSale(req, res, next) {
  try {
    const result = await saleService.registerSale(req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listSales(req, res, next) {
  try {
    const result = await saleService.listSales(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerSale,
  listSales
};
