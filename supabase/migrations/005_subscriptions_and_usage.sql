-- Job Foocus: Stripe subscriptions + daily usage counters
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → Your Project → SQL Editor
--
-- Adds:
--   subscriptions   — mirrors the user's Stripe subscription state.
--                    One row per user (upserted by the webhook using the
--                    service-role key, so RLS is read-only for the user).
--   usage_counters  — one row per user per UTC day. Incremented atomically
--                    by /api/usage/increment on the server. Enforces daily
--                    Free / Pro / Max limits.
--
-- ROLLBACK: drop both tables — no other migration depends on them.

-- ============================================================
-- TABLE: subscriptions
-- ============================================================
create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  -- One of the configured STRIPE_PRICE_ID_* values, or NULL for free users.
  -- Stored as text (not FK) so price IDs can be rotated without a migration.
  stripe_price_id text,
  -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | NULL
  -- NULL means the user has never had a Stripe subscription.
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  updated_at timestamptz default now() not null
);

create index if not exists subscriptions_stripe_customer_id_idx
  on subscriptions(stripe_customer_id);
create index if not exists subscriptions_stripe_subscription_id_idx
  on subscriptions(stripe_subscription_id);

alter table subscriptions enable row level security;

drop policy if exists "users read own subscription" on subscriptions;
create policy "users read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Writes only via service-role key (webhook handler). No user-facing
-- insert/update policy is created on purpose.

-- ============================================================
-- TABLE: usage_counters
-- One row per user per UTC day. Date is bucketed at UTC midnight so the
-- daily reset is consistent regardless of the server's local timezone.
-- ============================================================
create table if not exists usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  jobs_added int not null default 0 check (jobs_added >= 0),
  edits_made int not null default 0 check (edits_made >= 0),
  primary key (user_id, usage_date)
);

create index if not exists usage_counters_user_date_idx
  on usage_counters(user_id, usage_date desc);

alter table usage_counters enable row level security;

drop policy if exists "users read own counters" on usage_counters;
create policy "users read own counters"
  on usage_counters for select
  using (auth.uid() = user_id);

-- Writes only via service-role key. The check/increment endpoints run on
-- the server (Next.js API route) so the user never gets INSERT/UPDATE
-- privileges directly.

-- ============================================================
-- FUNCTION: try_increment_usage
-- Atomically bumps the daily counter for one action, but only if the
-- user is strictly below the cap. Returns a JSON document:
--   { ok: true,  value: <new_count> }   — increment succeeded
--   { ok: false, value: <cap> }        — at limit, no rows updated
--
-- We do this in a single SQL function so the increment and the cap
-- check happen in the same statement. The Supabase JS client can't
-- express "UPDATE … SET x = x + 1 WHERE x < cap" as a single call, so
-- we wrap it in an RPC. SECURITY DEFINER is intentional — this runs
-- with the function owner's privileges, which lets it bypass the
-- RLS read policy that the user has on usage_counters.
-- ============================================================
create or replace function public.try_increment_usage(
  p_user_id uuid,
  p_action text,
  p_cap int
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_col text;
  v_value int;
begin
  if p_action not in ('add_job', 'edit_doc') then
    raise exception 'invalid action: %', p_action;
  end if;

  v_col := case when p_action = 'add_job' then 'jobs_added' else 'edits_made' end;

  -- Ensure today's row exists.
  insert into usage_counters (user_id, usage_date, jobs_added, edits_made)
    values (p_user_id, v_today, 0, 0)
    on conflict (user_id, usage_date) do nothing;

  -- Atomic bump with cap guard. If no row matches, the user is at the
  -- cap; return ok=false with the cap as the value.
  update usage_counters
    set jobs_added = case when v_col = 'jobs_added' then jobs_added + 1 else jobs_added end,
        edits_made = case when v_col = 'edits_made' then edits_made + 1 else edits_made end
    where user_id = p_user_id
      and usage_date = v_today
      and case
            when v_col = 'jobs_added' then jobs_added
            else edits_made
          end < p_cap
    returning case
                when v_col = 'jobs_added' then jobs_added
                else edits_made
              end into v_value;

  if v_value is null then
    return json_build_object('ok', false, 'value', p_cap);
  end if;

  return json_build_object('ok', true, 'value', v_value);
end;
$$;

-- Allow the service role to call this (and only this — users still can't
-- directly read or write the table). The function does its own
-- authorization by only operating on p_user_id.
revoke all on function public.try_increment_usage(uuid, text, int) from public;
grant execute on function public.try_increment_usage(uuid, text, int) to service_role;

-- ============================================================
-- ROLLBACK SECTION
-- ============================================================
--
-- drop function if exists public.try_increment_usage(uuid, text, int);
-- drop table if exists usage_counters;
-- drop table if exists subscriptions;
