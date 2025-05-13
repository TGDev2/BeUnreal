-- ====================================================================
-- BeUnreal – Supabase schema
-- Ajout de la table "contacts" + politiques RLS + diffusion en temps réel
-- ====================================================================

-- Table profils (inchangée)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text,
  avatar_url text,
  created_at timestamptz default current_timestamp
);

-- --------------------------------------------------------------------
-- Contacts (relations utilisateur → contact)
-- --------------------------------------------------------------------
create table if not exists public.contacts (
  user_id     uuid references auth.users(id) on delete cascade,
  contact_id  uuid references auth.users(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, contact_id)
);

-- Index pour accélérer les requêtes « mes contacts »
create index if not exists contacts_user_idx    on public.contacts (user_id);
create index if not exists contacts_contact_idx on public.contacts (contact_id);

-- Sécurité : RLS – chaque utilisateur ne gère que SA liste
alter table public.contacts enable row level security;

create policy "Users can manage their own contacts"
  on public.contacts
  for all                            -- SELECT, INSERT, UPDATE, DELETE
  using (auth.uid() = user_id)       -- lecture
  with check (auth.uid() = user_id); -- écriture

-- Temps-réel Supabase pour les mises à jour éventuelles
alter publication supabase_realtime add table public.contacts;

-- --------------------------------------------------------------------
-- Table messages
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

-- --------------------------------------------------------------------
-- Groups, group_members, group_messages
create table if not exists public.groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz default now()
);

create table if not exists public.group_members (
  group_id    uuid references public.groups(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  role        text not null default 'member', -- 'owner' | 'member'
  joined_at   timestamptz default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_messages (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid references public.groups(id) on delete cascade,
  sender_id   uuid references auth.users(id) on delete set null,
  content     text,
  image_url   text,
  created_at  timestamptz default now()
);
alter publication supabase_realtime add table public.group_messages;

-- --------------------------------------------------------------------
-- Stories géolocalisées
create table if not exists public.stories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  media_url   text not null,
  media_type  text not null default 'image', -- 'image' | 'video'
  latitude    double precision not null,
  longitude   double precision not null,
  created_at  timestamptz default now()
);
alter publication supabase_realtime add table public.stories;
