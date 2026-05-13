# Carga de colaboradores

Usar `csv_templates/employees_template.csv`.

Columnas:

```csv
cedula,person_id,person_name,area_id,cost_area,job_title,is_active
```

## Reglas

- `cedula` única.
- `is_active = true` para permitir registro.
- No cargar contraseñas en CSV.
- El usuario crea contraseña en Supabase Auth desde la app.
