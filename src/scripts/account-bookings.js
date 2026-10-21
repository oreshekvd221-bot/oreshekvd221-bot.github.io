// My bookings: mocked auth gate (src/scripts/auth.js) + bookings read from
// localStorage (src/scripts/bookings.js, written by checkout.js).
import { getCurrentUser, onAuthChange } from './auth.js';
import { getAllBookings, setBookingStatus } from './bookings.js';
import { formatPrice } from './tours.js';
import { toast } from './toast.js';

const root = document.querySelector('[data-bookings-root]');
if (root) {
  const plural = (n, one, many) => (n === 1 ? one : many);
  const STATUS_LABEL = { confirmed: 'Confirmed', waitlist: 'Waitlist', cancelled: 'Cancelled' };

  let activeTab = 'upcoming';

  function cancellationIsFree(booking) {
    const cutoff = new Date(`${booking.departureStart}T00:00:00`);
    cutoff.setDate(cutoff.getDate() - 30);
    return new Date() <= cutoff;
  }

  function bookingCard(booking) {
    const total = booking.adults + booking.children;
    const status = booking.status || 'confirmed';
    const card = document.createElement('article');
    card.className = 'booking-card-row';
    card.innerHTML = `
      <div class="booking-card-row__head">
        <p class="booking-card-row__place">${booking.place}</p>
        <span class="booking-card-row__chip booking-card-row__chip--${status}">${STATUS_LABEL[status] || status}</span>
      </div>
      <h3 class="booking-card-row__name">${booking.tourName}</h3>
      <p class="booking-card-row__meta">${booking.departureLabel} · ${total} ${plural(total, 'traveler', 'travelers')}</p>
      <div class="booking-card-row__foot">
        <p class="booking-card-row__price"><strong>${formatPrice(booking.dueNow)}</strong> <span>paid</span></p>
        <div class="booking-card-row__actions">
          <a href="/tours/${booking.tourSlug}">Details</a>
          ${status === 'cancelled' ? '' : '<button type="button" data-cancel-btn>Cancel</button>'}
        </div>
      </div>
    `;
    card.querySelector('[data-cancel-btn]')?.addEventListener('click', () => {
      const free = cancellationIsFree(booking);
      const question = free
        ? `Cancel your booking for ${booking.tourName}? This is a free cancellation.`
        : `Cancel your booking for ${booking.tourName}? This is within 30 days of departure, so it may not be fully refundable.`;
      if (!window.confirm(question)) return;
      setBookingStatus(booking.id, 'cancelled');
      toast('Booking cancelled.');
      render();
    });
    return card;
  }

  function render() {
    const bookings = getAllBookings();
    const now = new Date();
    const upcoming = bookings.filter((b) => new Date(`${b.departureStart}T00:00:00`) >= now);
    const past = bookings.filter((b) => new Date(`${b.departureStart}T00:00:00`) < now);
    const list = activeTab === 'upcoming' ? upcoming : past;

    const listEl = document.querySelector('[data-bookings-list]');
    listEl.innerHTML = '';
    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'booking-card-row__empty';
      empty.textContent = activeTab === 'upcoming' ? "You don't have any upcoming bookings yet." : "You don't have any past bookings.";
      listEl.appendChild(empty);
    } else {
      list.forEach((b) => listEl.appendChild(bookingCard(b)));
    }

    document.querySelectorAll('[data-tab]').forEach((btn) => {
      const isActive = btn.dataset.tab === activeTab;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
  }

  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      render();
    });
  });

  function updateGate() {
    const user = getCurrentUser();
    document.querySelector('[data-signed-out-prompt]').hidden = Boolean(user);
    document.querySelector('[data-bookings-content]').hidden = !user;
    if (user) render();
  }

  document.querySelector('[data-prompt-login]')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('wanderloop:open-auth', { detail: { mode: 'login' } }));
  });

  onAuthChange(updateGate);
  updateGate();
}
