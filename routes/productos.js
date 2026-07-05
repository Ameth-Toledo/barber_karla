const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { categoria } = req.query;
    const conditions = ['p.activo = 1'];
    const params = [];
    if (categoria) { conditions.push('p.categoria = ?'); params.push(categoria); }

    const [rows] = await pool.query(`
      SELECT p.*, pr.nombre AS proveedor_nombre
      FROM productos p
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.categoria ASC, p.nombre ASC
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { nombre, categoria, unidad_medida, stock_actual, stock_minimo, precio_compra, precio_venta, proveedor_id } = req.body;
    if (!nombre || !categoria) return res.status(400).json({ error: 'Nombre y categoria son obligatorios' });
    const [result] = await pool.query(
      `INSERT INTO productos (nombre, categoria, unidad_medida, stock_actual, stock_minimo, precio_compra, precio_venta, proveedor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, categoria, unidad_medida || 'pza', stock_actual || 0, stock_minimo || 0, precio_compra || 0, precio_venta || 0, proveedor_id || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { nombre, categoria, unidad_medida, stock_minimo, precio_compra, precio_venta, proveedor_id } = req.body;
    await pool.query(
      `UPDATE productos SET nombre = ?, categoria = ?, unidad_medida = ?, stock_minimo = ?,
        precio_compra = ?, precio_venta = ?, proveedor_id = ? WHERE id = ?`,
      [nombre, categoria, unidad_medida, stock_minimo || 0, precio_compra || 0, precio_venta || 0, proveedor_id || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('UPDATE productos SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
