-- =====================================================================
-- Patch 08 – RPC add_group_members()
--  Ajoute plusieurs membres à un groupe en toute sécurité.
-- =====================================================================

create or replace function public.add_group_members(
    p_group_id  uuid,
    p_user_ids  uuid[]
) returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
    added int := 0;
    uid   uuid;
begin
    -- 1) L’appelant doit déjà appartenir au groupe
    if not exists (
        select 1
        from public.group_members
        where group_id = p_group_id
          and user_id  = auth.uid()
    ) then
        raise exception 'You are not a member of this group';
    end if;

    -- 2) Insertion (ignore les doublons)
    foreach uid in array p_user_ids loop
        insert into public.group_members (group_id, user_id, role)
        values (p_group_id, uid, 'member')
        on conflict do nothing;

        if found then
            added := added + 1;
        end if;
    end loop;

    return added;
end;
$$;

grant execute on function public.add_group_members(uuid, uuid[]) to authenticated;
