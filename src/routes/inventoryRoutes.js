const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, inventoryController.listInventory);
router.get('/movimientos', authenticate, inventoryController.listMovements);

module.exports = router;
