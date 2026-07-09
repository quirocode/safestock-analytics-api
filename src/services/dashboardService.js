const env = require('../config/env');
const dashboardModel = require('../models/dashboardModel');

async function getSummary() {
  const summary = await dashboardModel.getSummary({
    timeZone: env.reportTimeZone
  });

  return {
    totalVentasHoy: summary.total_ventas_hoy,
    transaccionesHoy: summary.transacciones_hoy,
    productosBajoStock: summary.productos_bajo_stock,
    zonaHoraria: env.reportTimeZone
  };
}

module.exports = {
  getSummary
};
