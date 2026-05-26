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
  localStorage.removeItem('mipos_session');
  var saved = localStorage.getItem('mipos_session');
  if (saved) {
    try {
      var u = JSON.parse(saved);
      if (u && u.username && u.rol) { SESSION.user = u; onLoginSuccess(); return; }
    } catch(e) {}
  }
}
document.getElementById('nu-foto').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('nu-foto-preview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('nu-foto-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
});
function doLogin() {
  var username = $$('login-user').value.trim().toLowerCase();
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
      SESSION.user = { id: found.id, username: found.username, nombre: found.nombre, rol: found.rol };
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
    SESSION.user = { id: found.id, username: found.username, nombre: found.nombre, rol: found.rol };
    localStorage.setItem('mipos_session', JSON.stringify(SESSION.user));
    $$('login-error').style.display = 'none';
    onLoginSuccess();
  }
}

async function onLoginSuccess() {
  $$('login-screen').style.display = 'none';
  $$('session-nombre').textContent = SESSION.user.nombre;
  var rolEl = $$('session-rol');
  rolEl.textContent = SESSION.user.rol === 'administrador' ? 'Admin' : 'Técnico';
  rolEl.className = 'role-badge role-' + SESSION.user.rol;
  $$('session-info').style.display = 'flex';
  $$('btn-logout').style.display = 'inline-flex';
  $$('btn-usuarios').style.display = SESSION.user.rol === 'administrador' ? 'inline-flex' : 'none';
  if (typeof window.cargarDB === 'function') {
    await window.cargarDB();
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
  var html = '<div class="emp-grid">';
  users.forEach(function(u, idx) {
    var isSelf = u.username === SESSION.user.username;
    var avatarContent = u.foto
      ? '<img src="' + u.foto + '">'
      : u.nombre.charAt(0).toUpperCase();
    html += '<div class="emp-card" onclick="verUsuario(' + idx + ')">';
    html += '<div class="emp-avatar">' + avatarContent + '</div>';
    html += '<div class="emp-name">' + u.nombre + '</div>';
    html += '<div class="emp-role">' + (u.rol === 'administrador' ? '⭐ Administrador' : '🔧 Técnico') + '</div>';
    html += '<div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end;">';
    if (!isSelf) {
      html += '<button class="btn btn-sm btn-red" onclick="event.stopPropagation();eliminarUsuario(\'' + (u.id || u.username) + '\')">🗑️</button>';
    } else {
      html += '<span style="color:var(--text3);font-size:11px;">(sesión actual)</span>';
    }
    html += '</div></div>';
  });
  html += '</div>';
  $$('usuarios-list').innerHTML = html;
  window.usuarios_cache = users;
}


function verUsuario(idx) {
  var u = window.usuarios_cache[idx];
  var fotoEl = document.getElementById('gafete-foto');
  fotoEl.innerHTML = u.foto ? '<img src="' + u.foto + '">' : u.nombre.charAt(0).toUpperCase();
  document.getElementById('gafete-nombre').textContent = u.nombre;
  document.getElementById('gafete-puesto').textContent = u.rol === 'administrador' ? '⭐ Administrador' : '🔧 Técnico';
  document.getElementById('gafete-username').textContent = u.username;
  document.getElementById('gafete-pass').textContent = u.password || '••••••••';
  document.getElementById('gafete-id').textContent = 'ID: ' + (u.id || 'local-' + idx);
  document.getElementById('m-gafete-user').style.display = 'flex';
}

async function guardarNuevoUsuario() {
  var nombre = $$('nu-nombre').value.trim();
  var username = $$('nu-user').value.trim().toLowerCase().replace(/\s+/g,'_');
  var password = $$('nu-pass').value;
  var rol = $$('nu-rol').value;
  if (!nombre || !username || !password) { toast('Completa todos los campos requeridos', 'error'); return; }
  if (password.length < 4) { toast('La contraseña debe tener al menos 4 caracteres', 'error'); return; }

  // Obtener foto en base64
  var fotoBase64 = null;
  var fotoInput = document.getElementById('nu-foto');
  if (fotoInput && fotoInput.files[0]) {
    fotoBase64 = await new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result); };
      reader.readAsDataURL(fotoInput.files[0]);
    });
  }

  if (typeof window.dbUsuarios !== 'undefined') {
    window.dbUsuarios.crear({ username: username, password: password, nombre: nombre, rol: rol, foto: fotoBase64 }).then(function() {
      $$('nu-nombre').value = ''; $$('nu-user').value = ''; $$('nu-pass').value = '';
      document.getElementById('nu-foto').value = '';
      document.getElementById('nu-foto-preview').style.display = 'none';
      pintarUsuarios();
      toast('Usuario "' + nombre + '" agregado correctamente');
    }).catch(function(e) {
      toast(e.message.includes('unique') ? 'Ya existe un usuario con ese nombre' : 'Error: ' + e.message, 'error');
    });
  } else {
    var users = getUsers();
    if (users.some(function(u){ return u.username === username; })) { toast('Ya existe un usuario con ese nombre', 'error'); return; }
    users.push({ username: username, password: password, nombre: nombre, rol: rol, foto: fotoBase64 });
    saveUsers(users);
    $$('nu-nombre').value = ''; $$('nu-user').value = ''; $$('nu-pass').value = '';
    document.getElementById('nu-foto').value = '';
    document.getElementById('nu-foto-preview').style.display = 'none';
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
      maintainAspectRatio:false,
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
const fs = require('fs');
const os = require('os');
const path = require('path');
const { shell } = require('electron');

// ─── Estilos reutilizables ───────────────────────────────────────────────────
var ESTILOS = {
  // Encabezados por sección
  hdrAzul:   { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, fill: { fgColor: { rgb: '1F3864' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { bottom: { style: 'medium', color: { rgb: 'FFFFFF' } } } },
  hdrVerde:  { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, fill: { fgColor: { rgb: '1E5631' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } },
  hdrRojo:   { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, fill: { fgColor: { rgb: '7B0000' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } },
  hdrMorado: { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, fill: { fgColor: { rgb: '2E1F5E' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } },
  hdrDorado: { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, fill: { fgColor: { rgb: '7D4600' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } },
  // Filas alternadas
  filaPar:   { fill: { fgColor: { rgb: 'EBF2FF' } }, alignment: { vertical: 'center' } },
  filaImpar: { fill: { fgColor: { rgb: 'FFFFFF' } }, alignment: { vertical: 'center' } },
  // Especiales
  stockBajo:  { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'C0392B' } }, alignment: { horizontal: 'center' } },
  stockMedio: { font: { bold: true, color: { rgb: '000000' } }, fill: { fgColor: { rgb: 'F39C12' } }, alignment: { horizontal: 'center' } },
  stockOk:    { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '27AE60' } }, alignment: { horizontal: 'center' } },
  moneda:     { numFmt: '"$"#,##0.00', alignment: { horizontal: 'right' } },
  monedaRojo: { numFmt: '"$"#,##0.00', font: { color: { rgb: 'C0392B' } }, alignment: { horizontal: 'right' } },
  porcentaje: { numFmt: '0.0"%"', alignment: { horizontal: 'center' } },
  numero:     { alignment: { horizontal: 'center' } },
  titulo:     { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 }, fill: { fgColor: { rgb: '1F3864' } }, alignment: { horizontal: 'center', vertical: 'center' } },
  subtitulo:  { font: { bold: true, color: { rgb: '1F3864' }, sz: 11 }, fill: { fgColor: { rgb: 'D6E4FF' } }, alignment: { horizontal: 'left', vertical: 'center' } },
  labelRes:   { font: { bold: true, color: { rgb: '2C3E50' }, sz: 11 }, fill: { fgColor: { rgb: 'ECF0F1' } } },
  valorRes:   { font: { bold: true, color: { rgb: '1F3864' }, sz: 12 }, alignment: { horizontal: 'right' } },
  valorMoneda:{ font: { bold: true, color: { rgb: '1E5631' }, sz: 12 }, numFmt: '"$"#,##0.00', alignment: { horizontal: 'right' } },
};

function _aplicarEstilo(ws, celda, estilo) {
  if (!ws[celda]) ws[celda] = { t: 'z', v: '' };
  ws[celda].s = estilo;
}

function _estilizarHoja(ws, headers, numRows, colWidths, hdrEstilo, colFormats) {
  var cols = headers.length;
  // Encabezados
  for (var c = 0; c < cols; c++) {
    var cel = XLSX.utils.encode_cell({ r: 0, c: c });
    if (ws[cel]) ws[cel].s = hdrEstilo;
  }
  // Filas de datos
  for (var r = 1; r <= numRows; r++) {
    for (var c = 0; c < cols; c++) {
      var cel = XLSX.utils.encode_cell({ r: r, c: c });
      if (!ws[cel]) continue;
      var base = (r % 2 === 0) ? Object.assign({}, ESTILOS.filaPar) : Object.assign({}, ESTILOS.filaImpar);
      if (colFormats && colFormats[c]) {
        ws[cel].s = Object.assign({}, base, colFormats[c]);
      } else {
        ws[cel].s = base;
      }
    }
  }
  // Anchos de columna
  ws['!cols'] = colWidths.map(function(w) { return { wch: w }; });
  // Alto de encabezado
  ws['!rows'] = [{ hpx: 32 }];
}

function _guardarExcel(wb, nombre) {
  var ruta = path.join(os.homedir(), 'Desktop', nombre);
  var buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
  fs.writeFileSync(ruta, buf);
  shell.showItemInFolder(ruta);
}

// ─── EXPORTAR TODO ────────────────────────────────────────────────────────────
function exportarExcel() {
  var wb = XLSX.utils.book_new();

  // ── RESUMEN ──
  var totalVtas = DB.ventas.reduce(function(a,v){return a+v.total;},0);
  var totalGan  = DB.ventas.reduce(function(a,v){return a+v.ganancia;},0);
  var totalMerma= DB.mermas.reduce(function(a,m){return a+m.costo;},0);
  var valInv    = DB.productos.reduce(function(a,p){return a+p.cantidad*p.precio;},0);

  var resData = [
    ['MiPOS Pro — Reporte General', ''],
    ['Generado:', ahora()],
    ['', ''],
    ['📦 INVENTARIO', ''],
    ['Total Productos',    DB.productos.length],
    ['Valor Inventario',   valInv],
    ['Stock Bajo',         getStockBajos().length],
    ['', ''],
    ['💰 VENTAS', ''],
    ['Total Ingresos',     totalVtas],
    ['Total Ganancia',     totalGan],
    ['Num. Ventas',        DB.ventas.length],
    ['Margen Promedio',    totalVtas>0?parseFloat(((totalGan/totalVtas)*100).toFixed(1)):0],
    ['', ''],
    ['⚠️ MERMAS', ''],
    ['Pérdida en Costo',   totalMerma],
    ['Num. Mermas',        DB.mermas.length],
  ];
  var wsRes = XLSX.utils.aoa_to_sheet(resData);
  wsRes['!cols'] = [{wch:28},{wch:22}];
  wsRes['!rows'] = [{hpx:36}];
  // Título principal
  wsRes['A1'].s = ESTILOS.titulo;
  wsRes['B1'].s = ESTILOS.titulo;
  // Subtítulos de sección
  [[3,'📦 INVENTARIO'],[8,'💰 VENTAS'],[14,'⚠️ MERMAS']].forEach(function(s){
    var cel = 'A'+(s[0]+1);
    if(wsRes[cel]) wsRes[cel].s = ESTILOS.subtitulo;
    var cel2 = 'B'+(s[0]+1);
    if(wsRes[cel2]) wsRes[cel2].s = ESTILOS.subtitulo;
  });
  // Labels y valores
  [4,5,6,9,10,11,12,15,16].forEach(function(r){
    var ca='A'+(r+1), cb='B'+(r+1);
    if(wsRes[ca]) wsRes[ca].s = ESTILOS.labelRes;
    if(wsRes[cb]) wsRes[cb].s = ESTILOS.valorRes;
  });
  // Monedas
  ['B6','B10','B11','B16'].forEach(function(c){ if(wsRes[c]) wsRes[c].s = ESTILOS.valorMoneda; });
  XLSX.utils.book_append_sheet(wb, wsRes, '📋 Resumen');

  // ── INVENTARIO ──
  var invHeaders = ['Producto','SKU','Proveedor','Categoría','Cantidad','Costo','Precio Venta','Margen %','Valor Total','Estado'];
  var invRows = DB.productos.map(function(p){
    var m = p.precio>0?parseFloat(((p.precio-p.costo)/p.precio*100).toFixed(1)):0;
    return [p.nombre,p.sku,p.proveedor,p.categoria,p.cantidad,p.costo,p.precio,m,p.cantidad*p.precio,
      p.cantidad<=(p.minstock||5)?'Stock bajo':p.cantidad<=20?'Stock medio':'Stock Completo'];
  });
  var wsInv = XLSX.utils.aoa_to_sheet([invHeaders].concat(invRows));
  _estilizarHoja(wsInv, invHeaders, invRows.length,
    [30,16,22,18,10,12,14,11,14,14], ESTILOS.hdrAzul,
    {4:{numFmt:'#,##0',alignment:{horizontal:'center'}}, 5:ESTILOS.moneda, 6:ESTILOS.moneda, 7:ESTILOS.porcentaje, 8:ESTILOS.moneda});
  // Estado con color
  invRows.forEach(function(row, i){
    var cel = XLSX.utils.encode_cell({r:i+1, c:9});
    if(!wsInv[cel]) return;
    if(row[9]==='Stock bajo')    wsInv[cel].s = ESTILOS.stockBajo;
    else if(row[9]==='Stock medio') wsInv[cel].s = ESTILOS.stockMedio;
    else                            wsInv[cel].s = ESTILOS.stockOk;
  });
  XLSX.utils.book_append_sheet(wb, wsInv, '📦 Inventario');

  // ── VENTAS ──
  var vtasHeaders = ['N° Ticket','Fecha','Producto','Empleado','Cantidad','Precio Unit.','Total','Costo','Ganancia','Margen %','Método Pago','Nota'];
  var vtasRows = DB.ventas.map(function(v){
    return [v.ticket||v.folio, v.fecha, v.producto, v.empleado, v.cantidad,
      v.precioUnit, v.total, v.costo, v.ganancia,
      v.total>0?parseFloat(((v.ganancia/v.total)*100).toFixed(1)):0, v.pago||'', v.nota||''];
  });
  var wsVtas = XLSX.utils.aoa_to_sheet([vtasHeaders].concat(vtasRows));
  _estilizarHoja(wsVtas, vtasHeaders, vtasRows.length,
    [22,20,28,18,10,13,13,13,13,11,16,20], ESTILOS.hdrVerde,
    {4:{numFmt:'#,##0',alignment:{horizontal:'center'}}, 5:ESTILOS.moneda, 6:ESTILOS.moneda, 7:ESTILOS.moneda, 8:ESTILOS.moneda, 9:ESTILOS.porcentaje});
  XLSX.utils.book_append_sheet(wb, wsVtas, '💰 Ventas');

  // ── MERMAS ──
  var mermHeaders = ['Fecha','Producto','Motivo','Responsable','Descripción','Cantidad','Costo Perdido','Valor Perdido','Ganancia Perdida'];
  var mermRows = DB.mermas.map(function(m){
    return [m.fecha,m.producto,m.motivo,m.culpable||'',m.desc,m.cantidad,m.costo,m.valor,m.ganancia];
  });
  var wsMerm = XLSX.utils.aoa_to_sheet([mermHeaders].concat(mermRows));
  _estilizarHoja(wsMerm, mermHeaders, mermRows.length,
    [20,28,18,18,24,10,15,15,16], ESTILOS.hdrRojo,
    {5:{numFmt:'#,##0',alignment:{horizontal:'center'}}, 6:ESTILOS.monedaRojo, 7:ESTILOS.monedaRojo, 8:ESTILOS.monedaRojo});
  XLSX.utils.book_append_sheet(wb, wsMerm, '⚠️ Mermas');

  // ── PROVEEDORES ──
  var provHeaders = ['Empresa','Contacto','Teléfono','Email','RFC','CURP','NSS','Dirección','Notas','# Productos'];
  var provRows = DB.proveedores.map(function(p){
    return [p.nombre,p.contacto,p.tel,p.email,p.rfc||'',p.curp||'',p.nss||'',p.dir,p.notas||'',
      DB.productos.filter(function(pr){return pr.proveedor===p.nombre;}).length];
  });
  var wsProv = XLSX.utils.aoa_to_sheet([provHeaders].concat(provRows));
  _estilizarHoja(wsProv, provHeaders, provRows.length,
    [24,18,14,28,14,18,14,32,24,12], ESTILOS.hdrMorado,
    {9:{numFmt:'#,##0',alignment:{horizontal:'center'}}});
  XLSX.utils.book_append_sheet(wb, wsProv, '🏭 Proveedores');

  _guardarExcel(wb, 'MiPOS_Reporte_'+new Date().toLocaleDateString('es-MX').replace(/\//g,'-')+'.xlsx');
  toast('Excel exportado exitosamente 📊');
}

// ─── EXPORTAR INDIVIDUAL ──────────────────────────────────────────────────────
function exportarInvExcel(){
  var wb = XLSX.utils.book_new();
  var headers = ['Producto','SKU','Proveedor','Categoría','Cantidad','Costo','Precio Venta','Margen %','Valor Total','Estado'];
  var rows = DB.productos.map(function(p){
    var m=p.precio>0?parseFloat(((p.precio-p.costo)/p.precio*100).toFixed(1)):0;
    return[p.nombre,p.sku,p.proveedor,p.categoria,p.cantidad,p.costo,p.precio,m,p.cantidad*p.precio,
      p.cantidad<=(p.minstock||5)?'Stock bajo':p.cantidad<=20?'Stock medio':'Stock Completo'];
  });
  var ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
  _estilizarHoja(ws,headers,rows.length,[30,16,22,18,10,12,14,11,14,14],ESTILOS.hdrAzul,
    {4:{numFmt:'#,##0',alignment:{horizontal:'center'}},5:ESTILOS.moneda,6:ESTILOS.moneda,7:ESTILOS.porcentaje,8:ESTILOS.moneda});
  rows.forEach(function(row,i){
    var cel=XLSX.utils.encode_cell({r:i+1,c:9});
    if(!ws[cel])return;
    ws[cel].s=row[9]==='Stock bajo'?ESTILOS.stockBajo:row[9]==='Stock medio'?ESTILOS.stockMedio:ESTILOS.stockOk;
  });
  XLSX.utils.book_append_sheet(wb,ws,'Inventario');
  _guardarExcel(wb,'Inventario_'+fechaHoy()+'.xlsx');
  toast('Inventario exportado 📊');
}

function exportarProvExcel(){
  var wb = XLSX.utils.book_new();
  var headers = ['Empresa','Contacto','Teléfono','Email','RFC','CURP','NSS','Dirección','Notas'];
  var rows = DB.proveedores.map(function(p){return[p.nombre,p.contacto,p.tel,p.email,p.rfc||'',p.curp||'',p.nss||'',p.dir,p.notas||''];});
  var ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
  _estilizarHoja(ws,headers,rows.length,[24,18,14,28,14,18,14,32,24],ESTILOS.hdrMorado,null);
  XLSX.utils.book_append_sheet(wb,ws,'Proveedores');
  _guardarExcel(wb,'Proveedores_'+fechaHoy()+'.xlsx');
  toast('Proveedores exportados 📊');
}

function exportarVtasExcel(){
  var wb = XLSX.utils.book_new();
  var headers = ['N° Ticket','Fecha','Producto','Empleado','Cantidad','Precio Unit.','Total','Ganancia','Pago'];
  var rows = DB.ventas.map(function(v){return[v.ticket||v.folio,v.fecha,v.producto,v.empleado,v.cantidad,v.precioUnit,v.total,v.ganancia,v.pago||''];});
  var ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
  _estilizarHoja(ws,headers,rows.length,[22,20,28,18,10,13,13,13,16],ESTILOS.hdrVerde,
    {4:{numFmt:'#,##0',alignment:{horizontal:'center'}},5:ESTILOS.moneda,6:ESTILOS.moneda,7:ESTILOS.moneda});
  XLSX.utils.book_append_sheet(wb,ws,'Ventas');
  _guardarExcel(wb,'Ventas_'+fechaHoy()+'.xlsx');
  toast('Ventas exportadas 📊');
}

function exportarMermExcel(){
  var wb = XLSX.utils.book_new();
  var headers = ['Fecha','Producto','Motivo','Responsable','Descripción','Cantidad','Costo Perdido','Ganancia Perdida'];
  var rows = DB.mermas.map(function(m){return[m.fecha,m.producto,m.motivo,m.culpable||'',m.desc,m.cantidad,m.costo,m.ganancia];});
  var ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
  _estilizarHoja(ws,headers,rows.length,[20,28,18,18,24,10,15,16],ESTILOS.hdrRojo,
    {5:{numFmt:'#,##0',alignment:{horizontal:'center'}},6:ESTILOS.monedaRojo,7:ESTILOS.monedaRojo});
  XLSX.utils.book_append_sheet(wb,ws,'Mermas');
  _guardarExcel(wb,'Mermas_'+fechaHoy()+'.xlsx');
  toast('Mermas exportadas 📊');
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