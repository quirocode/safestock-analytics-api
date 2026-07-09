const inventoryModel = require('../models/inventoryModel');

function buildMovementPagination(query) {
  const parsedLimit = Number(query.limit || 100);
  const parsedOffset = Number(query.offset || 0);

  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 500)
    : 100;

  const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0
    ? parsedOffset
    : 0;

  return { limit, offset };
}

async function listInventory() {
  return inventoryModel.listCurrentStock();
}

async function listMovements(query = {}) {
  const pagination = buildMovementPagination(query);
  const movimientos = await inventoryModel.listMovements(pagination);

  return {
    movimientos,
    pagination
  };
}

module.exports = {
  listInventory,
  listMovements
};
