# WorldCupX · Polla Mundialista

> Producto **WorldCupX** · plataforma **CoreX** · _by P&P_ · **Malima**

Aplicación interna para gestionar la polla mundialista empresarial con dos experiencias: colaborador y TTHH/Admin. Diseño sobre la familia visual CoreX (paleta Loriva rosa `#fb6f92` sobre light mode, símbolo orbital).

**Producción**: [https://corex-malima.github.io/corex-worldcupx/](https://corex-malima.github.io/corex-worldcupx/)

## Stack

- Vite + React + TypeScript
- TailwindCSS (light mode, paleta Loriva)
- lucide-react
- @react-pdf/renderer (lazy chunk para PDFs)
- Supabase Auth, Postgres, RLS y RPC
- Hosting: GitHub Pages con custom domain (`public/CNAME`)

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Copiar variables de entorno:

```bash
cp .env.example .env
```

Configurar:

```bash
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

El frontend nunca debe usar `service_role`. Esa clave solo se usa en entornos backend seguros y no pertenece a este repositorio.

## Modo mock

Si `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY` están vacías, la app entra en modo mock. Esto permite revisar la UI, tickets, predicciones, ranking y panel admin sin conectar Supabase.

## Build

```bash
npm run build
```

Para revisar el build local:

```bash
npm run preview
```

## Deploy en GitHub Pages

Este proyecto usa `base: '/worldcupx/'` en `vite.config.ts` para publicarse como GitHub Pages de proyecto.

El despliegue está configurado con GitHub Actions en `.github/workflows/deploy.yml`. En cada `push` a `main`, el workflow:

1. Instala Node 20.
2. Instala dependencias con `npm ci`.
3. Ejecuta el build.
4. Publica `dist/` en GitHub Pages.

En GitHub, activar Pages con:

```text
Settings -> Pages -> Build and deployment -> Source: GitHub Actions
```

Si el repositorio cambia de nombre, ajustar `base` en `vite.config.ts` a `/<NOMBRE_REPO>/`. Si se usa dominio custom o despliegue en raíz, cambiar `base` a `/`.

Build local:

```bash
npm run build
```

## Conexión con Supabase

1. Crear proyecto en Supabase.
2. Configurar las variables públicas en `.env` local:

```bash
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

3. Ejecutar los SQL de Supabase desde `supabase/sql` en el orden indicado por `supabase/README.md`.
4. Cargar colaboradores desde la plantilla CSV del proyecto si existe.
5. Cargar o ajustar equipos y fixture.
6. Crear usuarios colaboradores desde la pantalla de registro.
7. Crear roles admin en tabla `profiles` manualmente o por SQL controlado.

## Seguridad aplicada desde el frontend

- Login visual con cédula. Supabase Auth usa internamente un email técnico generado como `<cedula>.<apellido>@mundial.malima`.
- El registro exige cédula + código de ticket vendido por TTHH; el ticket se reclama durante el registro.
- Solo variables públicas de Supabase en `.env`.
- No usar ni subir `service_role`, `SUPABASE_SERVICE_ROLE`, `VITE_SUPABASE_SERVICE_ROLE` ni variantes equivalentes en frontend.
- Venta, reclamo, cancelación, resultados y scoring pasan por RPC.
- La UI oculta cédulas completas y códigos completos ajenos.
- El bloqueo por fecha límite se calcula en UI para experiencia, pero la validación crítica está en PostgreSQL.

## Scripts

```bash
npm run dev       # desarrollo
npm run build     # typecheck + build
npm run preview   # revisar build local
npm run typecheck # TypeScript sin emitir archivos
```
