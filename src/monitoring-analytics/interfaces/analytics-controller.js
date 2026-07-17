class AnalyticsController {
  constructor(service, subscriptionService) {
    this.service=service; this.subscriptionService=subscriptionService;
    for(const method of ['summary','lowStock','suspicious','employeeRisk','advanced','consolidated','stockZeroAlerts','exportSales']) this[method]=this[method].bind(this);
  }
  async summary(req,res,next){try{res.json(await this.service.summary());}catch(error){next(error);}}
  async lowStock(req,res,next){try{res.json(await this.service.lowStock());}catch(error){next(error);}}
  async suspicious(req,res,next){try{const plan=await this.subscriptionService.assertFeature(req.user.organizationId,'antifraud');res.json(await this.service.suspicious({organizationId:req.user.organizationId,threshold:plan.fraudThreshold||0}));}catch(error){next(error);}}
  async employeeRisk(req,res,next){try{await this.subscriptionService.assertFeature(req.user.organizationId,'antifraud');res.json(await this.service.employeeRisk({organizationId:req.user.organizationId,query:req.query}));}catch(error){next(error);}}
  async advanced(req,res,next){try{await this.subscriptionService.assertFeature(req.user.organizationId,'activities');res.json(await this.service.advanced(req.query));}catch(error){next(error);}}
  async consolidated(req,res,next){try{await this.subscriptionService.assertFeature(req.user.organizationId,'analytics');res.json(await this.service.consolidated(req.query));}catch(error){next(error);}}
  async stockZeroAlerts(req,res,next){try{res.json(await this.service.stockZeroAlerts(req.query));}catch(error){next(error);}}
  async exportSales(req,res,next){try{await this.subscriptionService.assertFeature(req.user.organizationId,'activities');const csv=await this.service.exportSales(req.query);res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="reporte-ventas.csv"'});res.send(csv);}catch(error){next(error);}}
}
module.exports=AnalyticsController;
