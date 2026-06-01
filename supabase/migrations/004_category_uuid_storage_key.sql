-- Job Foocus: Use UUID category_id as storage key instead of category name
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → Your Project → SQL Editor
--
-- ROLLBACK: If this migration fails or causes issues, run the statements in the
-- ROLLBACK SECTION at the bottom of this file.

-- ============================================================
-- ADD category_id TO applications
-- ============================================================
alter table applications add column if not exists category_id uuid references user_categories(id) on delete set null;

-- ============================================================
-- ADD category_id TO documents
-- ============================================================
alter table documents add column if not exists category_id uuid references user_categories(id) on delete set null;

-- ============================================================
-- POPULATE category_id FROM user_categories
-- (Only rows where a matching category exists get a UUID;
--  others remain with category_id = NULL for backward compat)
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
-- (category_id is nullable - apps/categories created before this migration
-- retain category_id = NULL and use the category text column as fallback.
-- PostgreSQL unique constraints allow multiple NULL values.)
-- ============================================================
alter table applications add constraint applications_user_id_category_id_folder_key
  unique (user_id, category_id, folder);

alter table documents add constraint documents_user_id_category_id_folder_doc_type_key
  unique (user_id, category_id, folder, doc_type);

-- ============================================================
-- ROLLBACK SECTION
-- (Only run this if you need to undo the migration)
-- ============================================================
--
-- Step 1: Drop new constraints
-- alter table applications drop constraint if exists applications_user_id_category_id_folder_key;
-- alter table documents drop constraint if exists documents_user_id_category_id_folder_doc_type_key;
--
-- Step 2: Restore old constraints (requires migration 003 to be applied)
-- alter table applications add constraint applications_user_id_category_folder_key unique (user_id, category, folder);
-- alter table documents add constraint documents_user_id_category_folder_doc_type_key unique (user_id, category, folder, doc_type);
--
-- Step 3: Drop the category_id columns
-- alter table applications drop column if exists category_id;
-- alter table documents drop column if exists category_id;