const express = require('express');
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/authorizationMiddleware');

const router = express.Router();

router.get('/', authenticate, authorizeRoles('ADMIN', 'ADMINISTRADOR'), employeeController.listEmployees);

module.exports = router;
