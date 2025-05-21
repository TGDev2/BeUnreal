-- =====================================================================
-- Patch 02 – Corrige les politiques RLS récursives de `group_members`
-- =====================================================================

alter table public.group_members
    enable row level security;

-- 1. Suppression des règles problématiques
drop policy if exists "Members can read membership"          on public.group_members;
drop policy if exists "Existing members can add members"     on public.group_members;

-- 2. Règles simplifiées, non récursives
create policy "Auth users can read group_members"
  on public.group_members
  for select
  using ( auth.role() = 'authenticated' );

create policy "Auth users can insert group_members"
  on public.group_members
  for insert
  with check ( auth.role() = 'authenticated' );