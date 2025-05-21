-- =====================================================================
-- Patch 05 – Contacts réciproques
-- Crée automatiquement (B, A) après l’insertion de (A, B)
-- =====================================================================

create or replace function public.ensure_reciprocal_contact()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
    if not exists (
        select 1
        from public.contacts
        where user_id    = new.contact_id
          and contact_id = new.user_id
    ) then
        insert into public.contacts(user_id, contact_id)
        values (new.contact_id, new.user_id);
    end if;
    return new;
end;
$$;

-- Idempotent : on (re)crée proprement le trigger
drop trigger if exists tg_contacts_reciprocal on public.contacts;

create trigger tg_contacts_reciprocal
after insert on public.contacts
for each row
execute procedure public.ensure_reciprocal_contact();
