const express = require('express');
const router = express.Router();
const pool = require('../db');

// Lista de movimientos con filtros
router.get('/movimientos', async (req, res, next) => {
  try {
    const { desde, hasta, tipo, producto_id, categoria } = req.query;
    const conditions = [];
    const params = [];

    if (desde) { conditions.push('m.fecha_hora >= ?'); params.push(`${desde} 00:00:00`); }
    if (hasta) { conditions.push('m.fecha_hora <= ?'); params.push(`${hasta} 23:59:59`); }
    if (tipo) { conditions.push('m.tipo = ?'); params.push(tipo); }
    if (producto_id) { conditions.push('m.producto_id = ?'); params.push(producto_id); }
    if (categoria) { conditions.push('p.categoria = ?'); params.push(categoria); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(`
      SELECT m.*, p.nombre AS producto_nombre, p.categoria, p.unidad_medida, pr.nombre AS proveedor_nombre
      FROM movimientos_inventario m
      JOIN productos p ON p.id = m.producto_id
      LEFT JOIN proveedores pr ON pr.id = m.proveedor_id
      ${where}
      ORDER BY m.fecha_hora DESC
      LIMIT 500
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/movimientos', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { producto_id, proveedor_id, tipo, motivo, cantidad, precio_unitario, fecha_hora, notas } = req.body;
    if (!producto_id || !tipo || !cantidad) {
      return res.status(400).json({ error: 'producto_id, tipo y cantidad son obligatorios' });
    }
    if (!['entrada', 'salida'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo invalido' });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO movimientos_inventario (producto_id, proveedor_id, tipo, motivo, cantidad, precio_unitario, fecha_hora, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [producto_id, proveedor_id || null, tipo, motivo || 'ajuste', cantidad, precio_unitario || 0, fecha_hora || new Date(), notas || null]
    );

    const delta = tipo === 'entrada' ? Number(cantidad) : -Number(cantidad);
    await conn.query('UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?', [delta, producto_id]);

    await conn.commit();
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.delete('/movimientos/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM movimientos_inventario WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Movimiento no encontrado' });
    const mov = rows[0];

    await conn.beginTransaction();

    const delta = mov.tipo === 'entrada' ? -Number(mov.cantidad) : Number(mov.cantidad);
    await conn.query('UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?', [delta, mov.producto_id]);
    await conn.query('DELETE FROM movimientos_inventario WHERE id = ?', [req.params.id]);

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
