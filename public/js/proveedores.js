buildSidebar('proveedores');

const modal = document.getElementById('modal-backdrop');
const form = document.getElementById('form-proveedor');

function openModal(proveedor = null) {
  form.reset();
  document.getElementById('pr-id').value = '';
  document.getElementById('modal-title').textContent = proveedor ? 'Editar proveedor' : 'Nuevo proveedor';
  if (proveedor) {
    document.getElementById('pr-id').value = proveedor.id;
    document.getElementById('pr-nombre').value = proveedor.nombre;
    document.getElementById('pr-contacto').value = proveedor.contacto || '';
    document.getElementById('pr-telefono').value = proveedor.telefono || '';
    document.getElementById('pr-email').value = proveedor.email || '';
    document.getElementById('pr-notas').value = proveedor.notas || '';
  }
  modal.classList.add('open');
}
function closeModal() { modal.classList.remove('open'); }

document.getElementById('btn-nuevo-proveedor').addEventListener('click', () => openModal());
document.getElementById('btn-cancelar').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('pr-id').value;
  const payload = {
    nombre: document.getElementById('pr-nombre').value,
    contacto: document.getElementById('pr-contacto').value,
    telefono: document.getElementById('pr-telefono').value,
    email: document.getElementById('pr-email').value,
    notas: document.getElementById('pr-notas').value
  };
  try {
    if (id) await api.put(`/api/proveedores/${id}`, payload);
    else await api.post('/api/proveedores', payload);
    closeModal();
    await cargar();
  } catch (err) { alert('Error al guardar: ' + err.message); }
});

async function eliminar(id) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  try {
    await api.del(`/api/proveedores/${id}`);
    await cargar();
  } catch (err) { alert('Error al eliminar: ' + err.message); }
}

let proveedoresCache = [];

function render(proveedores) {
  const cont = document.getElementById('tabla-proveedores');
  if (!proveedores.length) {
    cont.innerHTML = '<div class="empty-state">Aun no hay proveedores registrados.</div>';
    return;
  }
  cont.innerHTML = `
    <table>
      <thead><tr><th>Nombre</th><th>Contacto</th><th>Telefono</th><th>Email</th><th>Ultima entrega</th><th></th></tr></thead>
      <tbody>
        ${proveedores.map(p => `
          <tr>
            <td>${p.nombre}</td>
            <td>${p.contacto || '-'}</td>
            <td>${p.telefono || '-'}</td>
            <td>${p.email || '-'}</td>
            <td>${p.ultima_entrega ? fmtFechaHora(p.ultima_entrega) : '<span class="text-muted">Sin registros</span>'}</td>
            <td>
              <button class="btn btn-sm" data-edit="${p.id}">Editar</button>
              <button class="btn btn-sm btn-danger" data-del="${p.id}">Eliminar</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  cont.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openModal(proveedoresCache.find(p => p.id == btn.dataset.edit)))
  );
  cont.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => eliminar(btn.dataset.del))
  );
}

async function cargar() {
  proveedoresCache = await api.get('/api/proveedores');
  render(proveedoresCache);
}

cargar().catch(err => alert('Error al cargar proveedores: ' + err.message));
