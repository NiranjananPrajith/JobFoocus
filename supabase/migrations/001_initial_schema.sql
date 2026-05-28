-- Job Foocus Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → Your Project → SQL Editor

-- ============================================================
-- TABLE: applications
-- Stores: one row per job application, data as JSONB
-- Key: user_id + category + folder (unique)
-- ============================================================
create table if not exists applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  folder text not null,
  data jsonb not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, category, folder)
);

create index if not exists applications_user_id_idx on applications(user_id);

alter table applications enable row level security;

drop policy if exists "Users manage own applications" on applications;
create policy "Users manage own applications"
  on applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: documents
-- Stores: raw HTML for resumes, cover letters, job descriptions
-- Key: user_id + category + folder + doc_type (unique)
-- ============================================================
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  folder text not null,
  doc_type text not null,
  html text not null default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, category, folder, doc_type)
);

create index if not exists documents_user_id_idx on documents(user_id);

alter table documents enable row level security;

drop policy if exists "Users manage own documents" on documents;
create policy "Users manage own documents"
  on documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: master_resumes
-- Stores: user's master resume as JSONB — one row per user
-- ============================================================
create table if not exists master_resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade unique,
  data jsonb not null default '{"name":"","phone":"","email":"","workExperience":[],"education":[],"skills":[],"socials":[],"portfolio":[]}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table master_resumes enable row level security;

drop policy if exists "Users manage own master resume" on master_resumes;
create policy "Users manage own master resume"
  on master_resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: settings
-- Stores: { cloudProvider, syncEnabled, openAiKey } — one row per user
-- ============================================================
create table if not exists settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade unique,
  cloud_provider text not null default 'none',
  sync_enabled boolean not null default false,
  openai_key text not null default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table settings enable row level security;

drop policy if exists "Users manage own settings" on settings;
create policy "Users manage own settings"
  on settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists applications_updated_at on applications;
create trigger applications_updated_at before update on applications
  for each row execute function update_updated_at_column();

drop trigger if exists documents_updated_at on documents;
create trigger documents_updated_at before update on documents
  for each row execute function update_updated_at_column();

drop trigger if exists master_resumes_updated_at on master_resumes;
create trigger master_resumes_updated_at before update on master_resumes
  for each row execute function update_updated_at_column();

drop trigger if exists settings_updated_at on settings;
create trigger settings_updated_at before update on settings
  for each row execute function update_updated_at_column();
