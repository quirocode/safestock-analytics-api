const ProductRepositoryPort = require('../domain/product-repository-port');

class PostgresProductRepository extends ProductRepositoryPort {
  constructor(database) { super(); this.database = database; }

  async list({ search = '', includeInactive = false } = {}) {
    const result = await this.database.query(
      `SELECT id, sku, nombre, categoria, precio, stock_actual, stock_actual AS stock,
              stock_minimo, estado, creado_en, actualizado_en
       FROM productos
       WHERE ($1::boolean OR estado = 'activo')
         AND ($2 = '' OR sku ILIKE '%' || $2 || '%' OR nombre ILIKE '%' || $2 || '%')
       ORDER BY nombre`, [includeInactive, search]
    );
    return result.rows;
  }

  async findById(id) {
    const result = await this.database.query('SELECT * FROM productos WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] || null;
  }

  async create(product, client = this.database) {
    const result = await client.query(
      `INSERT INTO productos (sku, nombre, categoria, precio, stock_actual, stock_minimo, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, sku, nombre, categoria, precio, stock_actual, stock_actual AS stock, stock_minimo, estado`,
      [product.sku, product.nombre, product.categoria, product.precio, product.stockActual, product.stockMinimo, product.estado]
    );
    return result.rows[0];
  }

  async update(id, product) {
    const result = await this.database.query(
      `UPDATE productos SET nombre=$2, categoria=$3, precio=$4, stock_actual=$5,
       stock_minimo=$6, estado=$7, actualizado_en=NOW() WHERE id=$1
       RETURNING id, sku, nombre, categoria, precio, stock_actual, stock_actual AS stock, stock_minimo, estado`,
      [id, product.nombre, product.categoria, product.precio, product.stockActual, product.stockMinimo, product.estado]
    );
    return result.rows[0] || null;
  }

  async deactivate(id) {
    const result = await this.database.query(
      `UPDATE productos SET estado='inactivo', actualizado_en=NOW() WHERE id=$1
       RETURNING id, sku, nombre, estado`, [id]
    );
    return result.rows[0] || null;
  }

  async importMany(products) {
    return this.database.transaction(async (client) => {
      const imported = [];
      for (const product of products) imported.push(await this.create(product, client));
      return imported;
    });
  }
}

module.exports = PostgresProductRepository;
