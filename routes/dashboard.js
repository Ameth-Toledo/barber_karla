const express = require('express');
const router = express.Router();
const pool = require('../db');

// Resumen de citas: hoy, por dia (ultimos N dias), clientes frecuentes, frecuencia promedio
router.get('/citas-resumen', async (req, res, next) => {
  try {
    const dias = Number(req.query.dias) || 30;

    const [[hoy]] = await pool.query(
      `SELECT COUNT(*) AS total FROM citas WHERE fecha = CURDATE() AND estado <> 'cancelada'`
    );

    const [porDia] = await pool.query(
      `SELECT fecha, COUNT(*) AS total
       FROM citas
       WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND estado <> 'cancelada'
       GROUP BY fecha
       ORDER BY fecha ASC`,
      [dias]
    );

    const [clientesFrecuentes] = await pool.query(
      `SELECT c.id, c.nombre, COUNT(ci.id) AS total_citas, MAX(ci.fecha) AS ultima_visita
       FROM clientes c
       JOIN citas ci ON ci.cliente_id = c.id AND ci.estado <> 'cancelada'
       GROUP BY c.id
       ORDER BY total_citas DESC
       LIMIT 8`
    );

    const [[frecuencia]] = await pool.query(
      `SELECT ROUND(AVG(promedio), 1) AS promedio_dias FROM (
         SELECT cliente_id, DATEDIFF(MAX(fecha), MIN(fecha)) / NULLIF(COUNT(*) - 1, 0) AS promedio
         FROM citas
         WHERE estado <> 'cancelada'
         GROUP BY cliente_id
         HAVING COUNT(*) > 1
       ) t`
    );

    const [[semana]] = await pool.query(
      `SELECT COUNT(*) AS total FROM citas
       WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND estado <> 'cancelada'`
    );

    res.json({
      citas_hoy: hoy.total,
      citas_semana: semana.total,
      por_dia: porDia,
      clientes_frecuentes: clientesFrecuentes,
      promedio_dias_entre_visitas: frecuencia.promedio_dias
    });
  } catch (err) { next(err); }
});

// Resumen de inventario: stock bajo, consumo mensual, entradas/salidas mensuales
router.get('/inventario-resumen', async (req, res, next) => {
  try {
    const [stockBajo] = await pool.query(
      `SELECT id, nombre, categoria, unidad_medida, stock_actual, stock_minimo
       FROM productos
       WHERE activo = 1 AND stock_actual <= stock_minimo
       ORDER BY (stock_actual - stock_minimo) ASC`
    );

    const [consumoMensual] = await pool.query(
      `SELECT p.nombre, DATE_FORMAT(m.fecha_hora, '%Y-%m') AS mes, SUM(m.cantidad) AS total
       FROM movimientos_inventario m
       JOIN productos p ON p.id = m.producto_id
       WHERE m.tipo = 'salida' AND p.categoria = 'uso_diario'
         AND m.fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY p.id, mes
       ORDER BY mes ASC`
    );

    const [entradasSalidas] = await pool.query(
      `SELECT DATE_FORMAT(m.fecha_hora, '%Y-%m') AS mes, m.tipo, SUM(m.cantidad) AS total
       FROM movimientos_inventario m
       JOIN productos p ON p.id = m.producto_id
       WHERE p.categoria = 'venta'
         AND m.fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY mes, m.tipo
       ORDER BY mes ASC`
    );

    const [proximasEntregas] = await pool.query(
      `SELECT pr.id, pr.nombre, MAX(m.fecha_hora) AS ultima_entrega
       FROM proveedores pr
       LEFT JOIN movimientos_inventario m ON m.proveedor_id = pr.id AND m.tipo = 'entrada'
       GROUP BY pr.id
       ORDER BY ultima_entrega DESC`
    );

    res.json({
      stock_bajo: stockBajo,
      consumo_mensual: consumoMensual,
      entradas_salidas_mensual: entradasSalidas,
      proveedores_ultima_entrega: proximasEntregas
    });
  } catch (err) { next(err); }
});

module.exports = router;
