# JobFoocus

A Next.js job-application workspace. You drop in a master resume, paste a
job description (or send one from the browser extension), and the app
generates a tailored resume + cover letter, files them under
`YYYY-MM-DD_Company_Title`, and tracks status through your pipeline.

Three paid tiers (Stripe), daily usage limits, a print-optimized document
viewer, and a Manifest V3 browser extension for one-click capture from
any job board.

---

## Table of contents

- [Features](#features)
- [Stack](#stack)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Database (Supabase)](#database-supabase)
- [Stripe setup](#stripe-setup)
- [Browser extension](#browser-extension)
- [Deployment (Vercel)](#deployment-vercel)
- [Security notes](#security-notes)
- [Project layout](#project-layout)
- [Useful npm scripts](#useful-npm-scripts)

---

## Features

- **AI document generation** — server-side calls to the DeepSeek V4 Flash Free model
  draft a tailored `resume.html` and `cover_letter.html`. PII is masked
  before the prompt and demasked on the way back so the model never sees
  your real phone/email.
- **Smart categorization** — user-defined categories with AI
  auto-classification based on job title, company, and description. A
  reserved `Uncategorized` bucket is the fallback.
- **Document editor** — in-browser AI edits via a floating yellow panel.
  Server-side cap enforcement (402 → upgrade modal) on the AI endpoint.
- **Subscription tiers** — Free / Pro / Max via Stripe Checkout + Customer
  Portal + webhook. Daily usage caps are enforced at the database layer
  with an atomic SQL function.
- **Browser extension** — Manifest V3, works in Chrome / Edge / Brave /
  Firefox. One-click scrape, context-menu shortcut, popdown UI, deep-link
  pre-fill to the dashboard.
- **Print to PDF** — `@page` CSS hooks + `print-color-adjust: exact`,
  no floats, no multi-column layouts (ATS-safe).
- **Account dashboard** — current plan, today's usage bars, reset
  countdown, and "Manage in Stripe" portal link.

---

## Stack

| Layer            | Tech                                                |
| ---------------- | --------------------------------------------------- |
| Framework        | Next.js 14.2.29 (App Router) + React 18 + TypeScript |
| Database         | Supabase Postgres with RLS                          |
| Auth             | Supabase Auth (email + Google OAuth)                |
| Payments         | Stripe (USD/EUR) + Razorpay Subscriptions (INR) + webhooks |
| AI               | DeepSeek V4 Flash Free via OpenCode ZEN (OpenAI-compatible) |
| PDF rendering    | `pdfjs-dist` (worker copied to `public/pdf-worker/`) |
| Styling          | Tailwind CSS                                        |
| Hosting          | Vercel                                              |
| Browser ext.     | Manifest V3 (Chrome / Firefox)                      |
| Package manager  | npm                                                 |

---

## Quick start (local)

```bash
npm install
cp .env .env.local          # then fill in real values (see below)
npm run dev
# → http://localhost:3000
```

The first dev run copies `pdfjs-dist`'s worker into `public/pdf-worker/`
via the `copy-pdf-worker` predev hook. The packaged extension zip is
**not** built automatically — see [Browser extension](#browser-extension).

> **Local data is local.** The dev server reads from Supabase, not from
> `localStorage`. There is no localStorage fallback in this codebase —
> data created in dev is real data on the same Postgres instance the
> production app uses. Be careful with seed accounts.

---

## Environment variables

All values live in `.env` (local) and in the Vercel project settings
(production). **Never commit `.env`** — `.gitignore` covers it, and the
Stripe and Supabase keys are sensitive.

| Variable                                | Required | Where it comes from                            |
| --------------------------------------- | -------- | ---------------------------------------------- |
| `OPENCODE_ZEN_API_KEY`                 | yes      | OpenCode ZEN dashboard                              |
| `NEXT_PUBLIC_SUPABASE_URL`              | yes      | Supabase project settings                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | yes      | Supabase project settings (anon / publishable) |
| `SUPABASE_SERVICE_ROLE_KEY`             | yes      | Supabase project settings (service role, secret) |
| `STRIPE_SECRET_KEY`                     | yes      | Stripe dashboard → Developers → API keys       |
| `STRIPE_WEBHOOK_SECRET`                 | yes      | Stripe dashboard → Webhooks → endpoint signing secret |
| `STRIPE_PRICE_ID_PRO`                   | yes      | Stripe dashboard → Products → Pro price ID (USD) |
| `STRIPE_PRICE_ID_MAX`                   | yes      | Stripe dashboard → Products → Max price ID (USD) |
| `STRIPE_PRICE_ID_PRO_EUR`              | yes      | Stripe dashboard → Products → Pro price ID (EUR) |
| `STRIPE_PRICE_ID_MAX_EUR`              | yes      | Stripe dashboard → Products → Max price ID (EUR) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`    | yes      | Stripe dashboard → Developers → API keys       |
| `RAZORPAY_KEY_ID`                      | yes      | Razorpay dashboard → Settings → API Keys       |
| `RAZORPAY_KEY_SECRET`                  | yes      | Razorpay dashboard → Settings → API Keys       |
| `RAZORPAY_WEBHOOK_SECRET`              | yes      | Razorpay dashboard → Webhooks → signing secret  |
| `RAZORPAY_PLAN_ID_PRO`                 | yes      | Razorpay dashboard → Subscriptions → Plans → Pro plan ID |
| `RAZORPAY_PLAN_ID_MAX`                 | yes      | Razorpay dashboard → Subscriptions → Plans → Max plan ID |
| `NEXT_PUBLIC_SITE_URL`                  | optional | Canonical site URL, used for Stripe `success_url` / `cancel_url` fallbacks |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`          | yes      | Google Cloud Console → OAuth client ID         |
| `ONEDRIVE_CLIENT_ID`                    | yes      | Azure App Registrations                        |
| `DROPBOX_CLIENT_ID`                     | yes      | Dropbox App Console                            |

> **Mode consistency.** When you flip Stripe from test to live (or vice
> versa), you must swap **all four** Stripe env vars in lockstep:
> `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_MAX`,
> `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. A test-mode secret key with a
> live-mode price ID returns 500 from `create-checkout-session` with
> `No such price`. Live and test products are in separate dashboards
> (toggle "Test mode" in the top-right of the Stripe dashboard).

---

## Database (Supabase)

JobFoocus uses Supabase PostgreSQL with Row Level Security (RLS). To initialize a fresh database instance, open the **Supabase Dashboard → SQL Editor**, paste the consolidated schema below, and run it:

```sql
-- JobFoocus Complete Consolidated Database Schema

-- 1. Applications table
create table if not exists applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  category_id uuid,
  folder text not null,
  data jsonb not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, category, folder)
);

create index if not exists applications_user_id_idx on applications(user_id);
create index if not exists applications_deleted_at_idx on applications(user_id, deleted_at);

alter table applications enable row level security;
drop policy if exists "Users manage own applications" on applications;
create policy "Users manage own applications"
  on applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Documents table
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  category_id uuid,
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

-- 3. Master Resumes table
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

-- 4. Settings table
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

-- 5. User Categories table
create table if not exists user_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  color text default '#888888',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, name)
);

create index if not exists user_categories_user_id_idx on user_categories(user_id);

alter table user_categories enable row level security;
drop policy if exists "Users manage own categories" on user_categories;
create policy "Users manage own categories"
  on user_categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Subscriptions table (Stripe + Razorpay)
create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  razorpay_customer_id text,
  razorpay_subscription_id text,
  razorpay_plan_id text,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  currency text,
  meta_purchase_event_id text,
  updated_at timestamptz default now() not null
);

create index if not exists subscriptions_stripe_customer_id_idx on subscriptions(stripe_customer_id);
create index if not exists subscriptions_stripe_subscription_id_idx on subscriptions(stripe_subscription_id);
create index if not exists subscriptions_razorpay_subscription_id_idx on subscriptions(razorpay_subscription_id);

alter table subscriptions enable row level security;
drop policy if exists "users read own subscription" on subscriptions;
create policy "users read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- 7. Usage Counters table
create table if not exists usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  jobs_added int not null default 0 check (jobs_added >= 0),
  edits_made int not null default 0 check (edits_made >= 0),
  primary key (user_id, usage_date)
);

create index if not exists usage_counters_user_date_idx on usage_counters(user_id, usage_date desc);

alter table usage_counters enable row level security;
drop policy if exists "users read own counters" on usage_counters;
create policy "users read own counters"
  on usage_counters for select
  using (auth.uid() = user_id);

-- 8. Insider Requests table
create table if not exists insider_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  referrer_name text not null,
  referral_code text not null,
  created_at timestamptz default now() not null
);

alter table insider_requests enable row level security;
drop policy if exists "users insert own insider request" on insider_requests;
create policy "users insert own insider request"
  on insider_requests for insert
  with check (auth.uid() = user_id);

-- 9. Function: Atomic usage increment RPC
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

  insert into usage_counters (user_id, usage_date, jobs_added, edits_made)
    values (p_user_id, v_today, 0, 0)
    on conflict (user_id, usage_date) do nothing;

  update usage_counters
    set jobs_added = case when v_col = 'jobs_added' then jobs_added + 1 else jobs_added end,
        edits_made = case when v_col = 'edits_made' then edits_made + 1 else edits_made end
    where user_id = p_user_id
      and usage_date = v_today
      and case when v_col = 'jobs_added' then jobs_added else edits_made end < p_cap
    returning case when v_col = 'jobs_added' then jobs_added else edits_made end into v_value;

  if v_value is null then
    return json_build_object('ok', false, 'value', p_cap);
  end if;

  return json_build_object('ok', true, 'value', v_value);
end;
$$;

revoke all on function public.try_increment_usage(uuid, text, int) from public;
grant execute on function public.try_increment_usage(uuid, text, int) to service_role;
```

---

## Stripe setup

You need two products in the Stripe dashboard:

| Product            | Monthly price | What it's for                   |
| ------------------ | ------------- | ------------------------------- |
| Pro (`prod_…`)     | $5            | 25 jobs/day, 150 edits/day      |
| Max (`prod_…`)     | $12           | 250 jobs/day, 500 edits/day (UI: "unlimited") |

For each product, copy the recurring price's `price_…` ID and put it
into the matching `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_MAX` env var.

### Webhook

1. Stripe dashboard → Developers → Webhooks → **Add endpoint**.
2. Endpoint URL: `https://<your-domain>/api/stripe/webhook`.
3. Listen for: `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

For local development, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy the whsec_… it prints into STRIPE_WEBHOOK_SECRET
```

### Customer Portal

Stripe dashboard → Settings → Customer Portal → enable the portal and
configure which actions (cancel, update payment method, switch plan)
are allowed. The app just opens a session via
`stripe.billingPortal.sessions.create({ customer, return_url })`.

### Restricted API keys (recommended)

If you create a restricted key (`rk_…`) for the app, the required
permissions are:

- **Customers**: write (create + retrieve)
- **Checkout Sessions**: write
- **Billing Portal Sessions**: write
- **Subscriptions**: read
- **All other resources**: none

---

## Razorpay setup (India / INR)

Indian visitors (detected via Vercel's geo headers) see prices in INR and
are routed to Razorpay instead of Stripe. Everyone else uses Stripe as
before.

You need two subscription plans in the Razorpay dashboard:

| Plan              | Monthly price | What it's for                   |
| ----------------- | ------------- | ------------------------------- |
| Pro (`plan_…`)    | ₹500          | 25 jobs/day, 150 edits/day      |
| Max (`plan_…`)    | ₹1,250        | 250 jobs/day, 500 edits/day     |

For each plan, copy the plan's `plan_…` ID and put it into the matching
`RAZORPAY_PLAN_ID_PRO` / `RAZORPAY_PLAN_ID_MAX` env var.

### Webhook

1. Razorpay dashboard → Settings → Webhooks → **Add new webhook**.
2. Webhook URL: `https://<your-domain>/api/razorpay/webhook`.
3. Subscribe to: `subscription.authenticated`,
   `subscription.activated`, `subscription.charged`,
   `subscription.cancelled`, `subscription.completed`,
   `subscription.halted`, `subscription.resumed`.
4. Copy the webhook signing secret into `RAZORPAY_WEBHOOK_SECRET`.

### Mode consistency

When you flip Razorpay from test to live (or vice versa), swap all three
env vars in lockstep: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`. A test-mode key with a live-mode plan ID
returns an error.

### Local dev

Set `NEXT_PUBLIC_DEV_REGION=IN` in your `.env` to simulate an Indian
visitor in local dev (where Vercel geo headers aren't available). Use
`EEA` to simulate a European visitor (EUR default). Omit or set to
`OTHER` to test the USD path.

---

## Stripe setup (USD + EUR)

You need four products in the Stripe dashboard (two per currency):

| Product            | Currency | Monthly price | What it's for                   |
| ------------------ | -------- | ------------- | ------------------------------- |
| Pro (`price_…`)    | USD      | $5            | 25 jobs/day, 150 edits/day      |
| Max (`price_…`)    | USD      | $12           | 250 jobs/day, 500 edits/day     |
| Pro (`price_…`)    | EUR      | €4.50         | 25 jobs/day, 150 edits/day      |
| Max (`price_…`)    | EUR      | €11           | 250 jobs/day, 500 edits/day     |

For each product, copy the recurring price's `price_…` ID and put it
into the matching env var (`STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_MAX`,
`STRIPE_PRICE_ID_PRO_EUR`, `STRIPE_PRICE_ID_MAX_EUR`).

### Webhook

1. Stripe dashboard → Developers → Webhooks → **Add endpoint**.
2. Endpoint URL: `https://<your-domain>/api/stripe/webhook`.
3. Listen for: `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## Browser extension

The extension lives in `extension/` and is built into a `.zip` the
dashboard serves at `/extension-install`.

```bash
npm run build:extension
# → public/extensions/build/jobfoocus-extension.zip  (always latest)
# → public/extensions/build/jobfoocus-extension-v1.2.0.zip  (versioned, immutable)
```

The unversioned zip is committed to the repo (it's tiny and the
install page links to it directly). Versioned zips are gitignored to
avoid accumulating stale builds.

To change the deep-link target URL (e.g., point at `localhost:3000`
during extension dev), edit `DASHBOARD_URL` at the top of
`extension/background.js` and reload the extension at
`chrome://extensions`. See `extension/README.md` for the full
installation and usage walkthrough.

---

## Deployment (Vercel)

This is a standard Next.js 14 App Router deploy:

1. Push to `main` (or import the repo into Vercel).
2. Vercel detects Next.js, runs `npm run build` (which includes
   `copy-pdf-worker`).
3. Set every env var from [Environment variables](#environment-variables)
   in **Project → Settings → Environment Variables**, for each
   environment (Production / Preview / Development).
4. After the first deploy, configure the Stripe webhook endpoint
   (see [Stripe setup](#stripe-setup)) and point it at
   `https://<your-domain>/api/stripe/webhook`.

### Domain

The default `DASHBOARD_URL` in the extension points to
`https://job-foocus.vercel.app/application`. To ship the extension
against a custom domain, update `DASHBOARD_URL` in
`extension/background.js` and rebuild with `npm run build:extension`.

### What the deploy ships

- The Next.js bundle (including `public/pdf-worker/`, copied at build
  time by `copy-pdf-worker`).
- `public/extensions/build/jobfoocus-extension.zip` — the install
  button on `/extension-install` downloads this file. **It must be
  present in the deployed output for the install page to work**, which
  is why the file is committed.

---

## Security notes

- **Stripe secret + webhook secret are server-only.** Never prefix
  with `NEXT_PUBLIC_`. The Stripe Node SDK is imported only from
  `src/lib/stripe.ts` (server code).
- **Supabase service-role key bypasses RLS.** It's used by the Stripe
  webhook and by the `try_increment_usage` RPC. Treat it as a master
  key — it must never reach the client bundle.
- **PII is masked** before the LLM call (`src/lib/pii-utils.ts`) and
  restored on the way out, so the model never sees the user's real
  phone/email.
- **Security headers** are set globally in `next.config.mjs`:
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a
  `Content-Security-Policy` that whitelists the Supabase origins.
- **API routes are exempt from the auth redirect** in `src/middleware.ts`.
  They return their own 401 JSON, so unauthenticated API calls don't
  get bounced to `/login`.
- **The Stripe webhook authenticates by signature**, not session
  cookies — the `matcher` in `src/middleware.ts` lets it through.

---

## Project layout

```
.
├── extension/                  # Manifest V3 browser extension
│   ├── manifest.json
│   ├── background.js           # service worker: scrape + message router
│   ├── content.js              # runs in the page, extracts job fields
│   ├── popup.html / popup.js   # popdown UI
│   ├── icons/
│   └── README.md
├── public/
│   ├── extensions/build/       # packaged extension zip (committed)
│   ├── pdf-worker/             # pdfjs worker (copied at build time)
│   ├── icon.webp
│   ├── icon_wide.webp
│   └── homepageSS.webp
├── scripts/
│   ├── build-extension.mjs     # packages extension/ into a .zip
│   └── copy-pdf-worker.mjs     # copies pdfjs worker to public/
├── src/
│   ├── middleware.ts           # auth gate, exempts /api/* and /auth/*
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── (auth)/             # login, signup
│   │   ├── (doc)/document/     # document viewer + AI edit panel
│   │   ├── (main)/             # dashboard, pricing, account, jobs, …
│   │   ├── auth/callback/      # OAuth callback
│   │   └── api/
│   │       ├── ai/             # edit-document AI + bare /ai proxy
│   │       ├── db/             # applications, documents, categories, …
│   │       ├── stripe/         # checkout, portal, webhook
│   │       ├── razorpay/       # create-subscription, cancel, reactivate, webhook
│   │       └── usage/          # check, increment
│   ├── components/             # AddJobModal, UpgradePromptModal, NavBar, …
│   └── lib/
│       ├── ai-generation.ts    # LLM calls + PII masking
│       ├── cloud-sync.ts
│       ├── db/bootstrap.ts
│       ├── design-system.ts
│       ├── formatting-guides.json
│       ├── limits.ts           # single source of truth: tier → limits
│       ├── pii-utils.ts        # mask/demask
│       ├── razorpay.ts         # server-side Razorpay SDK singleton
│       ├── region.ts           # geo-based region detection (IN / OTHER)
│       ├── resume-parser.ts
│       ├── storage-adapter.ts  # all client→server data flow
│       ├── stripe.ts           # server-side Stripe SDK singleton
│       ├── subscription.ts     # read subscription + resolve tier
│       ├── supabase/           # client + middleware + server
│       ├── supabase-utils/     # server + service-role helpers
│       └── usage.ts            # counter CRUD + atomic RPC
├── supabase/migrations/        # 001…005, applied in order
├── next.config.mjs             # security headers, image config
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── README.md                   # you are here
├── AGENTS.md                   # developer / AI-agent guide
└── CLAUDE.md                   # symlink-style pointer to AGENTS.md
```

---

## Useful npm scripts

| Command                  | What it does                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- |
| `npm run dev`            | Copies the pdfjs worker, then starts Next.js dev on `http://localhost:3000`. |
| `npm run build`          | Copies the pdfjs worker, then `next build`.                                  |
| `npm run start`          | Runs the production build (after `npm run build`).                           |
| `npm run lint`           | `next lint`.                                                                 |
| `npm run build:extension`| Packages `extension/` into `public/extensions/build/*.zip`.                  |
| `npm run copy-pdf-worker`| Copies the pdfjs worker into `public/pdf-worker/` (runs automatically on dev/build). |
