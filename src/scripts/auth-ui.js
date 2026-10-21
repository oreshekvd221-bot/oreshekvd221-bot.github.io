// Wires up the login/signup modals (AuthModals.astro) and every header
// account-menu trigger on the page. Loaded once from Layout.astro so it's
// available everywhere. Other pages ask for a modal via a custom event:
//   window.dispatchEvent(new CustomEvent('wanderloop:open-auth', { detail: { mode: 'signup', prefill: {...} } }))
import { getCurrentUser, signUp, logIn, signOut, initials, displayName, onAuthChange } from './auth.js';
import { toast } from './toast.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const overlay = $('[data-auth-overlay]');
let lastFocused = null;
let activeModal = null;

function focusableIn(container) {
  return $$('button, input, a[href]', container).filter(
    (el) => !el.disabled && el.offsetParent !== null,
  );
}

function trapKeydown(e) {
  if (!activeModal) return;
  if (e.key === 'Escape') {
    closeModal();
    return;
  }
  if (e.key !== 'Tab') return;
  const focusables = focusableIn(activeModal);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function showModal(mode, prefill) {
  overlay.hidden = false;
  $$('[data-auth-modal]').forEach((m) => {
    m.hidden = m.dataset.authModal !== mode;
  });
  activeModal = $(`[data-auth-modal="${mode}"]`);
  if (prefill) {
    Object.entries(prefill).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el && value) el.value = value;
    });
  }
  document.addEventListener('keydown', trapKeydown);
  focusableIn(activeModal)[0]?.focus();
}

// A fresh open from outside the overlay (account menu, a page's own button,
// the custom event): remember where to return focus once the overlay closes.
function openModal(mode, prefill) {
  if (!overlay) return;
  const opener = document.activeElement;
  const openerMenu = opener?.closest('.account-menu');
  closeAllAccountMenus();
  // The opener may have just been hidden (e.g. "Sign up" inside the account
  // menu panel) — fall back to that menu's still-visible trigger button.
  lastFocused = opener && opener.offsetParent !== null ? opener : (openerMenu?.querySelector('[data-account-trigger]') ?? opener);
  showModal(mode, prefill);
}

// Switching between the login/signup modals themselves: the overlay stays
// open, so the original opener (captured by openModal) is left untouched.
function switchModal(mode) {
  showModal(mode);
}

function closeModal() {
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  $$('[data-auth-modal]').forEach((m) => {
    m.hidden = true;
  });
  document.removeEventListener('keydown', trapKeydown);
  activeModal = null;
  lastFocused?.focus();
}

if (overlay) {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  $$('[data-modal-close]').forEach((btn) => btn.addEventListener('click', closeModal));
  $$('[data-show-signup]').forEach((btn) => btn.addEventListener('click', () => switchModal('signup')));
  $$('[data-show-login]').forEach((btn) => btn.addEventListener('click', () => switchModal('login')));
  $('[data-forgot-btn]')?.addEventListener('click', () => toast("We've emailed you a password reset link."));

  // ---------- validation (same small rule set as checkout) ----------
  const MSG = {
    text: 'Please fill in this field',
    email: 'Check your email, for example name@mail.com',
    phone: 'Enter a number with country code',
    password: 'Use at least 6 characters',
  };
  function validateInput(el) {
    const v = el.value.trim();
    const rule = el.dataset.rule;
    if (rule === 'text') return v ? '' : MSG.text;
    if (rule === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : MSG.email;
    if (rule === 'phone') return v.replace(/\D/g, '').length >= 8 ? '' : MSG.phone;
    if (rule === 'password') return v.length >= 6 ? '' : MSG.password;
    return '';
  }
  function showFieldError(el, msg) {
    const wrap = el.closest('.field');
    wrap.classList.toggle('field--invalid', Boolean(msg));
    wrap.querySelector('[data-error]').textContent = msg || '';
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function fieldLabel(el) {
    return el.closest('.field').querySelector('label').textContent;
  }
  function validateForm(form, summaryBox, summaryList) {
    const errors = [];
    $$('[data-rule]', form).forEach((el) => {
      const msg = validateInput(el);
      showFieldError(el, msg);
      if (msg) errors.push({ el, msg });
    });
    summaryList.innerHTML = errors
      .map((e, i) => `<li><button type="button" data-goto-field="${i}">${fieldLabel(e.el)}: ${e.msg}</button></li>`)
      .join('');
    summaryBox.hidden = errors.length === 0;
    $$('[data-goto-field]', summaryList).forEach((btn, i) => {
      btn.addEventListener('click', () => errors[i].el.focus());
    });
    if (errors.length) errors[0].el.focus();
    return errors.length === 0;
  }
  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (el.matches && el.matches('.auth-modal [data-rule]') && (el.value || el.closest('.field').classList.contains('field--invalid'))) {
      showFieldError(el, validateInput(el));
    }
  });

  const loginForm = $('[data-login-form]');
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(loginForm, $('[data-login-error-summary]'), $('[data-login-error-list]'))) return;
    logIn({ email: $('#login-email').value.trim() });
    closeModal();
    toast("You're logged in.");
    renderAccountMenus();
  });

  const signupForm = $('[data-signup-form]');
  signupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(signupForm, $('[data-signup-error-summary]'), $('[data-signup-error-list]'))) return;
    signUp({
      firstName: $('#signup-first').value.trim(),
      lastName: $('#signup-last').value.trim(),
      email: $('#signup-email').value.trim(),
      phone: $('#signup-phone').value.trim(),
    });
    closeModal();
    toast('Account created. Welcome!');
    renderAccountMenus();
  });

  window.addEventListener('wanderloop:open-auth', (e) => {
    openModal(e.detail?.mode || 'login', e.detail?.prefill);
  });
}

// ---------- header account menu(s) ----------
function closeAllAccountMenus() {
  $$('[data-account-menu]').forEach((menu) => {
    const trigger = $('[data-account-trigger]', menu);
    const panel = $('[data-account-panel]', menu);
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  });
}

function renderAccountMenus() {
  const user = getCurrentUser();
  $$('[data-account-menu]').forEach((menu) => {
    const signedOut = $('[data-account-signed-out]', menu);
    const signedIn = $('[data-account-signed-in]', menu);
    const initialsEl = $('[data-account-initials]', menu);
    const iconEl = $('[data-account-avatar-icon]', menu);
    if (user) {
      signedOut.hidden = true;
      signedIn.hidden = false;
      $('[data-account-name]', menu).textContent = displayName(user);
      $('[data-account-email]', menu).textContent = user.email;
      if (initialsEl) {
        initialsEl.textContent = initials(user);
        initialsEl.hidden = false;
      }
      if (iconEl) iconEl.hidden = true;
    } else {
      signedOut.hidden = false;
      signedIn.hidden = true;
      if (initialsEl) initialsEl.hidden = true;
      if (iconEl) iconEl.hidden = false;
    }
  });
}

$$('[data-account-menu]').forEach((menu) => {
  const trigger = $('[data-account-trigger]', menu);
  const panel = $('[data-account-panel]', menu);
  if (!trigger || !panel) return;
  trigger.addEventListener('click', () => {
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    closeAllAccountMenus();
    if (!isOpen) {
      trigger.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
    }
  });
  $$('[data-open-login]', panel).forEach((btn) => btn.addEventListener('click', () => openModal('login')));
  $$('[data-open-signup]', panel).forEach((btn) => btn.addEventListener('click', () => openModal('signup')));
  $$('[data-logout-btn]', panel).forEach((btn) =>
    btn.addEventListener('click', () => {
      signOut();
      closeAllAccountMenus();
      toast("You're logged out.");
      renderAccountMenus();
      if (location.pathname.startsWith('/account/')) window.location.href = '/';
    }),
  );
});

document.addEventListener('click', (e) => {
  if (!(e.target instanceof Node)) return;
  $$('[data-account-menu]').forEach((menu) => {
    if (!menu.contains(e.target)) {
      const trigger = $('[data-account-trigger]', menu);
      const panel = $('[data-account-panel]', menu);
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
    }
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllAccountMenus();
});

onAuthChange(renderAccountMenus);
renderAccountMenus();
