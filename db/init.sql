-- providers: cấu hình global theo provider
-- create table if not exists providers (
--   key text primary key,
--   standard_map jsonb not null default '{}'::jsonb,
--   default_headers jsonb not null default '{}'::jsonb,
--   created_at timestamptz not null default now()
-- );

-- users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- mapping user -> provider config (payload/config theo account)
-- create table if not exists user_providers (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references users(id) on delete cascade,
--   provider_key text not null references providers(key) on delete cascade,
--   config jsonb not null default '{}'::jsonb,
--   created_at timestamptz not null default now(),
--   unique(user_id, provider_key)
-- );

-- extensions
create extension if not exists pgcrypto;