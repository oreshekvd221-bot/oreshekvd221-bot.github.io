// Confirmation page: the booking was saved to localStorage by checkout.js
// (the site is static, so this id can't be prerendered — see CLAUDE.md routes).
import { formatPrice } from './tours.js';
import { getBooking } from './bookings.js';
import { toast } from './toast.js';

const $ = (sel) => document.querySelector(sel);
const plural = (n, one, many) => (n === 1 ? one : many);

function groupText(adults, children) {
  const parts = [`${adults} ${plural(adults, 'adult', 'adults')}`];
  if (children) parts.push(`${children} ${plural(children, 'child', 'children')}`);
  return parts.join(', ');
}

const root = document.querySelector('[data-confirmation-root]');
if (root) {
  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get('booking');
  const booking = bookingId ? getBooking(bookingId) : null;

  function showView(view) {
    root.querySelectorAll('[data-view]').forEach((el) => {
      el.hidden = el.dataset.view !== view;
    });
  }

  if (!booking) {
    showView('notfound');
  } else {
    $('[data-conf-email]').textContent = booking.email || 'your email';
    $('[data-conf-ref]').textContent = `Booking number ${booking.id}`;
    $('[data-conf-trip]').textContent = booking.tourName;
    $('[data-conf-dates]').textContent = booking.departureLabel;
    $('[data-conf-group]').textContent = groupText(booking.adults, booking.children);

    const isDeposit = booking.plan === 'deposit';
    $('[data-conf-paid-label]').textContent = isDeposit ? 'Paid now' : 'Paid';
    $('[data-conf-paid]').textContent = isDeposit
      ? `${formatPrice(booking.dueNow)} of ${formatPrice(booking.total)}`
      : formatPrice(booking.total);

    const stepRest = $('[data-step-rest]');
    if (isDeposit) {
      stepRest.hidden = false;
      $('[data-step-rest-text]').innerHTML =
        `Pay the remaining ${formatPrice(booking.rest)} by ${booking.cancelBy}` +
        `<p class="confirmation__step-note">We'll email a reminder 5 days before</p>`;
      $('[data-step-list-num]').textContent = '3';
    } else {
      stepRest.hidden = true;
      $('[data-step-list-num]').textContent = '2';
    }

    $('[data-ics-btn]').addEventListener('click', () => {
      const uid = `${booking.id}@wanderloop.example`;
      const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const toIcsDate = (d) => d.replace(/-/g, '');
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Wanderloop//EN',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${toIcsDate(booking.departureStart)}`,
        `DTEND;VALUE=DATE:${toIcsDate(booking.departureEnd)}`,
        `SUMMARY:Wanderloop: ${booking.tourName}`,
        `LOCATION:${booking.place}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = `wanderloop-${booking.tourSlug}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Event saved as a calendar file');
    });
    $('[data-voucher-btn]').addEventListener('click', () => toast("We've emailed your voucher."));
    $('[data-account-btn]').addEventListener('click', () => {
      window.dispatchEvent(
        new CustomEvent('wanderloop:open-auth', {
          detail: {
            mode: 'signup',
            prefill: {
              'signup-first': booking.leadFirstName,
              'signup-last': booking.leadLastName,
              'signup-email': booking.email,
            },
          },
        }),
      );
    });

    showView('confirmed');
  }
}
