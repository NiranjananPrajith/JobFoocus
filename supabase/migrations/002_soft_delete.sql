-- Job Foocus: Soft Delete (Trash) Support
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → Your Project → SQL Editor

-- ============================================================
-- ENABLE pg_cron extension (required for scheduled cleanup)
-- ============================================================
create extension if not exists pg_cron with schema extensions;

-- ============================================================
-- ADD deleted_at TO applications
-- ============================================================
alter table applications add column if not exists deleted_at timestamptz;

create index if not exists applications_deleted_at_idx on applications(deleted_at) where deleted_at is not null;

-- ============================================================
-- UPDATE RLS POLICY: split into SELECT/UPDATE and INSERT policies
-- SELECT: only see non-deleted rows
-- INSERT: allow inserts (new applications have no deleted_at)
-- UPDATE/DELETE: operate on non-deleted rows
-- ============================================================
drop policy if exists "Users manage own applications" on applications;

-- SELECT, UPDATE, DELETE: only non-deleted rows
create policy "Users manage own active applications"
  on applications for select
  using (auth.uid() = user_id and deleted_at is null);

create policy "Users manage own active applications"
  on applications for update
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);

create policy "Users manage own active applications"
  on applications for delete
  using (auth.uid() = user_id and deleted_at is null);

-- INSERT: new application rows (deleted_at is null by default)
create policy "Users insert applications"
  on applications for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- AUTO-DELETE TRASH: runs daily at 3am UTC
-- Permanently removes applications and their documents older than 30 days
-- ============================================================
create or replace function purge_expired_trash()
returns void as $$
begin
  -- Delete documents for expired trash applications
  delete from documents
  where user_id in (
    select user_id from applications where deleted_at is not null and deleted_at < now() - interval '30 days'
  );

  -- Delete expired trash applications
  delete from applications where deleted_at is not null and deleted_at < now() - interval '30 days';
end;
$$ language plpgsql;

-- Drop existing cron job if re-running (ignore errors if cron schema missing)
do $$
begin
  perform cron.unschedule('purge-trash-daily');
exception when others then null;
end
$$;

-- Schedule daily at 3am UTC
select cron.schedule('purge-trash-daily', '0 3 * * *', 'select purge_expired_trash()');
