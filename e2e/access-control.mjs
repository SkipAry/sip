/**
 * End-to-end check of the access model.
 *
 * Run against a built preview:
 *   npm run build && npm run preview &
 *   node e2e/access-control.mjs
 *
 * It asserts the things unit tests cannot: that the sign-in gate holds, that a
 * member cannot reach the admin console even by typing its route, that a draw
 * publishes exactly once, and that credentials the admin generates actually
 * sign in.
 */

import { chromium } from 'playwright';
const base = 'http://127.0.0.1:4173/';
// Honour a pre-installed browser when one is provided, otherwise let
// Playwright resolve its own.
const executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const results = [];
const fail = (m) => results.push(`FAIL ${m}`);
const pass = (m) => results.push(`ok   ${m}`);

async function login(page, id, password) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.fill('input[autocomplete="username"]', id);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(900);
}

// 1. Login gate
{
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  const gated = await page.locator('text=Sign in').first().isVisible();
  gated ? pass('unauthenticated visitors see the sign-in screen') : fail('dashboard rendered without sign-in');

  // Wrong password
  await page.fill('input[autocomplete="username"]', 'SS-100244');
  await page.fill('input[type="password"]', 'wrong-password');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  const err = await page.locator('[role="alert"]').first().textContent().catch(() => null);
  err?.includes('does not match') ? pass('wrong password is rejected') : fail(`wrong password not rejected: ${err}`);
  await page.close();
}

// 2. Member role
{
  const page = await ctx.newPage();
  await login(page, 'SS-100244', 'SUVARNA-MEMBER-2026');
  const nav = await page.locator('nav[aria-label="Sections"] button').allTextContents();
  nav.includes('Overview') ? pass('member sees Overview') : fail(`member nav wrong: ${nav}`);
  !nav.includes('Spin & Win') ? pass('member has no Spin & Win link') : fail('member can see Spin & Win');
  !nav.includes('Members') ? pass('member has no Members link') : fail('member can see Members');

  // Force the admin route by hash
  await page.goto(`${base}#spin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const body = await page.locator('main').innerText();
  const leaked = body.includes('Run the monthly spin') || body.includes('Admin-only control');
  !leaked ? pass('member forcing #spin is redirected away') : fail('member reached the spin console via hash');
  await page.close();
}

// 3. Admin role + spin + member creation
{
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'ADMIN-001', 'SUVARNA-ADMIN-2026');
  const nav = await page.locator('nav[aria-label="Sections"] button').allTextContents();
  nav.includes('Spin & Win') ? pass('admin sees Spin & Win') : fail(`admin nav wrong: ${nav}`);
  !nav.includes('Overview') ? pass('admin does not get the member overview') : fail('admin sees member Overview');

  await page.goto(`${base}#spin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.click('button:has-text("Spin for month 1")');
  await page.waitForTimeout(3400);
  const after = await page.locator('main').innerText();
  /month 1 winner/i.test(after) ? pass('admin draw produces a winner') : fail('draw produced no winner');

  // Re-drawing month 1 must be impossible
  const btn = await page.locator('button:has-text("Spin for month 2")').count();
  btn === 1 ? pass('the console advances to month 2') : fail('console did not advance past month 1');

  // Members page
  await page.goto(`${base}#members`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.fill('input[placeholder="Anjali Verma"]', 'Test Member');
  await page.click('button:has-text("Create member")');
  await page.waitForTimeout(1200);
  const memberBody = await page.locator('main').innerText();
  const idMatch = memberBody.match(/SS-\d{6}/);
  const pwMatch = memberBody.match(/[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}/);
  idMatch ? pass(`generated member id ${idMatch[0]}`) : fail('no generated member id shown');
  pwMatch ? pass(`generated password ${pwMatch[0]}`) : fail('no generated password shown');

  // The new credentials must actually work
  if (idMatch && pwMatch) {
    await page.click('button:has-text("Sign out")');
    await page.waitForTimeout(500);
    await login(page, idMatch[0], pwMatch[0]);
    const signedIn = await page.locator('nav[aria-label="Sections"]').count();
    signedIn === 1 ? pass('new member can sign in with the generated credentials') : fail('generated credentials do not work');
  }
  errors.length === 0 ? pass('no page errors') : fail(`page errors: ${errors.join('; ')}`);
  await page.close();
}

// 4. Member sees the published result
{
  const page = await ctx.newPage();
  await login(page, 'SS-100244', 'SUVARNA-MEMBER-2026');
  await page.goto(`${base}#savings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const body = await page.locator('main').innerText();
  /published/i.test(body) ? pass('member sees the published draw badge') : fail('member does not see published results');
  const canSpin = await page.locator('button:has-text("Spin")').count();
  canSpin === 0 ? pass('member has no spin control anywhere') : fail('member has a spin button');
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
const failed = results.some((r) => r.startsWith('FAIL'));
console.log(failed ? '\n>>> FAILURES PRESENT' : '\n>>> ALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
