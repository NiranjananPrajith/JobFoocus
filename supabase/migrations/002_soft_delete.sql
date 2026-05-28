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
-- UPDATE RLS POLICY: exclude soft-deleted rows from SELECT
-- ============================================================
drop policy if exists "Users manage own applications" on applications;
create policy "Users manage own applications"
  on applications for all
  using (auth.uid() = user_id and deleted_at is null)
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
