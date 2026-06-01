-- Job Foocus: User Categories Sync via Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → Your Project → SQL Editor

-- ============================================================
-- TABLE: user_categories
-- Stores: user-defined job categories synced across devices
-- Key: user_id + name (unique)
-- ============================================================
create table if not exists user_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null,
  created_at timestamptz default now() not null,
  unique (user_id, name)
);

create index if not exists user_categories_user_id_idx on user_categories(user_id);

alter table user_categories enable row level security;

drop policy if exists "Users manage own categories" on user_categories;
create policy "Users manage own categories"
  on user_categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- RESET: All existing applications to Uncategorized
-- Since app is not released yet, this is a one-time reset
-- ============================================================
update applications
set data = jsonb_set(
    jsonb_set(
        jsonb_set(data, '{category}', '"Uncategorized"'),
        '{category_key}',
        '"Uncategorized"'
    ),
    '{category_name}',
    '"Uncategorized"'
)
where deleted_at is null
  and (data->>'category' is null or data->>'category' != 'Uncategorized');
