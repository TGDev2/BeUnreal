-- =====================================================================
-- Patch 04 – Policies storage.objects (ACL 2025 compliant)
-- Exécuté sous le rôle supabase_admin (par défaut dans la CLI & Dashboard)
-- =====================================================================

/* 1) Helper function : bucket filter ------------------------------------------------ */
create or replace function public.is_media_bucket(b text)
returns boolean
language sql
immutable as $$
    select b in ('chat-images', 'chat-media', 'story-media')
$$;

/* 2) Policies : idempotent ---------------------------------------------------------- */
do
$$
begin
    /* --- SELECT : lecture des fichiers ------------------------------------------- */
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename  = 'objects'
          and policyname = 'Auth read media buckets'
    ) then
        create policy "Auth read media buckets"
            on storage.objects
            for select
            to authenticated
            using (
                auth.role() = 'authenticated'
            and public.is_media_bucket(bucket_id)
            );
    end if;

    /* --- INSERT : upload fichiers -------------------------------------------------- */
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename  = 'objects'
          and policyname = 'Auth upload media buckets'
    ) then
        create policy "Auth upload media buckets"
            on storage.objects
            for insert
            to authenticated
            with check (
                auth.role() = 'authenticated'
            and public.is_media_bucket(bucket_id)
            );
    end if;
end;
$$;
