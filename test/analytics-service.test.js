const test = require('node:test');
const assert = require('node:assert/strict');
const AnalyticsService = require('../src/monitoring-analytics/application/analytics-service');

test('maps consolidated repository data into chart-friendly series', async () => {
  const repository = { consolidated: async () => ({ accumulated_sales:'120.50', transactions:3, net_inventory_variation:-4,
    sales_series:[{date:'2026-07-01',total:'120.50',transactions:3}],
    top_products:[{sku:'A-1',nombre:'Agua',categoria:'Bebidas',quantity:4,amount:'20.00'}],
    inventory_series:[{date:'2026-07-01',variation:-4}] }) };
  const service = new AnalyticsService({ repository, reportExporter:{}, timeZone:'America/Lima' });
  const report = await service.consolidated({ fechaInicio:'2026-07-01', fechaFin:'2026-07-07', categoria:'Bebidas', sku:'A-1' });
  assert.deepEqual(report.indicadores, { ventasAcumuladas:120.5, transacciones:3, variacionNetaInventario:-4 });
  assert.deepEqual(report.ventasEnElTiempo[0], { x:'2026-07-01', y:120.5, transacciones:3 });
  assert.equal(report.productosMayorMovimiento[0].cantidad, 4);
});

test('rejects inverted or excessive analytics date ranges', async () => {
  const service = new AnalyticsService({ repository:{}, reportExporter:{}, timeZone:'America/Lima' });
  await assert.rejects(() => service.consolidated({ fechaInicio:'2026-07-10', fechaFin:'2026-07-01' }), /no puede ser posterior/);
  await assert.rejects(() => service.consolidated({ fechaInicio:'2024-01-01', fechaFin:'2026-07-01' }), /rango máximo/);
});
