buildSidebar('ingresos');
chartDefaults();

const modal = document.getElementById('modal-backdrop');
const form = document.getElementById('form-ingreso');

function metodoBadge(metodo) {
  const map = { efectivo: 'good', tarjeta: 'warning', transferencia: '', otro: 'muted' };
  return `<span class="badge ${map[metodo] || 'muted'}">${metodo.charAt(0).toUpperCase() + metodo.slice(1)}</span>`;
}

function openModal(ingreso = null) {
  form.reset();
  document.getElementById('i-id').value = '';
  document.getElementById('modal-title').textContent = ingreso ? 'Editar ingreso' : 'Nuevo ingreso';

  if (ingreso) {
    document.getElementById('i-id').value = ingreso.id;
    document.getElementById('i-fecha').value = ingreso.fecha;
    document.getElementById('i-cliente').value = ingreso.cliente_nombre || '';
    document.getElementById('i-servicio').value = ingreso.servicio;
    document.getElementById('i-cantidad').value = ingreso.cantidad;
    document.getElementById('i-precio').value = ingreso.precio_unitario;
    document.getElementById('i-total').value = ingreso.total;
    document.getElementById('i-metodo').value = ingreso.metodo_pago;
    document.getElementById('i-notas').value = ingreso.notas || '';
  } else {
    document.getElementById('i-fecha').value = todayISO();
  }
  modal.classList.add('open');
}

function closeModal() { modal.classList.remove('open'); }

document.getElementById('btn-nuevo-ingreso').addEventListener('click', () => openModal());
document.getElementById('btn-cancelar').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function calcTotal() {
  const cant = Number(document.getElementById('i-cantidad').value) || 0;
  const precio = Number(document.getElementById('i-precio').value) || 0;
  document.getElementById('i-total').value = (cant * precio).toFixed(2);
}
document.getElementById('i-cantidad').addEventListener('input', calcTotal);
document.getElementById('i-precio').addEventListener('input', calcTotal);

form.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('i-id').value;
  const payload = {
    fecha: document.getElementById('i-fecha').value,
    cliente_nombre: document.getElementById('i-cliente').value,
    servicio: document.getElementById('i-servicio').value,
    cantidad: Number(document.getElementById('i-cantidad').value) || 1,
    precio_unitario: Number(document.getElementById('i-precio').value) || 0,
    total: Number(document.getElementById('i-total').value) || 0,
    metodo_pago: document.getElementById('i-metodo').value,
    notas: document.getElementById('i-notas').value
  };
  try {
    if (id) {
      await api.put(`/api/ingresos/${id}`, payload);
    } else {
      await api.post('/api/ingresos', payload);
    }
    closeModal();
    await refrescar();
    await cargarResumen();
  } catch (err) { alert('Error al guardar: ' + err.message); }
});

async function eliminarIngreso(id) {
  if (!confirm('¿Eliminar este ingreso?')) return;
  try {
    await api.del(`/api/ingresos/${id}`);
    await refrescar();
    await cargarResumen();
  } catch (err) { alert('Error al eliminar: ' + err.message); }
}

function renderTabla(ingresos) {
  const cont = document.getElementById('tabla-ingresos');
  if (!ingresos.length) {
    cont.innerHTML = '<div class="empty-state">No hay ingresos en este rango.</div>';
    return;
  }
  cont.innerHTML = `
    <table>
      <thead>
        <tr><th>Fecha</th><th>Cliente</th><th>Servicio</th><th>Cant.</th><th>Precio</th><th>Total</th><th>Metodo</th><th></th></tr>
      </thead>
      <tbody>
        ${ingresos.map(i => `
          <tr>
            <td>${fmtFecha(i.fecha)}</td>
            <td>${i.cliente_nombre || '-'}</td>
            <td>${i.servicio}</td>
            <td>${i.cantidad}</td>
            <td>${fmtMoney(i.precio_unitario)}</td>
            <td><strong>${fmtMoney(i.total)}</strong></td>
            <td>${metodoBadge(i.metodo_pago)}</td>
            <td>
              <button class="btn btn-sm" data-edit="${i.id}">Editar</button>
              <button class="btn btn-sm btn-danger" data-del="${i.id}">Eliminar</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  cont.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openModal(ingresos.find(i => i.id == btn.dataset.edit)))
  );
  cont.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => eliminarIngreso(btn.dataset.del))
  );
}

let chartDia = null, chartMetodo = null;

async function cargarResumen() {
  const data = await api.get('/api/ingresos/resumen');

  document.getElementById('stat-ingreso-hoy').textContent = fmtMoney(data.hoy.total_ingreso);
  document.getElementById('stat-cortes-hoy').textContent = `${data.hoy.total_cortes} cortes`;
  document.getElementById('stat-ingreso-semana').textContent = fmtMoney(data.semana.total_ingreso);
  document.getElementById('stat-cortes-semana').textContent = `${data.semana.total_cortes} cortes`;
  document.getElementById('stat-ingreso-mes').textContent = fmtMoney(data.mes.total_ingreso);
  document.getElementById('stat-cortes-mes').textContent = `${data.mes.total_cortes} cortes`;

  if (chartDia) chartDia.destroy();
  chartDia = new Chart(document.getElementById('chart-ingresos-dia'), {
    type: 'bar',
    data: {
      labels: data.por_dia.map(r => fmtFecha(r.fecha)),
      datasets: [{
        label: 'Ingresos',
        data: data.por_dia.map(r => r.total_ingreso),
        backgroundColor: SERIES_COLORS[1],
        borderRadius: 4,
        maxBarThickness: 18
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: v => '$' + v } }
      }
    }
  });

  if (chartMetodo) chartMetodo.destroy();
  const metodoLabels = data.por_metodo.map(r => r.metodo_pago.charAt(0).toUpperCase() + r.metodo_pago.slice(1));
  chartMetodo = new Chart(document.getElementById('chart-ingresos-metodo'), {
    type: 'doughnut',
    data: {
      labels: metodoLabels,
      datasets: [{
        data: data.por_metodo.map(r => r.total_ingreso),
        backgroundColor: SERIES_COLORS.slice(0, data.por_metodo.length)
      }]
    },
    options: {
      plugins: { legend: { position: 'right' } }
    }
  });
}

async function refrescar() {
  const desde = document.getElementById('f-desde').value;
  const hasta = document.getElementById('f-hasta').value;
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);

  const ingresos = await api.get(`/api/ingresos?${params.toString()}`);
  renderTabla(ingresos);
}

document.getElementById('btn-filtrar').addEventListener('click', () => refrescar().catch(err => alert(err.message)));

(async function init() {
  try {
    await cargarResumen();
    await refrescar();
  } catch (err) { alert('Error al cargar ingresos: ' + err.message); }
})();
