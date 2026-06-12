-- 006_auto_create_uncategorized.sql
--
-- Auto-create the "Uncategorized" system category for all users.
--
-- Background: ensureUncategorizedCategory() in the storage adapter
-- used to lazily create this row via the categories API, but the
-- server's POST handler blocks "Uncategorized" as a reserved name —
-- so the row could never be created for new users. This migration
-- fixes the root cause: a trigger now inserts the row on signup,
-- and a one-time backfill handles existing users.
--
-- Rollback:
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user_category();
--   delete from public.user_categories where lower(name) = 'uncategorized';

-- 1. Function that runs after a new user signs up
create or replace function public.handle_new_user_category()
returns trigger as $$
begin
  insert into public.user_categories (user_id, name, description, color)
  values (new.id, 'Uncategorized', 'Default category for uncategorized jobs', '#888888')
  on conflict (user_id, name) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 2. Trigger: fire after insert on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_category();

-- 3. Backfill: create the row for existing users who don't have one yet
insert into public.user_categories (user_id, name, description, color)
select
  id,
  'Uncategorized',
  'Default category for uncategorized jobs',
  '#888888'
from auth.users
where id not in (
  select user_id from public.user_categories where lower(name) = 'uncategorized'
)
on conflict (user_id, name) do nothing;
