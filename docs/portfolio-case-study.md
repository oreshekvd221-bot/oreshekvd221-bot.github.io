# Wanderloop — Behance case study draft

Slide-by-slide outline + English copy, ready to paste into Behance's text blocks. Pair each slide with the screenshot(s) noted under it — the real ones are in `qa/shots/` (desktop = `*-desktop.png`, mobile = `*-mobile.png`), not the Figma placeholders, since those show real tour data instead of placeholder text.

Structure follows the Clinix pattern: cover → overview → user flow → design process → style guide → components → feature highlights → key pages → mobile → closing. Slide count is adjusted to what this project actually has to show, not padded to match exactly.

---

## 1. Cover

**Wanderloop**
Booking small-group trips with fixed departure dates

*Visual: `home-desktop.png`, full-bleed or cropped to the hero + first row of cards.*

---

## 2. Project overview

**The problem**
Group trip sites usually hide the one thing that matters most when you're deciding to book: how many seats are actually left. Wanderloop puts that front and center — every tour shows its real seat count, right on the card, before you click anything.

**What it is**
A booking platform for small-group tours with fixed departure dates. Travelers browse 12 real itineraries, check seat availability for each departure, and book for their whole group in one flow — with every edge case designed, not just the happy path: low stock, sold out, an expired hold, a declined card.

**Audience**
Adults booking a trip for two, for a group of friends, or for family — people who want someone else to handle the logistics of a small-group trip.

**My role**
End-to-end product design and front-end build: UX flows, visual design system in Figma, and the coded implementation (Astro, vanilla JS, a token-based CSS system) — including every state, not only the primary screens.

*Visual: none needed, or a small line-up of 3–4 tour card photos.*

---

## 3. User flow

A simple map, left to right:

**Browse** (home or catalog, filter by destination/dates/group size) → **Tour page** (pick a departure, see seats left) → **Checkout: traveler details** → **Checkout: payment** (pay in full or a 30% deposit) → **Confirmation**

Branches worth calling out on the diagram:
- Seats run out mid-checkout → **sold out state**, offers the next available date or a waitlist
- The 15-minute seat hold runs out → **hold expired state**, offers to hold the seats again
- A card payment fails → **inline decline state**, same form, no lost progress

*Visual: a simple flow diagram you build in Figma/FigJam — not a screenshot. Keep it to arrows and labeled boxes.*

---

## 4. Design process

From a written brief to a working, token-based build:

1. **Brief → Figma** — translated a text brief (routes, business rules, accessibility targets) into desktop and mobile frames for every screen and every state.
2. **Figma → design tokens** — every color, spacing value, radius and type size became a CSS variable, so the Figma file and the live code share one source of truth instead of drifting apart.
3. **A real accessibility trade-off, documented, not hidden.** Two of the brand's Figma colors (the terracotta accent and the muted gray) read beautifully but fall short of WCAG AA contrast for body text. Rather than silently darkening the brand palette, the call was to keep the exact Figma colors and document the trade-off in the codebase — accepting a specific, measured gap instead of guessing at a "safe" color that nobody signed off on.
4. **Code review against the design, screen by screen** — every page was checked against its Figma frame at both breakpoints and corrected until spacing, radii and type matched.

*Visual: a side-by-side of a Figma frame and the matching live screenshot (pick one, e.g. the tour page) — this slide is about the pairing, not a specific screen.*

---

## 5. Style guide

**Color** — a warm, earthy palette: cream background, a terracotta accent for actions and emphasis, a muted olive for secondary status, soft beige surfaces for cards.

**Type** — Jost, self-hosted as a single variable font. A small, deliberate scale: Display for page headlines, two heading sizes, one body size, one caption size — each with its own weight and letter-spacing, tuned separately for mobile and desktop.

**Spacing & shape** — an 8-point-based spacing scale (4 to 64px), two corner radii (a small one for fields, a large one for cards), everything pulled from the same token set so nothing in the interface is a one-off number.

*Visual: a style-tile export from Figma — swatches, type specimen, spacing scale. Build this once in Figma as a clean reference frame.*

---

## 6. Components

A small, reusable set, each designed with every state it needs:

- **Tour card** — photo, scarcity badge, price, actions that reveal on hover (desktop) or stay visible (mobile, since there's no hover to reveal them)
- **Search widget** — a collapsed pill that expands into destination/dates/travelers, same logic on a desktop dropdown and a mobile full-screen sheet
- **Filter bar** — chips that open as a small dropdown on desktop and a bottom sheet with a blurred backdrop on mobile
- **Payment plan selector** — full amount vs. 30% deposit, with the math always visible
- **State cards** — one visual pattern reused for every "something's not the happy path" screen: sold out, hold expired, empty states

*Visual: a component sheet — crop the pieces out of `home-desktop.png`, `checkout-payment-desktop.png`, and a mobile search-sheet screenshot, arranged in a grid.*

---

## 7. Feature highlight — the seat hold

Booking a trip takes a minute or two to fill in. Wanderloop holds the traveler's seats for 15 minutes while they do that, with the countdown visible the whole time in the order summary.

- At 3 minutes left, a warning appears with a one-time **"Extend by 5 minutes"** button
- The countdown doesn't interrupt screen reader users every second — it only announces at the warning and at expiry, meeting WCAG's time-limit requirement without being noisy
- If time runs out, the seats release automatically and the page offers to hold them again, with the traveler's details already filled in

*Visual: `checkout-details-desktop.png` (showing the hold timer in the sticky summary) next to `checkout-hold-expired-desktop.png`.*

---

## 8. Feature highlight — every state, designed

Most booking flows are designed for the path where everything goes right. Wanderloop designs for the moments it doesn't:

- **Low stock** — a visible "N spots left" badge once availability drops to 3 or fewer, never color alone
- **Sold out mid-checkout** — seats can disappear while someone's filling in the form; the page offers the next available date or a waitlist instead of a dead end
- **Payment declined** — the card form stays filled in, the error is specific, nothing is lost
- **Minimum group not met** — if a departure doesn't reach its minimum group size, it's cancelled and refunded in full, by design, not as an afterthought

*Visual: `checkout-no-vacancies-desktop.png` and `checkout-details-error-desktop.png` side by side.*

---

## 9. Key pages

Walk through the primary path at desktop size:

1. **Home** — search, filters, the tour catalog
2. **Tour page** — gallery, day-by-day itinerary, what's included, date and group picker
3. **Checkout** — traveler details, then payment, with a sticky order summary
4. **Confirmation** — booking number, payment schedule, what happens next

*Visual: `home-desktop.png`, `tour-page-desktop.png`, `checkout-payment-desktop.png`, `checkout-booking-confirmed-desktop.png` — one per page, full width.*

---

## 10. Mobile version

Built mobile-first, not scaled down from desktop:

- The search bar and filters move to full-screen sheets with a blurred backdrop, instead of cramped dropdowns
- Card actions stay visible rather than hidden behind hover, since touch has no hover state
- Every tap target is at least 44px, every form field keeps its own visible label
- Checkout stacks into a single column, with the order summary (and the seat countdown) always above the form

*Visual: `home-mobile.png`, `checkout-details-mobile.png`, side by side or in phone frames.*

---

## 11. Closing

**Wanderloop** — a booking flow designed around the moments that actually decide whether someone books: how many seats are left, what happens when they run out, and whether the traveler can trust what the page is telling them.

Live project: [oreshekvd221-bot.github.io](https://oreshekvd221-bot.github.io/)
Figma: [Wanderloop](https://www.figma.com/design/SnDOwATqmu62RQDeKjuz9i/Wanderloop)

*Visual: `home-mobile.png` and `home-desktop.png` together, or your usual closing-slide treatment.*

---

## Notes for you

- A few spots above are placeholders in brackets — fill in the live URL and Figma link once you have them.
- I didn't flag any translation-awkward phrasing to fix — everything above was written directly in English, not translated, so there's nothing to re-check on that front. Still worth reading it aloud once before you paste it in.
- If you want a shorter deck (e.g. skip "Components" or merge the two feature-highlight slides into one), the structure holds fine at 8–9 slides too — nothing here depends on hitting exactly 11.
