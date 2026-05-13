# Plan Supabase

El frontend solo debe usar:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Nunca usar `service_role` en frontend.

## Tablas base

- `employees`
- `profiles`
- `tickets`
- `prediction_headers`
- `prediction_match_scores`
- `predicted_group_standings`
- `predicted_bracket_slots`
- `actual_group_standings`
- `actual_bracket_slots`
- `score_details`
- `ticket_scores`
- `app_config`

## RPCs principales

- `validate_registration_ticket(p_cedula, p_ticket_code)`
- `complete_registration_with_ticket(p_cedula, p_ticket_code)`
- `resolve_auth_email_by_cedula(p_cedula)`
- `validate_active_employee(p_cedula)`
- `sell_ticket(p_cedula, p_purchase_amount)`
- `claim_ticket(p_code)`
- `cancel_ticket(p_ticket_id, p_reason)`
- `save_prediction_match_score(...)`
- `submit_prediction(...)`
- `save_actual_result(...)`
- `build_actual_bracket(...)`
- `recalculate_all_scores()`

## Seguridad

- Ranking público no muestra cédula completa.
- Código completo de ticket solo lo ve dueño o admin.
- Registro inicial exige cédula + ticket vendido válido.
- Resultados reales solo los guarda `admin_tthh` o `super_admin`.
- Validaciones críticas viven en PostgreSQL/RLS/RPC, no solo en UI.
