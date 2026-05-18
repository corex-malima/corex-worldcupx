-- 22_fix_third_place_admin_edit.sql
-- Bug: save_prediction_third_place_assignment (file 16) hardcodea que el
-- ticket debe estar reclamado:
--
--   select claimed_by_user_id into v_owner_user from public.tickets ...
--   if v_owner_user is null then raise exception 'El ticket no está reclamado.';
--
-- Eso rompe la semántica del file 19 (admin TTHH puede editar tickets SOLD
-- no reclamados). Resultado en UI: "Error al guardar" cuando admin asigna
-- mejores terceros para un colaborador que no se registró.
--
-- Fix: alinear con save_prediction_match_score → coalesce(claimed_by, auth.uid()).
-- Cuando el colaborador después haga claim, claim_ticket transfiere ownership.
-- Idempotente.

create or replace function public.save_prediction_third_place_assignment(
    p_ticket_id uuid,
    p_slot_match_id uuid,
    p_team_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_ticket public.tickets%rowtype;
    v_owner_user uuid;
    v_prediction_id uuid;
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;
    if not public.can_edit_prediction(p_ticket_id) then
        raise exception 'Sin permisos para editar esta predicción.';
    end if;

    select * into v_ticket from public.tickets where id = p_ticket_id for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;

    -- Owner del header: el colaborador si ya reclamó; si no, el admin que
    -- está cargando (cuando el colaborador reclame, claim_ticket transfiere).
    v_owner_user := coalesce(v_ticket.claimed_by_user_id, v_user);

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (p_ticket_id, v_owner_user, 'in_progress')
    on conflict (ticket_id) do update set
        status = case when public.prediction_headers.status = 'pending' then 'in_progress' else public.prediction_headers.status end,
        updated_at = now()
    returning id into v_prediction_id;

    insert into public.prediction_third_place_assignments (prediction_id, slot_match_id, team_id)
    values (v_prediction_id, p_slot_match_id, p_team_id)
    on conflict (prediction_id, slot_match_id) do update set team_id = excluded.team_id;

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id);
end;
$$;
grant execute on function public.save_prediction_third_place_assignment(uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
