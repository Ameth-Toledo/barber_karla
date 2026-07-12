const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const clientesRouter = require('./routes/clientes');
const citasRouter = require('./routes/citas');
const proveedoresRouter = require('./routes/proveedores');
const productosRouter = require('./routes/productos');
const inventarioRouter = require('./routes/inventario');
const dashboardRouter = require('./routes/dashboard');
const ingresosRouter = require('./routes/ingresos');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/clientes', clientesRouter);
app.use('/api/citas', citasRouter);
app.use('/api/proveedores', proveedoresRouter);
app.use('/api/productos', productosRouter);
app.use('/api/inventario', inventarioRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/ingresos', ingresosRouter);

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
