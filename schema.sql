-- ============================================================
--  MiPOS – Schema para Supabase
--  Ejecuta esto en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- USUARIOS DEL SISTEMA (login)
create table if not exists usuarios (
  id          uuid primary key default gen_random_uuid(),
  username    text not null unique,
  password    text not null,
  nombre      text not null,
  rol         text not null check (rol in ('administrador', 'tecnico')),
  created_at  timestamptz default now()
);

-- Usuario administrador por defecto
insert into usuarios (username, password, nombre, rol)
values ('admin', 'admin123', 'Administrador', 'administrador')
on conflict (username) do nothing;

alter table usuarios disable row level security;

-- PROVEEDORES
create table if not exists proveedores (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  contacto    text,
  telefono    text,
  email       text,
  rfc         text,
  curp        text,
  nss         text,
  direccion   text,
  notas       text,
  created_at  timestamptz default now()
);

-- PRODUCTOS
create table if not exists productos (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  sku              text unique,
  proveedor_id     uuid references proveedores(id) on delete set null,
  proveedor_texto  text,
  categoria        text,
  cantidad         int default 0,
  costo            numeric(12,2) default 0,
  precio           numeric(12,2) default 0,
  descripcion      text,
  stock_minimo     int default 5,
  fibra_color      text,
  fibra_marca      text,
  fibra_material   text,
  fibra_hilo       text,
  fibra_colorante  text,
  created_at       timestamptz default now()
);

-- EMPLEADOS
create table if not exists empleados (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  id_colab    text,
  puesto      text,
  telefono    text,
  email       text,
  curp        text,
  nss         text,
  rfc         text,
  direccion   text,
  notas       text,
  foto        text,
  created_at  timestamptz default now()
);

-- VENTAS (cabecera)
create table if not exists ventas (
  id           uuid primary key default gen_random_uuid(),
  ticket       text unique,
  empleado_id  uuid references empleados(id) on delete set null,
  metodo_pago  text,
  nota         text,
  total        numeric(12,2) default 0,
  ganancia     numeric(12,2) default 0,
  fecha        timestamptz default now()
);

-- VENTA_ITEMS (líneas de venta)
create table if not exists venta_items (
  id           uuid primary key default gen_random_uuid(),
  venta_id     uuid not null references ventas(id) on delete cascade,
  producto_id  uuid references productos(id) on delete set null,
  nombre_snap  text,
  cantidad     int default 1,
  precio_unit  numeric(12,2) default 0,
  costo_unit   numeric(12,2) default 0,
  subtotal     numeric(12,2) default 0,
  ganancia     numeric(12,2) default 0
);

-- MERMAS (cabecera)
create table if not exists mermas (
  id               uuid primary key default gen_random_uuid(),
  motivo           text,
  culpable         text,
  descripcion      text,
  costo_total      numeric(12,2) default 0,
  valor_total      numeric(12,2) default 0,
  ganancia_perdida numeric(12,2) default 0,
  fecha            timestamptz default now()
);

-- MERMA_ITEMS (líneas de merma)
create table if not exists merma_items (
  id               uuid primary key default gen_random_uuid(),
  merma_id         uuid not null references mermas(id) on delete cascade,
  producto_id      uuid references productos(id) on delete set null,
  nombre_snap      text,
  cantidad         int default 1,
  costo_unit       numeric(12,2) default 0,
  precio_unit      numeric(12,2) default 0,
  costo_perdido    numeric(12,2) default 0,
  ganancia_perdida numeric(12,2) default 0
);

-- ============================================================
--  RLS (Row Level Security) — deshabilitar para app local
--  Si usas Supabase Auth, habilita y configura políticas.
-- ============================================================
alter table proveedores  disable row level security;
alter table productos    disable row level security;
alter table empleados    disable row level security;
alter table ventas       disable row level security;
alter table venta_items  disable row level security;
alter table mermas       disable row level security;
alter table merma_items  disable row level security;
