class StockAlert { constructor({ sku, nombre, stockActual, stockMinimo }) { this.sku=sku;this.nombre=nombre;this.stockActual=Number(stockActual);this.stockMinimo=Number(stockMinimo); } get critical(){return this.stockActual===0;} }
module.exports=StockAlert;
