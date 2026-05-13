-- 12_seed_config.sql
-- Configuración inicial parametrizable.

insert into public.app_config (key, value, description)
values
    ('prediction_deadline', '{"deadline_at":"2026-06-11T15:00:00-05:00"}'::jsonb, 'Fecha límite para editar predicciones.'),
    ('scoring_rules', '{
        "group_exact_score": 3,
        "group_result_score": 1,
        "group_position_exact": 1,
        "knockout_exact_score": 3,
        "knockout_winner_score": 1,
        "bracket_cross": 1,
        "advancement": 1,
        "champion_bonus": 3,
        "runner_up_bonus": 2
    }'::jsonb, 'Reglas de puntaje parametrizables.'),
    ('app_settings', '{"currency":"USD","ticket_price":5,"mock_fixture":true}'::jsonb, 'Configuraciones generales.')
on conflict (key) do update set value = excluded.value, description = excluded.description, updated_at = now();
