class InventoryController {
  constructor(service){this.service=service;for(const m of ['listStock','listMovements','createMovement','bulkAdjust'])this[m]=this[m].bind(this);}
  async listStock(req,res,next){try{res.json(await this.service.listStock());}catch(e){next(e);}}
  async listMovements(req,res,next){try{res.json(await this.service.listMovements(req.query));}catch(e){next(e);}}
  async createMovement(req,res,next){try{res.status(201).json(await this.service.createMovement(req.user.id,req.body));}catch(e){next(e);}}
  async bulkAdjust(req,res,next){try{res.json({ajustes:await this.service.bulkAdjust(req.user.id,req.body)});}catch(e){next(e);}}
}
module.exports=InventoryController;
