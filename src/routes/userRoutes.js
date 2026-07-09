const express = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.put('/perfil', authenticate, userController.updateProfile);

module.exports = router;
