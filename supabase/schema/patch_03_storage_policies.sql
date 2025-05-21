-- =====================================================================
-- Patch 03 – Politiques RLS sur storage.objects
--   Autorise les utilisateurs authentifiés à :
--     • lire   (SELECT) les objets publics
--     • écrire (INSERT) dans les trois buckets média
-- =====================================================================

alter table storage.objects enable row level security;

-- Nettoyage éventuel (idempotent)
drop policy if exists "Auth read media buckets"   on storage.objects;
drop policy if exists "Auth upload media buckets" on storage.objects;

-- Buckets concernés
create or replace function public.is_media_bucket(b text)
returns boolean language sql immutable as $$
  select b in ('chat-images', 'chat-media', 'story-media')
$$;

-- 1. Lecture pour tout authentifié (les buckets sont publics)
create policy "Auth read media buckets"
  on storage.objects
  for select
  using ( auth.role() = 'authenticated'
          and public.is_media_bucket(bucket_id) );

-- 2. Upload (INSERT) pour tout authentifié
create policy "Auth upload media buckets"
  on storage.objects
  for insert
  with check ( auth.role() = 'authenticated'
               and public.is_media_bucket(bucket_id) );
