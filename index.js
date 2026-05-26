// ==================== AUTH ====================
var SESSION = { user: null };

function getUsers() {
  var raw = localStorage.getItem('mipos_users');
  if (!raw) {
    var defaults = [{ username: 'admin', password: 'admin123', nombre: 'Administrador', rol: 'administrador' }];
    localStorage.setItem('mipos_users', JSON.stringify(defaults));
    return defaults;
  }
  try { return JSON.parse(raw); } catch(e) { return []; }
}

function saveUsers(users) {
  localStorage.setItem('mipos_users', JSON.stringify(users));
}

function initAuth() {
  var saved = localStorage.getItem('mipos_session');
  if (saved) {
    try {
      var u = JSON.parse(saved);
      if (u && u.username && u.rol) { SESSION.user = u; onLoginSuccess(); return; }
    } catch(e) {}
  }
}

function doLogin() {
  var username = $$('login-user').value.trim();
  var password = $$('login-pass').value;
  if (!username || !password) {
    $$('login-error').textContent = 'Ingresa tu usuario y contraseña';
    $$('login-error').style.display = 'block';
    return;
  }
  if (typeof window.dbUsuarios !== 'undefined') {
    $$('login-error').textContent = 'Verificando...';
    $$('login-error').style.display = 'block';
    window.dbUsuarios.login(username, password).then(function(found) {
      if (!found) {
        $$('login-error').textContent = 'Usuario o contraseña incorrectos';
        return;
      }
      SESSION.user = { username: found.username, nombre: found.nombre, rol: found.rol };
      localStorage.setItem('mipos_session', JSON.stringify(SESSION.user));
      $$('login-error').style.display = 'none';
      onLoginSuccess();
    }).catch(function() {
      $$('login-error').textContent = 'Error de conexión con la base de datos';
    });
  } else {
    var users = getUsers();
    var found = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === username && users[i].password === password) { found = users[i]; break; }
    }
    if (!found) {
      $$('login-error').textContent = 'Usuario o contraseña incorrectos';
      $$('login-error').style.display = 'block';
      return;
    }
    SESSION.user = { username: found.username, nombre: found.nombre, rol: found.rol };
    localStorage.setItem('mipos_session', JSON.stringify(SESSION.user));
    $$('login-error').style.display = 'none';
    onLoginSuccess();
  }
}

function onLoginSuccess() {
  $$('login-screen').style.display = 'none';
  $$('session-nombre').textContent = SESSION.user.nombre;
  var rolEl = $$('session-rol');
  rolEl.textContent = SESSION.user.rol === 'administrador' ? 'Admin' : 'Técnico';
  rolEl.className = 'role-badge role-' + SESSION.user.rol;
  $$('session-info').style.display = 'flex';
  $$('btn-logout').style.display = 'inline-flex';
  $$('btn-usuarios').style.display = SESSION.user.rol === 'administrador' ? 'inline-flex' : 'none';
  if (typeof window.cargarDB === 'function') {
    window.cargarDB();
  } else {
    pintarDash();
  }
}

function doLogout() {
  SESSION.user = null;
  localStorage.removeItem('mipos_session');
  $$('login-user').value = '';
  $$('login-pass').value = '';
  $$('login-error').style.display = 'none';
  $$('session-info').style.display = 'none';
  $$('btn-logout').style.display = 'none';
  $$('btn-usuarios').style.display = 'none';
  $$('login-screen').style.display = 'flex';
  setTimeout(function(){ $$('login-user').focus(); }, 50);
}

function abrirGestorUsuarios() {
  if (!SESSION.user || SESSION.user.rol !== 'administrador') return;
  pintarUsuarios();
  abrirMod('m-usuarios');
}

function pintarUsuarios() {
  if (typeof window.dbUsuarios !== 'undefined') {
    $$('usuarios-list').innerHTML = '<div style="color:var(--text2);font-size:13px;padding:12px;">Cargando...</div>';
    window.dbUsuarios.todos().then(renderUsuarios).catch(function(e) {
      $$('usuarios-list').innerHTML = '<div style="color:var(--red);font-size:13px;">Error: ' + e.message + '</div>';
    });
  } else {
    renderUsuarios(getUsers());
  }
}

function renderUsuarios(users) {
  var html = '<div class="tbl-wrap"><div class="tbl-scroll"><table>';
  html += '<thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Acciones</th></tr></thead><tbody>';
  users.forEach(function(u) {
    var isSelf = u.username === SESSION.user.username;
    var deleteBtn = isSelf
      ? '<span style="color:var(--text3);font-size:11px;">(sesión actual)</span>'
      : '<button class="btn btn-sm btn-red" onclick="eliminarUsuario(\'' + (u.id || u.username) + '\')">🗑️ Eliminar</button>';
    html += '<tr>';
    html += '<td style="font-weight:600;">' + u.nombre + '</td>';
    html += '<td style="font-family:monospace;color:var(--text2);">' + u.username + '</td>';
    html += '<td><span class="role-badge role-' + u.rol + '">' + (u.rol === 'administrador' ? 'Admin' : 'Técnico') + '</span></td>';
    html += '<td>' + deleteBtn + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';
  $$('usuarios-list').innerHTML = html;
}

function guardarNuevoUsuario() {
  var nombre = $$('nu-nombre').value.trim();
  var username = $$('nu-user').value.trim().toLowerCase().replace(/\s+/g,'_');
  var password = $$('nu-pass').value;
  var rol = $$('nu-rol').value;
  if (!nombre || !username || !password) { toast('Completa todos los campos requeridos', 'error'); return; }
  if (password.length < 4) { toast('La contraseña debe tener al menos 4 caracteres', 'error'); return; }
  if (typeof window.dbUsuarios !== 'undefined') {
    window.dbUsuarios.crear({ username: username, password: password, nombre: nombre, rol: rol }).then(function() {
      $$('nu-nombre').value = ''; $$('nu-user').value = ''; $$('nu-pass').value = '';
      pintarUsuarios();
      toast('Usuario "' + nombre + '" agregado correctamente');
    }).catch(function(e) {
      toast(e.message.includes('unique') ? 'Ya existe un usuario con ese nombre' : 'Error: ' + e.message, 'error');
    });
  } else {
    var users = getUsers();
    if (users.some(function(u){ return u.username === username; })) { toast('Ya existe un usuario con ese nombre', 'error'); return; }
    users.push({ username: username, password: password, nombre: nombre, rol: rol });
    saveUsers(users);
    $$('nu-nombre').value = ''; $$('nu-user').value = ''; $$('nu-pass').value = '';
    pintarUsuarios();
    toast('Usuario "' + nombre + '" agregado correctamente');
  }
}

function eliminarUsuario(idOrUsername) {
  if (typeof window.dbUsuarios !== 'undefined') {
    window.dbUsuarios.eliminar(idOrUsername).then(function() {
      pintarUsuarios();
      toast('Usuario eliminado');
    }).catch(function(e) {
      toast('Error: ' + e.message, 'error');
    });
  } else {
    var users = getUsers();
    var idx = parseInt(idOrUsername);
    if (isNaN(idx) || !users[idx]) return;
    if (users[idx].username === SESSION.user.username) { toast('No puedes eliminar tu propia cuenta', 'error'); return; }
    var nombre = users[idx].nombre;
    users.splice(idx, 1);
    saveUsers(users);
    pintarUsuarios();
    toast('Usuario "' + nombre + '" eliminado');
  }
}

// ==================== ESTADO ====================
var DB = {
  productos: [],
  proveedores: [],
  ventas: [],
  mermas: [],
};
var dashCharts={};
var ventaCounter=1000;

// ==================== UTILS ====================
function $$(id){return document.getElementById(id);}
function fmt(n){return '$'+Number(n).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0});}
function fmtN(n){return Number(n).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0});}
function ahora(){return new Date().toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'});}
function fechaHoy(){return new Date().toISOString().split('T')[0];}
function initiales(n){return n.split(' ').map(function(p){return p[0]||'';}).join('').substring(0,2).toUpperCase();}
function genTicket(){return 'TK-'+String(ventaCounter).padStart(6,'0');}

var toastTimer=null;
function toast(msg,tipo){
  var t=$$('toast');t.textContent=msg;
  t.className='toast toast-'+(tipo||'success');
  t.classList.add('show');
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove('show');},3000);
}

document.querySelectorAll('.overlay').forEach(function(el){
  el.addEventListener('click',function(e){if(e.target===el)el.classList.remove('open');});
});
function abrirMod(id){$$(id).classList.add('open');}
function cerrarModal(id){$$(id).classList.remove('open');}

// RELOJ
function actualizarReloj(){var d=new Date();$$('hdr-clock').textContent=d.toLocaleTimeString('es-MX');}
actualizarReloj();setInterval(actualizarReloj,1000);

// ==================== TABS ====================
var TABS=['dash','inv','prov','vtas','merm'];
function irTab(id){
  TABS.forEach(function(t){
    $$('page-'+t).classList.remove('active');
    $$('ntab-'+t).classList.remove('active');
  });
  $$('page-'+id).classList.add('active');
  $$('ntab-'+id).classList.add('active');
  if(id==='dash')pintarDash();
  else if(id==='inv')pintarInv();
  else if(id==='prov')pintarProv();
  else if(id==='vtas')pintarVtas();
  else if(id==='merm')pintarMerm();
}

// ==================== ALERTAS ====================
function getStockBajos(){
  return DB.productos.filter(function(p){return p.cantidad<=(p.minstock||5);});
}

function actualizarAlertaBadge(){
  var bajos=getStockBajos();
  var b=$$('alert-count');
  if(bajos.length>0){b.style.display='flex';b.textContent=bajos.length;$$('nb-stock').style.display='inline';}
  else{b.style.display='none';$$('nb-stock').style.display='none';}
}

// ==================== DASHBOARD ====================
var CHART_COLORS=['#f5a623','#22c55e','#3b82f6','#ef4444','#a855f7','#06b6d4','#f97316','#84cc16'];

function pintarDash(){
  var totalVtas=DB.ventas.reduce(function(a,v){return a+v.total;},0);
  var totalGan=DB.ventas.reduce(function(a,v){return a+v.ganancia;},0);
  var valorInv=DB.productos.reduce(function(a,p){return a+p.cantidad*p.precio;},0);
  var bajos=getStockBajos();
  var totalMerma=DB.mermas.reduce(function(a,m){return a+m.costo;},0);
  var margen=totalVtas>0?((totalGan/totalVtas)*100).toFixed(1):0;

  $$('dash-stats').innerHTML=
    '<div class="sc"><div class="sc-label">Total Ingresos</div><div class="sc-val c-green">'+fmt(totalVtas)+'</div><div class="sc-sub">'+DB.ventas.length+' ventas</div></div>'+
    '<div class="sc"><div class="sc-label">Ganancia Total</div><div class="sc-val c-gold">'+fmt(totalGan)+'</div><div class="sc-sub">Margen: '+margen+'%</div></div>'+
    '<div class="sc"><div class="sc-label">Valor Inventario</div><div class="sc-val c-white">'+fmt(valorInv)+'</div><div class="sc-sub">'+DB.productos.length+' productos</div></div>'+
    '<div class="sc"><div class="sc-label">Pérdida Mermas</div><div class="sc-val c-red">'+fmt(totalMerma)+'</div><div class="sc-sub">'+DB.mermas.length+' mermas</div></div>'+
    '<div class="sc"><div class="sc-label">Stock Bajo</div><div class="sc-val '+(bajos.length>0?'c-red':'c-green')+'">'+bajos.length+'</div><div class="sc-sub">'+(bajos.length>0?'Requieren atención':'Todo en orden ✓')+'</div></div>';

  var ap='';
  if(bajos.length>0){
    ap='<div class="alert-panel"><div class="alert-panel-title">⚠️ '+bajos.length+' producto(s) con stock bajo</div>';
    bajos.forEach(function(p){ap+='<div class="alert-list-item"><span style="color:var(--red)">●</span> <b>'+p.nombre+'</b> — '+p.cantidad+' unidades (mín: '+(p.minstock||5)+')</div>';});
    ap+='</div>';
  }
  $$('dash-alert-panel').innerHTML=ap;

  var dias=[];var ventasDia=[];
  for(var i=6;i>=0;i--){
    var d=new Date();d.setDate(d.getDate()-i);
    dias.push(d.toLocaleDateString('es-MX',{weekday:'short',day:'numeric'}));
    var dayStr=d.toLocaleDateString('es-MX');
    ventasDia.push(DB.ventas.filter(function(v){return v.fecha.includes(dayStr.split('/')[0])||v.fecha.includes(dayStr);}).reduce(function(a,v){return a+v.total;},0));
  }
  pintarChart('chart-dash-ventas','bar',{labels:dias,datasets:[{label:'Ventas ($)',data:ventasDia,backgroundColor:'#f5a623',borderRadius:5}]},{yTick:true});

  var byProd={};
  DB.ventas.forEach(function(v){byProd[v.producto]=(byProd[v.producto]||0)+v.cantidad;});
  var sortedTop=Object.keys(byProd).sort(function(a,b){return byProd[b]-byProd[a];}).slice(0,5);
  pintarChart('chart-dash-top','bar',{labels:sortedTop.length?sortedTop:['Sin datos'],datasets:[{label:'Unidades',data:sortedTop.map(function(k){return byProd[k];}),backgroundColor:['#f5a623','#f59e0b','#fbbf24','#fcd34d','#fde68a'],borderRadius:5}]},{yTick:true,horizontal:true});

  var sortedBottom=Object.keys(byProd).sort(function(a,b){return byProd[a]-byProd[b];}).slice(0,5);
  pintarChart('chart-dash-bottom','bar',{labels:sortedBottom.length?sortedBottom:['Sin ventas aún'],datasets:[{label:'Unidades',data:sortedBottom.map(function(k){return byProd[k];}),backgroundColor:['#6366f1','#818cf8','#a5b4fc','#c7d2fe','#e0e7ff'],borderRadius:5}]},{yTick:true,horizontal:true});

  var vendidos=new Set(DB.ventas.map(function(v){return v.producto;}));
  var sinVenta=DB.productos.filter(function(p){return !vendidos.has(p.nombre);});
  var svEl=$$('dash-sin-venta-list');
  if(sinVenta.length===0){svEl.innerHTML='<div style="color:var(--green);padding:6px 0;">✅ Todos los productos tienen al menos una venta.</div>';}
  else{svEl.innerHTML=sinVenta.map(function(p){return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;"><span style="color:var(--white);font-weight:700;">'+p.nombre+'</span><span style="color:var(--red);">'+p.cantidad+' uds en stock</span></div>';}).join('');}

  pintarChart('chart-dash-icg','bar',{
    labels:['Ingresos','Costo','Ganancia'],
    datasets:[{data:[totalVtas,DB.ventas.reduce(function(a,v){return a+v.costo;},0),totalGan],backgroundColor:['#22c55e','#f5a623','#3b82f6'],borderRadius:6,barThickness:70}]
  },{yTick:true});

  var byCat={};
  DB.productos.forEach(function(p){byCat[p.categoria||'Sin categoría']=(byCat[p.categoria||'Sin categoría']||0)+p.cantidad;});
  var catLabels=Object.keys(byCat);
  pintarChart('chart-dash-cat','doughnut',{labels:catLabels,datasets:[{data:catLabels.map(function(k){return byCat[k];}),backgroundColor:CHART_COLORS,hoverOffset:6}]},{legend:true});

  var rvl='';
  var rv=[...DB.ventas].reverse().slice(0,6);
  if(rv.length){rv.forEach(function(v){rvl+='<div class="recent-item"><div><div class="recent-prod">'+v.producto+'</div><div class="recent-emp">'+v.empleado+' · '+v.fecha+'</div><div style="font-size:10px;color:var(--text3);font-family:monospace">'+(v.ticket||v.folio||'')+'</div></div><div class="recent-amt">'+fmt(v.total)+'</div></div>';});}
  else{rvl='<div style="color:var(--text3);font-size:13px;">Sin ventas aún</div>';}
  $$('dr-vtas-list').innerHTML=rvl;

  var sbl='';
  if(bajos.length){bajos.forEach(function(p){sbl+='<div class="stock-alert-item"><div class="stock-alert-name">'+p.nombre+'</div><div class="stock-alert-qty">'+p.cantidad+' uds</div></div>';});}
  else{sbl='<div style="color:var(--text3);font-size:13px;">Todo en orden ✓</div>';}
  $$('dr-stock-list').innerHTML=sbl;
  actualizarAlertaBadge();
}

function pintarChart(id,type,data,opts){
  if(dashCharts[id])dashCharts[id].destroy();
  var ctx=$$(id);if(!ctx)return;
  dashCharts[id]=new Chart(ctx,{
    type:type,data:data,
    options:{
      responsive:true,
      indexAxis:opts&&opts.horizontal?'y':'x',
      plugins:{legend:{display:!!(opts&&opts.legend),labels:{color:'#888',font:{size:11}}},tooltip:{callbacks:{label:function(c){return type==='doughnut'?' '+c.label+': '+fmtN(c.raw):' '+fmtN(c.raw);}}}},
      scales:type==='doughnut'?{}:{x:{ticks:{color:'#777',font:{size:10}},grid:{color:'#2a2a2a'}},y:{ticks:{color:'#777',font:{size:10}},grid:{color:'#2a2a2a'}}}
    }
  });
}

// ==================== INVENTARIO ====================
function actualizarFiltrosInv(){
  var cats=[...new Set(DB.productos.map(function(p){return p.categoria||'Sin categoría';}))].sort();
  var cs=$$('fil-cat');var cv=cs.value;
  cs.innerHTML='<option value="">Todas</option>'+cats.map(function(c){return '<option>'+c+'</option>';}).join('');
  if(cv)cs.value=cv;
  var provs=[...new Set(DB.productos.map(function(p){return p.proveedor||'Sin proveedor';}))].sort();
  var ps=$$('fil-prov');var pv=ps.value;
  ps.innerHTML='<option value="">Todos</option>'+provs.map(function(p){return '<option>'+p+'</option>';}).join('');
  if(pv)ps.value=pv;
}

function pintarInv(){
  actualizarFiltrosInv();
  var q=($$('q-inv').value||'').toLowerCase();
  var fc=$$('fil-cat').value;
  var fp=$$('fil-prov').value;
  var fs=$$('fil-stock').value;
  var prods=DB.productos.filter(function(p){
    if(q&&!p.nombre.toLowerCase().includes(q)&&!(p.sku||'').toLowerCase().includes(q)&&!(p.categoria||'').toLowerCase().includes(q))return false;
    if(fc&&p.categoria!==fc)return false;
    if(fp&&p.proveedor!==fp)return false;
    if(fs==='bajo'&&p.cantidad>10)return false;
    if(fs==='medio'&&(p.cantidad<=10||p.cantidad>20))return false;
    if(fs==='ok'&&p.cantidad<=20)return false;
    return true;
  });
  var bajo=DB.productos.filter(function(p){return p.cantidad<=(p.minstock||5);}).length;
  var tstock=DB.productos.reduce(function(a,p){return a+p.cantidad;},0);
  var tvalor=DB.productos.reduce(function(a,p){return a+p.cantidad*p.precio;},0);
  $$('s-nprod').textContent=DB.productos.length;
  $$('s-stock').textContent=fmtN(tstock);
  $$('s-valor').textContent=fmt(tvalor);
  $$('s-bajo').textContent=bajo;
  var tb=$$('tb-inv');
  if(!prods.length){tb.innerHTML='<tr><td colspan="16" class="tbl-empty">No se encontraron productos</td></tr>';return;}
  tb.innerHTML=prods.map(function(p){
    var ri=DB.productos.indexOf(p);
    var vt=p.cantidad*p.precio;
    var margen=p.precio>0?((p.precio-p.costo)/p.precio*100).toFixed(1):0;
    var qc=p.cantidad<=(p.minstock||5)?'c-red':p.cantidad<=20?'c-gold':'c-green';
    var rowClass=p.cantidad<=(p.minstock||5)?'row-alert':'';
    var estado=p.cantidad===0?'<span class="badge badge-red">Sin stock</span>':p.cantidad<=(p.minstock||5)?'<span class="badge badge-red">Stock bajo</span>':p.cantidad<=20?'<span class="badge">Stock medio</span>':'<span class="badge badge-green">Stock Completo</span>';
    var fibraColors={'Azul':'#3b82f6','Naranja':'#f97316','Verde':'#22c55e','Café':'#92400e','Gris':'#6b7280','Blanco':'#f3f4f6','Rojo':'#ef4444','Negro':'#374151','Amarillo':'#eab308','Violeta':'#a855f7','Rosa':'#ec4899','Aqua':'#06b6d4'};
    var fc2=p.fibraColor&&fibraColors[p.fibraColor]?fibraColors[p.fibraColor]:'var(--text3)';
    var fCell=p.fibraColor?'<div class="fibra-color-cell"><span class="fibra-dot" style="background:'+fc2+'"></span>'+p.fibraColor+'</div>':'<span style="color:var(--text3)">—</span>';
    return '<tr class="'+rowClass+'">'
      +'<td class="td-bold">'+p.nombre+(p.desc?'<br><span style="font-size:11px;color:var(--text3);font-weight:400">'+p.desc+'</span>':'')+'</td>'
      +'<td style="color:var(--text2);font-size:12px">'+(p.sku||'—')+'</td>'
      +'<td style="font-size:12px">'+(p.proveedor||'—')+'</td>'
      +'<td><span class="badge">'+(p.categoria||'—')+'</span></td>'
      +'<td>'+fCell+'</td>'
      +'<td style="color:var(--text2);font-size:12px">'+(p.fibraMarca||'—')+'</td>'
      +'<td style="color:var(--text2);font-size:12px">'+(p.fibraMaterial||'—')+'</td>'
      +'<td style="color:var(--text2);font-size:12px">'+(p.fibraHilo||'—')+'</td>'
      +'<td style="color:var(--gold);font-size:12px">'+(p.fibraColorante||'—')+'</td>'
      +'<td class="'+qc+'" style="font-weight:800">'+p.cantidad+'</td>'
      +'<td>'+fmt(p.costo)+'</td>'
      +'<td>'+fmt(p.precio)+'</td>'
      +'<td style="color:'+(parseFloat(margen)>=30?'var(--green)':parseFloat(margen)>=15?'var(--gold)':'var(--red)')+'">'+margen+'%</td>'
      +'<td style="font-weight:800">'+fmt(vt)+'</td>'
      +'<td>'+estado+'</td>'
      +'<td><button class="act-btn act-edit" onclick="editProducto('+ri+')" title="Editar">✏️</button> <button class="act-btn act-del" onclick="eliminarProducto('+ri+')" title="Eliminar">🗑️</button></td>'
      +'</tr>';
  }).join('');
  actualizarAlertaBadge();
}

function calcMargen(){
  var c=parseFloat($$('mp-costo').value)||0;
  var p=parseFloat($$('mp-precio').value)||0;
  var info=$$('mp-margen-info');
  if(c>0&&p>0){var m=((p-c)/p*100).toFixed(1);var col=m>=30?'var(--green)':m>=15?'var(--gold)':'var(--red)';info.innerHTML='Margen de ganancia: <b style="color:'+col+'">'+m+'%</b> (Ganancia por unidad: '+fmt(p-c)+')';}
  else{info.innerHTML='';}
}

function abrirNuevoProducto(){
  $$('mp-idx').value=-1;$$('mp-titulo').textContent='📦 Nuevo Producto';$$('mp-btn-ok').textContent='Agregar Producto';
  ['mp-nombre','mp-sku','mp-cat','mp-desc','mp-prov'].forEach(function(id){$$(id).value='';});
  ['mp-qty','mp-costo','mp-precio'].forEach(function(id){$$(id).value='';});
  $$('mp-minstock').value=5;$$('mp-margen-info').innerHTML='';
  ['mp-fibra-color','mp-fibra-marca','mp-fibra-material','mp-fibra-hilo','mp-fibra-colorante'].forEach(function(id){$$(id).value='';});
  abrirMod('mp');
}

function editProducto(ri){
  var p=DB.productos[ri];
  $$('mp-idx').value=ri;$$('mp-titulo').textContent='✏️ Editar Producto';$$('mp-btn-ok').textContent='Guardar Cambios';
  $$('mp-nombre').value=p.nombre;$$('mp-sku').value=p.sku||'';$$('mp-cat').value=p.categoria||'';
  $$('mp-qty').value=p.cantidad;$$('mp-costo').value=p.costo;$$('mp-precio').value=p.precio;
  $$('mp-desc').value=p.desc||'';$$('mp-minstock').value=p.minstock||5;
  $$('mp-prov').value=p.proveedor||'';
  $$('mp-fibra-color').value=p.fibraColor||'';$$('mp-fibra-marca').value=p.fibraMarca||'';
  $$('mp-fibra-material').value=p.fibraMaterial||'';$$('mp-fibra-hilo').value=p.fibraHilo||'';
  $$('mp-fibra-colorante').value=p.fibraColorante||'';
  calcMargen();abrirMod('mp');
}

function guardarProducto(){
  var nombre=$$('mp-nombre').value.trim();
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  var obj={
    nombre:nombre,
    sku:$$('mp-sku').value.trim()||null,
    proveedor:$$('mp-prov').value.trim(),
    categoria:$$('mp-cat').value.trim(),
    cantidad:parseInt($$('mp-qty').value)||0,
    costo:parseFloat($$('mp-costo').value)||0,
    precio:parseFloat($$('mp-precio').value)||0,
    desc:$$('mp-desc').value.trim(),
    minstock:parseInt($$('mp-minstock').value)||5,
    fibraColor:$$('mp-fibra-color').value,
    fibraMarca:$$('mp-fibra-marca').value,
    fibraMaterial:$$('mp-fibra-material').value,
    fibraHilo:$$('mp-fibra-hilo').value,
    fibraColorante:$$('mp-fibra-colorante').value
  };
  var ri=parseInt($$('mp-idx').value);
  if(ri>=0){DB.productos[ri]=obj;toast('Producto actualizado ✓');}
  else{DB.productos.push(obj);toast('Producto agregado ✓');}
}

function eliminarProducto(ri){
  if(!confirm('¿Eliminar "'+DB.productos[ri].nombre+'"?'))return;
  DB.productos.splice(ri,1);pintarInv();toast('Producto eliminado','info');
}

// ==================== PROVEEDORES ====================
function pintarProv(){
  var q=($$('q-prov').value||'').toLowerCase();
  var provs=DB.proveedores.filter(function(p){return p.nombre.toLowerCase().includes(q)||(p.contacto||'').toLowerCase().includes(q);});
  var tb=$$('tb-prov');
  if(!provs.length){tb.innerHTML='<tr><td colspan="11" class="tbl-empty">No hay proveedores registrados</td></tr>';return;}
  tb.innerHTML=provs.map(function(p){
    var i=DB.proveedores.indexOf(p);
    var np=DB.productos.filter(function(pr){return pr.proveedor===p.nombre;}).length;
    return '<tr>'
      +'<td class="td-bold">'+p.nombre+'</td>'
      +'<td>'+(p.contacto||'—')+'</td>'
      +'<td>'+(p.tel||'—')+'</td>'
      +'<td style="color:var(--text2)">'+(p.email||'—')+'</td>'
      +'<td style="color:var(--gold);font-family:monospace;font-size:12px">'+(p.rfc||'—')+'</td>'
      +'<td style="color:var(--text2);font-family:monospace;font-size:11px">'+(p.curp||'—')+'</td>'
      +'<td style="color:var(--text2);font-size:12px">'+(p.nss||'—')+'</td>'
      +'<td style="color:var(--text2);font-size:12px;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(p.dir||'—')+'</td>'
      +'<td><span class="badge '+(np>0?'badge-green':'')+'">'+np+'</span></td>'
      +'<td style="color:var(--text2);font-size:11px;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(p.notas||'—')+'</td>'
      +'<td><button class="act-btn act-edit" onclick="editProveedor('+i+')">✏️</button> <button class="act-btn act-del" onclick="eliminarProveedor('+i+')">🗑️</button></td>'
      +'</tr>';
  }).join('');
}

function abrirNuevoProveedor(){
  $$('mpv-idx').value=-1;$$('mpv-titulo').textContent='🏭 Nuevo Proveedor';$$('mpv-btn-ok').textContent='Agregar Proveedor';
  ['mpv-nombre','mpv-contacto','mpv-tel','mpv-email','mpv-dir','mpv-notas','mpv-rfc','mpv-curp','mpv-nss'].forEach(function(id){$$(id).value='';});
  abrirMod('mpv');
}

function editProveedor(i){
  var p=DB.proveedores[i];
  $$('mpv-idx').value=i;$$('mpv-titulo').textContent='✏️ Editar Proveedor';$$('mpv-btn-ok').textContent='Guardar Cambios';
  $$('mpv-nombre').value=p.nombre;$$('mpv-contacto').value=p.contacto||'';
  $$('mpv-tel').value=p.tel||'';$$('mpv-email').value=p.email||'';
  $$('mpv-dir').value=p.dir||'';$$('mpv-notas').value=p.notas||'';
  $$('mpv-rfc').value=p.rfc||'';$$('mpv-curp').value=p.curp||'';$$('mpv-nss').value=p.nss||'';
  abrirMod('mpv');
}

function guardarProveedor(){
  var nombre=$$('mpv-nombre').value.trim();
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  var obj={
    nombre:nombre,
    contacto:$$('mpv-contacto').value.trim(),
    tel:$$('mpv-tel').value.trim(),
    email:$$('mpv-email').value.trim(),
    dir:$$('mpv-dir').value.trim(),
    notas:$$('mpv-notas').value.trim(),
    rfc:$$('mpv-rfc').value.trim(),
    curp:$$('mpv-curp').value.trim(),
    nss:$$('mpv-nss').value.trim()
  };
  var i=parseInt($$('mpv-idx').value);
  if(i>=0){DB.proveedores[i]=obj;toast('Proveedor actualizado ✓');}
  else{DB.proveedores.push(obj);toast('Proveedor agregado ✓');}
  cerrarModal('mpv');pintarProv();
}

function eliminarProveedor(i){
  if(!confirm('¿Eliminar "'+DB.proveedores[i].nombre+'"?'))return;
  DB.proveedores.splice(i,1);pintarProv();toast('Proveedor eliminado','info');
}

// ==================== VENTAS ====================
var mvCarrito=[];

function abrirModal(id){
  if(id==='mv'){
    mvCarrito=[];
    var empDisplay=$$('mv-emp-display');
    if(empDisplay)empDisplay.textContent=SESSION.user?SESSION.user.nombre:'—';
    mvRellenarSelector();
    $$('mv-nota').value='';
    mvRenderCarrito();
    scannerFocus();
  }
  abrirMod(id);
}

function mvRellenarSelector(){
  var ps=DB.productos.filter(function(p){return p.cantidad>0;});
  var sel=$$('mv-prod-sel');
  sel.innerHTML=ps.length
    ? ps.map(function(p){
        var ri=DB.productos.indexOf(p);
        var enCarrito=mvCarrito.find(function(c){return c.ri===ri;});
        var disponible=p.cantidad-(enCarrito?enCarrito.cantidad:0);
        return '<option value="'+ri+'" '+(disponible<=0?'disabled':'')+'>'+p.nombre+' — '+fmt(p.precio)+' (Stock: '+p.cantidad+')</option>';
      }).join('')
    : '<option>Sin productos con stock</option>';
  mvActualizarStock();
}

function mvActualizarStock(){
  var sel=$$('mv-prod-sel');if(!sel)return;
  var ri=parseInt(sel.value);var p=DB.productos[ri];
  if(!p){$$('mv-stock-lbl').textContent='Cantidad';return;}
  var enCarrito=mvCarrito.find(function(c){return c.ri===ri;});
  var disponible=p.cantidad-(enCarrito?enCarrito.cantidad:0);
  $$('mv-stock-lbl').textContent='Cantidad (disp: '+disponible+')';
  $$('mv-qty-sel').max=disponible;
  if(parseInt($$('mv-qty-sel').value)>disponible)$$('mv-qty-sel').value=disponible;
}

function mvAgregarItem(){
  var sel=$$('mv-prod-sel');
  var ri=parseInt(sel.value);var p=DB.productos[ri];
  var qty=parseInt($$('mv-qty-sel').value)||1;
  if(!p){toast('Selecciona un producto','error');return;}
  var enCarrito=mvCarrito.find(function(c){return c.ri===ri;});
  var disponible=p.cantidad-(enCarrito?enCarrito.cantidad:0);
  if(qty<=0||qty>disponible){toast('Cantidad inválida. Disponible: '+disponible,'error');return;}
  if(enCarrito){enCarrito.cantidad+=qty;}
  else{mvCarrito.push({ri:ri,nombre:p.nombre,sku:p.sku||'',precio:p.precio,costo:p.costo,cantidad:qty});}
  $$('mv-qty-sel').value=1;mvRellenarSelector();mvRenderCarrito();
  toast(p.nombre+' agregado al carrito','info');
}

function mvQuitarItem(ri){mvCarrito=mvCarrito.filter(function(c){return c.ri!==ri;});mvRellenarSelector();mvRenderCarrito();}

function mvCambiarCantidad(ri,delta){
  var item=mvCarrito.find(function(c){return c.ri===ri;});if(!item)return;
  var p=DB.productos[ri];var nueva=item.cantidad+delta;
  if(nueva<=0){mvQuitarItem(ri);return;}
  if(nueva>p.cantidad){toast('Stock insuficiente','error');return;}
  item.cantidad=nueva;mvRenderCarrito();
}

function mvRenderCarrito(){
  var tbody=$$('mv-carrito-tbody');
  if(!mvCarrito.length){
    tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:20px;font-size:13px;">Agrega productos al carrito para comenzar</td></tr>';
    $$('mv-total').textContent='$0';return;
  }
  var total=0;
  tbody.innerHTML=mvCarrito.map(function(item){
    var sub=item.precio*item.cantidad;total+=sub;
    return '<tr>'
      +'<td class="td-bold">'+item.nombre+'<br><span style="font-size:11px;color:var(--text3);font-weight:400">'+item.sku+'</span></td>'
      +'<td>'+fmt(item.precio)+'</td>'
      +'<td><div style="display:flex;align-items:center;gap:6px;">'
        +'<button onclick="mvCambiarCantidad('+item.ri+',-1)" style="background:var(--bg4);border:none;color:var(--text);width:26px;height:26px;border-radius:5px;cursor:pointer;font-size:15px;font-weight:700;">−</button>'
        +'<span style="font-weight:800;font-size:15px;min-width:22px;text-align:center">'+item.cantidad+'</span>'
        +'<button onclick="mvCambiarCantidad('+item.ri+',1)" style="background:var(--bg4);border:none;color:var(--text);width:26px;height:26px;border-radius:5px;cursor:pointer;font-size:15px;font-weight:700;">＋</button>'
      +'</div></td>'
      +'<td style="color:var(--green);font-weight:800">'+fmt(sub)+'</td>'
      +'<td><button onclick="mvQuitarItem('+item.ri+')" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:16px;" title="Quitar">🗑️</button></td>'
      +'</tr>';
  }).join('');
  $$('mv-total').textContent=fmt(total);
}

function hacerVenta(){
  if(!mvCarrito.length){toast('Agrega al menos un producto al carrito','error');return;}
  var emp=SESSION.user?SESSION.user.nombre:'Desconocido';
  for(var i=0;i<mvCarrito.length;i++){
    var item=mvCarrito[i];var p=DB.productos[item.ri];
    if(!p||item.cantidad>p.cantidad){toast('Stock insuficiente para: '+item.nombre,'error');return;}
  }
  ventaCounter++;
  var ticket=genTicket();
  var folio='V-'+ventaCounter;
  var fecha=ahora();var fechaISO=new Date().toISOString();
  var pago=$$('mv-pago').value;var nota=$$('mv-nota').value.trim();
  var totalFolio=0;var ventasCreadas=[];
  mvCarrito.forEach(function(item){
    var p=DB.productos[item.ri];
    var total=item.cantidad*item.precio;
    var costo=item.cantidad*item.costo;
    var ganancia=total-costo;
    totalFolio+=total;
    var v={folio:folio,ticket:ticket,fecha:fecha,fechaISO:fechaISO,producto:p.nombre,sku:item.sku,empleado:emp,cantidad:item.cantidad,precioUnit:item.precio,total:total,costo:costo,ganancia:ganancia,pago:pago,nota:nota};
    DB.ventas.push(v);
    p.cantidad-=item.cantidad;
    ventasCreadas.push(v);
  });
  cerrarModal('mv');pintarInv();pintarVtas();
  toast('Ticket '+ticket+' ('+ventasCreadas.length+' productos): '+fmt(totalFolio)+' ✓');
  mostrarReciboMulti(ticket,folio,fecha,emp,pago,nota,ventasCreadas,totalFolio);
  actualizarAlertaBadge();mvCarrito=[];
}

function mostrarReciboMulti(ticket,folio,fecha,emp,pago,nota,items,total){
  var html='<div class="receipt-header">';
  html+='<div class="receipt-title">⬡ MiPOS Pro</div>';
  html+='<div style="color:var(--text2);font-size:11px;margin-bottom:6px;">Sistema de Punto de Venta</div>';
  html+='<div style="font-size:11px;color:var(--text3);margin-bottom:4px;">N° TICKET</div>';
  html+='<div class="receipt-ticket">'+ticket+'</div>';
  html+='</div>';
  html+='<div class="receipt-row"><span>Folio interno:</span><span style="color:var(--text2);font-size:11px">'+folio+'</span></div>';
  html+='<div class="receipt-row"><span>Fecha:</span><span>'+fecha+'</span></div>';
  html+='<div class="receipt-row"><span>Atendido por:</span><span>'+emp+'</span></div>';
  html+='<div class="receipt-row"><span>Pago:</span><span>'+pago+'</span></div>';
  html+='<div style="border-top:1px dashed var(--border);margin:10px 0;padding-top:10px;">';
  items.forEach(function(v){
    html+='<div class="receipt-row"><span>'+v.producto+'</span><span>x'+v.cantidad+'</span></div>';
    html+='<div class="receipt-row" style="color:var(--text2);font-size:11px;padding-left:10px;"><span>'+fmt(v.precioUnit)+' c/u</span><span>'+fmt(v.total)+'</span></div>';
  });
  html+='</div>';
  html+='<div class="receipt-total receipt-row"><span>TOTAL ('+items.length+' producto'+(items.length>1?'s':'')+')</span><span style="color:var(--gold)">'+fmt(total)+'</span></div>';
  if(nota)html+='<div class="receipt-row" style="margin-top:6px"><span>Nota:</span><span>'+nota+'</span></div>';
  html+='<div class="receipt-footer">¡Gracias por su compra!<br><span style="font-size:10px;color:var(--text3)">Conserva este ticket</span></div>';
  $$('receipt-content').innerHTML=html;
  abrirMod('mrecibo');
}

function verRecibo(idx){
  var v=DB.ventas[idx];
  var grupo=DB.ventas.filter(function(x){return x.ticket===v.ticket&&x.folio===v.folio;});
  var total=grupo.reduce(function(a,x){return a+x.total;},0);
  mostrarReciboMulti(v.ticket||v.folio,v.folio,v.fecha,v.empleado,v.pago||'',v.nota||'',grupo,total);
}

function imprimirRecibo(){
  var c=$$('receipt-content').innerHTML;
  var w=window.open('','_blank');
  w.document.write('<html><head><title>Ticket</title><style>body{font-family:monospace;padding:20px;max-width:300px;margin:0 auto;}*{box-sizing:border-box;}.receipt-title{font-size:16px;font-weight:900;}.receipt-ticket{font-size:22px;font-weight:900;}.receipt-row{display:flex;justify-content:space-between;}.receipt-total{border-top:1px dashed #ccc;padding-top:8px;margin-top:8px;font-size:14px;font-weight:900;}.receipt-footer{text-align:center;color:#999;border-top:1px dashed #ccc;padding-top:10px;margin-top:10px;}.receipt-header{text-align:center;border-bottom:1px dashed #ccc;padding-bottom:10px;margin-bottom:10px;}</style></head><body>'+c+'</body></html>');
  w.document.close();w.print();
}

function limpiarFiltrosVtas(){
  ['fil-vemp','fil-vprod'].forEach(function(id){$$(id).value='';});
  ['fil-vfrom','fil-vto'].forEach(function(id){$$(id).value='';});
  $$('q-vtas').value='';pintarVtas();
}

function pintarVtas(){
  var vs=$$('fil-vemp');var vc=vs.value;
  var empNames=[...new Set(DB.ventas.map(function(v){return v.empleado;}))].filter(Boolean).sort();
  vs.innerHTML='<option value="">Todos</option>'+empNames.map(function(n){return '<option>'+n+'</option>';}).join('');
  if(vc)vs.value=vc;
  var vp=$$('fil-vprod');var vpc=vp.value;
  var pnames=[...new Set(DB.ventas.map(function(v){return v.producto;}))].sort();
  vp.innerHTML='<option value="">Todos</option>'+pnames.map(function(n){return '<option>'+n+'</option>';}).join('');
  if(vpc)vp.value=vpc;
  var q=($$('q-vtas').value||'').toLowerCase();
  var fe=$$('fil-vemp').value;var fp=$$('fil-vprod').value;
  var ff=$$('fil-vfrom').value;var ft=$$('fil-vto').value;
  var filt=DB.ventas.filter(function(v){
    if(q&&!v.producto.toLowerCase().includes(q)&&!v.empleado.toLowerCase().includes(q)&&!(v.ticket||'').toLowerCase().includes(q)&&!(v.folio||'').toLowerCase().includes(q))return false;
    if(fe&&v.empleado!==fe)return false;
    if(fp&&v.producto!==fp)return false;
    if(ff&&v.fechaISO<ff)return false;
    if(ft&&v.fechaISO>ft+'T23:59:59')return false;
    return true;
  });
  var total=filt.reduce(function(a,v){return a+v.total;},0);
  var gan=filt.reduce(function(a,v){return a+v.ganancia;},0);
  var npv=filt.reduce(function(a,v){return a+v.cantidad;},0);
  $$('sv-total').textContent=fmt(total);$$('sv-gan').textContent=fmt(gan);
  $$('sv-num').textContent=filt.length;$$('sv-pv').textContent=fmtN(npv);
  var tb=$$('tb-vtas');
  if(!filt.length){tb.innerHTML='<tr><td colspan="9" class="tbl-empty">No hay ventas registradas</td></tr>';return;}
  tb.innerHTML=[...filt].reverse().map(function(v){
    var realIdx=DB.ventas.indexOf(v);
    return '<tr>'
      +'<td><span class="ticket-badge">'+(v.ticket||v.folio||'—')+'</span></td>'
      +'<td style="color:var(--text2);font-size:12px">'+v.fecha+'</td>'
      +'<td class="td-bold">'+v.producto+'</td>'
      +'<td>'+v.empleado+'</td>'
      +'<td>'+v.cantidad+'</td>'
      +'<td>'+fmt(v.precioUnit)+'</td>'
      +'<td style="color:var(--green);font-weight:800">'+fmt(v.total)+'</td>'
      +'<td style="color:var(--gold);font-weight:700">'+fmt(v.ganancia)+'</td>'
      +'<td><button class="act-btn" onclick="verRecibo('+realIdx+')" title="Ver ticket" style="color:var(--blue)">🧾</button></td>'
      +'</tr>';
  }).join('');
}

// ==================== MERMAS ====================
var mmLista=[];

function abrirNuevaMerma(){
  mmLista=[];
  mmRellenarSelector();
  $$('mm-desc').value='';$$('mm-culpable').value='';
  mmRenderLista();abrirMod('mm');
}

function mmRellenarSelector(){
  var ps=DB.productos.filter(function(p){return p.cantidad>0;});
  var sel=$$('mm-prod-sel');
  sel.innerHTML=ps.length
    ? ps.map(function(p){
        var ri=DB.productos.indexOf(p);
        var enLista=mmLista.find(function(c){return c.ri===ri;});
        var disponible=p.cantidad-(enLista?enLista.cantidad:0);
        return '<option value="'+ri+'" '+(disponible<=0?'disabled':'')+'>'+p.nombre+' — costo: '+fmt(p.costo)+' (Stock: '+p.cantidad+')</option>';
      }).join('')
    : '<option>Sin productos con stock</option>';
  mmActualizarStock();
}

function mmActualizarStock(){
  var sel=$$('mm-prod-sel');if(!sel)return;
  var ri=parseInt(sel.value);var p=DB.productos[ri];
  if(!p){$$('mm-stock-lbl').textContent='Cantidad';return;}
  var enLista=mmLista.find(function(c){return c.ri===ri;});
  var disponible=p.cantidad-(enLista?enLista.cantidad:0);
  $$('mm-stock-lbl').textContent='Cantidad (disp: '+disponible+')';
  $$('mm-qty-sel').max=disponible;
  if(parseInt($$('mm-qty-sel').value)>disponible)$$('mm-qty-sel').value=Math.max(1,disponible);
}

function mmAgregarItem(){
  var sel=$$('mm-prod-sel');
  var ri=parseInt(sel.value);var p=DB.productos[ri];
  var qty=parseInt($$('mm-qty-sel').value)||1;
  if(!p){toast('Selecciona un producto','error');return;}
  var enLista=mmLista.find(function(c){return c.ri===ri;});
  var disponible=p.cantidad-(enLista?enLista.cantidad:0);
  if(qty<=0||qty>disponible){toast('Cantidad inválida. Disponible: '+disponible,'error');return;}
  if(enLista){enLista.cantidad+=qty;}
  else{mmLista.push({ri:ri,nombre:p.nombre,costo:p.costo,precio:p.precio,cantidad:qty});}
  $$('mm-qty-sel').value=1;mmRellenarSelector();mmRenderLista();
  toast(p.nombre+' agregado a la lista','info');
}

function mmQuitarItem(ri){mmLista=mmLista.filter(function(c){return c.ri!==ri;});mmRellenarSelector();mmRenderLista();}

function mmCambiarCantidad(ri,delta){
  var item=mmLista.find(function(c){return c.ri===ri;});if(!item)return;
  var p=DB.productos[ri];var nueva=item.cantidad+delta;
  if(nueva<=0){mmQuitarItem(ri);return;}
  if(nueva>p.cantidad){toast('Stock insuficiente','error');return;}
  item.cantidad=nueva;mmRenderLista();
}

function mmRenderLista(){
  var tbody=$$('mm-lista-tbody');
  if(!mmLista.length){
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px;font-size:13px;">Agrega productos dañados para continuar</td></tr>';
    $$('lp-costo').textContent='$0';$$('lp-valor').textContent='$0';$$('lp-gan').textContent='$0';return;
  }
  var tc=0,tv=0,tg=0;
  tbody.innerHTML=mmLista.map(function(item){
    var c=item.costo*item.cantidad;var v=item.precio*item.cantidad;var g=v-c;
    tc+=c;tv+=v;tg+=g;
    return '<tr>'
      +'<td class="td-bold">'+item.nombre+'</td>'
      +'<td style="color:var(--gold)">'+fmt(item.costo)+'</td>'
      +'<td><div style="display:flex;align-items:center;gap:6px;">'
        +'<button onclick="mmCambiarCantidad('+item.ri+',-1)" style="background:var(--bg4);border:none;color:var(--text);width:26px;height:26px;border-radius:5px;cursor:pointer;font-size:15px;font-weight:700;">−</button>'
        +'<span style="font-weight:800;font-size:15px;min-width:22px;text-align:center">'+item.cantidad+'</span>'
        +'<button onclick="mmCambiarCantidad('+item.ri+',1)" style="background:var(--bg4);border:none;color:var(--text);width:26px;height:26px;border-radius:5px;cursor:pointer;font-size:15px;font-weight:700;">＋</button>'
      +'</div></td>'
      +'<td style="color:var(--red);font-weight:800">'+fmt(c)+'</td>'
      +'<td style="color:var(--red);font-weight:700">'+fmt(g)+'</td>'
      +'<td><button onclick="mmQuitarItem('+item.ri+')" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:16px;">🗑️</button></td>'
      +'</tr>';
  }).join('');
  $$('lp-costo').textContent=fmt(tc);$$('lp-valor').textContent=fmt(tv);$$('lp-gan').textContent=fmt(tg);
}

function guardarMerma(){
  if(!mmLista.length){toast('Agrega al menos un producto','error');return;}
  for(var i=0;i<mmLista.length;i++){
    var item=mmLista[i];var p=DB.productos[item.ri];
    if(!p||item.cantidad>p.cantidad){toast('Stock insuficiente para: '+item.nombre,'error');return;}
  }
  var motivo=$$('mm-motivo').value;
  var culpable=$$('mm-culpable').value.trim();
  var desc=$$('mm-desc').value;
  var fecha=ahora();var fechaISO=new Date().toISOString();
  mmLista.forEach(function(item){
    var p=DB.productos[item.ri];
    var c=item.cantidad*item.costo,v=item.cantidad*item.precio,g=v-c;
    DB.mermas.push({fecha:fecha,fechaISO:fechaISO,producto:p.nombre,motivo:motivo,culpable:culpable,desc:desc,cantidad:item.cantidad,costo:c,valor:v,ganancia:g});
    p.cantidad-=item.cantidad;
  });
  cerrarModal('mm');pintarMerm();pintarInv();
  toast(mmLista.length+' producto(s) registrados como merma ✓','info');
  actualizarAlertaBadge();mmLista=[];
}

function pintarMerm(){
  var fc=$$('fil-mculpable');var fcv=fc.value;
  var culpables=[...new Set(DB.mermas.map(function(m){return m.culpable||'';}).filter(Boolean))].sort();
  fc.innerHTML='<option value="">Todos</option>'+culpables.map(function(c){return '<option>'+c+'</option>';}).join('');
  if(fcv)fc.value=fcv;
  var q=($$('q-merm').value||'').toLowerCase();
  var fm=$$('fil-mmotivo').value;
  var fmc=$$('fil-mculpable').value;
  var filt=DB.mermas.filter(function(m){
    if(q&&!m.producto.toLowerCase().includes(q)&&!m.motivo.toLowerCase().includes(q)&&!(m.culpable||'').toLowerCase().includes(q))return false;
    if(fm&&m.motivo!==fm)return false;
    if(fmc&&m.culpable!==fmc)return false;
    return true;
  });
  var tc=filt.reduce(function(a,m){return a+m.costo;},0);
  var tv=filt.reduce(function(a,m){return a+m.valor;},0);
  var tg=filt.reduce(function(a,m){return a+m.ganancia;},0);
  $$('sm-costo').textContent=fmt(tc);$$('sm-valor').textContent=fmt(tv);$$('sm-ganancia').textContent=fmt(tg);
  var tb=$$('tb-merm');
  if(!filt.length){tb.innerHTML='<tr><td colspan="9" class="tbl-empty">No hay mermas registradas</td></tr>';return;}
  tb.innerHTML=[...filt].reverse().map(function(m){
    var culColor=m.culpable?'color:var(--red);font-weight:700':'color:var(--text3)';
    return '<tr>'
      +'<td style="color:var(--text3);font-size:11px">'+(DB.mermas.length-DB.mermas.indexOf(m))+'</td>'
      +'<td style="color:var(--text2);font-size:12px">'+m.fecha+'</td>'
      +'<td class="td-bold">'+m.producto+'</td>'
      +'<td><span class="badge badge-red">'+m.motivo+'</span></td>'
      +'<td style="'+culColor+'">'+(m.culpable||'—')+'</td>'
      +'<td style="color:var(--text2);font-size:12px">'+(m.desc||'—')+'</td>'
      +'<td>'+m.cantidad+'</td>'
      +'<td style="color:var(--red);font-weight:800">'+fmt(m.costo)+'</td>'
      +'<td style="color:var(--red);font-weight:800">'+fmt(m.ganancia)+'</td>'
      +'</tr>';
  }).join('');
}


// ==================== EXPORTAR EXCEL ====================
function exportarExcel(){
  var wb=XLSX.utils.book_new();
  var inv=[['Producto','SKU','Proveedor','Categoría','Cantidad','Costo','Precio Venta','Margen %','Valor Total','Estado']].concat(DB.productos.map(function(p){var m=p.precio>0?((p.precio-p.costo)/p.precio*100).toFixed(1):0;return[p.nombre,p.sku,p.proveedor,p.categoria,p.cantidad,p.costo,p.precio,m,p.cantidad*p.precio,p.cantidad<=(p.minstock||5)?'Stock bajo':p.cantidad<=20?'Stock medio':'Stock Completo'];}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(inv),'Inventario');
  var vtas=[['N° Ticket','Folio','Fecha','Producto','SKU','Empleado','Cantidad','Precio Unit.','Total','Costo','Ganancia','Margen %','Método Pago','Nota']].concat(DB.ventas.map(function(v){return[v.ticket||v.folio,v.folio,v.fecha,v.producto,v.sku||'',v.empleado,v.cantidad,v.precioUnit,v.total,v.costo,v.ganancia,v.total>0?((v.ganancia/v.total)*100).toFixed(1):0,v.pago||'',v.nota||''];}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(vtas),'Ventas');
  var merm=[['Fecha','Producto','Motivo / Causa','Culpable / Responsable','Descripción','Cantidad','Costo Perdido','Valor Perdido','Ganancia Perdida']].concat(DB.mermas.map(function(m){return[m.fecha,m.producto,m.motivo,m.culpable||'',m.desc,m.cantidad,m.costo,m.valor,m.ganancia];}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(merm),'Mermas');
  var prov=[['Empresa','Contacto','Teléfono','Email','RFC','CURP','NSS','Dirección','Notas','# Productos']].concat(DB.proveedores.map(function(p){return[p.nombre,p.contacto,p.tel,p.email,p.rfc||'',p.curp||'',p.nss||'',p.dir,p.notas||'',DB.productos.filter(function(pr){return pr.proveedor===p.nombre;}).length];}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(prov),'Proveedores');
  var totalVtas=DB.ventas.reduce(function(a,v){return a+v.total;},0);
  var totalGan=DB.ventas.reduce(function(a,v){return a+v.ganancia;},0);
  var totalMerma=DB.mermas.reduce(function(a,m){return a+m.costo;},0);
  var resumen=[['MiPOS Pro - Reporte General'],['Generado:',ahora()],[''],['VENTAS'],['Total Ingresos',totalVtas],['Total Ganancia',totalGan],['Num. Ventas',DB.ventas.length],['Margen Promedio',totalVtas>0?((totalGan/totalVtas)*100).toFixed(1)+'%':'0%'],[''],['INVENTARIO'],['Total Productos',DB.productos.length],['Valor Inventario',DB.productos.reduce(function(a,p){return a+p.cantidad*p.precio;},0)],['Stock Bajo',getStockBajos().length],[''],['MERMAS'],['Pérdida en Costo',totalMerma],['Num. Mermas',DB.mermas.length]];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(resumen),'Resumen');
  XLSX.writeFile(wb,'MiPOS_Reporte_'+new Date().toLocaleDateString('es-MX').replace(/\//g,'-')+'.xlsx');
  toast('Excel exportado exitosamente 📊');
}

function exportarInvExcel(){
  var inv=[['Producto','SKU','Proveedor','Categoría','Cantidad','Costo','Precio Venta','Margen %','Valor Total','Estado']].concat(DB.productos.map(function(p){var m=p.precio>0?((p.precio-p.costo)/p.precio*100).toFixed(1):0;return[p.nombre,p.sku,p.proveedor,p.categoria,p.cantidad,p.costo,p.precio,m,p.cantidad*p.precio,p.cantidad<=(p.minstock||5)?'Stock bajo':p.cantidad<=20?'Stock medio':'Stock Completo'];}));
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(inv),'Inventario');
  XLSX.writeFile(wb,'Inventario_'+fechaHoy()+'.xlsx');toast('Inventario exportado 📊');
}
function exportarProvExcel(){
  var prov=[['Empresa','Contacto','Teléfono','Email','RFC','CURP','NSS','Dirección','Notas']].concat(DB.proveedores.map(function(p){return[p.nombre,p.contacto,p.tel,p.email,p.rfc||'',p.curp||'',p.nss||'',p.dir,p.notas||''];}));
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(prov),'Proveedores');
  XLSX.writeFile(wb,'Proveedores_'+fechaHoy()+'.xlsx');toast('Proveedores exportados 📊');
}
function exportarVtasExcel(){
  var vtas=[['N° Ticket','Folio','Fecha','Producto','Empleado','Cantidad','Precio Unit.','Total','Ganancia','Pago']].concat(DB.ventas.map(function(v){return[v.ticket||v.folio,v.folio,v.fecha,v.producto,v.empleado,v.cantidad,v.precioUnit,v.total,v.ganancia,v.pago||''];}));
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(vtas),'Ventas');
  XLSX.writeFile(wb,'Ventas_'+fechaHoy()+'.xlsx');toast('Ventas exportadas 📊');
}
function exportarMermExcel(){
  var merm=[['Fecha','Producto','Motivo / Causa','Culpable / Responsable','Descripción','Cantidad','Costo Perdido','Ganancia Perdida']].concat(DB.mermas.map(function(m){return[m.fecha,m.producto,m.motivo,m.culpable||'',m.desc,m.cantidad,m.costo,m.ganancia];}));
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(merm),'Mermas');
  XLSX.writeFile(wb,'Mermas_'+fechaHoy()+'.xlsx');toast('Mermas exportadas 📊');
}

// ==================== ESCÁNER ====================
var scannerBuffer='';
var scannerTimer=null;
var SCANNER_SPEED_THRESHOLD=50;
var lastKeyTime=0;

function scannerFocus(){
  var el=$$('scanner-input');
  if(el)setTimeout(function(){el.focus();},120);
}

function scannerInput(val){
  var bar=$$('scanner-bar');
  if(bar){bar.classList.add('flash');setTimeout(function(){bar.classList.remove('flash');},300);}
}

function scannerConfirm(){
  var el=$$('scanner-input');if(!el)return;
  var code=(el.value||'').trim();if(!code)return;
  el.value='';
  var found=buscarProductoPorCodigoONombre(code);
  if(found!==null){
    var sel=$$('mv-prod-sel');
    if(sel){sel.value=found;mvActualizarStock();}
    var p=DB.productos[found];
    if(!p||p.cantidad<=0){scannerSetStatus('sin-stock',p?p.nombre:'?');return;}
    var enCarrito=mvCarrito.find(function(c){return c.ri===found;});
    var disponible=p.cantidad-(enCarrito?enCarrito.cantidad:0);
    if(disponible<=0){scannerSetStatus('agotado',p.nombre);return;}
    if(enCarrito){enCarrito.cantidad+=1;}
    else{mvCarrito.push({ri:found,nombre:p.nombre,sku:p.sku||'',precio:p.precio,costo:p.costo,cantidad:1});}
    mvRellenarSelector();mvRenderCarrito();scannerSetStatus('ok',p.nombre);
  } else {scannerSetStatus('no-encontrado',code);}
  el.focus();
}

function buscarProductoPorCodigoONombre(code){
  var lower=code.toLowerCase();
  for(var i=0;i<DB.productos.length;i++){if((DB.productos[i].sku||'').toLowerCase()===lower)return i;}
  for(var i=0;i<DB.productos.length;i++){if((DB.productos[i].sku||'').toLowerCase().includes(lower)&&lower.length>=3)return i;}
  for(var i=0;i<DB.productos.length;i++){if(DB.productos[i].nombre.toLowerCase()===lower)return i;}
  for(var i=0;i<DB.productos.length;i++){if(DB.productos[i].nombre.toLowerCase().includes(lower)&&lower.length>=3)return i;}
  return null;
}

function scannerSetStatus(type,name){
  var st=$$('scanner-status');if(!st)return;
  if(type==='ok'){
    st.className='scanner-status on';st.textContent='✓ '+name.substring(0,22)+(name.length>22?'…':'');
    setTimeout(function(){st.className='scanner-status on';st.textContent='● Listo';},2000);
  } else if(type==='sin-stock'){
    st.className='scanner-status';st.style.cssText='background:rgba(239,68,68,.15);color:var(--red)';
    st.textContent='Sin stock: '+name.substring(0,18);
    setTimeout(function(){st.className='scanner-status on';st.style.cssText='';st.textContent='● Listo';},2500);
  } else if(type==='agotado'){
    st.className='scanner-status';st.style.cssText='background:rgba(245,166,35,.15);color:var(--gold)';
    st.textContent='Agotado en carrito';
    setTimeout(function(){st.className='scanner-status on';st.style.cssText='';st.textContent='● Listo';},2500);
  } else {
    st.className='scanner-status';st.style.cssText='background:rgba(239,68,68,.15);color:var(--red)';
    st.textContent='No encontrado: '+name.substring(0,15);
    setTimeout(function(){st.className='scanner-status on';st.style.cssText='';st.textContent='● Listo';},2500);
  }
}

document.addEventListener('keydown',function(e){
  var modal=$$('mv');
  if(!modal||!modal.classList.contains('open'))return;
  var active=document.activeElement;
  if(active&&active!==$$('scanner-input')&&(active.tagName==='INPUT'||active.tagName==='SELECT'||active.tagName==='TEXTAREA'))return;
  var now=Date.now();var gap=now-lastKeyTime;lastKeyTime=now;
  if(gap<SCANNER_SPEED_THRESHOLD&&e.key.length===1){
    scannerBuffer+=e.key;
    if(scannerTimer)clearTimeout(scannerTimer);
    scannerTimer=setTimeout(function(){
      var si=$$('scanner-input');
      if(si){si.value=scannerBuffer;scannerConfirm();}
      scannerBuffer='';
    },80);
  }
});

// ==================== INIT ====================
initAuth();