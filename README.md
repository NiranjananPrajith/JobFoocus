# JobFoocus — Enterprise SaaS Platform

> **A full-stack, production-grade SaaS platform built with Next.js 14 App Router, Supabase Postgres (RLS), multi-currency Stripe + Razorpay subscriptions, zero-PII AI pipeline, Manifest V3 extension, and Meta Conversions API (CAPI).**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Stripe](https://img.shields.io/badge/Stripe-USD%20%2F%20EUR-635BFF?style=for-the-badge&logo=stripe)](https://stripe.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-INR-0C2340?style=for-the-badge&logo=razorpay)](https://razorpay.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

## 🌟 SaaS Platform Highlights

JobFoocus turns a master resume and job posting into tailored, ATS-friendly resume and cover letter packages, automatically categorizing and tracking applications across a Kanban pipeline.

This repository serves as a **portfolio implementation** showcasing key production SaaS architectural patterns:

- 🎨 **Design System & UI/UX Excellence**: Custom warm sunset & mineral dark themes, magazine-style Kanban pipeline, custom interactive document editor, floating AI prompt controls, and print-optimized PDF outputs.
- 🔐 **Privacy-First Zero-PII AI Architecture**: Client-side tag-wrapping mask/demask pipeline ensuring candidate names, phones, emails, and portfolios are never transmitted to third-party LLMs.
- ⚡ **Atomic Database Concurrency**: Race-condition-free usage counters using custom PostgreSQL `SECURITY DEFINER` RPC functions and strict Row-Level Security (RLS).
- 🌍 **Geo-Optimized Multi-Provider Payments**: Automatic geo-routing serving **Stripe** (USD/EUR) to international visitors and **Razorpay Subscriptions** (INR) to Indian visitors, backed by self-healing state reconciliation.
- 📊 **Dual-Layer Analytics & CAPI**: Full-funnel Meta Conversions API (CAPI) deduplicated against browser Meta Pixel via unique `event_id`, paired with Microsoft Clarity heatmaps and session recordings.
- 🧩 **Manifest V3 Browser Extension**: Deep-linked Chrome/Firefox extension with auto-extraction heuristics and single-click job capture.

---

## 🏗 System Architecture

```
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                          CLIENT LAYER                                   │
   │  ┌──────────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
   │  │ Next.js App Router   │  │ Browser Extension│  │ Meta Pixel /      │  │
   │  │ (Kanban & Editor)    │  │ (Manifest V3)    │  │ Microsoft Clarity │  │
   │  └──────────┬───────────┘  └────────┬─────────┘  └───────────────────┘  │
   └─────────────┼───────────────────────┼───────────────────────────────────┘
                 │                       │ Deep-link Pre-fill
                 ▼                       │
   ┌─────────────────────────────────────▼───────────────────────────────────┐
   │                    NEXT.JS SERVER / API ROUTES                          │
   │  ┌────────────────────────┐ ┌──────────────────┐ ┌───────────────────┐  │
   │  │ Server Storage Adapter │ │ AI Proxy & Gate  │ │ Geo Payment Router│  │
   │  │ (Auth-Checked Queries) │ │ (PII Mask/Demask)│ │ (Vercel Edge Geo) │  │
   │  └───────────┬────────────┘ └────────┬─────────┘ └─────────┬─────────┘  │
   └──────────────┼───────────────────────┼─────────────────────┼────────────┘
                  │                       │                     │
                  ▼                       ▼                     ▼
   ┌──────────────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
   │ Supabase Postgres (RLS)  │ │ OpenCode ZEN API │ │ Stripe & Razorpay    │
   │ • Atomic RPC Counter     │ │ (DeepSeek LLM)   │ │ Webhooks & Portals   │
   └──────────────────────────┘ └──────────────────┘ └──────────────────────┘
```

---

## 💎 Core SaaS Modules & Technical Implementation

### 1. 🎨 UI/UX System & Editorial Design Architecture
- **Warm Sunset & Mineral Dark Tokens**: Single-source-of-truth CSS custom properties (`--canvas`, `--surface`, `--ink`, `--steel`) eliminating theme bleed across light/dark modes.
- **Interactive Kanban Pipeline**: Drag-and-drop job application workflow with custom floating segmented navigation, status color indicators, and response date trackers.
- **AI Document Editor**: Full-HTML pass-through content-editable editor with natural language AI formatting, custom progress overlays, and real-time color customizers.
- **ATS-Optimized PDF Export**: Engineered `@page` print stylesheets (`print-color-adjust: exact`) guaranteeing zero multi-column breaks or ATS parsing issues.

### 2. 🔐 Privacy & Zero-PII AI Pipeline
JobFoocus implements a zero-trust PII masking pipeline (`src/lib/pii-utils.ts`):
1. **Extraction**: Client extracts PII fields (name, phone, email, socials, portfolio) into a secure profile.
2. **Masking**: Replaces PII in prompts with XML-style tags (`<PII_NAME>`, `<PII_EMAIL>`).
3. **LLM Execution**: The OpenCode ZEN API (DeepSeek V4 Flash Free model) processes only masked text.
4. **Demasking**: Returned document HTML is restored with the user's PII locally before saving to Postgres.

### 3. 🛡️ Database & Race-Condition-Free Usage Limits
- **Supabase Postgres + RLS**: All user-facing tables (`applications`, `documents`, `master_resumes`, `settings`, `user_categories`) enforce `auth.uid() = user_id`.
- **Atomic Usage RPC (`try_increment_usage`)**: Prevents parallel API race conditions by executing `UPDATE ... SET count = count + 1 WHERE count < cap` atomically in a single PostgreSQL statement.

### 4. 💳 Multi-Currency Payment System (Stripe + Razorpay)
- **Geo-Detection Middleware**: Inspects Vercel edge headers (`x-jf-region`) to automatically route users:
  - **India (`IN`)**: Serves INR prices via **Razorpay Subscriptions**.
  - **Europe (`EEA`)**: Serves EUR prices via **Stripe Checkout**.
  - **Rest of World (`OTHER`)**: Serves USD prices via **Stripe Checkout**.
- **Self-Healing Reconciliation**: The `/account` page reconciles subscription state with PSP servers on load, ensuring immediate entitlement access even if webhooks are delayed.
- **HMAC Signature Verification**: All webhook endpoints verify raw signatures (`stripe-signature` and `x-razorpay-signature`) with constant-time buffer comparisons.

### 5. 📊 Dual Analytics & Meta Conversions API (CAPI)
- **Client Pixel**: `beforeInteractive` script stub for browser-side event tracking.
- **Server CAPI Integration**: Server-side purchase event dispatching (`sendMetaCAPIEvent` in `src/lib/meta-capi.ts`) hashed via SHA-256 (`userData.em`).
- **Deduplication**: Shares matching `event_id` strings (`purchase_${sessionId}`) between browser and server events to ensure 100% accurate ad attribution.
- **Microsoft Clarity**: Integrated session tracking (`NEXT_PUBLIC_MICROSOFT_CLARITY_ID`) for UX heatmap analysis.

---

## 🛠️ Stack & Technologies

| Layer | Technologies Used |
|---|---|
| **Frontend Framework** | Next.js 14.2 (App Router), React 18, TypeScript (Strict Mode) |
| **Styling & Icons** | Tailwind CSS, Custom Theme Design System, SVG Brand Icons |
| **Database & Auth** | Supabase Postgres, Row-Level Security (RLS), Supabase Auth (Email + Google OAuth) |
| **Payment Gateways** | Stripe SDK (USD/EUR Checkout & Customer Portal), Razorpay SDK (INR Subscriptions) |
| **AI Integration** | OpenCode ZEN API (DeepSeek V4 Flash Free), Custom PII Masking Pipeline |
| **Analytics & Telemetry** | Meta Pixel + Server Conversions API (CAPI), Microsoft Clarity, Vercel Speed Insights |
| **Browser Extension** | Manifest V3 (Chrome, Firefox, Edge, Brave), Background Service Worker |
| **PDF Processing** | `pdfjs-dist` static worker setup for resume parsing |

---

## ⚡ Quick Start (Local Setup)

### 1. Clone & Install
```bash
git clone https://github.com/NiranjananPrajith/JobFoocus.git
cd JobFoocus
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

```env
# Core Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Gateway
OPENCODE_ZEN_API_KEY=your-opencode-zen-api-key

# Payments (Stripe & Razorpay)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_MAX=price_...

RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret
RAZORPAY_PLAN_ID_PRO=plan_...
RAZORPAY_PLAN_ID_MAX=plan_...

# Analytics
NEXT_PUBLIC_META_PIXEL_ID=your-meta-pixel-id
META_ACCESS_TOKEN=your-meta-capi-token
NEXT_PUBLIC_MICROSOFT_CLARITY_ID=your-clarity-id
```

### 3. Run Development Server
```bash
npm run dev
# → http://localhost:3000
```

---

## 🗄️ Database Setup (Supabase)

To set up a fresh database instance, open **Supabase Dashboard → SQL Editor**, paste the consolidated schema below, and click **Run**:

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

## 🧩 Browser Extension Packaging

The Manifest V3 extension (`extension/`) scrapes job board postings and deep-links into the dashboard:

```bash
# Build the distributable zip package:
npm run build:extension
# → public/extensions/build/jobfoocus-extension.zip
```

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).
