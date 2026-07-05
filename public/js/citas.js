buildSidebar('citas');
chartDefaults();

const modal = document.getElementById('modal-backdrop');
const form = document.getElementById('form-cita');
let citasCache = [];

function estadoBadge(estado) {
  const map = { pendiente: 'warning', completada: 'good', cancelada: 'critical' };
  const labels = { pendiente: 'Pendiente', completada: 'Completada', cancelada: 'Cancelada' };
  return `<span class="badge ${map[estado]}">${labels[estado]}</span>`;
}

function openModal(cita = null) {
  form.reset();
  document.getElementById('c-id').value = '';
  document.getElementById('modal-title').textContent = cita ? 'Editar cita' : 'Nueva cita';
  document.getElementById('c-cliente').disabled = false;
  document.getElementById('c-telefono').style.display = '';

  if (cita) {
    document.getElementById('c-id').value = cita.id;
    document.getElementById('c-cliente').value = cita.cliente_nombre;
    document.getElementById('c-cliente').disabled = true;
    document.getElementById('c-telefono').style.display = 'none';
    document.getElementById('c-fecha').value = cita.fecha;
    document.getElementById('c-hora').value = cita.hora.slice(0, 5);
    document.getElementById('c-servicio').value = cita.servicio;
    document.getElementById('c-precio').value = cita.precio;
    document.getElementById('c-estado').value = cita.estado;
    document.getElementById('c-notas').value = cita.notas || '';
  } else {
    document.getElementById('c-fecha').value = todayISO();
  }
  modal.classList.add('open');
}

function closeModal() { modal.classList.remove('open'); }

document.getElementById('btn-nueva-cita').addEventListener('click', () => openModal());
document.getElementById('btn-cancelar').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('c-id').value;
  const payload = {
    fecha: document.getElementById('c-fecha').value,
    hora: document.getElementById('c-hora').value,
    servicio: document.getElementById('c-servicio').value,
    precio: Number(document.getElementById('c-precio').value) || 0,
    estado: document.getElementById('c-estado').value,
    notas: document.getElementById('c-notas').value
  };
  try {
    if (id) {
      await api.put(`/api/citas/${id}`, payload);
    } else {
      payload.cliente_nombre = document.getElementById('c-cliente').value;
      payload.telefono = document.getElementById('c-telefono').value;
      await api.post('/api/citas', payload);
    }
    closeModal();
    await refrescar();
  } catch (err) { alert('Error al guardar: ' + err.message); }
});

async function eliminarCita(id) {
  if (!confirm('¿Eliminar esta cita?')) return;
  try {
    await api.del(`/api/citas/${id}`);
    await refrescar();
  } catch (err) { alert('Error al eliminar: ' + err.message); }
}

function renderTabla(citas) {
  const cont = document.getElementById('tabla-citas');
  if (!citas.length) {
    cont.innerHTML = '<div class="empty-state">No hay citas en este rango.</div>';
    return;
  }
  cont.innerHTML = `
    <table>
      <thead>
        <tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Precio</th><th>Estado</th><th></th></tr>
      </thead>
      <tbody>
        ${citas.map(c => `
          <tr>
            <td>${fmtFecha(c.fecha)}</td>
            <td>${c.hora.slice(0, 5)}</td>
            <td>${c.cliente_nombre}</td>
            <td>${c.servicio}</td>
            <td>${fmtMoney(c.precio)}</td>
            <td>${estadoBadge(c.estado)}</td>
            <td>
              <button class="btn btn-sm" data-edit="${c.id}">Editar</button>
              <button class="btn btn-sm btn-danger" data-del="${c.id}">Eliminar</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  cont.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openModal(citas.find(c => c.id == btn.dataset.edit)))
  );
  cont.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => eliminarCita(btn.dataset.del))
  );
}

function renderChartMes(citas) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const diasEnMes = new Date(y, m + 1, 0).getDate();
  const counts = new Array(diasEnMes).fill(0);

  citas.forEach(c => {
    const [cy, cm, cd] = c.fecha.split('-').map(Number);
    if (cy === y && cm === m + 1 && c.estado !== 'cancelada') counts[cd - 1]++;
  });

  new Chart(document.getElementById('chart-citas-mes'), {
    type: 'bar',
    data: {
      labels: counts.map((_, i) => i + 1),
      datasets: [{ label: 'Citas', data: counts, backgroundColor: SERIES_COLORS[0], borderRadius: 3, maxBarThickness: 14 }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: 'Dia del mes' } },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

async function cargarClientesDatalist() {
  const clientes = await api.get('/api/clientes');
  document.getElementById('lista-clientes').innerHTML =
    clientes.map(c => `<option value="${c.nombre}">`).join('');
}

async function refrescar() {
  const desde = document.getElementById('f-desde').value;
  const hasta = document.getElementById('f-hasta').value;
  const estado = document.getElementById('f-estado').value;
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (estado) params.set('estado', estado);

  citasCache = await api.get(`/api/citas?${params.toString()}`);
  renderTabla(citasCache);
}

document.getElementById('btn-filtrar').addEventListener('click', () => refrescar().catch(err => alert(err.message)));

(async function init() {
  try {
    const mesCitas = await api.get('/api/citas');
    renderChartMes(mesCitas);
    await cargarClientesDatalist();
    await refrescar();
  } catch (err) { alert('Error al cargar citas: ' + err.message); }
})();
