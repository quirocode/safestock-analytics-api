const inventoryService = require('../services/inventoryService');

async function listInventory(req, res, next) {
  try {
    const inventario = await inventoryService.listInventory();
    res.status(200).json({ inventario });
  } catch (error) {
    next(error);
  }
}

async function listMovements(req, res, next) {
  try {
    const result = await inventoryService.listMovements(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listInventory,
  listMovements
};
