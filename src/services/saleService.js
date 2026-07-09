const saleModel = require('../models/saleModel');

const IGV_RATE = 0.18;

class SaleError extends Error {
  constructor(message, statusCode = 400, details = undefined) {
    super(message);
    this.name = 'SaleError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new SaleError('La venta debe incluir al menos un producto.', 400);
  }

  const grouped = new Map();

  for (const item of items) {
    const productId = Number(item.id_producto || item.producto_id || item.productoId);
    const quantity = Number(item.cantidad);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new SaleError('Cada item debe incluir un ID de producto valido.', 400);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new SaleError('Cada item debe incluir una cantidad entera mayor a cero.', 400);
    }

    grouped.set(productId, (grouped.get(productId) || 0) + quantity);
  }

  return Array.from(grouped.entries()).map(([productId, quantity]) => ({
    productId,
    quantity
  }));
}

function decimalToCents(value) {
  const [wholePart, decimalPart = ''] = String(value).split('.');
  const cents = `${decimalPart}00`.slice(0, 2);
  return (Number(wholePart) * 100) + Number(cents);
}

function centsToDecimal(cents) {
  return (cents / 100).toFixed(2);
}

function buildSalesPagination(query) {
  const parsedLimit = Number(query.limit || 100);
  const parsedOffset = Number(query.offset || 0);

  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 500)
    : 100;

  const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0
    ? parsedOffset
    : 0;

  return { limit, offset };
}

async function registerSale(userId, payload) {
  const items = normalizeItems(payload.productos || payload.items || payload.detalles);
  const client = await saleModel.pool.connect();

  try {
    await client.query('BEGIN');

    const productIds = items.map((item) => item.productId);
    const productsResult = await client.query(
      `SELECT
         id,
         sku,
         nombre,
         precio,
         stock_actual,
         estado
       FROM productos
       WHERE id = ANY($1::bigint[])
       FOR UPDATE`,
      [productIds]
    );

    const productsById = new Map(productsResult.rows.map((product) => [Number(product.id), product]));
    const unavailable = [];
    const saleDetails = [];
    let subtotalCents = 0;

    for (const item of items) {
      const product = productsById.get(item.productId);

      if (!product) {
        unavailable.push({
          productoId: item.productId,
          motivo: 'Producto no encontrado.'
        });
        continue;
      }

      if (product.estado !== 'activo') {
        unavailable.push({
          productoId: item.productId,
          sku: product.sku,
          nombre: product.nombre,
          motivo: 'Producto inactivo.'
        });
        continue;
      }

      if (Number(product.stock_actual) < item.quantity) {
        unavailable.push({
          productoId: item.productId,
          sku: product.sku,
          nombre: product.nombre,
          stockDisponible: Number(product.stock_actual),
          cantidadSolicitada: item.quantity,
          motivo: 'Stock insuficiente.'
        });
        continue;
      }

      const unitPriceCents = decimalToCents(product.precio);
      const lineSubtotalCents = unitPriceCents * item.quantity;
      subtotalCents += lineSubtotalCents;

      saleDetails.push({
        productId: item.productId,
        sku: product.sku,
        nombre: product.nombre,
        quantity: item.quantity,
        unitPriceCents,
        lineSubtotalCents
      });
    }

    if (unavailable.length > 0) {
      throw new SaleError('No se puede registrar la venta por problemas de stock o disponibilidad.', 400, unavailable);
    }

    const igvCents = Math.round(subtotalCents * IGV_RATE);
    const totalCents = subtotalCents + igvCents;

    const saleResult = await client.query(
      `INSERT INTO ventas (id_usuario, subtotal, igv, total)
       VALUES ($1, $2, $3, $4)
       RETURNING id, id_usuario, fecha, subtotal, igv, total`,
      [
        userId,
        centsToDecimal(subtotalCents),
        centsToDecimal(igvCents),
        centsToDecimal(totalCents)
      ]
    );

    const sale = saleResult.rows[0];
    const insertedDetails = [];

    for (const detail of saleDetails) {
      const detailResult = await client.query(
        `INSERT INTO ventas_detalle (id_venta, id_producto, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, id_venta, id_producto, cantidad, precio_unitario, subtotal`,
        [
          sale.id,
          detail.productId,
          detail.quantity,
          centsToDecimal(detail.unitPriceCents),
          centsToDecimal(detail.lineSubtotalCents)
        ]
      );

      const stockUpdateResult = await client.query(
        `UPDATE productos
         SET stock_actual = stock_actual - $2,
             actualizado_en = NOW()
         WHERE id = $1
           AND stock_actual >= $2`,
        [detail.productId, detail.quantity]
      );

      if (stockUpdateResult.rowCount !== 1) {
        throw new SaleError('No se pudo descontar stock de forma segura.', 400, [
          {
            productoId: detail.productId,
            sku: detail.sku,
            nombre: detail.nombre,
            cantidadSolicitada: detail.quantity,
            motivo: 'Stock insuficiente al momento de actualizar.'
          }
        ]);
      }

      await client.query(
        `INSERT INTO historial_inventario (producto_id, tipo_movimiento, cantidad, usuario_id)
         VALUES ($1, 'VENTA', $2, $3)`,
        [detail.productId, detail.quantity, userId]
      );

      insertedDetails.push({
        ...detailResult.rows[0],
        sku: detail.sku,
        nombre: detail.nombre
      });
    }

    await client.query('COMMIT');

    return {
      venta: sale,
      detalles: insertedDetails
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listSales(query = {}) {
  const pagination = buildSalesPagination(query);
  const ventas = await saleModel.listSales(pagination);

  return {
    ventas,
    pagination
  };
}

module.exports = {
  SaleError,
  registerSale,
  listSales
};
