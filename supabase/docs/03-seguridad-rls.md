# Seguridad RLS

## Principios

- Los usuarios solo leen sus tickets reclamados.
- TTHH/Admin lee lo operativo mediante policies y RPCs con rol.
- La venta, reclamo, anulación y scoring se ejecutan por RPC.
- Las tablas de torneo son lectura para autenticados.
- El ranking no expone cédulas completas ni códigos completos.

## Registro con ticket

`employees` no debe abrir lectura pública completa. El registro de colaborador usa:

- `validate_registration_ticket(p_cedula, p_ticket_code)` antes de autenticar, con respuesta genérica si el par no coincide.
- `complete_registration_with_ticket(p_cedula, p_ticket_code)` después de `signUp`, con `auth.uid()`, bloqueo `for update`, creación de perfil, reclamo de ticket y creación de `prediction_headers`.

## SECURITY DEFINER

Se usa solo en funciones que necesitan operar con permisos elevados y siempre con:

```sql
set search_path = public;
```

Cada función valida `auth.uid()` y rol cuando corresponde.
