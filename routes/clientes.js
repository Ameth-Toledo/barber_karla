const express = require('express');
const router = express.Router();
const pool = require('../db');

// Lista de clientes con estadisticas de frecuencia
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id, c.nombre, c.telefono, c.notas, c.creado_en,
        COUNT(ci.id) AS total_citas,
        MAX(ci.fecha) AS ultima_visita,
        MIN(ci.fecha) AS primera_visita,
        ROUND(DATEDIFF(MAX(ci.fecha), MIN(ci.fecha)) / NULLIF(COUNT(ci.id) - 1, 0), 1) AS promedio_dias_entre_visitas
      FROM clientes c
      LEFT JOIN citas ci ON ci.cliente_id = c.id AND ci.estado <> 'cancelada'
      GROUP BY c.id
      ORDER BY total_citas DESC, c.nombre ASC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { nombre, telefono, notas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const [result] = await pool.query(
      'INSERT INTO clientes (nombre, telefono, notas) VALUES (?, ?, ?)',
      [nombre, telefono || null, notas || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { nombre, telefono, notas } = req.body;
    await pool.query(
      'UPDATE clientes SET nombre = ?, telefono = ?, notas = ? WHERE id = ?',
      [nombre, telefono || null, notas || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
