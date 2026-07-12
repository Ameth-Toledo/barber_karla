const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;
    const conditions = [];
    const params = [];

    if (desde) { conditions.push('fecha >= ?'); params.push(desde); }
    if (hasta) { conditions.push('fecha <= ?'); params.push(hasta); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT * FROM ingresos_diarios ${where} ORDER BY fecha DESC, creado_en DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/resumen', async (req, res, next) => {
  try {
    const [[hoy]] = await pool.query(
      `SELECT COUNT(*) AS total_cortes, COALESCE(SUM(total), 0) AS total_ingreso
       FROM ingresos_diarios WHERE fecha = CURDATE()`
    );

    const [[semana]] = await pool.query(
      `SELECT COUNT(*) AS total_cortes, COALESCE(SUM(total), 0) AS total_ingreso
       FROM ingresos_diarios
       WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`
    );

    const [[mes]] = await pool.query(
      `SELECT COUNT(*) AS total_cortes, COALESCE(SUM(total), 0) AS total_ingreso
       FROM ingresos_diarios
       WHERE YEAR(fecha) = YEAR(CURDATE()) AND MONTH(fecha) = MONTH(CURDATE())`
    );

    const [porDia] = await pool.query(
      `SELECT fecha, COUNT(*) AS total_cortes, SUM(total) AS total_ingreso
       FROM ingresos_diarios
       WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
       GROUP BY fecha
       ORDER BY fecha ASC`
    );

    const [porMetodo] = await pool.query(
      `SELECT metodo_pago, COUNT(*) AS total_cortes, SUM(total) AS total_ingreso
       FROM ingresos_diarios
       WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
       GROUP BY metodo_pago
       ORDER BY total_ingreso DESC`
    );

    res.json({
      hoy,
      semana,
      mes,
      por_dia: porDia,
      por_metodo: porMetodo
    });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    let { fecha, cliente_nombre, servicio, cantidad, precio_unitario, total, metodo_pago, notas } = req.body;
    if (!fecha) return res.status(400).json({ error: 'La fecha es obligatoria' });

    servicio = servicio || 'Corte';
    cantidad = Number(cantidad) || 1;
    precio_unitario = Number(precio_unitario) || 0;
    total = Number(total) || precio_unitario * cantidad;
    metodo_pago = metodo_pago || 'efectivo';

    const [result] = await pool.query(
      `INSERT INTO ingresos_diarios (fecha, cliente_nombre, servicio, cantidad, precio_unitario, total, metodo_pago, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fecha, cliente_nombre || null, servicio, cantidad, precio_unitario, total, metodo_pago, notas || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    let { fecha, cliente_nombre, servicio, cantidad, precio_unitario, total, metodo_pago, notas } = req.body;

    cantidad = Number(cantidad) || 1;
    precio_unitario = Number(precio_unitario) || 0;
    total = Number(total) || precio_unitario * cantidad;

    await pool.query(
      `UPDATE ingresos_diarios
       SET fecha = ?, cliente_nombre = ?, servicio = ?, cantidad = ?, precio_unitario = ?, total = ?, metodo_pago = ?, notas = ?
       WHERE id = ?`,
      [fecha, cliente_nombre || null, servicio, cantidad, precio_unitario, total, metodo_pago, notas || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM ingresos_diarios WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
