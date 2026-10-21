# Reference map

This folder holds the visual and behavior references for Wanderloop. Read this file first, then open the PNG that matches the page you are building.

**Rules**

- All PNGs are exported at 2x. Desktop frames are 2880 px wide (design width 1440), mobile frames are 804 px wide (design width 402).
- The PNGs are the source of truth for **layout, style, spacing and states**. They are not a source of **content**: every text, date, price, spot count and country label must come from `src/data/tours.json`. Dates and spot counts shown in the PNGs are placeholders from an earlier draft.
- Exact colors, fonts and spacing come from `src/styles/tokens.css`. Where the PNG color fails contrast (muted gray text, terracotta and olive text, white text on the terracotta button), use the accessible `-text` and `-strong` tokens.
- The HTML prototypes in `prototypes/` are a behavior reference only (hold timer, extend button, sold-out flow, mobile search sheet). Do not copy their markup or CSS.

## Pages

| Route | Desktop | Mobile | What it shows |
|---|---|---|---|
| `/` and `/tours` | `figma/desktop/01-home.png` | `figma/mobile/01-home.png` | Header with search pill, filter chips (Destination, Departure dates, Trip type, Duration, Difficulty, Price, Spots), grid of tour cards, footer. `/tours` is the same layout with the query applied. There is no separate design for "no results": reuse this layout with a short empty message and ask Veronika if unsure. |
| `/tours/[slug]` | `figma/desktop/02-tour-page.png` | `figma/mobile/02-tour-page.png` | Photo gallery, title and meta, "About this trip", day-by-day itinerary (accordion), sticky booking card with departure date, travelers and "Book now", similar trips, footer. |
| `/checkout` (contact step) | `figma/desktop/03-checkout-details.png` | `figma/mobile/03-checkout-details.png` | "Complete your booking": lead traveler, other travelers (adult, child with age select), passport info note, "Continue to payment". Desktop has the order summary with the 15:00 hold timer on the right. |
| `/checkout` (payment step) | `figma/desktop/04-checkout-payment.png` | `figma/mobile/04-checkout-payment.png` | Contact step collapsed, payment open: pay in full or 30% deposit, Apple Pay and Google Pay, card fields, "Pay" button. |
| `/checkout` (validation errors) | `figma/desktop/05-checkout-details-error.png` | `figma/mobile/05-checkout-details-error.png` | Invalid fields get a terracotta border and a message directly under the field. Add an error icon and an error summary at the top for accessibility (see CLAUDE.md). The mobile version was derived from the desktop one. |
| `/checkout` (hold expired) | `figma/desktop/06-checkout-hold-expired.png` | `figma/mobile/06-checkout-hold-expired.png` | "Your hold has expired", button "Hold spots again". |
| `/checkout` (sold out during checkout) | `figma/desktop/07-checkout-no-vacancies.png` | `figma/mobile/07-checkout-no-vacancies.png` | "Those spots were just booked", next available date, waitlist button. |
| `/checkout/confirmation` | `figma/desktop/08-checkout-booking-confirmed.png` | `figma/mobile/08-checkout-booking-confirmed.png` | Success icon, booking number, summary, "What's next", add to calendar, download voucher, create account prompt for guests. |
| `/account/bookings` | `figma/desktop/my-bookings.png` | `figma/mobile/my-bookings.png` | Upcoming and Past tabs, booking cards with status chip (Confirmed, Waitlist), Details and Cancel. |
| `/account/profile` | `figma/desktop/profile.png` | `figma/mobile/profile.png` | Name, email, phone, "Save changes". |
| `/404` | `figma/desktop/09-404.png` | `figma/mobile/09-404.png` | Simple not-found page with two buttons. |

## Mobile search sheet

The mobile header search opens a full-screen "Find your trip" sheet with three sections. Behavior reference: `prototypes/wanderloop-mobile-header-search.html`.

| State | File |
|---|---|
| Destination open | `figma/mobile/search-destination.png` |
| Dates open | `figma/mobile/search-dates.png` |
| Travelers open | `figma/mobile/search-travelers.png` |
| Travelers before a date is chosen | `figma/mobile/search-travelers-data.png` |

## Components (`figma/components/`)

| Component | Files |
|---|---|
| Header, desktop | `header.png` (closed), `header-open.png`, `header-open-destination.png`, `header-open-dates.png`, `header-open-travelers.png` |
| Header, mobile | `header-mobil.png` |
| Search dropdown panels (desktop) | `dropdown-destination.png`, `dropdown-dates.png`, `dropdown-travelers.png`, `dropdown-travelers-data.png` (travelers panel before a date is chosen: "Choose a tour date first") |
| Filter dropdowns | `filter-destination.png`, `filter-departure-dates.png`, `filter-trip-type.png`, `filter-duration.png`, `filter-difficulty.png`, `filter-price.png`, `filter-spots.png` |
| Tour card | `tour-card-desktop.png`, `tour-card-mobil.png` |
| Account menu | `avatar.png` (signed out: Log in, Sign up) and `avatar-login.png` (signed in: My bookings, Profile, Log out). The Language, Currency and Help rows are inactive: the site is English and USD only. |
| Auth modals | `login-modal.png`, `signup-modal.png` (modals, no route; close on Esc and the Close button, focus returns to the opener) |
| Footer | `footer.png` (desktop), `footer-mobile.png` (mobile) |

## Known gaps

- No design for the catalog "no results" state or for sign-in-required redirects: build them simply in the same style and tell Veronika.
- Mobile frames for the tour page and home are long scrolling pages. Build mobile-first and fluid, do not treat the PNG height as fixed.
