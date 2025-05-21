-- =====================================================================
-- Patch 07 – Back-fill des profils manquants + FK group_members → profiles
-- =====================================================================

-- 1) Crée un profil minimal pour chaque user_id présent dans group_members
--    mais absent de profiles. On récupère l'email depuis auth.users.
insert into public.profiles (id, email)
select u.id, u.email
from auth.users       u
join public.group_members gm on gm.user_id = u.id
left join public.profiles p  on p.id       = u.id
where p.id is null;  -- seulement les profils manquants

-- 2) (Ré)création propre de la contrainte FK
alter table public.group_members
    drop constraint if exists fk_group_members_user_profile;

alter table public.group_members
    add constraint fk_group_members_user_profile
    foreign key (user_id)
    references public.profiles (id)
    on delete cascade;
