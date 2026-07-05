const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*,
        (SELECT MAX(m.fecha_hora) FROM movimientos_inventario m
          WHERE m.proveedor_id = p.id AND m.tipo = 'entrada') AS ultima_entrega
      FROM proveedores p
      ORDER BY p.nombre ASC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { nombre, contacto, telefono, email, notas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const [result] = await pool.query(
      'INSERT INTO proveedores (nombre, contacto, telefono, email, notas) VALUES (?, ?, ?, ?, ?)',
      [nombre, contacto || null, telefono || null, email || null, notas || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { nombre, contacto, telefono, email, notas } = req.body;
    await pool.query(
      'UPDATE proveedores SET nombre = ?, contacto = ?, telefono = ?, email = ?, notas = ? WHERE id = ?',
      [nombre, contacto || null, telefono || null, email || null, notas || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM proveedores WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
