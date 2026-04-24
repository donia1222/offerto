# OFFERTO Admin Panel — Proyecto Next.js

> Panel de administración para gestión de imágenes de productos via Gemini AI
> Stack: Next.js 15 + Vercel + MySQL (offerto_db existente)

---

## OBJETIVO

Panel web para gestionar la asignación automática de imágenes genéricas a los
productos de la app Offerto. El bot de Gemini lee los nombres de los productos
de la base de datos y asigna la imagen más adecuada del banco de imágenes local.

---

## TECH STACK

| Capa | Tecnología |
|------|-----------|
| Frontend + API | Next.js 15 (App Router) |
| Deploy | Vercel |
| DB | MySQL 8.0 — misma `offerto_db` de la app |
| DB Client | `mysql2` (conexión directa desde Next.js, sin PHP) |
| AI | Google Gemini Flash (`gemini-1.5-flash`) |
| Auth | NextAuth.js (acceso protegido, solo admin) |
| Estilos | Tailwind CSS |
| Cron | Vercel Cron Jobs (`vercel.json`) |

---

## VARIABLES DE ENTORNO

```bash
# .env.local (nunca commitear)
DATABASE_HOST=tu-servidor.com
DATABASE_PORT=3306
DATABASE_NAME=offerto_db
DATABASE_USER=offerto_user
DATABASE_PASSWORD=xxxx

GEMINI_API_KEY=AIza...

NEXTAUTH_SECRET=xxxx
NEXTAUTH_URL=https://admin.offerto.ch

ADMIN_EMAIL=info@lweb.ch
ADMIN_PASSWORD=xxxx
```

---

## ESTRUCTURA DEL PROYECTO

```
offerto-admin/
├── .env.local
├── .env.example
├── vercel.json              ← Cron job config
├── package.json
├── tailwind.config.ts
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx             ← Redirect a /dashboard
│   ├── login/
│   │   └── page.tsx         ← Login page
│   └── dashboard/
│       ├── layout.tsx       ← Layout con sidebar
│       ├── page.tsx         ← Dashboard (stats + último run)
│       ├── productos/
│       │   └── page.tsx     ← Lista productos + imagen asignada
│       ├── imagenes/
│       │   └── page.tsx     ← Banco de imágenes (gestión)
│       └── logs/
│           └── page.tsx     ← Historial de runs del bot
│
├── app/api/
│   ├── auth/[...nextauth]/
│   │   └── route.ts         ← NextAuth
│   ├── assign-images/
│   │   └── route.ts         ← POST: ejecuta Gemini para asignar imágenes
│   ├── productos/
│   │   └── route.ts         ← GET: lista productos con imagen asignada
│   ├── override/
│   │   └── route.ts         ← POST: override manual de imagen
│   └── imagenes/
│       └── route.ts         ← GET/POST/DELETE: gestión banco de imágenes
│
├── lib/
│   ├── db.ts                ← Conexión mysql2
│   ├── gemini.ts            ← Cliente Gemini API
│   └── auth.ts              ← Config NextAuth
│
├── components/
│   ├── Sidebar.tsx
│   ├── ProductRow.tsx       ← Fila con imagen actual + override
│   ├── ImagePicker.tsx      ← Modal para elegir imagen del banco
│   ├── RunButton.tsx        ← Botón "Ejecutar ahora"
│   └── StatsCard.tsx
│
└── public/
    └── images/products/     ← Banco de imágenes genéricas (40+ PNGs)
```

---

## BASE DE DATOS — CAMBIOS EN offerto_db

No se crea una nueva base de datos. Solo se añade una tabla y un campo:

```sql
-- Campo ya existente en schema (no hace falta añadirlo):
-- ALTER TABLE ofertas ADD COLUMN imagen_local VARCHAR(500);

-- Nueva tabla: banco de imágenes genéricas
CREATE TABLE imagen_banco (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(100) UNIQUE NOT NULL,  -- 'refresco_cola', 'vino_tinto'
  nombre      VARCHAR(150) NOT NULL,          -- 'Refresco Cola' (legible)
  archivo     VARCHAR(255) NOT NULL,          -- 'refresco_cola.png'
  categoria   VARCHAR(50),                    -- 'getraenke', 'fleisch', etc
  keywords    TEXT,                           -- 'cola, coca-cola, pepsi, refresco'
  activa      TINYINT DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nueva tabla: log de runs del bot
CREATE TABLE gemini_runs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  run_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  productos_procesados INT DEFAULT 0,
  asignaciones_nuevas  INT DEFAULT 0,
  errores       INT DEFAULT 0,
  duracion_ms   INT,
  trigger       ENUM('cron', 'manual') DEFAULT 'cron'
);
```

---

## CRON JOB — vercel.json

```json
{
  "crons": [
    {
      "path": "/api/assign-images",
      "schedule": "0 6 * * 1"
    }
  ]
}
```

Ejecuta cada **lunes a las 06:00 UTC** (después del scraper de la app).

---

## FLUJO COMPLETO

```
Lunes 06:00
  1. scrape_weekly.php (servidor app)
     → actualiza tabla `ofertas` en offerto_db

  2. Vercel Cron → POST /api/assign-images
     → lee ofertas donde imagen_local IS NULL
     → agrupa nombres de productos
     → llama Gemini Flash con lista de productos + banco de imágenes disponibles
     → Gemini devuelve: { "Coca-Cola 1.5L": "refresco_cola", "Entrecôte 200g": "ternera" }
     → UPDATE ofertas SET imagen_local = 'refresco_cola.png' WHERE nombre = ...
     → guarda log en gemini_runs

  App móvil (cualquier hora)
     → GET /api/ofertas.php → devuelve imagen_local ya asignada
     → usuario ve imagen correcta desde el primer momento, sin loading
```

---

## PROMPT GEMINI

```
Tienes una lista de productos de supermercado y un banco de imágenes genéricas disponibles.
Para cada producto, devuelve el slug de la imagen más adecuada del banco.
Si no hay imagen adecuada, devuelve null.

Banco de imágenes disponibles:
[lista dinámica de slugs + keywords del banco]

Productos a asignar:
[lista de nombres de productos de la DB]

Responde SOLO en JSON: { "nombre_producto": "slug_imagen" }
```

---

## PANEL ADMIN — PANTALLAS

### Dashboard (`/dashboard`)
- Total productos en DB
- Productos con imagen asignada vs sin imagen (%)
- Último run: fecha, cuántos asignados, errores
- Botón "Ejecutar ahora" (trigger manual)

### Productos (`/dashboard/productos`)
- Tabla paginada: nombre | tienda | categoría | imagen asignada | acciones
- Filtro por tienda (Transgourmet, Aligro, TopCC)
- Filtro "sin imagen"
- Click en imagen → modal `ImagePicker` para override manual

### Banco de imágenes (`/dashboard/imagenes`)
- Grid de todas las imágenes disponibles
- Añadir nueva imagen (upload + slug + keywords)
- Editar keywords (mejora la precisión de Gemini)
- Activar/desactivar imágenes del banco

### Logs (`/dashboard/logs`)
- Historial de runs: fecha | trigger | procesados | asignados | errores | duración

---

## BANCO DE IMÁGENES INICIAL (40 imágenes)

Ya generadas y recortadas en `assets/images/products/` de la app Offerto:

**Carnes:** rindfleisch, huhn, lachs, hackfleisch, fisch, garnelen, lamm, ganzes_huhn, raeucherlachs, schinken

**Lácteos:** milch, kaese, joghurt, butter, quark, mozzarella, tofu

**Verduras/Frutas:** tomate, salat, broccoli, spargel, blattsalat, erdbeeren, beeren, mandarinen

**Bebidas:** wasser, saft, wein, kaffee

**Panadería:** brot, bauernbrot

**Varios:** eier, pasta, pilze, oliven, essiggurken, tiefkuehlgemuese, lasagne, suppe, datteln, snacks

---

## COSTE ESTIMADO

| Concepto | Coste |
|---------|-------|
| Vercel (hobby plan) | Gratis |
| Gemini Flash (500 productos/semana) | ~$0.01/semana |
| MySQL (misma DB de la app) | $0 extra |
| **Total mensual** | **< $0.05** |

---

## IMPLEMENTACIÓN — ORDEN

- [ ] Crear proyecto Next.js 15: `npx create-next-app@latest offerto-admin`
- [ ] Configurar Tailwind + NextAuth
- [ ] Crear `lib/db.ts` (mysql2 connection pool)
- [ ] Crear tablas `imagen_banco` y `gemini_runs` en offerto_db
- [ ] Subir las 40 imágenes a `public/images/products/`
- [ ] Poblar tabla `imagen_banco` con los 40 slugs + keywords
- [ ] Crear `lib/gemini.ts` (cliente Gemini)
- [ ] API route `POST /api/assign-images` (lógica principal)
- [ ] Pantalla Dashboard
- [ ] Pantalla Productos con override manual
- [ ] Pantalla Banco de imágenes
- [ ] Pantalla Logs
- [ ] Configurar `vercel.json` con cron
- [ ] Deploy a Vercel + configurar env vars
- [ ] Test manual primer run
