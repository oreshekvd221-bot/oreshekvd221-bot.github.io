// QA screenshot capture: drives the real site with Playwright and saves
// screenshots sized to match the Figma PNG exports exactly (1440x* at 2x
// for desktop = 2880px wide shots, 402x* at 2x for mobile = 804px wide
// shots), so they can be diffed pixel-for-pixel against reference/figma.
//
// Usage: node qa/capture.mjs [scenario-id ...]   (no args = all scenarios)
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:4321';

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 402, height: 900 };
const DSF = 2;

const TOUR_SLUG = 'mountain-trekking-georgia';
const DEPARTURE = '2027-09-28';
const CHECKOUT_URL = `/checkout?tour=${TOUR_SLUG}&departure=${DEPARTURE}&adults=2&children=0`;

async function setMockSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'wanderloop:users',
      JSON.stringify({ 'vera@example.com': { firstName: 'Vera', lastName: 'Sokolova', email: 'vera@example.com', phone: '+1 555 000-0000' } }),
    );
    localStorage.setItem('wanderloop:session', 'vera@example.com');
  });
}

// Each browser context (and so each scenario run) has its own isolated
// localStorage — a booking made by actually running the checkout flow in
// one scenario doesn't carry over to another. For /account/bookings to
// show real booking cards (not the empty state), this seeds two bookings
// directly in the shape src/scripts/bookings.js reads, matching its
// localStorage keys (wanderloop:booking:<id> + the wanderloop:bookings
// id list).
async function seedMockBookings(page) {
  await page.addInitScript(() => {
    const bookings = [
      {
        id: 'WL-10482',
        status: 'confirmed',
        tourSlug: 'mountain-trekking-georgia',
        tourName: 'Mountain Trekking, 6 Days',
        place: 'Georgia · Svaneti',
        departureStart: '2027-09-28',
        departureLabel: 'Sep 28 — Oct 3, 2027',
        adults: 2,
        children: 0,
        dueNow: 2480,
      },
      {
        id: 'WL-20957',
        status: 'waitlist',
        tourSlug: 'mountain-trekking-georgia',
        tourName: 'Mountain Trekking, 6 Days',
        place: 'Georgia · Svaneti',
        departureStart: '2027-11-14',
        departureLabel: 'Nov 14 — 19, 2027',
        adults: 1,
        children: 0,
        dueNow: 1240,
      },
    ];
    for (const b of bookings) localStorage.setItem(`wanderloop:booking:${b.id}`, JSON.stringify(b));
    localStorage.setItem('wanderloop:bookings', JSON.stringify(bookings.map((b) => b.id)));
  });
}

async function fillLeadTraveler(page) {
  await page.fill('#t0first', 'Vera');
  await page.fill('#t0last', 'Sokolova');
  await page.fill('#t1first', 'Marco');
  await page.fill('#t1last', 'Rossi');
  await page.fill('#email', 'vera@example.com');
  await page.fill('#phone', '+1 555 000-0000');
}

async function fillCard(page) {
  await page.fill('#cardnum', '4242424242424242');
  await page.fill('#exp', '12/29');
  await page.fill('#cvc', '123');
  await page.fill('#cardname', 'VERA SOKOLOVA');
}

// Each scenario: id, figma path (relative to reference/figma), viewport,
// and a setup(page) that navigates + drives the UI into the right state.
// fullPage controls whether we capture the whole scrollable page or just
// the viewport (Figma frames are full-page, so default true).
const scenarios = [
  {
    id: 'home',
    figma: { desktop: 'desktop/01-home.png', mobile: 'mobile/01-home.png' },
    async setup(page) {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    },
  },
  {
    id: 'tour-page',
    figma: { desktop: 'desktop/02-tour-page.png', mobile: 'mobile/02-tour-page.png' },
    async setup(page) {
      await page.goto(`${BASE_URL}/tours/${TOUR_SLUG}`, { waitUntil: 'networkidle' });
    },
  },
  {
    id: 'checkout-details',
    figma: { desktop: 'desktop/03-checkout-details.png', mobile: 'mobile/03-checkout-details.png' },
    async setup(page) {
      await page.goto(`${BASE_URL}${CHECKOUT_URL}`, { waitUntil: 'networkidle' });
    },
  },
  {
    id: 'checkout-payment',
    figma: { desktop: 'desktop/04-checkout-payment.png', mobile: 'mobile/04-checkout-payment.png' },
    async setup(page) {
      await page.goto(`${BASE_URL}${CHECKOUT_URL}`, { waitUntil: 'networkidle' });
      await fillLeadTraveler(page);
      await page.click('[data-continue-btn]');
      await page.waitForSelector('[data-block="2"][data-state="active"]');
    },
  },
  {
    id: 'checkout-details-error',
    figma: { desktop: 'desktop/05-checkout-details-error.png', mobile: 'mobile/05-checkout-details-error.png' },
    async setup(page) {
      await page.goto(`${BASE_URL}${CHECKOUT_URL}`, { waitUntil: 'networkidle' });
      await page.click('[data-continue-btn]');
      await page.waitForSelector('.field--invalid, [data-field].is-invalid, .field__error:not(:empty)');
    },
  },
  {
    id: 'checkout-hold-expired',
    figma: { desktop: 'desktop/06-checkout-hold-expired.png', mobile: 'mobile/06-checkout-hold-expired.png' },
    async setup(page) {
      await page.goto(`${BASE_URL}${CHECKOUT_URL}&mock=expired`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-view="expired"]:not([hidden])');
    },
  },
  {
    id: 'checkout-no-vacancies',
    figma: { desktop: 'desktop/07-checkout-no-vacancies.png', mobile: 'mobile/07-checkout-no-vacancies.png' },
    async setup(page) {
      await page.goto(`${BASE_URL}${CHECKOUT_URL}&mock=soldout`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-view="soldout"]:not([hidden])');
    },
  },
  {
    id: 'checkout-booking-confirmed',
    figma: { desktop: 'desktop/08-checkout-booking-confirmed.png', mobile: 'mobile/08-checkout-booking-confirmed.png' },
    async setup(page) {
      await page.goto(`${BASE_URL}${CHECKOUT_URL}`, { waitUntil: 'networkidle' });
      await fillLeadTraveler(page);
      await page.click('[data-continue-btn]');
      await page.waitForSelector('[data-block="2"][data-state="active"]');
      await fillCard(page);
      await page.click('[data-pay-btn]');
      await page.waitForURL(/\/checkout\/confirmation/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
    },
  },
  {
    id: '404',
    figma: { desktop: 'desktop/09-404.png', mobile: 'mobile/09-404.png' },
    async setup(page) {
      await page.goto(`${BASE_URL}/this-page-does-not-exist`, { waitUntil: 'networkidle' });
    },
  },
  {
    id: 'my-bookings',
    figma: { desktop: 'desktop/my-bookings.png', mobile: 'mobile/my-bookings.png' },
    async setup(page) {
      await setMockSession(page);
      await seedMockBookings(page);
      await page.goto(`${BASE_URL}/account/bookings`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-bookings-content]:not([hidden])');
    },
  },
  {
    id: 'profile',
    figma: { desktop: 'desktop/profile.png', mobile: 'mobile/profile.png' },
    async setup(page) {
      await setMockSession(page);
      await page.goto(`${BASE_URL}/account/profile`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-profile-content]:not([hidden])');
    },
  },
];

async function captureOne(browser, scenario, variant, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: DSF,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    await scenario.setup(page);
    await page.waitForTimeout(150); // let fonts/images settle
    const outPath = path.join(SHOTS, `${scenario.id}-${variant}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`OK   ${scenario.id}-${variant} -> ${path.relative(ROOT, outPath)}`);
  } catch (err) {
    console.error(`FAIL ${scenario.id}-${variant}: ${err.message}`);
  } finally {
    await context.close();
  }
}

async function main() {
  const only = process.argv.slice(2);
  const list = only.length ? scenarios.filter((s) => only.includes(s.id)) : scenarios;
  if (!list.length) {
    console.error('No matching scenarios. Known ids:', scenarios.map((s) => s.id).join(', '));
    process.exit(1);
  }
  const browser = await chromium.launch({ headless: true, args: ['--disable-extensions', '--hide-scrollbars'] });
  for (const scenario of list) {
    if (scenario.figma.desktop) await captureOne(browser, scenario, 'desktop', DESKTOP);
    if (scenario.figma.mobile) await captureOne(browser, scenario, 'mobile', MOBILE);
  }
  await browser.close();
}

main();
