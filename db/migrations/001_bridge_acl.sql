-- Gyuniverse Discord Bridge v2: isolated guild/channel access.
-- Apply to a dedicated Supabase/PostgreSQL database before enabling personal credentials.
-- The service-role key is server-side only; do not grant table access to anon/authenticated.
create extension if not exists pgcrypto;

create table if not exists public.bridge_users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  role text not null check (role in ('admin','member','viewer')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.bridge_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.bridge_users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.bridge_guilds (
  id text primary key,
  name text not null,
  enabled boolean not null default false,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.bridge_channels (
  id text primary key,
  guild_id text not null references public.bridge_guilds(id) on delete cascade,
  name text not null,
  synced_at timestamptz,
  unique (guild_id, id)
);
create table if not exists public.bridge_guild_access (
  user_id uuid not null references public.bridge_users(id) on delete cascade,
  guild_id text not null references public.bridge_guilds(id) on delete cascade,
  access_mode text not null check (access_mode in ('all_channels','selected_channels')),
  primary key (user_id,guild_id)
);
create table if not exists public.bridge_channel_access (
  user_id uuid not null,
  guild_id text not null,
  channel_id text not null,
  can_read boolean not null default false,
  primary key (user_id,channel_id),
  foreign key (user_id,guild_id) references public.bridge_guild_access(user_id,guild_id) on delete cascade,
  foreign key (guild_id,channel_id) references public.bridge_channels(guild_id,id) on delete cascade
);
create index if not exists bridge_channel_access_user_guild
  on public.bridge_channel_access(user_id,guild_id);

alter table public.bridge_users enable row level security;
alter table public.bridge_credentials enable row level security;
alter table public.bridge_guilds enable row level security;
alter table public.bridge_channels enable row level security;
alter table public.bridge_guild_access enable row level security;
alter table public.bridge_channel_access enable row level security;

revoke all on public.bridge_users, public.bridge_credentials,
  public.bridge_guilds, public.bridge_channels,
  public.bridge_guild_access, public.bridge_channel_access
  from anon, authenticated;
-- No anon/authenticated policies: only the trusted backend's service role may access these tables.

-- Explicitly preserve server-side PostgREST access when auto-exposure is disabled.
-- No table privileges are granted to anon or authenticated clients.
grant usage on schema public to service_role;
grant select, insert, update, delete on
  public.bridge_users, public.bridge_credentials, public.bridge_guilds,
  public.bridge_channels, public.bridge_guild_access, public.bridge_channel_access
to service_role;
