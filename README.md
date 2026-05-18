# Monitor Boletín Oficial 🇦🇷

App web para seguimiento automático de publicaciones del Boletín Oficial argentino.
Envía mails cuando hay novedades para las sociedades que configuraste.

---

## Stack

- **Frontend/Backend**: Next.js (hosteado gratis en Vercel)
- **Base de datos**: Supabase (gratis, PostgreSQL)
- **Mails**: Gmail vía nodemailer
- **Cron**: Vercel Cron Jobs (escaneo automático de lunes a viernes a las 9 hs)

---

## Deploy paso a paso

### 1. Crear base de datos en Supabase

1. Entrá a https://supabase.com y creá una cuenta gratis
2. Creá un nuevo proyecto (guardá la contraseña)
3. Andá a **SQL Editor** y ejecutá este SQL:

```sql
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
```

4. En **Project Settings → API**, copiá:
   - `Project URL` → será tu `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. Configurar Gmail para envío de mails

Para que Gmail permita enviar desde la app necesitás una **App Password** (no tu contraseña normal):

1. Entrá a tu cuenta de Google → **Seguridad**
2. Activá la **Verificación en dos pasos** (si no la tenés)
3. Andá a **Contraseñas de aplicaciones**
4. Creá una nueva: tipo "Correo", dispositivo "Otro" → nombralo "Monitor BO"
5. Copiá la contraseña de 16 caracteres que te da → será tu `GMAIL_APP_PASSWORD`

> Si no ves la opción, entrá directamente a:
> https://myaccount.google.com/apppasswords

---

### 3. Subir el código a GitHub

```bash
# En la carpeta del proyecto:
git init
git add .
git commit -m "Monitor Boletín Oficial"
# Creá un repo en github.com y luego:
git remote add origin https://github.com/TU_USUARIO/boletin-monitor.git
git push -u origin main
```

---

### 4. Deploy en Vercel

1. Entrá a https://vercel.com y creá una cuenta (podés entrar con GitHub)
2. Hacé clic en **Add New Project** → importá tu repo de GitHub
3. En la sección **Environment Variables** agregá todas estas variables:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key de Supabase |
| `GMAIL_USER` | tu-email@gmail.com |
| `GMAIL_APP_PASSWORD` | contraseña de 16 dígitos de Google |
| `ALERT_EMAIL_TO` | email donde recibir las alertas |
| `CRON_SECRET` | cualquier texto largo y secreto (ej: `mi-clave-super-secreta-2024`) |

4. Hacé clic en **Deploy** → en 2-3 minutos tu app está online

Tu URL será algo como: `https://boletin-monitor.vercel.app`

---

### 5. Verificar que funciona

1. Entrá a tu URL y agregá una sociedad de prueba (ej: "YPF S.A.")
2. Hacé clic en **↻ Escanear ahora** (el botón dorado arriba a la derecha)
3. Si hay novedades, en minutos deberías recibir un mail

---

## Cron automático

El archivo `vercel.json` ya configura el escaneo automático:
- **Horario**: lunes a viernes a las 9:00 AM (UTC-3 / hora Argentina)
- **Cómo funciona**: Vercel llama al endpoint `/api/cron` con el `CRON_SECRET`

Para cambiar el horario, editá `vercel.json`:
```json
"schedule": "0 12 * * 1-5"  // 12:00 UTC = 9:00 Argentina
```

> ⚠️ Los cron jobs de Vercel usan UTC. Argentina (ART) es UTC-3.

---

## Limitaciones del plan gratuito

| Servicio | Límite gratuito |
|---|---|
| Vercel | 100 GB bandwidth, functions ilimitadas |
| Supabase | 500 MB DB, 2 GB bandwidth |
| Gmail | 500 mails/día |

Para uso personal esto es más que suficiente.

---

## Estructura del proyecto

```
boletin-monitor/
├── pages/
│   ├── index.tsx          # App principal
│   └── api/
│       ├── sociedades.ts  # CRUD sociedades
│       ├── sociedades/[id].ts
│       ├── alertas.ts     # GET/PATCH alertas
│       ├── log.ts         # Historial de escaneos
│       └── cron.ts        # Escaneo + envío de mails
├── lib/
│   ├── supabase.ts        # Cliente DB
│   ├── scraper.ts         # Consulta al Boletín Oficial
│   └── mailer.ts          # Envío de mails con Gmail
├── styles/
│   └── Home.module.css
└── vercel.json            # Config del cron
```
