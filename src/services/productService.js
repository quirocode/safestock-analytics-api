const productModel = require('../models/productModel');

class ProductError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ProductError';
    this.statusCode = statusCode;
  }
}

function validateProductId(id) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new ProductError('ID de producto invalido.', 400);
  }

  return parsedId;
}

function validateProductPayload({ nombre, categoria, precio }) {
  const cleanName = nombre ? String(nombre).trim() : '';
  const cleanCategory = categoria ? String(categoria).trim() : '';
  const numericPrice = Number(precio);

  if (!cleanName || cleanName.length < 2) {
    throw new ProductError('El nombre del producto debe tener al menos 2 caracteres.', 400);
  }

  if (!cleanCategory || cleanCategory.length < 2) {
    throw new ProductError('La categoria debe tener al menos 2 caracteres.', 400);
  }

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new ProductError('El precio debe ser un numero mayor o igual a cero.', 400);
  }

  return {
    nombre: cleanName,
    categoria: cleanCategory,
    precio: numericPrice
  };
}

async function listActiveProducts() {
  return productModel.findActive();
}

async function updateProduct(id, payload) {
  const productId = validateProductId(id);
  const validPayload = validateProductPayload(payload);
  const existingProduct = await productModel.findById(productId);

  if (!existingProduct) {
    throw new ProductError('Producto no encontrado.', 404);
  }

  return productModel.updateById(productId, validPayload);
}

module.exports = {
  ProductError,
  listActiveProducts,
  updateProduct
};
