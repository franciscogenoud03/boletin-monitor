import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Sociedad = {
  id: string
  nombre: string
  cuit?: string
  tipos: string[]
  activa: boolean
  created_at: string
}

export type Alerta = {
  id: string
  sociedad_id: string
  sociedad_nombre: string
  tipo: string
  fecha_publicacion: string
  numero_boletin: string
  seccion: string
  resumen: string
  url: string
  leida: boolean
  created_at: string
}

// SQL para crear las tablas (ejecutar en Supabase SQL Editor)
export const SCHEMA_SQL = `
create table if not exists sociedades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cuit text,
  tipos text[] not null default '{"asamblea"}',
  activa boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists alertas (
  id uuid primary key default gen_random_uuid(),
  sociedad_id uuid references sociedades(id) on delete cascade,
  sociedad_nombre text not null,
  tipo text not null,
  fecha_publicacion date not null,
  numero_boletin text,
  seccion text,
  resumen text,
  url text,
  leida boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists scan_log (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz default now(),
  mensaje text,
  detalle text,
  alertas_generadas int default 0
);
`
