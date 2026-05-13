-- 13_seed_demo_worldcup.sql
-- Datos demo mínimos. No son fixture oficial. Reemplazar con fixture oficial validado.

insert into public.tournament_groups (code, name, sort_order) values
    ('A', 'Grupo A', 1),
    ('B', 'Grupo B', 2),
    ('C', 'Grupo C', 3)
on conflict (code) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.teams (fifa_code, name, group_code, flag_emoji, seed_order) values
    ('ARG', 'Argentina', 'A', '🇦🇷', 1),
    ('MEX', 'México', 'A', '🇲🇽', 2),
    ('ECU', 'Ecuador', 'A', '🇪🇨', 3),
    ('JPN', 'Japón', 'A', '🇯🇵', 4),
    ('BRA', 'Brasil', 'B', '🇧🇷', 1),
    ('GER', 'Alemania', 'B', '🇩🇪', 2),
    ('GHA', 'Ghana', 'B', '🇬🇭', 3),
    ('KOR', 'Corea del Sur', 'B', '🇰🇷', 4),
    ('FRA', 'Francia', 'C', '🇫🇷', 1),
    ('USA', 'Estados Unidos', 'C', '🇺🇸', 2),
    ('MAR', 'Marruecos', 'C', '🇲🇦', 3),
    ('AUS', 'Australia', 'C', '🇦🇺', 4)
on conflict (fifa_code) do update set name = excluded.name, group_code = excluded.group_code, flag_emoji = excluded.flag_emoji, seed_order = excluded.seed_order;

insert into public.matches (match_no, stage, group_code, home_team_id, away_team_id, match_datetime, venue, status)
select 1, 'GROUP', 'A', h.id, a.id, '2026-06-11 15:00:00-05'::timestamptz, 'Estadio Demo', 'scheduled'
from public.teams h, public.teams a where h.fifa_code='ARG' and a.fifa_code='MEX'
on conflict (match_no) do update set home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id;

insert into public.matches (match_no, stage, group_code, home_team_id, away_team_id, match_datetime, venue, status)
select 2, 'GROUP', 'A', h.id, a.id, '2026-06-12 15:00:00-05'::timestamptz, 'Estadio Demo', 'scheduled'
from public.teams h, public.teams a where h.fifa_code='ECU' and a.fifa_code='JPN'
on conflict (match_no) do update set home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id;

insert into public.matches (match_no, stage, group_code, home_team_id, away_team_id, match_datetime, venue, status)
select 3, 'GROUP', 'B', h.id, a.id, '2026-06-13 15:00:00-05'::timestamptz, 'Estadio Demo', 'scheduled'
from public.teams h, public.teams a where h.fifa_code='BRA' and a.fifa_code='GER'
on conflict (match_no) do update set home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id;

insert into public.matches (match_no, stage, group_code, home_team_id, away_team_id, match_datetime, venue, status)
select 4, 'GROUP', 'B', h.id, a.id, '2026-06-14 15:00:00-05'::timestamptz, 'Estadio Demo', 'scheduled'
from public.teams h, public.teams a where h.fifa_code='GHA' and a.fifa_code='KOR'
on conflict (match_no) do update set home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id;

insert into public.matches (match_no, stage, group_code, home_team_id, away_team_id, match_datetime, venue, status)
select 5, 'GROUP', 'C', h.id, a.id, '2026-06-15 15:00:00-05'::timestamptz, 'Estadio Demo', 'scheduled'
from public.teams h, public.teams a where h.fifa_code='FRA' and a.fifa_code='USA'
on conflict (match_no) do update set home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id;

insert into public.matches (match_no, stage, group_code, home_team_id, away_team_id, match_datetime, venue, status)
select 6, 'GROUP', 'C', h.id, a.id, '2026-06-16 15:00:00-05'::timestamptz, 'Estadio Demo', 'scheduled'
from public.teams h, public.teams a where h.fifa_code='MAR' and a.fifa_code='AUS'
on conflict (match_no) do update set home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id;

-- Slots demo de eliminatoria. Ajustar cuando se cargue la matriz oficial.
insert into public.matches (match_no, stage, home_slot, away_slot, match_datetime, venue, status) values
    (101, 'R32', '1A', '2B', '2026-06-28 15:00:00-05', 'Estadio Demo', 'scheduled'),
    (102, 'R32', '1B', '2A', '2026-06-29 15:00:00-05', 'Estadio Demo', 'scheduled')
on conflict (match_no) do update set home_slot = excluded.home_slot, away_slot = excluded.away_slot;
