const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/resumen', authenticate, dashboardController.getSummary);

module.exports = router;
