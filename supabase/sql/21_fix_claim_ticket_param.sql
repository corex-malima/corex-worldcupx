-- 21_fix_claim_ticket_param.sql
-- Bug: el frontend llama supabase.rpc('claim_ticket', { p_code }) pero el
-- file 19 dejó la función con parámetro 'p_ticket_code'. PostgREST hace
-- match por nombre de parámetro, así que tira:
--   "Could not find the function public.claim_ticket(p_code) in the schema cache"
--
-- Fix: recrear la función con el nombre p_code (alinear con el cliente).
-- Idempotente.

drop function if exists public.claim_ticket(text) cascade;

create or replace function public.claim_ticket(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_ticket public.tickets%rowtype;
    v_profile_cedula text;
    v_clean_code text;
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;

    -- Bloqueo post-deadline (file 20)
    if public.is_deadline_passed() then
        raise exception 'La fecha límite para reclamar tickets ya pasó.';
    end if;

    v_clean_code := trim(coalesce(p_code, ''));
    if v_clean_code = '' then raise exception 'Código vacío.'; end if;

    select cedula into v_profile_cedula from public.profiles where user_id = v_user;
    if v_profile_cedula is null then raise exception 'Perfil no encontrado.'; end if;

    select * into v_ticket from public.tickets
    where upper(code) = upper(v_clean_code) for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;
    if v_ticket.status = 'cancelled' then raise exception 'Ticket anulado.'; end if;
    if v_ticket.status = 'claimed' or v_ticket.claimed_by_user_id is not null then
        raise exception 'El ticket ya fue reclamado.';
    end if;
    if regexp_replace(v_ticket.cedula, '\D', '', 'g') <> regexp_replace(v_profile_cedula, '\D', '', 'g') then
        raise exception 'Este ticket no está asociado a tu cédula.';
    end if;

    update public.tickets
    set status = 'claimed',
        claimed_by_user_id = v_user,
        claimed_at = now(),
        updated_at = now()
    where id = v_ticket.id;

    -- Transferir prediction header al colaborador si admin ya había cargado
    update public.prediction_headers
    set user_id = v_user, updated_at = now()
    where ticket_id = v_ticket.id;

    return jsonb_build_object('ok', true, 'ticket_id', v_ticket.id);
end;
$$;

grant execute on function public.claim_ticket(text) to authenticated;

-- Forzar refresh del schema cache de PostgREST
notify pgrst, 'reload schema';
