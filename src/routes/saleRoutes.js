const express = require('express');
const saleController = require('../controllers/saleController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authenticate, saleController.registerSale);
router.get('/', authenticate, saleController.listSales);

module.exports = router;
