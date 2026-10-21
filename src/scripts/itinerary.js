// Day-by-day itinerary accordion. Collapsed by default; the user opens each
// day as needed. The chevron icon just rotates between states.
document.querySelectorAll('[data-itinerary-trigger]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    const body = document.getElementById(trigger.getAttribute('aria-controls'));
    if (body) body.hidden = expanded;
  });
});
