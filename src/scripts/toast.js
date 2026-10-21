// Shared toast: role="status", stays at least 5s, never steals focus (CLAUDE.md).
let el;

export function toast(message) {
  if (!el) {
    el = document.createElement('p');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.hidden = true;
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.hidden = false;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.hidden = true;
  }, 5000);
}
