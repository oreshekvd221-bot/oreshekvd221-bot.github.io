// Tour-page booking widget: pick a departure, pick a group size, see the total.
// Business rule (CLAUDE.md): a departure only fits if spotsLeft >= adults + children.
// Rather than letting the group outgrow the date and then clearing it, the +
// buttons are simply disabled once the group reaches the selected date's
// capacity, and picking a smaller date that can't fit the current group is
// refused with a message instead of silently switching to an invalid state.
import { formatPrice } from './tours.js';

document.querySelectorAll('[data-booking-card]').forEach((card) => {
  const priceAdult = Number(card.dataset.priceAdult);
  const priceChild = Number(card.dataset.priceChild);
  const slug = card.dataset.slug;

  const departureButtons = Array.from(card.querySelectorAll('[data-departure-option]'));
  const soldOutMessage = card.querySelector('[data-booking-sold-out]');
  const controls = card.querySelector('[data-booking-controls]');
  const capacityHint = card.querySelector('[data-capacity-hint]');
  const totalLabel = card.querySelector('[data-total-label]');
  const totalPrice = card.querySelector('[data-total-price]');
  const bookLink = card.querySelector('[data-book-link]');

  const adultsCountEl = card.querySelector('[data-traveler-count="adults"]');
  const childrenCountEl = card.querySelector('[data-traveler-count="children"]');
  const incrementButtons = Array.from(card.querySelectorAll('[data-traveler-increment]'));
  const decrementButtons = Array.from(card.querySelectorAll('[data-traveler-decrement]'));

  // Pre-fill from the header search (?departure=&adults=&children=), e.g.
  // after picking a date and a group size there and hitting "Show trips".
  const params = new URLSearchParams(window.location.search);
  const counts = {
    adults: Math.max(1, parseInt(params.get('adults'), 10) || 1),
    children: Math.max(0, parseInt(params.get('children'), 10) || 0),
  };
  const requestedDeparture = params.get('departure');
  let selected =
    (requestedDeparture && departureButtons.find((b) => b.dataset.start === requestedDeparture && Number(b.dataset.spots) >= counts.adults + counts.children)) ||
    departureButtons.find((b) => Number(b.dataset.spots) > 0) ||
    null;

  function hasAnyAvailableDeparture() {
    return departureButtons.some((b) => Number(b.dataset.spots) > 0);
  }

  function render() {
    departureButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn === selected)));

    const noneAvailable = !hasAnyAvailableDeparture();
    soldOutMessage.hidden = !noneAvailable;
    controls.hidden = noneAvailable;
    if (noneAvailable) return;

    const cap = selected ? Number(selected.dataset.spots) : 0;
    const total = counts.adults + counts.children;
    const remaining = cap - total;

    adultsCountEl.textContent = String(counts.adults);
    childrenCountEl.textContent = String(counts.children);

    incrementButtons.forEach((btn) => {
      btn.disabled = !selected || remaining <= 0;
    });
    decrementButtons.forEach((btn) => {
      const key = btn.dataset.travelerDecrement;
      btn.disabled = key === 'adults' ? counts.adults <= 1 : counts.children <= 0;
    });

    if (remaining <= 0) {
      capacityHint.textContent = "You've filled this date.";
    } else {
      capacityHint.textContent = `You can add ${remaining} more spot${remaining === 1 ? '' : 's'}.`;
    }

    const price = counts.adults * priceAdult + counts.children * priceChild;
    totalLabel.textContent = `Total for ${total} guest${total === 1 ? '' : 's'}`;
    totalPrice.textContent = formatPrice(price);

    const params = new URLSearchParams({
      tour: slug,
      adults: String(counts.adults),
      children: String(counts.children),
    });
    if (selected) params.set('departure', selected.dataset.start);
    bookLink.href = `/checkout?${params.toString()}`;
  }

  function changeCount(key, delta) {
    const next = counts[key] + delta;
    if (key === 'adults' && next < 1) return;
    if (key === 'children' && next < 0) return;

    const otherKey = key === 'adults' ? 'children' : 'adults';
    const total = next + counts[otherKey];
    if (selected && total > Number(selected.dataset.spots)) return;

    counts[key] = next;
    render();
  }

  incrementButtons.forEach((btn) => {
    btn.addEventListener('click', () => changeCount(btn.dataset.travelerIncrement, 1));
  });
  decrementButtons.forEach((btn) => {
    btn.addEventListener('click', () => changeCount(btn.dataset.travelerDecrement, -1));
  });

  departureButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const cap = Number(btn.dataset.spots);
      const total = counts.adults + counts.children;
      if (total > cap) {
        capacityHint.textContent = `This date only fits up to ${cap} traveler${cap === 1 ? '' : 's'}. Reduce your group or pick another date.`;
        return;
      }
      selected = btn;
      render();
    });
  });

  render();
});
