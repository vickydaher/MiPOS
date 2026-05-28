const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qouhxszlrihlwfiapxvj.supabase.co',
  'sb_publishable_y3N8tSIubhB_hA0o6BRIlQ_YoQ3UcCw'
);

async function iniciarDB() {
  console.log('✅ Conectado a Supabase');
}

// =================== PROVEEDORES ===================
const proveedores = {
  todos: async () => {
    const { data, error } = await supabase.from('proveedores').select('*').order('nombre');
    if (error) throw error;
    return data;
  },
  porId: async (id) => {
    const { data, error } = await supabase.from('proveedores').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  crear: async (d) => {
    const { data, error } = await supabase.from('proveedores').insert(d).select().single();
    if (error) throw error;
    return data.id;
  },
  actualizar: async (d) => {
    const { id, ...rest } = d;
    const { error } = await supabase.from('proveedores').update(rest).eq('id', id);
    if (error) throw error;
  },
  eliminar: async (id) => {
    const { error } = await supabase.from('proveedores').delete().eq('id', id);
    if (error) throw error;
  },
};

// =================== PRODUCTOS ===================
const productos = {
  todos: async () => {
    const { data, error } = await supabase.from('productos')
      .select('*, proveedores(nombre)')
      .order('nombre');
    if (error) throw error;
    return data.map(p => ({ ...p, proveedor_nombre: p.proveedores?.nombre }));
  },
  porId: async (id) => {
    const { data, error } = await supabase.from('productos').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  porSku: async (sku) => {
    const { data, error } = await supabase.from('productos').select('*').eq('sku', sku).single();
    if (error) throw error;
    return data;
  },
  crear: async (d) => {
    const { data, error } = await supabase.from('productos').insert(d).select().single();
    if (error) throw error;
    return data.id;
  },
  actualizar: async (d) => {
    const { id, ...rest } = d;
    const { error } = await supabase.from('productos').update(rest).eq('id', id);
    if (error) throw error;
  },
  actualizarStock: async (id, delta) => {
    const { data } = await supabase.from('productos').select('cantidad').eq('id', id).single();
    const { error } = await supabase.from('productos').update({ cantidad: data.cantidad + delta }).eq('id', id);
    if (error) throw error;
  },
  eliminar: async (id) => {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) throw error;
  },
  stockBajo: async () => {
    const { data, error } = await supabase.from('productos')
      .select('*')
      .filter('cantidad', 'lte', supabase.raw('stock_minimo'))
      .order('cantidad');
    if (error) throw error;
    return data;
  },
};

// =================== VENTAS ===================
const ventas = {
  todas: async () => {
    const { data, error } = await supabase.from('ventas')
      .select('*, usuarios(nombre)')
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data.map(v => ({ ...v, empleado_nombre: v.empleado_nombre || v.usuarios?.nombre || '' })); 
  },
  items: async (venta_id) => {
    const { data, error } = await supabase.from('venta_items').select('*').eq('venta_id', venta_id);
    if (error) throw error;
    return data;
  },
  crear: async (venta, items) => {
    const ticket = 'TK-' + Date.now();
    const { data: ventaData, error: ventaError } = await supabase.from('ventas')
      .insert({ ...venta, ticket })
      .select().single();
    if (ventaError) throw ventaError;

    const ventaId = ventaData.id;

    for (const item of items) {
      await supabase.from('venta_items').insert({ ...item, venta_id: ventaId });
      const { data: prod } = await supabase.from('productos').select('cantidad').eq('id', item.producto_id).single();
      await supabase.from('productos').update({ cantidad: prod.cantidad - item.cantidad }).eq('id', item.producto_id);
    }
    return ticket;
  },
  porUsuario: async (usuario_id) => {
    const { data, error } = await supabase.from('ventas')
      .select('*, venta_items(*)')
      .eq('usuario_id', usuario_id)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data;
  },
};

// =================== MERMAS ===================
const mermas = {
  todas: async () => {
    const { data, error } = await supabase.from('mermas').select('*').order('fecha', { ascending: false });
    if (error) throw error;
    return data;
  },
  items: async (merma_id) => {
    const { data, error } = await supabase.from('merma_items').select('*').eq('merma_id', merma_id);
    if (error) throw error;
    return data;
  },
  crear: async (merma, items) => {
    const { data: mermaData, error: mermaError } = await supabase.from('mermas')
      .insert(merma).select().single();
    if (mermaError) throw mermaError;

    const mermaId = mermaData.id;

    for (const item of items) {
      await supabase.from('merma_items').insert({ ...item, merma_id: mermaId });
      const { data: prod } = await supabase.from('productos').select('cantidad').eq('id', item.producto_id).single();
      await supabase.from('productos').update({ cantidad: prod.cantidad - item.cantidad }).eq('id', item.producto_id);
    }
    return mermaId;
  },
};

// =================== USUARIOS ===================
const usuarios = {
  todos: async () => {
    const { data, error } = await supabase.from('usuarios').select('id, username, nombre, rol, foto').order('nombre');
    if (error) throw error;
    return data;
  },
  login: async (username, password) => {
    const { data, error } = await supabase.from('usuarios')
      .select('id, username, nombre, rol')
      .eq('username', username)
      .eq('password', password)
      .single();
    if (error) return null;
    return data;
  },
  crear: async (d) => {
    const { error } = await supabase.from('usuarios').insert(d);
    if (error) throw error;
  },
  eliminar: async (id) => {
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (error) throw error;
  },
};

module.exports = { iniciarDB, proveedores, productos, ventas, mermas, usuarios };