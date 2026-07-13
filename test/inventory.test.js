const test = require('node:test');
const assert = require('node:assert/strict');
const Inventory = require('../src/inventory-management/domain/inventory');

test('emits a critical alert only when positive stock reaches exactly zero', () => {
  const inventory = new Inventory({ previousStock: 3, currentStock: 0, productName: 'Agua', sku: 'AG-1' });
  const alert = inventory.createZeroStockAlert();
  assert.equal(alert.severity, 'CRITICA');
  assert.match(alert.description, /Agua\/AG-1 ha llegado a Stock 0/);
});

test('does not emit a zero-stock alert while stock remains available', () => {
  const inventory = new Inventory({ previousStock: 3, currentStock: 1, productName: 'Agua', sku: 'AG-1' });
  assert.equal(inventory.createZeroStockAlert(), null);
});
