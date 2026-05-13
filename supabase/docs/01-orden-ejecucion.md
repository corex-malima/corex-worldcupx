# Orden de ejecución

Ejecutar los SQL exactamente en el orden indicado en `/supabase/README.md`.

## Recomendación

Después de cada archivo, verificar que no existan errores. No ejecutar seeds antes de crear constraints, RLS y funciones.

## Reset desarrollo

`99_reset_dev.sql` elimina tablas, vistas y funciones. No usar en producción.
