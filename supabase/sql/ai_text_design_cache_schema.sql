create extension if not exists pgcrypto;

create table if not exists public.ai_text_design_cache (
  id uuid primary key default gen_random_uuid(),
  model varchar(120) not null,
  target_text text not null,
  color_key varchar(64) not null default 'purple_gloss',
  design_name text,
  normalized_text text not null,
  cache_key text not null,
  image_url text not null,
  image_hash varchar(64) not null,
  storage_path text not null,
  use_count integer not null default 1,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ai_text_design_cache
  add column if not exists color_key varchar(64) not null default 'purple_gloss';

alter table public.ai_text_design_cache
  add column if not exists design_name text;

create unique index if not exists idx_ai_text_design_cache_key_hash
  on public.ai_text_design_cache(cache_key, image_hash);

create index if not exists idx_ai_text_design_cache_lookup
  on public.ai_text_design_cache(cache_key, created_at desc);

create index if not exists idx_ai_text_design_cache_model_color_text
  on public.ai_text_design_cache(model, color_key, normalized_text, created_at desc);

create index if not exists idx_ai_text_design_cache_design_name
  on public.ai_text_design_cache(design_name, created_at desc);
