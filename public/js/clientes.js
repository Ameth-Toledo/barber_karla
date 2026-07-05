buildSidebar('clientes');

const modal = document.getElementById('modal-backdrop');
const form = document.getElementById('form-cliente');
let clientesCache = [];

function openModal(cliente = null) {
  form.reset();
  document.getElementById('cl-id').value = '';
  document.getElementById('modal-title').textContent = cliente ? 'Editar cliente' : 'Nuevo cliente';
  if (cliente) {
    document.getElementById('cl-id').value = cliente.id;
    document.getElementById('cl-nombre').value = cliente.nombre;
    document.getElementById('cl-telefono').value = cliente.telefono || '';
    document.getElementById('cl-notas').value = cliente.notas || '';
  }
  modal.classList.add('open');
}
function closeModal() { modal.classList.remove('open'); }

document.getElementById('btn-nuevo-cliente').addEventListener('click', () => openModal());
document.getElementById('btn-cancelar').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('cl-id').value;
  const payload = {
    nombre: document.getElementById('cl-nombre').value,
    telefono: document.getElementById('cl-telefono').value,
    notas: document.getElementById('cl-notas').value
  };
  try {
    if (id) await api.put(`/api/clientes/${id}`, payload);
    else await api.post('/api/clientes', payload);
    closeModal();
    await cargar();
  } catch (err) { alert('Error al guardar: ' + err.message); }
});

async function eliminarCliente(id) {
  if (!confirm('¿Eliminar este cliente? Tambien se eliminaran sus citas.')) return;
  try {
    await api.del(`/api/clientes/${id}`);
    await cargar();
  } catch (err) { alert('Error al eliminar: ' + err.message); }
}

function render(clientes) {
  const cont = document.getElementById('tabla-clientes');
  if (!clientes.length) {
    cont.innerHTML = '<div class="empty-state">Aun no hay clientes registrados.</div>';
    return;
  }
  cont.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nombre</th><th>Telefono</th><th>Citas</th><th>Primera visita</th>
          <th>Ultima visita</th><th>Frecuencia</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${clientes.map(c => `
          <tr>
            <td>${c.nombre} ${c.total_citas >= 3 ? '<span class="badge good">Frecuente</span>' : ''}</td>
            <td>${c.telefono || '-'}</td>
            <td>${c.total_citas}</td>
            <td>${fmtFecha(c.primera_visita)}</td>
            <td>${fmtFecha(c.ultima_visita)}</td>
            <td>${c.promedio_dias_entre_visitas ? `cada ${c.promedio_dias_entre_visitas} dias` : '-'}</td>
            <td>
              <button class="btn btn-sm" data-edit="${c.id}">Editar</button>
              <button class="btn btn-sm btn-danger" data-del="${c.id}">Eliminar</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  cont.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openModal(clientes.find(c => c.id == btn.dataset.edit)))
  );
  cont.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => eliminarCliente(btn.dataset.del))
  );
}

document.getElementById('f-buscar').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  render(clientesCache.filter(c => c.nombre.toLowerCase().includes(q)));
});

async function cargar() {
  clientesCache = await api.get('/api/clientes');
  render(clientesCache);
}

cargar().catch(err => alert('Error al cargar clientes: ' + err.message));
