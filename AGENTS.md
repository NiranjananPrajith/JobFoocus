# AGENTS.md — JobFoocus developer & AI-agent guide

This file is the primary context for AI agents (and humans) working on
the JobFoocus codebase. `CLAUDE.md` is a one-line pointer to this file.
`README.md` is the operator-facing counterpart — read that for
deploy / Stripe / env setup questions.

---

## 1. System overview

JobFoocus is a Next.js 14 App Router app that turns a master resume +
job description into a tailored, ATS-friendly resume + cover letter,
files them under `YYYY-MM-DD_Company_Title`, and tracks application
status. There are three paid tiers, daily usage caps, an AI document
editor, and a Manifest V3 browser extension that scrapes job postings
and deep-links into the dashboard.

### High-level flow

```
browser extension                    web app
─────────────────                    ────────
content.js  ──┐                  ┌── /application         (pre-fill form)
              ├── background.js ─┤
context menu ─┘                  ├── /dashboard           (job list)
                                 ├── /document            (AI editor + viewer)
                                 ├── /account             (plan + usage)
popup ─────────────── click ──────┤
                                 └── /api/db/*            (CRUD via storage adapter)
                                              │
                                              ▼
                                      Supabase Postgres (RLS)
                                              ▲
                                              │
              /api/usage/*  /api/stripe/*  /api/ai/edit-document
                                              │
                                              ▼
                                 DeepSeek V4 Flash Free (via OpenCode ZEN)  +  Stripe API
```

### Source of truth for tier → limits

`src/lib/limits.ts` is the single source of truth. **Do not hard-code
tier numbers anywhere else.** Imported by:

- The client (`AddJobModal`, document editor, `/account`) for UX.
- The server (`/api/usage/*`, `/api/ai/edit-document` gate) for
  enforcement.

The Stripe price-id → tier mapping also lives there, so the webhook
can resolve tier from a row without re-reading env.

---

## 2. Module map

### 2.1 Data flow: client → server

**All client→server writes go through `src/lib/storage-adapter.ts`.**
Never have a `'use client'` component call Supabase directly — the
storage adapter adds the auth cookie, normalizes errors, and keeps the
data shape consistent.

The adapter posts to Next.js API routes under `src/app/api/db/`:

| Route                              | Backed by table      |
| ---------------------------------- | -------------------- |
| `/api/db/applications`             | `applications`       |
| `/api/db/documents`                | `documents`          |
| `/api/db/categories`               | `user_categories`    |
| `/api/db/master-resume`            | `master_resumes`     |
| `/api/db/settings`                 | `settings`           |
| `/api/db/export`                   | (read-only dump)     |
| `/api/db/import`                   | (bulk write)         |
| `/api/db/core`                     | (cross-table ops)    |

Each route does its own `await supabase.auth.getUser()` and 401s on
missing user. **Do not add a global auth wrapper** — the API exempt in
`middleware.ts` means these return 401 JSON, not a redirect.

### 2.2 The big singleton: `src/lib/storage-adapter.ts`

This is the largest file in the repo. Exports:

- `getApplications()`, `getApplication(category, folder)`,
  `getApplicationByUuid(uuid)`, `saveApplication(...)`, etc.
- `getDocuments(category, folder)`, `saveDocumentHTML(...)`.
- `getUserCategories()`, `saveUserCategory(...)`,
  `deleteUserCategory(...)` — enforces the 100-category soft cap.
- `getMasterResume()`, `saveMasterResume(...)`.
- `getSettings()`, `saveSettings(...)`.
- Constants: `SYSTEM_CATEGORIES = ['Uncategorized']`,
  `MAX_USER_CATEGORIES = 100`,
  `isSystemCategory(name)` (case-insensitive).
- The system `Uncategorized` row is created lazily by
  `ensureUncategorizedCategory()` on first use — both the extension
  pipeline and `AddJobModal` call this.

When extending the storage layer, **add the new function to the
adapter** (don't put Supabase calls in components), then thread it
through to the matching `/api/db/*` route.

### 2.3 AI: `src/lib/ai-generation.ts`

All LLM calls go through `zenChat(prompt, system)`:

- **Server-side** (`typeof window === 'undefined'`): calls the
  OpenCode ZEN OpenAI-compatible API directly with the `OPENCODE_ZEN_API_KEY`
  env var. Throws if the key is missing.
- **Client-side**: POSTs to `/api/ai`, which is a thin proxy that does
  the same call server-side. (CORS avoidance.)

The model is `'deepseek-v4-flash-free'`. The prompt is constructed with PII
masked via `maskPII(html, profile)` from `src/lib/pii-utils.ts`, and
the response is run through `demaskPII(html, profile)` before being
returned. The PII profile is a stable JSON blob generated on first
save of the master resume — see `pii-utils.ts`.

If you add a new AI call site, **always mask PII** and never log the
prompt body to the server console (it contains resume content).

### 2.4 AI editor: `src/app/api/ai/edit-document/route.ts`

- Auth required.
- **Server-side usage gate**: re-checks tier + today's counter before
  calling the model. Returns 402 with the full limits payload on cap.
- Returns the full new HTML; the client saves it via
  `saveDocumentHTML` (which is **not** gated — saving a doc you've
  already edited isn't an "edit" in the cap sense).

The cap is on AI-driven edits, not on every document write. Other
write paths (restore-from-trash, bulk import, the AI pipeline that
*generates* documents) don't increment the counter.

### 2.5 Stripe: `src/lib/stripe.ts` + three routes

`getStripe()` is a lazy singleton that reads `STRIPE_SECRET_KEY` once
and caches the client. `apiVersion` is pinned to `'2026-05-27.dahlia'`
with an `as any` cast — see the file's comment for why (the SDK
doesn't re-export the narrow type from the root namespace).

| Route                                       | Purpose                          |
| ------------------------------------------- | -------------------------------- |
| `POST /api/stripe/create-checkout-session`  | Resolve/create customer, build Checkout Session in `mode: 'subscription'`, return `{ url }` |
| `POST /api/stripe/create-portal-session`    | Look up `stripe_customer_id`, open a Customer Portal session |
| `POST /api/stripe/webhook`                  | Verify signature against `STRIPE_WEBHOOK_SECRET`, upsert `subscriptions` |

Webhook contract:

- Reads the **raw body** via `request.text()` (not `request.json()`).
- `export const dynamic = 'force-dynamic'` so Next.js doesn't try to
  cache or parse the body.
- Handles: `checkout.session.completed`,
  `customer.subscription.created/updated/deleted`,
  `invoice.payment_failed`.
- Upserts the `subscriptions` row by `user_id` (PK). Idempotency comes
  from the PK + the natural Stripe subscription ID — replays are safe.

`payment_method_types` is **intentionally omitted** from the checkout
session. Stripe picks the eligible methods dynamically from the
Dashboard's payment-method configuration. The platform best-practices
doc forbids passing this parameter except for Terminal (in-person)
integrations.

### 2.6 Usage cap enforcement

| File                                  | Role                                          |
| ------------------------------------- | --------------------------------------------- |
| `src/lib/limits.ts`                   | `TIER_LIMITS`, `tierFromPriceId`, `tierFromSubscription` |
| `src/lib/subscription.ts`             | `getSubscription(userId)`, `getEffectiveTier(userId)` |
| `src/lib/usage.ts`                    | `getOrCreateTodayUsage`, `getTodayUsageReadOnly`, `tryIncrement` (calls the RPC) |
| `supabase/migrations/005_*.sql`       | `try_increment_usage(user_id, action, cap)` — atomic SQL |
| `src/app/api/usage/check/route.ts`    | Pre-flight `{ allowed, tier, used, limit }`   |
| `src/app/api/usage/increment/route.ts`| Atomic bump, 402 on cap                       |
| `src/components/UpgradePromptModal.tsx` | Shared "you hit the cap" modal              |

**Defense in depth.** The client calls `/api/usage/check` before
kicking off an expensive action (job add, document edit) and shows
the upgrade modal if `allowed: false`. After the action succeeds, it
calls `/api/usage/increment`. The server also gates `/api/ai/edit-document`
on the cap, so a determined user with curl can't bypass the limit.
Both gates are required — don't remove the client one because "the
server has it too" (UX is the whole point of the client check).

**Fail-closed.** If `getEffectiveTier` throws or the DB is unreachable,
it returns `tier: 'free'`. Never `tier: 'max'`. If we can't determine
the tier, the user is treated as free.

**`cancel_at_period_end` does not demote.** A user who's canceled but
still inside the current period keeps their paid limits until the
webhook fires `customer.subscription.deleted` and the row updates to
`status: 'canceled'` (which `tierFromSubscription` then resolves to
`free`).

### 2.7 Browser extension: `extension/`

- `manifest.json` — MV3, declares both `background.service_worker`
  and `background.scripts` (the latter is for Firefox MV3).
- `background.js` — service worker. Defines `DASHBOARD_URL` at the
  top (line 12). Scrape pipeline + message router. Uses
  `chrome.tabs.query({ url: DASHBOARD_ORIGIN + '/*' })` to find an
  existing dashboard tab before opening a new one.
- `content.js` — heuristic job-page check + field extraction. **Do
  not** add a hard-coded site allowlist; the heuristic in
  `looksLikeJobPage()` is the only gate.
- `popup.html` / `popup.js` — popdown UI with "Add Job" button +
  inline error states.
- `scripts/build-extension.mjs` — zips `extension/` into
  `public/extensions/build/`.

**Changing the dashboard URL?** Edit `DASHBOARD_URL` at the top of
`extension/background.js`, then `npm run build:extension`. The
`/extension-install` page downloads the rebuilt zip.

### 2.8 Middleware: `src/middleware.ts`

Three things it does:

1. Refreshes the Supabase session cookie on every request (the
   `getAll` / `setAll` dance).
2. Redirects unauthenticated users away from protected pages to
   `/login?next=<original-path>`. The `?next=` round-trip is used by
   the extension's deep-link flow.
3. Exempts `/api/*` and a hard-coded public-route list
   (`/`, `/features`, `/pricing`, `/privacy-policy`,
   `/terms-of-service`, `/extension-install`).

The `matcher` regex at the bottom is a denylist of static asset
extensions — those never hit the middleware. When you add a new file
type (e.g. a new font), update the matcher.

---

## 3. Conventions

### 3.1 TypeScript & style

- **Strict mode** is on (`tsconfig.json`). No `any` unless there's a
  documented reason (the `apiVersion` cast in `src/lib/stripe.ts` is
  the canonical example).
- **No `console.log` in server code paths you don't own** — log
  prefixes: `[stripe-webhook]`, `[usage]`, `[subscription]`, `[AI]`.
  Operators grep by these.
- **Comments are first-class.** The codebase is heavily commented
  because the *why* is often non-obvious. Match the surrounding
  density; don't strip comments because the code "looks obvious."
- **Server-only modules import guard implicitly** by being imported
  only from server contexts. `src/lib/stripe.ts` and
  `src/lib/supabase-utils/service.ts` (the service-role client) must
  never be transitively imported from a `'use client'` file. If you
  need to expose one of their functions to the client, put the
  thin-wrapper API route in `src/app/api/`.

### 3.2 Database & RLS

- **User-facing tables use RLS.** Default policy: `auth.uid() = user_id`
  for SELECT. INSERT/UPDATE/DELETE are deliberately not granted —
  the server is the only writer (via the service-role key in API
  routes or in the RPC).
- **New migration?** Append a `00N_*.sql` to `supabase/migrations/`.
  Use `create table if not exists`, `drop policy if exists` +
  `create policy` for idempotency. Add a header comment with the
  rollback.
- **Atomic SQL for race-prone increments.** Don't try to express
  `SET x = x + 1 WHERE x < cap` from JS — wrap it in a `SECURITY
  DEFINER` RPC. See `try_increment_usage` for the template.

### 3.3 Adding a new endpoint

1. Decide if it needs auth. Most do.
2. If client-callable: put it under `src/app/api/<area>/<thing>/route.ts`.
3. Server-side:
   - `const supabase = await createClient()` (the cookie-bound client,
     not the service-role one).
   - `const { data: { user } } = await supabase.auth.getUser();` — 401
     if missing.
   - For writes that need to bypass RLS, switch to
     `createServiceClient()` from `src/lib/supabase-utils/service.ts`.
4. JSON body parsing: wrap in `try { body = await request.json() } catch
   { return 400 }`. Don't let an unparseable body crash the route.
5. Stripe routes: see §2.5 for the webhook raw-body requirement.
6. **Don't add a `try { ... } catch (e) { return 500 }` that swallows
   the error message.** Log it with a `[area]` prefix and surface the
   message in the response so operators can see what went wrong in
   the Vercel logs.

### 3.4 Adding a new tier (or changing limits)

1. Edit `TIER_LIMITS` in `src/lib/limits.ts`.
2. Add a matching `STRIPE_PRICE_ID_<NAME>` env var.
3. Add a case to `tierFromPriceId`.
4. Update the marketing copy in `src/app/(main)/pricing/page.tsx` and
   the `TIER_LABEL` / `TIER_PRICE_USD` maps in `limits.ts`.
5. New migration to add any new schema (probably none for limit
   changes — limits are constants in code).

---

## 4. Common pitfalls

- **Stripe mode skew.** A test-mode secret key with a live-mode price
  ID returns 500 from `create-checkout-session` with `No such price`.
  Verify all four Stripe env vars are from the same mode.
- **Service-role key in a client bundle.** The string
  `SUPABASE_SERVICE_ROLE_KEY` must never appear in `.next/static/`.
  If it does, you imported `createServiceClient` from a `'use client'`
  file. Search the bundle: `grep -r "SUPABASE_SERVICE_ROLE_KEY" .next/static`.
- **Webhook signature failures on Vercel.** If you ever wrap the
  webhook route with a body-parsing middleware, signature verification
  will fail. The route uses `request.text()` and `dynamic =
  'force-dynamic'` precisely to keep the body raw.
- **Tier mismatch on a fresh test user.** A new signup has no
  `subscriptions` row at all. `getSubscription()` returns `null`,
  `tierFromSubscription(null)` returns `'free'`. Don't write
  `if (!subRow) return 500` — the absence of a row is the *Free tier*.
- **Counter resets at UTC midnight.** Documented on the `/account`
  page as "Resets in Xh Ym (midnight UTC)". If a user is in a
  different timezone, the reset can be jarring — but it's consistent
  across the fleet.
- **Extension DASHBOARD_URL.** The committed default is
  `https://job-foocus.vercel.app/application`. If you're running
  locally, change it to `http://localhost:3000/application` and
  rebuild the zip, or the extension will deep-link to prod.

---

## 5. Verifying a change

This project uses runtime observation, not unit tests. To verify a
change:

1. `npm run dev`.
2. Drive the affected route in a real browser (or `curl` for API
   routes). Watch `/tmp/dev.log` and the Vercel runtime logs.
3. For Stripe changes: use the Stripe CLI to forward webhooks
   (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
   and the test-mode dashboard.
4. For extension changes: rebuild the zip, load the unpacked
   extension from `extension/`, click around on a few real job
   boards, watch the popdown for the heuristic-fail inline error.

The Vercel runtime logs are the source of truth for what the
deployed app actually did. Filter by `[stripe-webhook]`, `[usage]`,
`[subscription]`, `[AI]` to find specific subsystem traces.

---

## 6. What's not in this repo

- **The Supabase project itself.** The schema lives here as SQL
  files; the running instance is configured via the three Supabase
  env vars. Apply migrations in the SQL Editor (or via
  `supabase db push` if you've linked the project).
- **The Stripe products.** You create them in the Stripe dashboard;
  the price IDs are the only thing the app needs.
- **The deployed extension zip for previous versions.** Only the
  `jobfoocus-extension.zip` (latest) is committed. The versioned
  `jobfoocus-extension-v*.zip` files are gitignored to avoid
  accumulating stale builds.
- **Customer data.** Don't add fixtures, seed scripts, or test users
  to the repo. The database is the database; tests are runtime
  observations against a real env.

---

## 7. Quick reference

- **Tier limits**: `src/lib/limits.ts`
- **Server-side usage gate**: `src/app/api/ai/edit-document/route.ts`
- **Webhook raw-body gotcha**: `src/app/api/stripe/webhook/route.ts`
- **PII masking**: `src/lib/pii-utils.ts`
- **Auth gate**: `src/middleware.ts`
- **Build the extension zip**: `npm run build:extension`
- **Migrations**: `supabase/migrations/00N_*.sql`
- **The single client→server write API**: `src/lib/storage-adapter.ts`
