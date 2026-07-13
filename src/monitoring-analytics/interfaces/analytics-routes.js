const express=require('express');
class AnalyticsRoutes {
  constructor({controller,authentication}) {
    this.router=express.Router(); this.router.use(authentication.authenticate);
    this.router.get('/dashboard/resumen',controller.summary);
    this.router.get('/dashboard/avanzado',controller.advanced);
    this.router.get('/dashboard/analitico',controller.consolidated);
    this.router.get('/alertas/stock',controller.lowStock);
    this.router.get('/alertas/stock-cero',controller.stockZeroAlerts);
    this.router.get('/alertas/sospechosas',controller.suspicious);
    this.router.get('/reportes/ventas.csv',authentication.authorize('ADMIN','AUDITOR'),controller.exportSales);
  }
}
module.exports=AnalyticsRoutes;
