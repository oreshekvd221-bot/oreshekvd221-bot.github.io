# Wanderloop

Small-group, fixed-departure tour booking site. It is a portfolio project: the goal is a polished, accessible, interactive front end with every state designed (low spots, sold out, hold expired, payment declined). There are no real payments and no real guides.

## About the owner

- Veronika is a UI/UX designer learning HTML, CSS and JavaScript. She works in VS Code.
- **Talk to her in Russian.** Keep code, comments, commit messages and file names in English.
- Explain non-obvious decisions in one or two plain sentences. Do not assume she knows build tooling. Prefer readable code over clever code.
- The UI language of the site is English.

## Sources of truth (in this order)

1. **The Figma PNG exports in `reference/figma/`** are the source of truth for visuals (the Figma file is on a free plan, so it cannot be read by link or by tool: do not try). Screens are in `desktop/` and `mobile/`, repeated parts (header, footer, tour card) are in `components/`. Build each repeated part once as a component from its `components/` PNG. The PNGs are for layout, style and states only: **the text, dates, prices, spot counts and country labels in them are placeholders** (they still show 2026 dates, "2 spots left" for Sep 28, "1 spots left", and a Georgia label on the Mezcal card). Always render content from `tours.json`, never copy it from a PNG. All PNGs are 2x (desktop 2880 px wide, mobile 804 px wide). Exact colors, fonts and spacing come from `src/styles/tokens.css`; if a value is not in the tokens or readable from a PNG, ask Veronika instead of guessing. Figma file, for her reference only: https://www.figma.com/design/SnDOwATqmu62RQDeKjuz9i/Wanderloop
2. `docs/project-brief.md` is the source of truth for scope, routes, rules, accessibility and stack.
3. `src/data/tours.json` is the only source of tour content and departures. Never invent tours, dates, prices or copy. If something is missing, ask.
4. `src/styles/tokens.css` holds the design tokens (colors, type, spacing, radius, shadow). Never hardcode a color, font size or spacing that exists as a token.
5. `reference/prototypes/` holds the HTML prototypes (checkout, mobile header and search). They are a **behavior reference only**: copy the logic and states, not the markup or CSS. If a prototype and the Figma PNGs disagree on how something looks, the PNGs win.

## Stack

- **Astro** (static output) with plain HTML, CSS and vanilla JavaScript. No React, no Vue, no Tailwind, no UI kit. Ask before adding any dependency.
- Node.js. Commands: `npm run dev` (local), `npm run build` (static build), `npm run preview`.
- Data: `tours.json`. No database and no backend in the first version.
- Login and bookings are **mocked** with `localStorage`. Payments are mocked. Never store or log real card data, even in tests.
- Fonts: Jost (self-hosted). Icons and logo: SVG in `src/assets`.
- Tests: Playwright for the booking flow, axe for accessibility. Run them before saying a task is done.

## Folder structure

```
CLAUDE.md
docs/project-brief.md
reference/            Figma PNG frames (2x) and the HTML prototypes
src/
  data/tours.json
  styles/tokens.css, global.css
  components/         Header, SearchBar, TourCard, Footer, Modal, Timer, ...
  layouts/
  pages/
  scripts/            vanilla JS modules (search, filters, booking, hold timer)
  assets/images/<imageFolder>/   photos, folder name = "imageFolder" in tours.json
```

### What exists today (before scaffolding)

The project folder already contains: `icons-named/` (19 SVG icons with clear names, see its `README.txt`; naming is `<what>-<style>-<size>.svg`, colors are baked into the files; `icons/` is the old folder with the original names, ignore it and copy only from `icons-named/`), `Logo/` (`desktop-logo.svg`, `mobil-logo.svg`), `Wanderloop-img/NN-slug/` (photos per tour; the folder name equals `imageFolder` in the data) and `tours.json` at the root. When you scaffold the Astro project, **copy** these into the structure above (`src/assets/icons` from `icons-named/`, `src/assets/logo`, `src/assets/images`, `src/data/tours.json`) and keep the originals until she confirms the site works. Some photos are 5 to 11 MB: never serve them as they are, resize and convert them (WebP or AVIF, responsive sizes) in the build, and keep the originals untouched. Use the logo files for the header: desktop on wide screens, `mobil-logo.svg` on mobile.

## Routes

| Page | Route | Notes |
|---|---|---|
| Home | `/` | Header with search, filters, tour picks, footer |
| Catalog and results | `/tours` | Query: `?dest=&date=&adults=&children=` |
| Tour page | `/tours/[slug]` | 12 pages generated from `tours.json` |
| Checkout | `/checkout` | Query: `?tour=&departure=&adults=&children=` |
| Confirmation | `/checkout/confirmation` | Query: `?booking=<id>`. Booking data comes from `localStorage` (the site is static, so ids cannot be prerendered) |
| My bookings | `/account/bookings` | Redirect to sign-in if signed out |
| Profile | `/account/profile` | Redirect to sign-in if signed out |
| Sign in and register | modals, no route | Close on Esc and the Close button; focus returns to the opener |
| 404 | `/404` | Design: `reference/figma/desktop/09-404.png` and `mobile/09-404.png`. Buttons: "Browse all trips" (`/tours`) and "Back to home" (`/`) |

Footer links: About us, How it works, Blog, Contact, All trips, Popular destinations, Upcoming departure dates, Help center, Booking terms, Cancellations & refunds, FAQ, Privacy Policy, Terms of Service. **Do not create pages for them.** Only "All trips" works (`/tours`); the rest stay in the footer as inactive links.

Footer design: desktop `reference/figma/components/footer.png`, mobile `reference/figma/components/footer-mobile.png` (same style as desktop, scaled down: logo and tagline on top, the three link columns side by side with wrapping, copyright and legal links stacked at the bottom). The copyright year is the current year (`new Date().getFullYear()`), never hardcoded.

Dates: use only the dates in `tours.json`. Any other date you see in a PNG is a placeholder from an earlier draft and must be ignored.

Guest checkout is allowed: users can book without an account.

## Business rules (implement exactly)

- `spotsLeft = total - booked`. Chip text: `Full` at 0, `N spots left` at 1 to 3 (singular `1 spot left`), `N spots` above 3. Use the `chip` field from the data or the same rule.
- A departure fits a group only if `spotsLeft >= adults + children`. If the group grows and the chosen date no longer fits, clear the date and show a message.
- Children take a spot. Child price is `round(adultPrice * 0.5)` (`priceChild` in the data).
- Payment: pay in full, or a 30% deposit now with the rest due 30 days before departure.
- Free cancellation until 30 days before departure. Compute the date from the booked departure's start date; never write it as text.
- Seat hold at checkout: 15:00 timer. Warn at 3:00 and show a button **"Extend by 5 minutes"** (works once per hold; a new hold resets it). At 0:00 show the "hold expired" state, release the seats, offer "Hold spots again".
- Sold out during checkout: show the sold-out state with the next available date and a waitlist option.
- Minimum group is 3 travelers for every tour (`minGroup`). If fewer than 3 are booked when the departure is due to run, it is cancelled and everyone is refunded in full.
- Promo code in the prototype: `WANDER10` gives 10% off.
- Departures in the past are not shown on the site.
- Departure end date is `start + durationDays - 1`. Departures use 2027 and later dates. Georgia · Svaneti runs Sep 28 to Oct 3, 2027, with 3 of 8 spots left.
- Guides' business model (commission per booking) is documentation only. Do not build a guide dashboard.

## Accessibility (WCAG 2.2 AA, required)

- Colors follow Figma exactly (Veronika's decision, see Open items), so the contrast ratios of the Figma palette are accepted. Do not change colors for contrast.
- Everything works with a keyboard. Visible focus ring (3:1). A "Skip to content" link at the top.
- Status is never color only: scarce, full and error states always include text, errors also an icon.
- Every form field has a visible label. Errors are linked with `aria-describedby`, there is an error summary on submit, and focus moves to the first error.
- Modals trap focus, close on Esc, and return focus to the opener.
- Hold timer: do not announce every second. Update the `aria-live` region only at the 3:00 warning and at expiry. After "Extend by 5 minutes", keep focus on the timer block and announce the change with `role="status"`.
- One `h1` per page, no skipped heading levels, landmarks (header, main, footer, nav), meaningful `alt` on tour photos, `lang="en"`.
- Respect `prefers-reduced-motion`. Toasts use `role="status"`, stay at least 5 seconds and never steal focus.
- Touch targets 44px or more on mobile. Min font size 12px for captions, 14px for body. Works at 320px width and at 200% zoom.

## Responsive

- Design frames: desktop 1440 (40px side padding, 1360 max content width) and mobile. Build mobile-first and fluid. The mobile frame is 402px wide (content 362px, 20px side padding). Ignore the older prototypes, which use 390.
- Checkout is 1120px wide on desktop: form column plus a 400px sticky order summary.

## How to work

- Build in this order: tokens and layout, header and footer, catalog and filters, tour page, checkout, confirmation, account pages, then accessibility and test pass.
- After each page, compare it with the Figma frame at the same width and fix differences before moving on.
- Verify in a real browser with Playwright. Zero console errors and zero page errors. Add a test for each state: low spots, full, sold out during checkout, hold expired, payment declined, success.
- Keep components small and reuse them. Event handling: one delegated listener on a stable root; do not re-render a text input while the user is typing in it (it loses focus).
- Do not edit `tours.json` unless asked. If content looks wrong, say so and propose a fix.
- Do not add pages, features or dependencies that are not in `docs/project-brief.md` without asking.
- Small, focused commits with clear messages.

## Open items

- Design tokens are ready in `src/styles/tokens.css` and `tokens.json`. Several Figma colors fail WCAG AA for normal text (muted gray `#A5A5A5` is 2.4:1, terracotta `#C97C5D` is 3.2:1, olive `#7D8C5C` is 3.2 to 3.6:1, white on the terracotta button is 3.2:1). **DECISION (Veronika, 2026-10-19): the site must match the Figma colors exactly.** Buttons, text and borders use the raw Figma values (button `#C97C5D` with white text, muted gray `#A5A5A5`, olive `#7D8C5C`, lines `#A5A5A5`). The `-text` and `-strong` tokens now hold those same values, so keep using the tokens but never darken them, never add darker shades, and never hardcode a color. Do not replace them with "more accessible" variants on your own; if you think a color is a real problem, mention it once and leave it. Keep every other accessibility measure (keyboard, focus, labels, aria, text alternatives, status shown by text and icon, not color alone). The error color is a placeholder (Figma had the same olive as "ok"): in the desktop error PNG errors are terracotta, so use that.
- Tour type label: the data says "Cultural Immersion", the mobile prototype filter says "Cultural". Follow Figma.
- Islands & Old Coastal Towns difficulty: the data says Moderate, the mobile prototype says Easy. Follow Figma.
- In Figma, the Sep 28 to Oct 3 departure chip should read "3 spots left" (not 2).
