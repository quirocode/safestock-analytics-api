const test = require('node:test');
const assert = require('node:assert/strict');
const Sale = require('../src/sales-management/domain/sale');
const SalesProcessingService = require('../src/sales-management/application/sales-processing-service');

test('extracts IGV from a tax-inclusive price', () => {
  const sale = new Sale({ userId: 1, items: [{ productoId: 10, cantidad: 1 }] });
  sale.applyProductPricing([{ id: 10, sku: 'COLA', nombre: 'Coca Cola', precio: '3.00', stock_actual: 5, estado: 'activo' }]);

  assert.deepEqual(sale.financialBreakdown, {
    total: '3.00',
    subtotal: '2.54',
    igv: '0.46'
  });
});

test('keeps total equal to unit prices multiplied by quantities', () => {
  const sale = new Sale({
    userId: 1,
    items: [{ productoId: 10, cantidad: 2 }, { productoId: 20, cantidad: 1 }]
  });
  sale.applyProductPricing([
    { id: 10, sku: 'A', nombre: 'Producto A', precio: '3.00', stock_actual: 5, estado: 'activo' },
    { id: 20, sku: 'B', nombre: 'Producto B', precio: '1.50', stock_actual: 5, estado: 'activo' }
  ]);

  assert.deepEqual(sale.financialBreakdown, {
    total: '7.50',
    subtotal: '6.36',
    igv: '1.14'
  });
});

test('application service prices the Sale domain entity before persistence', async () => {
  let persistedSale;
  const repository = {
    findProductsForSale: async () => [
      { id: 10, sku: 'COLA', nombre: 'Coca Cola', precio: '3.00', stock_actual: 5, estado: 'activo' }
    ],
    register: async (sale) => { persistedSale = sale; return sale.financialBreakdown; }
  };
  const service = new SalesProcessingService({ repository, receiptGenerator: {} });

  const result = await service.register(1, { productos: [{ productoId: 10, cantidad: 1 }] });

  assert.ok(persistedSale instanceof Sale);
  assert.equal(result.total, '3.00');
  assert.equal(result.igv, '0.46');
});
