// Checkout page logic. The page is static (output: 'static'), so the tour,
// departure and traveler counts are only known at runtime from the URL
// (?tour=&departure=&adults=&children=) — everything here is built client-side,
// following the behavior in reference/prototypes/wanderloop-checkout-en.html
// (styling comes from tokens.css instead, per CLAUDE.md: copy logic, not CSS).
//
// Testing hooks (not part of the UI, read from the URL):
//   ?mock=soldout   — show the "sold out during checkout" state immediately
//   ?mock=expired   — show the "hold expired" state immediately
//   ?mock=lowhold   — start the hold timer at 3:00 instead of 15:00
// Card numbers for the payment step: 4242 4242 4242 4242 always succeeds,
// 4000 0000 0000 0002 always gets declined (both pass the Luhn check).
import toursData from '../data/tours.json';
import { formatPrice } from './tours.js';
import { generateBookingId, saveBooking } from './bookings.js';

const DECLINE_CARD = '4000000000000002';
const HOLD_SECONDS = 15 * 60;
const WARNING_SECONDS = 3 * 60;

const $ = (sel) => document.querySelector(sel);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, one, many) => (n === 1 ? one : many);

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d;
}

function formatLongDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function cancelByDate(departureStart) {
  return formatLongDate(addDays(departureStart, -30));
}

function groupText(adults, children) {
  const parts = [`${adults} ${plural(adults, 'adult', 'adults')}`];
  if (children) parts.push(`${children} ${plural(children, 'child', 'children')}`);
  return parts.join(', ');
}

const root = document.querySelector('[data-checkout-root]');
if (root) {
  const params = new URLSearchParams(window.location.search);
  const tourSlug = params.get('tour');
  const requestedDeparture = params.get('departure');
  const adults = Math.max(1, parseInt(params.get('adults'), 10) || 1);
  const children = Math.max(0, parseInt(params.get('children'), 10) || 0);
  const mock = params.get('mock');

  const tour = toursData.tours.find((t) => t.slug === tourSlug);

  function showView(view) {
    root.querySelectorAll('[data-view]').forEach((el) => {
      el.hidden = el.dataset.view !== view;
    });
    if (view !== 'checkout') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!tour) {
    showView('notfound');
  } else {
    const departure = tour.departures.find((d) => d.start === requestedDeparture) || tour.departures[0];
    const groupSize = adults + children;
    const soldOut = mock === 'soldout' || !departure || departure.spotsLeft < groupSize;

    const coverMap = JSON.parse($('#cover-images')?.textContent || '{}');

    // Back-to-trip / change-date links all point at this tour.
    root.querySelectorAll('[data-back-link], [data-change-link]').forEach((a) => {
      a.href = `/tours/${tour.slug}`;
    });

    if (soldOut) {
      const altDeparture = tour.departures.find((d) => d.start !== departure.start && d.spotsLeft > 0);
      $('[data-soldout-dates]').textContent = departure.label;
      $('[data-soldout-waitlist-btn]').textContent = `Join the waitlist for ${formatShortDate(departure.start)}`;
      const altBox = $('[data-alt-date]');
      if (altDeparture) {
        altBox.hidden = false;
        $('[data-alt-date-label]').textContent = altDeparture.label;
        $('[data-alt-date-spots]').textContent = `${altDeparture.spotsLeft} of ${altDeparture.total} spots available`;
        $('[data-alt-date-select]').addEventListener('click', () => {
          const next = new URLSearchParams(params);
          next.set('departure', altDeparture.start);
          window.location.href = `/checkout?${next.toString()}`;
        });
      } else {
        altBox.hidden = true;
      }
      $('[data-waitlist-btn]').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = "You're on the waitlist";
        const msg = $('[data-waitlist-msg]');
        msg.hidden = false;
        msg.textContent = "We'll email you if a spot opens up.";
      });
      showView('soldout');
    } else {
      initCheckout(tour, departure, adults, children, coverMap, mock);
    }
  }

  function initCheckout(tour, departure, adults, children, coverMap, mock) {
    const priceAdult = tour.priceAdult;
    const priceChild = tour.priceChild;

    const state = { plan: 'full', promo: null, paying: false, extended: false, warned: false, endTime: 0, timerId: null };

    function totals() {
      const adultsAmt = adults * priceAdult;
      const childAmt = children * priceChild;
      const subtotal = adultsAmt + childAmt;
      const disc = state.promo ? Math.round(subtotal * state.promo.pct) : 0;
      const total = subtotal - disc;
      const deposit = Math.round(total * 0.3);
      const dueNow = state.plan === 'deposit' ? deposit : total;
      return { adultsAmt, childAmt, subtotal, disc, total, deposit, rest: total - deposit, dueNow };
    }

    // ---------- order summary ----------
    function renderSummary() {
      const t = totals();
      const thumb = $('[data-tour-thumb]');
      if (coverMap[tour.slug]) {
        thumb.src = coverMap[tour.slug];
        thumb.hidden = false;
      }
      $('[data-tour-place]').textContent = tour.place;
      $('[data-tour-name]').textContent = tour.name;
      $('[data-fact-dates]').textContent = departure.label;
      $('[data-fact-group]').textContent = groupText(adults, children);

      $('[data-line-adults-label]').textContent = `${adults} × adult, ${formatPrice(priceAdult)}`;
      $('[data-line-adults-amt]').textContent = formatPrice(t.adultsAmt);
      $('[data-line-children]').hidden = children === 0;
      if (children) {
        $('[data-line-children-label]').textContent = `${children} × child, ${formatPrice(priceChild)}`;
        $('[data-line-children-amt]').textContent = formatPrice(t.childAmt);
      }
      $('[data-line-discount]').hidden = !state.promo;
      if (state.promo) {
        $('[data-promo-code-label]').textContent = state.promo.code;
        $('[data-line-discount-amt]').textContent = `−${formatPrice(t.disc)}`;
      }

      $('[data-total-amt]').textContent = formatPrice(t.total);
      const dep = state.plan === 'deposit';
      $('[data-due-row]').hidden = !dep;
      $('[data-rest-row]').hidden = !dep;
      if (dep) {
        $('[data-due-now]').textContent = formatPrice(t.dueNow);
        $('[data-rest-label]').textContent = `Remaining due by ${cancelByDate(departure.start)}`;
        $('[data-rest-amt]').textContent = formatPrice(t.rest);
      }

      $('[data-plan-full-amt]').textContent = formatPrice(t.total);
      $('[data-plan-deposit-amt]').textContent = formatPrice(t.deposit);
      $('[data-plan-deposit-sub]').textContent = `Pay the remaining ${formatPrice(t.rest)} by ${cancelByDate(departure.start)}. We'll email you a reminder.`;
      $('[data-pay-btn]').textContent = `Pay ${formatPrice(t.dueNow)}`;
      $('[data-cancel-date-1]').textContent = cancelByDate(departure.start);
      $('[data-cancel-date-2]').textContent = cancelByDate(departure.start);

      return t;
    }

    root.querySelectorAll('[data-plan-radio]').forEach((r) => {
      r.addEventListener('change', () => {
        state.plan = r.value;
        renderSummary();
      });
    });

    // ---------- promo ----------
    $('[data-promo-toggle]').addEventListener('click', () => {
      $('[data-promo-box]').hidden = false;
      $('[data-promo-toggle]').hidden = true;
      $('[data-promo-input]').focus();
    });
    function applyPromo() {
      const input = $('[data-promo-input]');
      const code = input.value.trim().toUpperCase();
      const msg = $('[data-promo-msg]');
      if (!code) return;
      if (code === 'WANDER10') {
        state.promo = { code, pct: 0.1 };
        msg.className = 'order-summary__promo-msg order-summary__promo-msg--ok';
        msg.textContent = 'Promo code applied: 10% off';
        $('[data-promo-box]').hidden = true;
      } else {
        msg.className = 'order-summary__promo-msg order-summary__promo-msg--err';
        msg.textContent = "That promo code doesn't exist. Check the spelling.";
      }
      renderSummary();
    }
    $('[data-promo-apply]').addEventListener('click', applyPromo);
    $('[data-promo-input]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyPromo();
    });

    // ---------- hold timer ----------
    function formatMMSS(totalSeconds) {
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    }
    function announce(msg) {
      $('[data-announce]').textContent = msg;
    }
    function tick() {
      const left = Math.max(0, Math.round((state.endTime - Date.now()) / 1000));
      $('[data-timer]').textContent = formatMMSS(left);
      const hold = $('[data-hold]');
      hold.classList.toggle('is-low', left <= WARNING_SECONDS && left > 0);
      $('[data-extend-btn]').hidden = !(left <= WARNING_SECONDS && left > 0 && !state.extended);
      if (left <= WARNING_SECONDS && left > 0 && !state.warned) {
        state.warned = true;
        announce('3 minutes left on your hold. Extend if you need more time.');
      }
      if (left <= 0) {
        clearInterval(state.timerId);
        if (!state.paying) {
          announce('Your hold has expired.');
          showView('expired');
        }
      }
    }
    function startTimer(seconds) {
      state.endTime = Date.now() + (seconds ?? HOLD_SECONDS) * 1000;
      state.extended = false;
      state.warned = seconds != null && seconds <= WARNING_SECONDS;
      clearInterval(state.timerId);
      state.timerId = setInterval(tick, 1000);
      tick();
    }
    $('[data-extend-btn]').addEventListener('click', () => {
      if (state.extended) return;
      state.extended = true;
      state.endTime += 5 * 60 * 1000;
      tick();
      announce('Your hold was extended by 5 minutes.');
      const hold = $('[data-hold]');
      hold.focus();
    });

    // ---------- traveler fields ----------
    function fieldHTML(id, label, rule, attrs) {
      return `<div class="field" data-field="${id}">
        <label for="${id}">${label}</label>
        <input id="${id}" data-rule="${rule}" aria-describedby="${id}-err" ${attrs || ''}>
        <p class="field__error" id="${id}-err" data-error></p>
      </div>`;
    }
    function buildTravelers() {
      let html = '';
      const total = adults + children;
      for (let i = 0; i < total; i++) {
        const isChild = i >= adults;
        if (i === 0) {
          html += `<div class="traveler">
            <p class="traveler__title">Lead traveler</p>
            <p class="traveler__note">Name as in your passport. Your confirmation will be sent to this email.</p>
            <div class="field-row">${fieldHTML('t0first', 'First name', 'text', 'autocomplete="given-name"')}${fieldHTML('t0last', 'Last name', 'text', 'autocomplete="family-name"')}</div>
            <div class="field-row">${fieldHTML('email', 'Email', 'email', 'type="email" autocomplete="email" placeholder="name@mail.com"')}${fieldHTML('phone', 'Phone number', 'phone', 'type="tel" autocomplete="tel" placeholder="+1 555 000-0000"')}</div>
          </div>`;
        } else {
          html += `<div class="traveler">
            <p class="traveler__title">Traveler ${i + 1} · ${isChild ? 'child' : 'adult'}</p>
            <div class="field-row${isChild ? ' field-row--3' : ''}">${fieldHTML('t' + i + 'first', 'First name', 'text')}${fieldHTML('t' + i + 'last', 'Last name', 'text')}${
              isChild
                ? `<div class="field" data-field="t${i}age">
                  <label for="t${i}age">Age at departure</label>
                  <select id="t${i}age" data-rule="select" required aria-describedby="t${i}age-err">
                    <option value="">Select</option>
                    ${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((a) => `<option value="${a}">${a} years</option>`).join('')}
                  </select>
                  <p class="field__error" id="t${i}age-err" data-error></p>
                </div>`
                : ''
            }</div>
          </div>`;
        }
      }
      $('[data-travelers-container]').innerHTML = html;
    }

    // ---------- validation ----------
    const MSG = {
      text: 'Please fill in this field',
      email: 'Check your email, for example name@mail.com',
      phone: 'Enter a number with country code',
      select: "Select the child's age",
      cardnum: 'Check your card number',
      expEmpty: 'Enter the expiry date, for example 12/30',
      expPast: 'This card has expired',
      cvc: '3 digits on the back of the card',
    };
    function luhn(num) {
      let sum = 0;
      let alt = false;
      for (let i = num.length - 1; i >= 0; i--) {
        let d = Number(num[i]);
        if (alt) {
          d *= 2;
          if (d > 9) d -= 9;
        }
        sum += d;
        alt = !alt;
      }
      return sum % 10 === 0;
    }
    function validateInput(el) {
      const v = el.value.trim();
      const rule = el.dataset.rule;
      if (rule === 'text') return v ? '' : MSG.text;
      if (rule === 'select') return v ? '' : MSG.select;
      if (rule === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : MSG.email;
      if (rule === 'phone') return v.replace(/\D/g, '').length >= 8 ? '' : MSG.phone;
      if (rule === 'cardnum') {
        const d = v.replace(/\s/g, '');
        return d.length === 16 && luhn(d) ? '' : MSG.cardnum;
      }
      if (rule === 'exp') {
        const m = v.match(/^(\d{2})\/(\d{2})$/);
        if (!m) return MSG.expEmpty;
        const mm = Number(m[1]);
        const yy = 2000 + Number(m[2]);
        if (mm < 1 || mm > 12) return MSG.expEmpty;
        const now = new Date();
        if (yy < now.getFullYear() || (yy === now.getFullYear() && mm < now.getMonth() + 1)) return MSG.expPast;
        return '';
      }
      if (rule === 'cvc') return /^\d{3}$/.test(v) ? '' : MSG.cvc;
      return '';
    }
    function showFieldError(el, msg) {
      const wrap = el.closest('.field');
      wrap.classList.toggle('field--invalid', Boolean(msg));
      wrap.querySelector('[data-error]').textContent = msg || '';
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function validateGroup(container) {
      const errors = [];
      container.querySelectorAll('[data-rule]').forEach((el) => {
        const msg = validateInput(el);
        showFieldError(el, msg);
        if (msg) errors.push({ el, msg });
      });
      // No error summary box: each field shows its own message, and focus
      // moves straight to the first invalid one.
      if (errors.length) errors[0].el.focus();
      return errors.length === 0;
    }

    root.addEventListener(
      'focusout',
      (e) => {
        const el = e.target;
        if (el.matches && el.matches('[data-rule]') && (el.value || el.closest('.field').classList.contains('field--invalid'))) {
          showFieldError(el, validateInput(el));
        }
      },
      true,
    );
    root.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.matches || !el.matches('[data-rule]')) return;
      if (el.id === 'cardnum') {
        const d = el.value.replace(/\D/g, '').slice(0, 16);
        el.value = d.replace(/(.{4})/g, '$1 ').trim();
      }
      if (el.id === 'exp') {
        let d = el.value.replace(/\D/g, '').slice(0, 4);
        if (d.length >= 3) d = `${d.slice(0, 2)}/${d.slice(2)}`;
        el.value = d;
      }
      if (el.id === 'cvc') el.value = el.value.replace(/\D/g, '').slice(0, 3);
      if (el.closest('.field').classList.contains('field--invalid') && !validateInput(el)) showFieldError(el, '');
    });

    // ---------- block state ----------
    function setBlock(n, st) {
      $(`[data-block="${n}"]`).dataset.state = st;
      const body = $(`[data-block-body="${n}"]`);
      const summary = $(`[data-block-summary="${n}"]`);
      const edit = $(`[data-edit-block="${n}"]`);
      const numText = $(`[data-block="${n}"] [data-num-text]`);
      const numCheck = $(`[data-block="${n}"] [data-num-check]`);
      body.hidden = st !== 'active';
      summary.hidden = st === 'active';
      if (edit) edit.hidden = st !== 'done';
      numText.hidden = st === 'done';
      numCheck.hidden = st !== 'done';
    }

    function updateBlock1Summary() {
      const first = $('#t0first').value.trim();
      const last = $('#t0last').value.trim();
      const extra = adults + children - 1;
      $('[data-block-summary="1"]').innerHTML =
        `<strong>${esc(first)} ${esc(last)}</strong> · ${esc($('#email').value.trim())} · ${esc($('#phone').value.trim())}` +
        (extra ? `<br>+ ${extra} more ${plural(extra, 'traveler', 'travelers')}` : '');
    }

    function goToPayment() {
      if (!validateGroup($('[data-block-body="1"]'))) return;
      updateBlock1Summary();
      setBlock(1, 'done');
      setBlock(2, 'active');
      $('[data-block="2"]').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => $('#cardnum').focus({ preventScroll: true }), 250);
    }
    $('[data-continue-btn]').addEventListener('click', goToPayment);
    $('[data-edit-block="1"]').addEventListener('click', () => {
      setBlock(1, 'active');
      setBlock(2, 'locked');
      $('#t0first').focus();
    });
    // Clicking the "Payment" plate itself is a shortcut for "Continue to
    // payment": while step 1 isn't done yet, it validates and (if valid)
    // opens payment the same way the button does. Once payment is already
    // open or done, the click is a no-op.
    $('[data-block="2"] .checkout-block__head').addEventListener('click', () => {
      if ($('[data-block="1"]').dataset.state !== 'done') goToPayment();
    });

    // ---------- payment ----------
    function pay(method) {
      if (state.paying) return;
      if (method === 'card' && !validateGroup($('[data-block-body="2"]'))) {
        return;
      }
      state.paying = true;
      $('[data-pay-alert]').hidden = true;
      const btn = $('[data-pay-btn]');
      btn.disabled = true;
      btn.textContent = 'Processing payment…';
      setTimeout(() => {
        state.paying = false;
        btn.disabled = false;
        const cardDigits = $('#cardnum').value.replace(/\D/g, '');
        if (method === 'card' && cardDigits === DECLINE_CARD) {
          const t = renderSummary();
          const alertBox = $('[data-pay-alert]');
          alertBox.textContent = 'Your bank declined the payment. Try another card or Apple Pay. Your details are saved and you have not been charged.';
          alertBox.hidden = false;
          btn.textContent = `Pay ${formatPrice(t.dueNow)}`;
          alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        completeBooking();
      }, 1200);
    }
    $('[data-pay-btn]').addEventListener('click', () => pay('card'));
    root.querySelectorAll('[data-wallet-pay]').forEach((btn) => btn.addEventListener('click', () => pay('wallet')));

    function completeBooking() {
      const t = totals();
      const id = generateBookingId();
      const booking = {
        id,
        status: 'confirmed',
        tourSlug: tour.slug,
        tourName: tour.name,
        place: tour.place,
        departureStart: departure.start,
        departureEnd: departure.end,
        departureLabel: departure.label,
        adults,
        children,
        plan: state.plan,
        total: t.total,
        dueNow: t.dueNow,
        rest: t.rest,
        promoCode: state.promo ? state.promo.code : null,
        email: $('#email').value.trim(),
        leadFirstName: $('#t0first').value.trim(),
        leadLastName: $('#t0last').value.trim(),
        cancelBy: cancelByDate(departure.start),
        paidAt: new Date().toISOString(),
      };
      saveBooking(booking);
      window.location.href = `/checkout/confirmation?booking=${id}`;
    }

    // ---------- hold-expired recovery ----------
    $('[data-fact-dates-expired]').textContent = departure.label;
    $('[data-rehold-btn]')?.addEventListener('click', () => {
      showView('checkout');
      startTimer();
    });

    // ---------- init ----------
    buildTravelers();
    renderSummary();
    if (mock === 'expired') {
      showView('expired');
    } else {
      showView('checkout');
      startTimer(mock === 'lowhold' ? WARNING_SECONDS : undefined);
    }
  }
}
