-- Job Foocus: Use UUID category_id as storage key instead of category name
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → Your Project → SQL Editor

-- ============================================================
-- ADD category_id TO applications
-- ============================================================
alter table applications add column if not exists category_id uuid references auth.users(id) on delete set null;

-- ============================================================
-- ADD category_id TO documents
-- ============================================================
alter table documents add column if not exists category_id uuid references auth.users(id) on delete set null;

-- ============================================================
-- POPULATE category_id FROM user_categories
-- ============================================================
update applications a
set category_id = (
  select uc.id from user_categories uc
  where uc.user_id = a.user_id
  and lower(uc.name) = lower(a.category)
  limit 1
);

update documents d
set category_id = (
  select uc.id from user_categories uc
  where uc.user_id = d.user_id
  and lower(uc.name) = lower(d.category)
  limit 1
);

-- ============================================================
-- DROP OLD UNIQUE CONSTRAINTS (will recreate with category_id)
-- ============================================================
alter table applications drop constraint if exists applications_user_id_category_folder_key;
alter table documents drop constraint if exists documents_user_id_category_folder_doc_type_key;

-- ============================================================
-- ADD NEW UNIQUE CONSTRAINTS WITH category_id
-- (category_id is nullable - for apps/categories created before this migration,
-- we keep the old category text as fallback)
-- ============================================================
alter table applications add constraint applications_user_id_category_id_folder_key
  unique (user_id, category_id, folder);

alter table documents add constraint documents_user_id_category_id_folder_doc_type_key
  unique (user_id, category_id, folder, doc_type);

-- ============================================================
-- UPDATE RLS POLICIES to also filter by category_id where applicable
-- (Existing policies still work with category text for backward compat)
-- ============================================================
