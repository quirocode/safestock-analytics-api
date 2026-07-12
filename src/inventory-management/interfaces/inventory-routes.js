const express=require('express');
class InventoryRoutes{constructor({controller,authentication}){this.router=express.Router();this.router.use(authentication.authenticate);this.router.get('/',controller.listStock);this.router.get('/movimientos',controller.listMovements);this.router.post('/movimientos',controller.createMovement);this.router.post('/ajustes-masivos',authentication.authorize('ADMIN'),controller.bulkAdjust);}}
module.exports=InventoryRoutes;
