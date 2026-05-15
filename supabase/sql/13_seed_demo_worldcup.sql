-- 13_seed_demo_worldcup.sql
-- Fixture base Mundial 2026: 12 grupos (A-L), 48 selecciones, 104 partidos.
-- Los equipos son una semilla razonable. Reemplazar con clasificados oficiales cuando estén disponibles.
-- Las sedes y horarios son aproximados. Ajustar con datos oficiales cuando la FIFA los publique.

-- Grupos
insert into public.tournament_groups (code, name, sort_order) values
    ('A', 'Grupo A', 1),
    ('B', 'Grupo B', 2),
    ('C', 'Grupo C', 3),
    ('D', 'Grupo D', 4),
    ('E', 'Grupo E', 5),
    ('F', 'Grupo F', 6),
    ('G', 'Grupo G', 7),
    ('H', 'Grupo H', 8),
    ('I', 'Grupo I', 9),
    ('J', 'Grupo J', 10),
    ('K', 'Grupo K', 11),
    ('L', 'Grupo L', 12)
on conflict (code) do update set name = excluded.name, sort_order = excluded.sort_order;

-- 48 selecciones (4 por grupo). seed_order 1..4 dentro del grupo (FIFA: cabeza, bombo 2, 3, 4).
insert into public.teams (fifa_code, name, group_code, flag_emoji, seed_order) values
    ('MEX', 'México', 'A', '🇲🇽', 1),
    ('RSA', 'Sudáfrica', 'A', '🇿🇦', 2),
    ('KOR', 'República de Corea', 'A', '🇰🇷', 3),
    ('CZE', 'República Checa', 'A', '🇨🇿', 4),
    ('CAN', 'Canadá', 'B', '🇨🇦', 1),
    ('BIH', 'Bosnia y Herzegovina', 'B', '🇧🇦', 2),
    ('QAT', 'Catar', 'B', '🇶🇦', 3),
    ('SUI', 'Suiza', 'B', '🇨🇭', 4),
    ('BRA', 'Brasil', 'C', '🇧🇷', 1),
    ('MAR', 'Marruecos', 'C', '🇲🇦', 2),
    ('HAI', 'Haití', 'C', '🇭🇹', 3),
    ('SCO', 'Escocia', 'C', '🏴', 4),
    ('USA', 'Estados Unidos', 'D', '🇺🇸', 1),
    ('PAR', 'Paraguay', 'D', '🇵🇾', 2),
    ('AUS', 'Australia', 'D', '🇦🇺', 3),
    ('TUR', 'Turquía', 'D', '🇹🇷', 4),
    ('GER', 'Alemania', 'E', '🇩🇪', 1),
    ('CUW', 'Curazao', 'E', '🇨🇼', 2),
    ('CIV', 'Costa de Marfil', 'E', '🇨🇮', 3),
    ('ECU', 'Ecuador', 'E', '🇪🇨', 4),
    ('NED', 'Países Bajos', 'F', '🇳🇱', 1),
    ('JPN', 'Japón', 'F', '🇯🇵', 2),
    ('SWE', 'Suecia', 'F', '🇸🇪', 3),
    ('TUN', 'Túnez', 'F', '🇹🇳', 4),
    ('BEL', 'Bélgica', 'G', '🇧🇪', 1),
    ('EGY', 'Egipto', 'G', '🇪🇬', 2),
    ('IRN', 'RI de Irán', 'G', '🇮🇷', 3),
    ('NZL', 'Nueva Zelanda', 'G', '🇳🇿', 4),
    ('ESP', 'España', 'H', '🇪🇸', 1),
    ('CPV', 'Cabo Verde', 'H', '🇨🇻', 2),
    ('KSA', 'Arabia Saudí', 'H', '🇸🇦', 3),
    ('URU', 'Uruguay', 'H', '🇺🇾', 4),
    ('FRA', 'Francia', 'I', '🇫🇷', 1),
    ('SEN', 'Senegal', 'I', '🇸🇳', 2),
    ('IRQ', 'Irak', 'I', '🇮🇶', 3),
    ('NOR', 'Noruega', 'I', '🇳🇴', 4),
    ('ARG', 'Argentina', 'J', '🇦🇷', 1),
    ('ALG', 'Argelia', 'J', '🇩🇿', 2),
    ('AUT', 'Austria', 'J', '🇦🇹', 3),
    ('JOR', 'Jordania', 'J', '🇯🇴', 4),
    ('POR', 'Portugal', 'K', '🇵🇹', 1),
    ('COD', 'RD del Congo', 'K', '🇨🇩', 2),
    ('UZB', 'Uzbekistán', 'K', '🇺🇿', 3),
    ('COL', 'Colombia', 'K', '🇨🇴', 4),
    ('ENG', 'Inglaterra', 'L', '🏴', 1),
    ('CRO', 'Croacia', 'L', '🇭🇷', 2),
    ('GHA', 'Ghana', 'L', '🇬🇭', 3),
    ('PAN', 'Panamá', 'L', '🇵🇦', 4)
on conflict (fifa_code) do update set name = excluded.name, group_code = excluded.group_code, flag_emoji = excluded.flag_emoji, seed_order = excluded.seed_order;

-- Helper temporal: tabla de partidos de grupo (match_no, group, home_code, away_code, datetime, venue).
-- Insertamos uno a uno usando subselects para resolver UUID por fifa_code y conservar idempotencia.
do $$
declare
    v_fixtures jsonb := $fixt$
    [
      [1,  "A", "MEX", "RSA", "2026-06-11T15:00:00-05:00", "Estadio Ciudad de México"],
      [2,  "A", "KOR", "CZE", "2026-06-11T22:00:00-05:00", "Estadio Guadalajara"],
      [3,  "B", "CAN", "BIH", "2026-06-12T15:00:00-05:00", "Estadio Toronto"],
      [4,  "D", "USA", "PAR", "2026-06-12T21:00:00-05:00", "Estadio Los Ángeles"],
      [5,  "B", "QAT", "SUI", "2026-06-13T15:00:00-05:00", "Estadio Bahía de San Francisco"],
      [6,  "C", "BRA", "MAR", "2026-06-13T18:00:00-05:00", "Estadio Nueva York Nueva Jersey"],
      [7,  "C", "HAI", "SCO", "2026-06-13T21:00:00-05:00", "Estadio Boston"],
      [8,  "D", "AUS", "TUR", "2026-06-14T00:00:00-05:00", "Estadio BC Place Vancouver"],
      [9,  "E", "GER", "CUW", "2026-06-14T13:00:00-05:00", "Estadio Houston"],
      [10, "F", "NED", "JPN", "2026-06-14T16:00:00-05:00", "Estadio Dallas"],
      [11, "E", "CIV", "ECU", "2026-06-14T19:00:00-05:00", "Estadio Filadelfia"],
      [12, "F", "SWE", "TUN", "2026-06-14T22:00:00-05:00", "Estadio Monterrey"],
      [13, "H", "ESP", "CPV", "2026-06-15T12:00:00-05:00", "Estadio Atlanta"],
      [14, "G", "BEL", "EGY", "2026-06-15T15:00:00-05:00", "Estadio Seattle"],
      [15, "H", "KSA", "URU", "2026-06-15T18:00:00-05:00", "Estadio Miami"],
      [16, "G", "IRN", "NZL", "2026-06-15T21:00:00-05:00", "Estadio Los Ángeles"],
      [17, "I", "FRA", "SEN", "2026-06-16T15:00:00-05:00", "Estadio Nueva York Nueva Jersey"],
      [18, "I", "IRQ", "NOR", "2026-06-16T18:00:00-05:00", "Estadio Boston"],
      [19, "J", "ARG", "ALG", "2026-06-16T21:00:00-05:00", "Estadio Kansas City"],
      [20, "J", "AUT", "JOR", "2026-06-17T00:00:00-05:00", "Estadio Bahía de San Francisco"],
      [21, "K", "POR", "COD", "2026-06-17T13:00:00-05:00", "Estadio Houston"],
      [22, "L", "ENG", "CRO", "2026-06-17T16:00:00-05:00", "Estadio Dallas"],
      [23, "L", "GHA", "PAN", "2026-06-17T19:00:00-05:00", "Estadio Toronto"],
      [24, "K", "UZB", "COL", "2026-06-17T22:00:00-05:00", "Estadio Ciudad de México"],
      [25, "A", "CZE", "RSA", "2026-06-18T12:00:00-05:00", "Estadio Atlanta"],
      [26, "B", "SUI", "BIH", "2026-06-18T15:00:00-05:00", "Estadio Los Ángeles"],
      [27, "B", "CAN", "QAT", "2026-06-18T18:00:00-05:00", "Estadio BC Place Vancouver"],
      [28, "A", "MEX", "KOR", "2026-06-18T21:00:00-05:00", "Estadio Guadalajara"],
      [29, "D", "USA", "AUS", "2026-06-19T15:00:00-05:00", "Estadio Seattle"],
      [30, "C", "SCO", "MAR", "2026-06-19T18:00:00-05:00", "Estadio Boston"],
      [31, "C", "BRA", "HAI", "2026-06-19T21:00:00-05:00", "Estadio Filadelfia"],
      [32, "D", "TUR", "PAR", "2026-06-20T00:00:00-05:00", "Estadio Bahía de San Francisco"],
      [33, "F", "NED", "SWE", "2026-06-20T13:00:00-05:00", "Estadio Houston"],
      [34, "E", "GER", "CIV", "2026-06-20T16:00:00-05:00", "Estadio Toronto"],
      [35, "E", "ECU", "CUW", "2026-06-20T22:00:00-05:00", "Estadio Kansas City"],
      [36, "F", "TUN", "JPN", "2026-06-21T00:00:00-05:00", "Estadio Monterrey"],
      [37, "H", "ESP", "KSA", "2026-06-21T12:00:00-05:00", "Estadio Atlanta"],
      [38, "G", "BEL", "IRN", "2026-06-21T15:00:00-05:00", "Estadio Los Ángeles"],
      [39, "H", "URU", "CPV", "2026-06-21T18:00:00-05:00", "Estadio Miami"],
      [40, "G", "NZL", "EGY", "2026-06-21T21:00:00-05:00", "Estadio BC Place Vancouver"],
      [41, "J", "ARG", "AUT", "2026-06-22T13:00:00-05:00", "Estadio Dallas"],
      [42, "I", "FRA", "IRQ", "2026-06-22T17:00:00-05:00", "Estadio Filadelfia"],
      [43, "I", "NOR", "SEN", "2026-06-22T20:00:00-05:00", "Estadio Nueva York Nueva Jersey"],
      [44, "J", "JOR", "ALG", "2026-06-22T23:00:00-05:00", "Estadio Bahía de San Francisco"],
      [45, "K", "POR", "UZB", "2026-06-23T13:00:00-05:00", "Estadio Houston"],
      [46, "L", "ENG", "GHA", "2026-06-23T16:00:00-05:00", "Estadio Boston"],
      [47, "L", "PAN", "CRO", "2026-06-23T19:00:00-05:00", "Estadio Toronto"],
      [48, "K", "COL", "COD", "2026-06-23T22:00:00-05:00", "Estadio Guadalajara"],
      [49, "B", "SUI", "CAN", "2026-06-24T15:00:00-05:00", "Estadio BC Place Vancouver"],
      [50, "B", "BIH", "QAT", "2026-06-24T15:00:00-05:00", "Estadio Seattle"],
      [51, "C", "SCO", "BRA", "2026-06-24T18:00:00-05:00", "Estadio Miami"],
      [52, "C", "MAR", "HAI", "2026-06-24T18:00:00-05:00", "Estadio Atlanta"],
      [53, "A", "CZE", "MEX", "2026-06-24T21:00:00-05:00", "Estadio Ciudad de México"],
      [54, "A", "RSA", "KOR", "2026-06-24T21:00:00-05:00", "Estadio Monterrey"],
      [55, "E", "CUW", "CIV", "2026-06-25T16:00:00-05:00", "Estadio Filadelfia"],
      [56, "E", "ECU", "GER", "2026-06-25T16:00:00-05:00", "Estadio Nueva York Nueva Jersey"],
      [57, "F", "JPN", "SWE", "2026-06-25T19:00:00-05:00", "Estadio Dallas"],
      [58, "F", "TUN", "NED", "2026-06-25T19:00:00-05:00", "Estadio Kansas City"],
      [59, "D", "TUR", "USA", "2026-06-25T22:00:00-05:00", "Estadio Los Ángeles"],
      [60, "D", "PAR", "AUS", "2026-06-25T22:00:00-05:00", "Estadio Bahía de San Francisco"],
      [61, "I", "NOR", "FRA", "2026-06-26T15:00:00-05:00", "Estadio Boston"],
      [62, "I", "SEN", "IRQ", "2026-06-26T15:00:00-05:00", "Estadio Toronto"],
      [63, "H", "CPV", "KSA", "2026-06-26T20:00:00-05:00", "Estadio Houston"],
      [64, "H", "URU", "ESP", "2026-06-26T20:00:00-05:00", "Estadio Guadalajara"],
      [65, "G", "EGY", "IRN", "2026-06-26T23:00:00-05:00", "Estadio Seattle"],
      [66, "G", "NZL", "BEL", "2026-06-26T23:00:00-05:00", "Estadio BC Place Vancouver"],
      [67, "L", "PAN", "ENG", "2026-06-27T17:00:00-05:00", "Estadio Nueva York Nueva Jersey"],
      [68, "L", "CRO", "GHA", "2026-06-27T17:00:00-05:00", "Estadio Filadelfia"],
      [69, "K", "COL", "POR", "2026-06-27T19:30:00-05:00", "Estadio Miami"],
      [70, "K", "COD", "UZB", "2026-06-27T19:30:00-05:00", "Estadio Atlanta"],
      [71, "J", "ALG", "AUT", "2026-06-27T22:00:00-05:00", "Estadio Kansas City"],
      [72, "J", "JOR", "ARG", "2026-06-27T22:00:00-05:00", "Estadio Dallas"]
    ]
    $fixt$;
    v_row jsonb;
    v_match_no int;
    v_group text;
    v_home_code text;
    v_away_code text;
    v_dt timestamptz;
    v_venue text;
    v_home_id uuid;
    v_away_id uuid;
begin
    for v_row in select * from jsonb_array_elements(v_fixtures) loop
        v_match_no := (v_row->>0)::int;
        v_group := v_row->>1;
        v_home_code := v_row->>2;
        v_away_code := v_row->>3;
        v_dt := (v_row->>4)::timestamptz;
        v_venue := v_row->>5;

        select id into v_home_id from public.teams where fifa_code = v_home_code;
        select id into v_away_id from public.teams where fifa_code = v_away_code;

        insert into public.matches (match_no, stage, group_code, home_team_id, away_team_id, match_datetime, venue, status)
        values (v_match_no, 'GROUP', v_group, v_home_id, v_away_id, v_dt, v_venue, 'scheduled')
        on conflict (match_no) do update set
            stage = excluded.stage,
            group_code = excluded.group_code,
            home_team_id = excluded.home_team_id,
            away_team_id = excluded.away_team_id,
            match_datetime = excluded.match_datetime,
            venue = excluded.venue,
            updated_at = now();
    end loop;
end $$;

-- Partidos de eliminatorias (R32..Final). home_slot/away_slot describen el origen del equipo;
-- los equipos concretos se resuelven más adelante en build_actual_bracket y en el submit del jugador.
do $$
declare
    v_kos jsonb := $kos$
    [
      [73,  "R32",         "2A",                  "2B",                  "2026-06-28T15:00:00-05:00", "Estadio Los Ángeles"],
      [74,  "R32",         "1E",                  "3A/B/C/D/F",          "2026-06-29T15:00:00-05:00", "Estadio Boston"],
      [75,  "R32",         "1F",                  "2C",                  "2026-06-29T15:00:00-05:00", "Estadio Monterrey"],
      [76,  "R32",         "1C",                  "2F",                  "2026-06-29T18:00:00-05:00", "Estadio Houston"],
      [77,  "R32",         "1I",                  "3C/D/F/G/H",          "2026-06-30T15:00:00-05:00", "Estadio Nueva York Nueva Jersey"],
      [78,  "R32",         "2E",                  "2I",                  "2026-06-30T15:00:00-05:00", "Estadio Dallas"],
      [79,  "R32",         "1A",                  "3C/E/F/H/I",          "2026-06-30T18:00:00-05:00", "Estadio Ciudad de México"],
      [80,  "R32",         "1L",                  "3E/H/I/J/K",          "2026-07-01T15:00:00-05:00", "Estadio Atlanta"],
      [81,  "R32",         "1D",                  "3B/E/F/I/J",          "2026-07-01T15:00:00-05:00", "Estadio Bahía de San Francisco"],
      [82,  "R32",         "1G",                  "3A/E/H/I/J",          "2026-07-01T18:00:00-05:00", "Estadio Seattle"],
      [83,  "R32",         "2K",                  "2L",                  "2026-07-02T15:00:00-05:00", "Estadio Toronto"],
      [84,  "R32",         "1H",                  "2J",                  "2026-07-02T15:00:00-05:00", "Estadio Los Ángeles"],
      [85,  "R32",         "1B",                  "3E/F/G/I/J",          "2026-07-02T18:00:00-05:00", "Estadio BC Place Vancouver"],
      [86,  "R32",         "1J",                  "2H",                  "2026-07-03T15:00:00-05:00", "Estadio Miami"],
      [87,  "R32",         "1K",                  "3D/E/I/J/L",          "2026-07-03T15:00:00-05:00", "Estadio Kansas City"],
      [88,  "R32",         "2D",                  "2G",                  "2026-07-03T18:00:00-05:00", "Estadio Dallas"],
      [89,  "R16",         "Ganador Partido 74",  "Ganador Partido 77",  "2026-07-04T15:00:00-05:00", "Estadio Filadelfia"],
      [90,  "R16",         "Ganador Partido 73",  "Ganador Partido 75",  "2026-07-04T15:00:00-05:00", "Estadio Houston"],
      [91,  "R16",         "Ganador Partido 76",  "Ganador Partido 78",  "2026-07-05T15:00:00-05:00", "Estadio Nueva York Nueva Jersey"],
      [92,  "R16",         "Ganador Partido 79",  "Ganador Partido 80",  "2026-07-05T15:00:00-05:00", "Estadio Ciudad de México"],
      [93,  "R16",         "Ganador Partido 83",  "Ganador Partido 84",  "2026-07-06T15:00:00-05:00", "Estadio Dallas"],
      [94,  "R16",         "Ganador Partido 81",  "Ganador Partido 82",  "2026-07-06T15:00:00-05:00", "Estadio Seattle"],
      [95,  "R16",         "Ganador Partido 86",  "Ganador Partido 88",  "2026-07-07T15:00:00-05:00", "Estadio Atlanta"],
      [96,  "R16",         "Ganador Partido 85",  "Ganador Partido 87",  "2026-07-07T15:00:00-05:00", "Estadio BC Place Vancouver"],
      [97,  "QF",          "Ganador Partido 89",  "Ganador Partido 90",  "2026-07-09T15:00:00-05:00", "Estadio Boston"],
      [98,  "QF",          "Ganador Partido 93",  "Ganador Partido 94",  "2026-07-10T15:00:00-05:00", "Estadio Los Ángeles"],
      [99,  "QF",          "Ganador Partido 91",  "Ganador Partido 92",  "2026-07-11T15:00:00-05:00", "Estadio Miami"],
      [100, "QF",          "Ganador Partido 95",  "Ganador Partido 96",  "2026-07-11T15:00:00-05:00", "Estadio Kansas City"],
      [101, "SF",          "Ganador Partido 97",  "Ganador Partido 98",  "2026-07-14T15:00:00-05:00", "Estadio Dallas"],
      [102, "SF",          "Ganador Partido 99",  "Ganador Partido 100", "2026-07-15T15:00:00-05:00", "Estadio Atlanta"],
      [103, "THIRD_PLACE", "Perdedor Partido 101","Perdedor Partido 102","2026-07-18T15:00:00-05:00", "Estadio Miami"],
      [104, "FINAL",       "Ganador Partido 101", "Ganador Partido 102", "2026-07-19T15:00:00-05:00", "Estadio Nueva York Nueva Jersey"]
    ]
    $kos$;
    v_row jsonb;
    v_match_no int;
    v_stage text;
    v_home_slot text;
    v_away_slot text;
    v_dt timestamptz;
    v_venue text;
begin
    for v_row in select * from jsonb_array_elements(v_kos) loop
        v_match_no := (v_row->>0)::int;
        v_stage := v_row->>1;
        v_home_slot := v_row->>2;
        v_away_slot := v_row->>3;
        v_dt := (v_row->>4)::timestamptz;
        v_venue := v_row->>5;

        insert into public.matches (match_no, stage, home_slot, away_slot, match_datetime, venue, status)
        values (v_match_no, v_stage, v_home_slot, v_away_slot, v_dt, v_venue, 'scheduled')
        on conflict (match_no) do update set
            stage = excluded.stage,
            home_slot = excluded.home_slot,
            away_slot = excluded.away_slot,
            match_datetime = excluded.match_datetime,
            venue = excluded.venue,
            -- Limpia el lado oficial si se reimporta el fixture (status no oficial todavía).
            home_team_id = case when public.matches.status = 'official' then public.matches.home_team_id else null end,
            away_team_id = case when public.matches.status = 'official' then public.matches.away_team_id else null end,
            updated_at = now();
    end loop;
end $$;

-- Catálogo de cruces: para cada partido R32 con tercero, define los grupos elegibles.
-- Esto es la matriz FIFA de mejores terceros para R32.
create table if not exists public.r32_third_place_rules (
    match_no int primary key,
    allowed_groups text[] not null
);

alter table public.r32_third_place_rules enable row level security;
drop policy if exists r32_rules_authenticated_select on public.r32_third_place_rules;
create policy r32_rules_authenticated_select on public.r32_third_place_rules for select using (auth.uid() is not null);

insert into public.r32_third_place_rules (match_no, allowed_groups) values
    (74, array['A','B','C','D','F']),
    (77, array['C','D','F','G','H']),
    (79, array['C','E','F','H','I']),
    (80, array['E','H','I','J','K']),
    (81, array['B','E','F','I','J']),
    (82, array['A','E','H','I','J']),
    (85, array['E','F','G','I','J']),
    (87, array['D','E','I','J','L'])
on conflict (match_no) do update set allowed_groups = excluded.allowed_groups;
