const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const alertRoutes = require('./routes/alertRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const productRoutes = require('./routes/productRoutes');
const saleRoutes = require('./routes/saleRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'safestock-analytics-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/alertas', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/empleados', employeeRoutes);
app.use('/api/inventario', inventoryRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/ventas', saleRoutes);
app.use('/api/usuarios', userRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
