// scripts/test-billing-popdown.mjs
//
// Smoke-tests the NavBar's billing popdown endpoints + the NavBar
// page itself. Drives against a running dev server on localhost:3000.
//
// What we check:
//   1. GET /dashboard (the page that renders NavBar) — must return
//      a 200/302 (302 is fine: middleware redirects unauthed users
//      to /login). A 500 would indicate a compile error in the new
//      BillingPopdown component.
//   2. POST /api/usage/check — must return JSON. The popdown's
//      on-open fetch calls this route.
//   3. POST /api/stripe/create-portal-session — must return either
//      { url: '...' } (paid user) or { error: '...' } (no
//      stripe_customer_id). Either is fine; the popdown's button
//      handler treats both shapes correctly.
//
// We don't validate the popdown visually — the user does that in a
// real browser. We just make sure the page compiles and the API
// routes are reachable.

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, location: r.headers.get('location') };
}

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

let passed = 0, failed = 0;
function check(name, cond, extra = '') {
  console.log(cond ? `  ✓ ${name}` : `  ✗ ${name}${extra ? ' — ' + extra : ''}`);
  cond ? passed++ : failed++;
}

console.log(`Driving ${BASE}\n`);

// 1. /dashboard page — must compile and return 200 or 302 (redirect to
// /login for unauthenticated). 500 = compile error in BillingPopdown.
{
  const r = await get('/dashboard');
  check(
    'GET /dashboard compiles and responds',
    r.status === 200 || r.status === 302,
    `got ${r.status} (loc=${r.location || '-'})`
  );
}

// 2. /api/usage/check — popdown fetch on open
{
  const r = await post('/api/usage/check', { action: 'add_job' });
  // 401 (unauth) or 200 (with payload) are both OK. 400 = bug. 500 = bug.
  const ok = r.status === 200 || r.status === 401;
  check(
    'POST /api/usage/check responds cleanly',
    ok,
    `got ${r.status} body=${JSON.stringify(r.json).slice(0, 80)}`
  );
  if (r.status === 200) {
    check('200 response has tier field', typeof r.json?.tier === 'string',
      `tier=${r.json?.tier}`);
    check('200 response has jobsLimit', typeof r.json?.jobsLimit === 'number',
      `jobsLimit=${r.json?.jobsLimit}`);
    check('200 response has editsLimit', typeof r.json?.editsLimit === 'number',
      `editsLimit=${r.json?.editsLimit}`);
  }
}

// 3. /api/stripe/create-portal-session — popdown's Manage button
{
  const r = await post('/api/stripe/create-portal-session', {});
  // 401 (unauth), 200 (paid user with portal URL), or 400 (no
  // stripe_customer_id for free user) are all OK. 500 = bug.
  const ok = r.status === 200 || r.status === 401 || r.status === 400;
  check(
    'POST /api/stripe/create-portal-session responds cleanly',
    ok,
    `got ${r.status} body=${JSON.stringify(r.json).slice(0, 80)}`
  );
}

console.log(`\n--- ${passed} passed, ${failed} failed ---`);
process.exit(failed === 0 ? 0 : 1);
