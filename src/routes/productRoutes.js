const express = require('express');
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, productController.listProducts);
router.put('/:id', authenticate, productController.updateProduct);

module.exports = router;
