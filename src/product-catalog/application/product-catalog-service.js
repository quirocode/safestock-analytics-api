const HttpError = require('../../shared/domain/http-error');
const Product = require('../domain/product');

class ProductCatalogService {
  constructor({ repository, excelImporter }) { this.repository = repository; this.excelImporter = excelImporter; }

  list(query = {}) { return this.repository.list({ search: String(query.search || ''), includeInactive: query.includeInactive === 'true' }); }

  fromPayload(payload, current = {}) {
    return new Product({
      id: current.id,
      sku: payload.sku ?? current.sku,
      nombre: payload.nombre ?? current.nombre,
      categoria: payload.categoria ?? current.categoria ?? 'General',
      precio: payload.precio ?? current.precio,
      stockActual: payload.stock_actual ?? payload.stock ?? current.stock_actual ?? 0,
      stockMinimo: payload.stock_minimo ?? current.stock_minimo ?? 10,
      estado: payload.estado ?? current.estado ?? 'activo'
    }).assertValid();
  }

  async create(payload) {
    try { return await this.repository.create(this.fromPayload(payload)); }
    catch (error) { if (error.code === '23505') throw new HttpError('Ya existe un producto con ese SKU.', 409); throw error; }
  }

  async update(id, payload) {
    const current = await this.repository.findById(id);
    if (!current) throw new HttpError('Producto no encontrado.', 404);
    return this.repository.update(id, this.fromPayload(payload, current));
  }

  async remove(id) {
    const product = await this.repository.deactivate(id);
    if (!product) throw new HttpError('Producto no encontrado.', 404);
    return product;
  }

  async importExcel(buffer) {
    if (!buffer) throw new HttpError('Archivo Excel requerido.', 400);
    const rows = await this.excelImporter.parse(buffer);
    if (!rows.length) throw new HttpError('El archivo no contiene productos.', 400);
    const products = rows.map((row) => this.fromPayload({
      sku: row.sku || row.SKU, nombre: row.nombre || row.Nombre,
      categoria: row.categoria || row.Categoria || 'General', precio: row.precio ?? row.Precio,
      stock: row.stock ?? row.stock_actual ?? row.Stock ?? 0,
      stock_minimo: row.stock_minimo ?? row.StockMinimo ?? 10
    }));
    try { return await this.repository.importMany(products); }
    catch (error) { if (error.code === '23505') throw new HttpError('El Excel contiene un SKU duplicado o existente.', 409); throw error; }
  }
}

module.exports = ProductCatalogService;
