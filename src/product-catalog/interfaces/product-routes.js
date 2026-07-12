const express = require('express');
const multer = require('multer');

class ProductRoutes {
  constructor({ controller, authentication }) {
    this.router = express.Router();
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
    this.router.use(authentication.authenticate);
    this.router.get('/', controller.list);
    this.router.post('/', controller.create);
    this.router.post('/importar', authentication.authorize('ADMIN'), upload.single('archivo'), controller.importExcel);
    this.router.put('/:id', controller.update);
    this.router.delete('/:id', authentication.authorize('ADMIN'), controller.remove);
  }
}
module.exports = ProductRoutes;
