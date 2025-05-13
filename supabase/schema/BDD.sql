-- Tables de conversation de groupe pour BeUnreal
-- À exécuter sur Supabase (via SQL Editor ou supabase db push)

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text,
  avatar_url text,
  created_at timestamp with time zone default current_timestamp
);

-- Table messages ---------------------------------------------------------
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid references auth.users not null,
  recipient_id  uuid references auth.users not null,
  content       text,
  image_url     text,
  created_at    timestamptz not null default now()
);

-- Index pour accélérer les conversations
create index if not exists messages_participants_idx
  on public.messages (sender_id, recipient_id, created_at desc);


-- Groups -------------------------------------------------------------
create table if not exists public.groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz default now()
);

-- Group members ------------------------------------------------------
create table if not exists public.group_members (
  group_id    uuid references public.groups(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  role        text not null default 'member', -- 'owner' | 'member'
  joined_at   timestamptz default now(),
  primary key (group_id, user_id)
);

-- Group messages -----------------------------------------------------
create table if not exists public.group_messages (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid references public.groups(id) on delete cascade,
  sender_id   uuid references auth.users(id) on delete set null,
  content     text,
  image_url   text,
  created_at  timestamptz default now()
);

-- Temps-réel Supabase -----------------------------------------------
alter publication supabase_realtime add table public.group_messages;

-- Stories (géolocalisées) -----------------------------------------------
create table if not exists public.stories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  media_url   text not null,
  media_type  text not null default 'image', -- 'image' | 'video'
  latitude    double precision not null,
  longitude   double precision not null,
  created_at  timestamptz       default now()
);

alter publication supabase_realtime add table public.stories;
