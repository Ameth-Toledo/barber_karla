buildSidebar('inventario');
chartDefaults();

let categoriaActiva = 'venta';
let productosCache = [];
let proveedoresCache = [];

function pivotByMonth(rows, labelKey, monthKey = 'mes') {
  const months = [...new Set(rows.map(r => r[monthKey]))].sort();
  const groups = [...new Set(rows.map(r => r[labelKey]))];
  const datasets = groups.map((g, i) => ({
    label: g === 'entrada' ? 'Entradas' : g === 'salida' ? 'Salidas' : g,
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

async function cargarGraficas() {
  const data = await api.get('/api/dashboard/inventario-resumen');

  const c1 = document.getElementById('chart-entradas-salidas');
  if (!data.entradas_salidas_mensual.length) {
    c1.replaceWith(Object.assign(document.createElement('div'), { className: 'empty-state', textContent: 'Aun no hay movimientos de productos de venta.' }));
  } else {
    new Chart(c1, {
      type: 'bar',
      data: pivotByMonth(data.entradas_salidas_mensual, 'tipo'),
      options: { plugins: { legend: { position: 'top' } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }
    });
  }

  const c2 = document.getElementById('chart-consumo');
  if (!data.consumo_mensual.length) {
    c2.replaceWith(Object.assign(document.createElement('div'), { className: 'empty-state', textContent: 'Aun no hay consumo registrado de insumos de uso diario.' }));
  } else {
    new Chart(c2, {
      type: 'bar',
      data: pivotByMonth(data.consumo_mensual, 'nombre'),
      options: { plugins: { legend: { position: 'top' } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }
    });
  }
}

// --- Productos ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    categoriaActiva = btn.dataset.cat;
    renderProductos();
  });
});

function renderProductos() {
  const cont = document.getElementById('tabla-productos');
  const items = productosCache.filter(p => p.categoria === categoriaActiva);
  if (!items.length) {
    cont.innerHTML = '<div class="empty-state">No hay productos en esta categoria.</div>';
    return;
  }
  cont.innerHTML = `
    <table>
      <thead>
        <tr><th>Producto</th><th>Stock</th><th>Minimo</th><th>Proveedor</th><th>Precio compra</th>
        ${categoriaActiva === 'venta' ? '<th>Precio venta</th>' : ''}<th>Estado</th><th></th></tr>
      </thead>
      <tbody>
        ${items.map(p => {
          const bajo = Number(p.stock_actual) <= Number(p.stock_minimo);
          return `
          <tr>
            <td>${p.nombre}</td>
            <td>${p.stock_actual} ${p.unidad_medida}</td>
            <td>${p.stock_minimo} ${p.unidad_medida}</td>
            <td>${p.proveedor_nombre || '-'}</td>
            <td>${fmtMoney(p.precio_compra)}</td>
            ${categoriaActiva === 'venta' ? `<td>${fmtMoney(p.precio_venta)}</td>` : ''}
            <td>${bajo ? '<span class="badge critical">Stock bajo</span>' : '<span class="badge good">OK</span>'}</td>
            <td>
              <button class="btn btn-sm" data-edit="${p.id}">Editar</button>
              <button class="btn btn-sm btn-danger" data-del="${p.id}">Eliminar</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  cont.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openProductoModal(productosCache.find(p => p.id == btn.dataset.edit)))
  );
  cont.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este producto?')) return;
      await api.del(`/api/productos/${btn.dataset.del}`);
      await cargarProductos();
    })
  );
}

function fillProveedorSelects() {
  const opts = proveedoresCache.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  document.getElementById('p-proveedor').innerHTML = '<option value="">Sin proveedor</option>' + opts;
  document.getElementById('m-proveedor').innerHTML = '<option value="">-</option>' + opts;
}

function openProductoModal(producto = null) {
  const form = document.getElementById('form-producto');
  form.reset();
  document.getElementById('p-id').value = '';
  document.getElementById('modal-producto-title').textContent = producto ? 'Editar producto' : 'Nuevo producto';
  if (producto) {
    document.getElementById('p-id').value = producto.id;
    document.getElementById('p-nombre').value = producto.nombre;
    document.getElementById('p-categoria').value = producto.categoria;
    document.getElementById('p-unidad').value = producto.unidad_medida;
    document.getElementById('p-stock-minimo').value = producto.stock_minimo;
    document.getElementById('p-precio-compra').value = producto.precio_compra;
    document.getElementById('p-precio-venta').value = producto.precio_venta;
    document.getElementById('p-proveedor').value = producto.proveedor_id || '';
  } else {
    document.getElementById('p-categoria').value = categoriaActiva;
  }
  document.getElementById('modal-producto').classList.add('open');
}

document.getElementById('btn-nuevo-producto').addEventListener('click', () => openProductoModal());

document.getElementById('form-producto').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('p-id').value;
  const payload = {
    nombre: document.getElementById('p-nombre').value,
    categoria: document.getElementById('p-categoria').value,
    unidad_medida: document.getElementById('p-unidad').value,
    stock_minimo: Number(document.getElementById('p-stock-minimo').value) || 0,
    precio_compra: Number(document.getElementById('p-precio-compra').value) || 0,
    precio_venta: Number(document.getElementById('p-precio-venta').value) || 0,
    proveedor_id: document.getElementById('p-proveedor').value || null
  };
  try {
    if (id) await api.put(`/api/productos/${id}`, payload);
    else await api.post('/api/productos', payload);
    document.getElementById('modal-producto').classList.remove('open');
    await cargarProductos();
  } catch (err) { alert('Error al guardar producto: ' + err.message); }
});

async function cargarProductos() {
  productosCache = await api.get('/api/productos');
  renderProductos();
  const opts = productosCache.map(p => `<option value="${p.id}">${p.nombre} (${p.categoria === 'venta' ? 'Venta' : 'Uso diario'})</option>`).join('');
  document.getElementById('m-producto').innerHTML = opts;
}

// --- Movimientos ---
function openMovimientoModal() {
  document.getElementById('form-movimiento').reset();
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('m-fecha').value = now.toISOString().slice(0, 16);
  document.getElementById('modal-movimiento').classList.add('open');
}

document.getElementById('btn-nuevo-movimiento').addEventListener('click', openMovimientoModal);

document.getElementById('form-movimiento').addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    producto_id: document.getElementById('m-producto').value,
    tipo: document.getElementById('m-tipo').value,
    motivo: document.getElementById('m-motivo').value,
    proveedor_id: document.getElementById('m-proveedor').value || null,
    cantidad: Number(document.getElementById('m-cantidad').value),
    precio_unitario: Number(document.getElementById('m-precio').value) || 0,
    fecha_hora: document.getElementById('m-fecha').value.replace('T', ' ') + ':00',
    notas: document.getElementById('m-notas').value
  };
  try {
    await api.post('/api/inventario/movimientos', payload);
    document.getElementById('modal-movimiento').classList.remove('open');
    await Promise.all([cargarProductos(), cargarMovimientos()]);
  } catch (err) { alert('Error al registrar movimiento: ' + err.message); }
});

function tipoBadge(tipo) {
  return tipo === 'entrada' ? '<span class="badge good">Entrada</span>' : '<span class="badge critical">Salida</span>';
}

function renderMovimientos(movs) {
  const cont = document.getElementById('tabla-movimientos');
  if (!movs.length) {
    cont.innerHTML = '<div class="empty-state">No hay movimientos registrados.</div>';
    return;
  }
  cont.innerHTML = `
    <table>
      <thead><tr><th>Fecha y hora</th><th>Producto</th><th>Tipo</th><th>Motivo</th><th>Cantidad</th><th>Proveedor</th><th></th></tr></thead>
      <tbody>
        ${movs.map(m => `
          <tr>
            <td>${fmtFechaHora(m.fecha_hora)}</td>
            <td>${m.producto_nombre}</td>
            <td>${tipoBadge(m.tipo)}</td>
            <td>${m.motivo}</td>
            <td>${m.cantidad} ${m.unidad_medida}</td>
            <td>${m.proveedor_nombre || '-'}</td>
            <td><button class="btn btn-sm btn-danger" data-del="${m.id}">Eliminar</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  cont.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este movimiento? Se ajustara el stock.')) return;
      await api.del(`/api/inventario/movimientos/${btn.dataset.del}`);
      await Promise.all([cargarProductos(), cargarMovimientos()]);
    })
  );
}

async function cargarMovimientos() {
  const params = new URLSearchParams();
  const tipo = document.getElementById('f-tipo').value;
  const categoria = document.getElementById('f-categoria').value;
  const desde = document.getElementById('f-desde-mov').value;
  const hasta = document.getElementById('f-hasta-mov').value;
  if (tipo) params.set('tipo', tipo);
  if (categoria) params.set('categoria', categoria);
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);

  const movs = await api.get(`/api/inventario/movimientos?${params.toString()}`);
  renderMovimientos(movs);
}

document.getElementById('btn-filtrar-mov').addEventListener('click', () => cargarMovimientos().catch(err => alert(err.message)));

document.querySelectorAll('[data-close]').forEach(btn =>
  btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open'))
);
document.querySelectorAll('.modal-backdrop').forEach(mb =>
  mb.addEventListener('click', e => { if (e.target === mb) mb.classList.remove('open'); })
);

(async function init() {
  try {
    proveedoresCache = await api.get('/api/proveedores');
    fillProveedorSelects();
    await cargarProductos();
    await cargarMovimientos();
    await cargarGraficas();
  } catch (err) { alert('Error al cargar inventario: ' + err.message); }
})();
