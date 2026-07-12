class ProductController {
  constructor(service) { this.service = service; for (const m of ['list','create','update','remove','importExcel']) this[m] = this[m].bind(this); }
  async list(req,res,next){try{res.json(await this.service.list(req.query));}catch(e){next(e);}}
  async create(req,res,next){try{res.status(201).json(await this.service.create(req.body));}catch(e){next(e);}}
  async update(req,res,next){try{res.json(await this.service.update(req.params.id,req.body));}catch(e){next(e);}}
  async remove(req,res,next){try{res.json(await this.service.remove(req.params.id));}catch(e){next(e);}}
  async importExcel(req,res,next){try{const products=await this.service.importExcel(req.file?.buffer);res.status(201).json({importados:products.length,productos:products});}catch(e){next(e);}}
}
module.exports = ProductController;
