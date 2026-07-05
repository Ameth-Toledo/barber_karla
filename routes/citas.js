const express = require('express');
const router = express.Router();
const pool = require('../db');

// Lista de citas, con filtros opcionales por rango de fecha y estado
router.get('/', async (req, res, next) => {
  try {
    const { desde, hasta, estado } = req.query;
    const conditions = [];
    const params = [];

    if (desde) { conditions.push('ci.fecha >= ?'); params.push(desde); }
    if (hasta) { conditions.push('ci.fecha <= ?'); params.push(hasta); }
    if (estado) { conditions.push('ci.estado = ?'); params.push(estado); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(`
      SELECT ci.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
      FROM citas ci
      JOIN clientes c ON c.id = ci.cliente_id
      ${where}
      ORDER BY ci.fecha DESC, ci.hora DESC
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    let { cliente_id, cliente_nombre, telefono, fecha, hora, servicio, precio, estado, notas } = req.body;
    if (!fecha || !hora) return res.status(400).json({ error: 'Fecha y hora son obligatorias' });

    await conn.beginTransaction();

    if (!cliente_id) {
      if (!cliente_nombre) {
        await conn.rollback();
        return res.status(400).json({ error: 'Se requiere cliente_id o cliente_nombre' });
      }
      const [existing] = await conn.query('SELECT id FROM clientes WHERE nombre = ? LIMIT 1', [cliente_nombre]);
      if (existing.length) {
        cliente_id = existing[0].id;
      } else {
        const [result] = await conn.query(
          'INSERT INTO clientes (nombre, telefono) VALUES (?, ?)',
          [cliente_nombre, telefono || null]
        );
        cliente_id = result.insertId;
      }
    }

    const [result] = await conn.query(
      `INSERT INTO citas (cliente_id, fecha, hora, servicio, precio, estado, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cliente_id, fecha, hora, servicio || 'Corte', precio || 0, estado || 'pendiente', notas || null]
    );

    await conn.commit();
    res.status(201).json({ id: result.insertId, cliente_id });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { fecha, hora, servicio, precio, estado, notas } = req.body;
    await pool.query(
      `UPDATE citas SET fecha = ?, hora = ?, servicio = ?, precio = ?, estado = ?, notas = ?
       WHERE id = ?`,
      [fecha, hora, servicio, precio, estado, notas || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM citas WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
