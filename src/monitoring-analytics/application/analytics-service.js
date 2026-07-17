const HttpError = require('../../shared/domain/http-error');
const FraudDetectionService = require('./fraud-detection-service');

class AnalyticsService {
  constructor({ repository, reportExporter, timeZone }) {
    this.repository = repository; this.reportExporter = reportExporter; this.timeZone = timeZone;
    this.fraudDetection = new FraudDetectionService(repository);
  }
  async summary() { const summary=await this.repository.summary(); return { totalVentasHoy:summary.total_ventas_hoy, transaccionesHoy:summary.transacciones_hoy, productosBajoStock:summary.productos_bajo_stock, zonaHoraria:this.timeZone }; }
  lowStock() { return this.repository.lowStock(); }
  suspicious({ organizationId, threshold }) { return this.fraudDetection.suspicious({ organizationId, threshold }); }
  employeeRisk({ organizationId, query }) { return this.fraudDetection.employeeRisk({ organizationId, query }); }
  advanced(query) { return this.repository.advanced(Math.min(Math.max(Number(query.dias)||30,7),365)); }
  async consolidated(query) {
    const filters = this.normalizeFilters(query);
    const raw = await this.repository.consolidated(filters);
    return {
      filtros: { fechaInicio: filters.from, fechaFin: filters.to, categoria: filters.category || null, sku: filters.sku || null },
      indicadores: { ventasAcumuladas: Number(raw.accumulated_sales), transacciones: Number(raw.transactions), variacionNetaInventario: Number(raw.net_inventory_variation) },
      ventasEnElTiempo: (raw.sales_series || []).map(item => ({ x: item.date, y: Number(item.total), transacciones: Number(item.transactions) })),
      productosMayorMovimiento: (raw.top_products || []).map(item => ({ sku:item.sku, nombre:item.nombre, categoria:item.categoria, cantidad:Number(item.quantity), monto:Number(item.amount) })),
      variacionesInventario: (raw.inventory_series || []).map(item => ({ x:item.date, y:Number(item.variation) }))
    };
  }
  normalizeFilters(query) {
    const today = new Date(); const defaultFrom = new Date(today); defaultFrom.setDate(today.getDate() - 29);
    const from = String(query.fechaInicio || query.fechaDesde || defaultFrom.toISOString().slice(0,10));
    const to = String(query.fechaFin || query.fechaHasta || today.toISOString().slice(0,10));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new HttpError('Las fechas deben usar el formato AAAA-MM-DD.', 400);
    const fromDate = new Date(`${from}T00:00:00Z`); const toDate = new Date(`${to}T00:00:00Z`);
    if (fromDate > toDate) throw new HttpError('La fecha de inicio no puede ser posterior a la fecha de fin.', 400);
    if ((toDate - fromDate) / 86400000 > 366) throw new HttpError('El rango máximo permitido es de 366 días.', 400);
    return { from, to, category:String(query.categoria || '').trim().slice(0,120), sku:String(query.sku || '').trim().slice(0,80) };
  }
  stockZeroAlerts(query) { return this.repository.stockZeroAlerts({ afterId:Math.max(Number(query.afterId)||0,0), since:query.desde || null }); }
  async exportSales(query) { return this.reportExporter.export(await this.repository.salesReport({ from:query.fechaDesde, to:query.fechaHasta })); }
}
module.exports = AnalyticsService;
