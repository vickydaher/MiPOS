window.XLSX = require('xlsx');
const { iniciarDB, proveedores, productos, ventas, mermas, usuarios } = require('./database');
if (typeof XLSX === 'undefined') window.XLSX = require('xlsx');

// ==================== CARGA INICIAL ====================
async function cargarLocal() {
  try {
    DB.productos = (await productos.todos()).map(function(p) {
      return {
        _id: p.id,
        nombre: p.nombre,
        sku: p.sku || '',
        proveedor: p.proveedor_texto || p.proveedor_nombre || 'Sin proveedor',
        proveedor_id: p.proveedor_id,
        categoria: p.categoria || '',
        cantidad: p.cantidad,
        costo: p.costo,
        precio: p.precio,
        desc: p.descripcion || '',
        minstock: p.stock_minimo || 5,
        fibraColor: p.fibra_color || '',
        fibraMarca: p.fibra_marca || '',
        fibraMaterial: p.fibra_material || '',
        fibraHilo: p.fibra_hilo || '',
        fibraColorante: p.fibra_colorante || '',
      };
    });

    DB.proveedores = (await proveedores.todos()).map(function(p) {
      return {
        _id: p.id,
        nombre: p.nombre,
        contacto: p.contacto || '',
        tel: p.telefono || '',
        email: p.email || '',
        rfc: p.rfc || '',
        curp: p.curp || '',
        nss: p.nss || '',
        dir: p.direccion || '',
        notas: p.notas || '',
      };
    });


    DB.ventas = [];
    const todasVentas = await ventas.todas();
    console.log('Primera venta:', JSON.stringify(todasVentas[0]));  // ← aquí
    for (const v of todasVentas) {
      const items = await ventas.items(v.id);
      items.forEach(function(item) {
        DB.ventas.push({
          _id: v.id,
          ticket: v.ticket,
          folio: v.ticket,
          fecha: v.fecha,
          fechaISO: v.fecha,
          producto: item.nombre_snap,
          sku: '',
          empleado: v.empleado_nombre || '',
          cantidad: item.cantidad,
          precioUnit: item.precio_unit,
          total: item.subtotal,
          costo: item.costo_unit * item.cantidad,
          ganancia: item.ganancia,
          pago: v.metodo_pago || '',
          nota: v.nota || '',
        });
      });
    }

    DB.mermas = [];
    const todasMermas = await mermas.todas();
    for (const m of todasMermas) {
      const items = await mermas.items(m.id);
      items.forEach(function(item) {
        DB.mermas.push({
          _id: m.id,
          fecha: m.fecha,
          fechaISO: m.fecha,
          producto: item.nombre_snap,
          motivo: m.motivo || '',
          culpable: m.culpable || '',
          desc: m.descripcion || '',
          cantidad: item.cantidad,
          costo: item.costo_perdido,
          valor: item.precio_unit * item.cantidad,
          ganancia: item.ganancia_perdida,
        });
      });
    }

    console.log('✅ DB cargada:', DB.productos.length, 'productos,', DB.ventas.length, 'ventas');
  } catch(e) {
    console.error('Error cargando DB:', e);
  }
}

function guardarLocal() {}

// ==================== PRODUCTOS ====================
window.guardarProducto = async function() {
  var nombre = document.getElementById('mp-nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

  var obj = {
    nombre: nombre,
    sku: document.getElementById('mp-sku').value.trim() || null,
    proveedor_id: null,
    proveedor_texto: document.getElementById('mp-prov').value.trim(),
    categoria: document.getElementById('mp-cat').value.trim(),
    cantidad: parseInt(document.getElementById('mp-qty').value) || 0,
    costo: parseFloat(document.getElementById('mp-costo').value) || 0,
    precio: parseFloat(document.getElementById('mp-precio').value) || 0,
    descripcion: document.getElementById('mp-desc').value.trim(),
    stock_minimo: parseInt(document.getElementById('mp-minstock').value) || 5,
    fibra_color: document.getElementById('mp-fibra-color').value,
    fibra_marca: document.getElementById('mp-fibra-marca').value,
    fibra_material: document.getElementById('mp-fibra-material').value,
    fibra_hilo: document.getElementById('mp-fibra-hilo').value,
    fibra_colorante: document.getElementById('mp-fibra-colorante').value,
  };

  var ri = parseInt(document.getElementById('mp-idx').value);
  if (ri >= 0 && DB.productos[ri] && DB.productos[ri]._id) {
    obj.id = DB.productos[ri]._id;
    await productos.actualizar(obj);
    toast('Producto actualizado ✓');
  } else {
    await productos.crear(obj);
    toast('Producto agregado ✓');
  }

  cerrarModal('mp');
  await cargarLocal();
  pintarInv();
};

window.eliminarProducto = async function(ri) {
  if (!confirm('¿Eliminar "' + DB.productos[ri].nombre + '"?')) return;
  if (DB.productos[ri]._id) await productos.eliminar(DB.productos[ri]._id);
  await cargarLocal();
  pintarInv();
  toast('Producto eliminado', 'info');
};

window.guardarProveedor = async function() {
  var nombre = document.getElementById('mpv-nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

  var obj = {
    nombre: nombre,
    contacto: document.getElementById('mpv-contacto').value.trim(),
    telefono: document.getElementById('mpv-tel').value.trim(),
    email: document.getElementById('mpv-email').value.trim(),
    rfc: document.getElementById('mpv-rfc').value.trim(),
    curp: document.getElementById('mpv-curp').value.trim(),
    nss: document.getElementById('mpv-nss').value.trim(),
    direccion: document.getElementById('mpv-dir').value.trim(),
    notas: document.getElementById('mpv-notas').value.trim(),
  };

  var i = parseInt(document.getElementById('mpv-idx').value);
  if (i >= 0 && DB.proveedores[i] && DB.proveedores[i]._id) {
    obj.id = DB.proveedores[i]._id;
    await proveedores.actualizar(obj);
    toast('Proveedor actualizado ✓');
  } else {
    await proveedores.crear(obj);
    toast('Proveedor agregado ✓');
  }

  cerrarModal('mpv');
  await cargarLocal();
  pintarProv();
};

window.eliminarProveedor = async function(i) {
  if (!confirm('¿Eliminar "' + DB.proveedores[i].nombre + '"?')) return;
  if (DB.proveedores[i]._id) await proveedores.eliminar(DB.proveedores[i]._id);
  await cargarLocal();
  pintarProv();
  toast('Proveedor eliminado', 'info');
};

// ==================== VENTAS ====================
window.hacerVenta = async function() {
  if (!mvCarrito.length) { toast('Agrega al menos un producto al carrito', 'error'); return; }
var emp = SESSION.user ? SESSION.user.nombre : 'Desconocido';

  for (var i = 0; i < mvCarrito.length; i++) {
    var item = mvCarrito[i];
    var p = DB.productos[item.ri];
    if (!p || item.cantidad > p.cantidad) { toast('Stock insuficiente para: ' + item.nombre, 'error'); return; }
  }

  var empObj = SESSION.user;
  var pago = document.getElementById('mv-pago').value;
  var nota = document.getElementById('mv-nota').value.trim();

  var totalVenta = mvCarrito.reduce(function(a, item) { return a + item.precio * item.cantidad; }, 0);
  var gananciaVenta = mvCarrito.reduce(function(a, item) { return a + (item.precio - item.costo) * item.cantidad; }, 0);

  console.log('SESSION.user:', JSON.stringify(SESSION.user));
var ventaData = {
  usuario_id: SESSION.user ? SESSION.user.id : null,
  empleado_nombre: SESSION.user ? SESSION.user.nombre : 'Desconocido',
  metodo_pago: pago,
  nota: nota,
  total: totalVenta,
  ganancia: gananciaVenta,
};

  var items = mvCarrito.map(function(item) {
    var p = DB.productos[item.ri];
    return {
      producto_id: p._id,
      nombre_snap: p.nombre,
      cantidad: item.cantidad,
      precio_unit: item.precio,
      costo_unit: item.costo,
      subtotal: item.precio * item.cantidad,
      ganancia: (item.precio - item.costo) * item.cantidad,
    };
  });

  var ticket = await ventas.crear(ventaData, items);

  await cargarLocal();
  cerrarModal('mv');
  pintarInv();
  pintarVtas();
  toast('Ticket ' + ticket + ' (' + items.length + ' productos): $' + totalVenta.toFixed(0) + ' ✓');

  var fecha = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  var ventasCreadas = items.map(function(item) {
    return { producto: item.nombre_snap, cantidad: item.cantidad, precioUnit: item.precio_unit, total: item.subtotal };
  });
  mostrarReciboMulti(ticket, ticket, fecha, emp, pago, nota, ventasCreadas, totalVenta);
  actualizarAlertaBadge();
  mvCarrito = [];
};

// ==================== MERMAS ====================
window.guardarMerma = async function() {
  if (!mmLista.length) { toast('Agrega al menos un producto', 'error'); return; }

  for (var i = 0; i < mmLista.length; i++) {
    var item = mmLista[i];
    var p = DB.productos[item.ri];
    if (!p || item.cantidad > p.cantidad) { toast('Stock insuficiente para: ' + item.nombre, 'error'); return; }
  }

  var tc = mmLista.reduce(function(a, item) { return a + item.costo * item.cantidad; }, 0);
  var tv = mmLista.reduce(function(a, item) { return a + item.precio * item.cantidad; }, 0);

  var mermaData = {
    motivo: document.getElementById('mm-motivo').value,
    culpable: document.getElementById('mm-culpable').value.trim(),
    descripcion: document.getElementById('mm-desc').value,
    costo_total: tc,
    valor_total: tv,
    ganancia_perdida: tv - tc,
  };

  var items = mmLista.map(function(item) {
    var p = DB.productos[item.ri];
    return {
      producto_id: p._id,
      nombre_snap: p.nombre,
      cantidad: item.cantidad,
      costo_unit: item.costo,
      precio_unit: item.precio,
      costo_perdido: item.costo * item.cantidad,
      ganancia_perdida: (item.precio - item.costo) * item.cantidad,
    };
  });

  await mermas.crear(mermaData, items);

  await cargarLocal();
  cerrarModal('mm');
  pintarMerm();
  pintarInv();
  toast(mmLista.length + ' producto(s) registrados como merma ✓', 'info');
  actualizarAlertaBadge();
  mmLista = [];
};

// ==================== INIT ====================
// Expone usuarios para que el sistema de auth en index.js lo use
window.dbUsuarios = usuarios;

// Expone cargarDB para que onLoginSuccess() lo llame después del login
window.cargarDB = async function() {
  await cargarLocal();
  if(typeof pintarDash === 'function') pintarDash();
  if(typeof pintarInv === 'function') pintarInv();
  if(typeof pintarProv === 'function') pintarProv();
  if(typeof pintarEmp === 'function') pintarEmp();
  if(typeof pintarVtas === 'function') pintarVtas();
  if(typeof pintarMerm === 'function') pintarMerm();
  if(typeof actualizarAlertaBadge === 'function') actualizarAlertaBadge();
};

iniciarDB().catch(function(e) {
  console.error('Error conectando a Supabase:', e);
});