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
