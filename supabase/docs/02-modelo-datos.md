# Modelo de datos

## Core

- `employees`: colaboradores cargados por TTHH.
- `profiles`: perfil vinculado a `auth.users` y a `employees`.
- `app_config`: deadline, reglas y parámetros.
- `admin_audit_log`: trazabilidad de acciones admin.

## Torneo

- `tournament_groups`: grupos.
- `teams`: selecciones.
- `matches`: partidos reales y slots futuros.
- `bracket_slots`: definición base de llaves.

## Predicciones

- `tickets`: participaciones compradas.
- `prediction_headers`: cabecera de predicción por ticket.
- `prediction_match_scores`: marcadores pronosticados.
- `predicted_group_standings`: tabla simulada por ticket.
- `predicted_bracket_slots`: avance simulado.
- `actual_group_standings`: tabla oficial calculada.
- `actual_bracket_slots`: llaves reales calculadas.
- `ticket_scores`: total agregado.
- `score_details`: detalle auditable de puntos.
