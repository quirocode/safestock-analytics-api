const express = require('express');
const alertController = require('../controllers/alertController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stock', authenticate, alertController.listStockAlerts);

module.exports = router;
