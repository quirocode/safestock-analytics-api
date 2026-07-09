const productService = require('../services/productService');

async function listProducts(req, res, next) {
  try {
    const productos = await productService.listActiveProducts();
    res.status(200).json({ productos });
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const producto = await productService.updateProduct(req.params.id, req.body);
    res.status(200).json({ producto });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  updateProduct
};
