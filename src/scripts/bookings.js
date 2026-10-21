// Bookings live only in localStorage (the site is static, no backend — see
// CLAUDE.md). Shared by checkout.js (writes), confirmation.js and the
// /account/bookings page (both read).
const LIST_KEY = 'wanderloop:bookings';

export function generateBookingId() {
  return `WL-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function saveBooking(booking) {
  try {
    localStorage.setItem(`wanderloop:booking:${booking.id}`, JSON.stringify(booking));
    const list = JSON.parse(localStorage.getItem(LIST_KEY) || '[]');
    if (!list.includes(booking.id)) {
      list.push(booking.id);
      localStorage.setItem(LIST_KEY, JSON.stringify(list));
    }
  } catch {
    // localStorage can be unavailable (private browsing); booking just won't persist.
  }
}

export function getBooking(id) {
  try {
    const raw = localStorage.getItem(`wanderloop:booking:${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAllBookings() {
  try {
    const ids = JSON.parse(localStorage.getItem(LIST_KEY) || '[]');
    return ids.map(getBooking).filter(Boolean);
  } catch {
    return [];
  }
}

export function setBookingStatus(id, status) {
  const booking = getBooking(id);
  if (!booking) return;
  booking.status = status;
  try {
    localStorage.setItem(`wanderloop:booking:${id}`, JSON.stringify(booking));
  } catch {
    // ignore
  }
}
