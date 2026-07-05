buildSidebar('dashboard');
chartDefaults();

function pivotByMonth(rows, labelKey, valueKey, monthKey = 'mes') {
  const months = [...new Set(rows.map(r => r[monthKey]))].sort();
  const groups = [...new Set(rows.map(r => r[labelKey]))];
  const datasets = groups.map((g, i) => ({
    label: g,
    data: months.map(m => {
      const found = rows.find(r => r[labelKey] === g && r[monthKey] === m);
      return found ? Number(found.total) : 0;
    }),
    backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length],
    borderRadius: 4,
    maxBarThickness: 28
  }));
  return { labels: months, datasets };
}

async function loadCitasResumen() {
  const data = await api.get('/api/dashboard/citas-resumen?dias=30');

  document.getElementById('stat-citas-hoy').textContent = data.citas_hoy;
  document.getElementById('stat-citas-semana').textContent = data.citas_semana;
  document.getElementById('stat-frecuencia').textContent = data.promedio_dias_entre_visitas
    ? `${data.promedio_dias_entre_visitas} dias` : 'N/D';

  const labels = data.por_dia.map(r => fmtFecha(r.fecha));
  const values = data.por_dia.map(r => r.total);

  new Chart(document.getElementById('chart-citas-dia'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Citas',
        data: values,
        backgroundColor: SERIES_COLORS[0],
        borderRadius: 4,
        maxBarThickness: 18
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });

  const top = data.clientes_frecuentes.slice(0, 8);
  new Chart(document.getElementById('chart-clientes-frecuentes'), {
    type: 'bar',
    data: {
      labels: top.map(c => c.nombre),
      datasets: [{
        label: 'Citas totales',
        data: top.map(c => c.total_citas),
        backgroundColor: SERIES_COLORS[0],
        borderRadius: 4,
        maxBarThickness: 18
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 }, grid: { display: false } },
        y: { grid: { display: false } }
      }
    }
  });
}

async function loadInventarioResumen() {
  const data = await api.get('/api/dashboard/inventario-resumen');

  document.getElementById('stat-stock-bajo').textContent = data.stock_bajo.length;

  const cont = document.getElementById('tabla-stock-bajo');
  if (!data.stock_bajo.length) {
    cont.innerHTML = '<div class="empty-state">Todo el stock esta en orden.</div>';
  } else {
    cont.innerHTML = `
      <table>
        <thead><tr><th>Producto</th><th>Categoria</th><th>Stock</th><th>Minimo</th><th></th></tr></thead>
        <tbody>
          ${data.stock_bajo.map(p => `
            <tr>
              <td>${p.nombre}</td>
              <td><span class="badge muted">${p.categoria === 'venta' ? 'Venta' : 'Uso diario'}</span></td>
              <td>${p.stock_actual} ${p.unidad_medida}</td>
              <td>${p.stock_minimo} ${p.unidad_medida}</td>
              <td><span class="badge critical">Reabastecer</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  const canvas = document.getElementById('chart-consumo-mensual');
  if (!data.consumo_mensual.length) {
    canvas.replaceWith(Object.assign(document.createElement('div'), {
      className: 'empty-state',
      textContent: 'Aun no hay movimientos de salida registrados.'
    }));
    return;
  }
  const pivot = pivotByMonth(data.consumo_mensual, 'nombre', 'total');
  new Chart(canvas, {
    type: 'bar',
    data: pivot,
    options: {
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

loadCitasResumen().catch(err => alert('Error al cargar citas: ' + err.message));
loadInventarioResumen().catch(err => alert('Error al cargar inventario: ' + err.message));
