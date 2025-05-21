-- ====================================================================
-- BeUnreal – Supabase schema
-- Tables + RLS + publication temps réel
-- ====================================================================

-- ▸ Extensions indispensables ----------------------------------------
create extension if not exists "pgcrypto";     -- gen_random_uuid()
create extension if not exists "uuid-ossp";    -- uuid_generate_v4()

-- -------------------------------------------------------
-- Table "profiles"
-- -------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text,
  avatar_url  text,
  email       text,
  created_at  timestamptz default current_timestamp
);

------------------------------------------------------------------------
-- Row-Level Security sur PROFILES
------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Lecture : tout utilisateur authentifié peut lire les profils
create policy "Authenticated can read profiles"
  on public.profiles
  for select
  using ( auth.role() = 'authenticated' );

-- Création : un utilisateur ne peut insérer qu’un profil correspondant
--            à son propre id.
create policy "User can create own profile"
  on public.profiles
  for insert
  with check ( auth.uid() = id );

-- Mise à jour : uniquement son propre profil
create policy "User can update own profile"
  on public.profiles
  for update
  using ( auth.uid() = id );

-- Suppression : uniquement son propre profil
create policy "User can delete own profile"
  on public.profiles
  for delete
  using ( auth.uid() = id );

-- Temps réel
alter publication supabase_realtime add table public.profiles;

-- -------------------------------------------------------
-- Contacts
-- -------------------------------------------------------
create table if not exists public.contacts (
  user_id     uuid references auth.users(id) on delete cascade,
  contact_id  uuid references auth.users(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, contact_id)
);

create index if not exists contacts_user_idx    on public.contacts (user_id);
create index if not exists contacts_contact_idx on public.contacts (contact_id);

alter table public.contacts enable row level security;

create policy "Users manage their own contacts"
  on public.contacts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.contacts;

-- -------------------------------------------------------
-- Messages privés
-- -------------------------------------------------------
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid references auth.users not null,
  recipient_id  uuid references auth.users not null,
  content       text,
  image_url     text,
  created_at    timestamptz not null default now()
);
create index if not exists messages_participants_idx
  on public.messages (sender_id, recipient_id, created_at desc);

alter table public.messages enable row level security;

-- Lire : seul un participant peut lire
create policy "Participants can read conversation"
  on public.messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Écrire : seul l’expéditeur authentifié peut insérer
create policy "Sender can write message"
  on public.messages
  for insert
  with check (auth.uid() = sender_id);

alter publication supabase_realtime add table public.messages;

-- -------------------------------------------------------
-- Groupes, membres, messages de groupe
-- -------------------------------------------------------
create table if not exists public.groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz default now()
);

alter table public.groups enable row level security;

-- Lecture : un utilisateur voit les groupes où il est membre
create policy "Members can see their groups"
  on public.groups
  for select
  using (exists (
    select 1 from public.group_members gm
    where gm.group_id = id and gm.user_id = auth.uid()
  ));

-- Création : tout utilisateur peut créer un groupe
create policy "Anyone can create a group"
  on public.groups
  for insert
  with check (true);

-- -------------------------------------------------------
create table if not exists public.group_members (
  group_id    uuid references public.groups(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  role        text not null default 'member', -- 'owner' | 'member'
  joined_at   timestamptz default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

-- Lire : chaque membre peut voir la liste des membres de ses groupes
create policy "Members can read membership"
  on public.group_members
  for select
  using (auth.uid() = user_id
         or exists (select 1 from public.group_members gm
                    where gm.group_id = group_id
                      and gm.user_id = auth.uid()));

-- Insérer / upsert : seuls les membres déjà présents (owner ou member) peuvent ajouter d’autres membres
create policy "Existing members can add members"
  on public.group_members
  for insert
  with check (exists (
    select 1 from public.group_members gm
    where gm.group_id = group_id and gm.user_id = auth.uid()
  ));

-- -------------------------------------------------------
create table if not exists public.group_messages (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.groups(id) on delete cascade,
  sender_id   uuid references auth.users(id) on delete set null,
  content     text,
  image_url   text,
  created_at  timestamptz default now()
);

alter table public.group_messages enable row level security;

-- Lire : seul un membre du groupe peut lire
create policy "Group members can read messages"
  on public.group_messages
  for select
  using (exists (
    select 1 from public.group_members gm
    where gm.group_id = group_id and gm.user_id = auth.uid()
  ));

-- Écrire : seul un membre peut poster et doit être l’expéditeur
create policy "Group members can post"
  on public.group_messages
  for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.group_messages;

-- -------------------------------------------------------
-- Stories géolocalisées (lecture publique)
-- -------------------------------------------------------
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  media_url   text not null,
  media_type  text not null default 'image', -- 'image' | 'video'
  latitude    double precision not null,
  longitude   double precision not null,
  created_at  timestamptz default now()
);

alter table public.stories enable row level security;

-- Tout le monde (auth ou non) peut lire les stories
create policy "Anonymous read stories"
  on public.stories
  for select
  using (true);

-- Seul l’utilisateur connecté peut créer SA story
create policy "User can post story"
  on public.stories
  for insert
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.stories;

-- ▸ Extensions géospatiales & index
create extension if not exists cube;
create extension if not exists earthdistance;

create index if not exists stories_location_earth_idx
  on public.stories
  using gist ( ll_to_earth(latitude, longitude) );

-- ▸ Fonction RPC : stories dans un rayon donné
create or replace function public.nearby_stories(
    p_lat         double precision,
    p_lon         double precision,
    p_radius_km   double precision default 10
)
returns setof public.stories
language sql
security definer
as $$
    select *
    from public.stories
    where earth_distance(
              ll_to_earth(p_lat, p_lon),
              ll_to_earth(latitude, longitude)
          ) <= p_radius_km * 1000
    order by created_at desc;
$$;

-- -------------------------------------------------------
-- RPC create_group : crée un groupe et ajoute le créateur
-- -------------------------------------------------------
create or replace function public.create_group(
    p_name text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
    new_group_id uuid;
begin
    -- 1. Insertion du groupe
    insert into public.groups(name)
    values (p_name)
    returning id
    into new_group_id;

    -- 2. Le créateur devient propriétaire
    insert into public.group_members(group_id, user_id, role)
    values (new_group_id, auth.uid(), 'owner');

    return new_group_id;
end;
$$;

grant execute on function public.create_group(text) to authenticated;

-- -------------------------------------------------------
--  Trigger : crée automatiquement le profil
--               dès qu’un utilisateur est ajouté
-- -------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
