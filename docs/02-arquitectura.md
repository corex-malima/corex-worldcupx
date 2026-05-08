# Arquitectura frontend

El frontend está separado en:

- `lib`: cliente Supabase, auth, scoring, torneo y formatos.
- `hooks`: carga de tickets, ranking, predicción y sesión.
- `components`: UI, tickets, predicción, bracket, ranking y admin.
- `pages`: pantallas completas.
- `data/mock`: datos demo para trabajar sin Supabase.

## Modo mock

`src/lib/constants.ts` activa `USE_MOCKS` cuando faltan variables de Supabase. Esto evita bloquear el diseño y permite que Codex continúe iterando UI sin backend.

## Enrutamiento

Se usa hash routing simple para GitHub Pages y evitar dependencias adicionales. Rutas principales:

- `#/login`
- `#/register`
- `#/dashboard`
- `#/prediction/:ticketId`
- `#/ranking`
- `#/admin`
- `#/admin/sales`
- `#/admin/tickets`
- `#/admin/results`
