// Header search: 3 steps (destination, dates, travelers), desktop segmented
// pill + dropdown panel, mobile full-screen sheet with an accordion — both
// driven by the same state. Visuals follow the Figma exports exactly
// (reference/figma/components/header-open*.png, dropdown-*.png); the mobile
// prototype is only used where Figma doesn't show the mobile layout.
import toursData from '../data/tours.json';
import { nearestDeparture, formatPrice, TYPE_LABELS } from './tours.js';
import searchIconUrl from '../assets/icons/search-circle-32.svg?url';
import plusIconUrl from '../assets/icons/plus-circle-24.svg?url';
import minusIconUrl from '../assets/icons/minus-circle-24.svg?url';
import arrowLeftUrl from '../assets/icons/arrow-left-20.svg?url';
import arrowRightUrl from '../assets/icons/arrow-right-20.svg?url';

const tours = toursData.tours;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const plural = (n, one, many) => (n === 1 ? one : many);
const RECENT_KEY = 'wanderloop:recent-destinations';
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}
function pushRecent(slug) {
  try {
    const list = readRecent().filter((s) => s !== slug);
    list.unshift(slug);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 3)));
  } catch {
    // ignore
  }
}
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
// FLIP-style morph: makes `el` (already in its final layout position/size)
// animate in from `fromRect`'s position and size, e.g. the collapsed
// trigger's rect growing into the expanded bar, or the reverse on collapse.
function animateMorph(el, fromRect) {
  if (prefersReducedMotion()) return;
  const toRect = el.getBoundingClientRect();
  if (!toRect.width || !toRect.height) return;
  const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2);
  const dy = fromRect.top + fromRect.height / 2 - (toRect.top + toRect.height / 2);
  const scaleX = fromRect.width / toRect.width;
  const scaleY = fromRect.height / toRect.height;
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`, opacity: 0.6 },
      { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
    ],
    { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  );
}
function fullDateRange(startStr, endStr) {
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  const y = start.getFullYear();
  if (start.getMonth() === end.getMonth()) {
    return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} — ${end.getDate()}, ${y}`;
  }
  return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} — ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${y}`;
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function inRange(day, startStr, endStr) {
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  return day >= start && day <= end;
}

document.querySelectorAll('[data-search-widget]').forEach((widget) => {
  const coverMap = JSON.parse($('#search-cover-images', widget)?.textContent || '{}');
  const gridCoverMap = JSON.parse($('#search-grid-images', widget)?.textContent || '{}');

  const state = {
    destSlug: null,
    departure: null,
    adults: 1,
    children: 0,
    touched: false,
    query: '',
    activeSegment: null,
    calendarMonth: null, // {year, month}
  };

  function currentTour() {
    return state.destSlug ? tours.find((t) => t.slug === state.destSlug) : null;
  }
  function partySize() {
    return state.adults + state.children;
  }
  function currentDeparture() {
    const tour = currentTour();
    if (!tour || !state.departure) return null;
    return tour.departures.find((d) => d.start === state.departure) || null;
  }
  function ensureCalendarMonth() {
    if (state.calendarMonth) return;
    const tour = currentTour();
    const dep = currentDeparture() || (tour && tour.departures[0]);
    const base = dep ? new Date(`${dep.start}T00:00:00`) : new Date();
    state.calendarMonth = { year: base.getFullYear(), month: base.getMonth() };
  }

  // ---------- destination step ----------
  function destRowList(t) {
    const cover = coverMap[t.slug];
    const thumb = cover
      ? `<img class="search-row__thumb" src="${cover}" alt="" width="56" height="56" />`
      : `<span class="search-row__thumb"></span>`;
    return `<button type="button" class="search-row" data-pick-dest="${t.slug}">
      ${thumb}
      <span><span class="search-row__name">${t.place}</span><span class="search-row__sub">${TYPE_LABELS[t.type] ?? t.type}</span></span>
    </button>`;
  }
  function destTile(t) {
    const cover = gridCoverMap[t.slug];
    const img = cover ? `<img src="${cover}" alt="" width="280" height="170" />` : '';
    return `<button type="button" class="search-tile" data-pick-dest="${t.slug}">
      <span class="search-tile__photo">${img}</span>
      <span class="search-tile__name">${t.place}</span>
      <span class="search-tile__sub">${TYPE_LABELS[t.type] ?? t.type}</span>
    </button>`;
  }
  function destStepHTML(isDesktop) {
    const q = state.query.trim().toLowerCase();
    const recent = readRecent()
      .map((slug) => tours.find((t) => t.slug === slug))
      .filter(Boolean);
    const match = (t) => !q || t.place.toLowerCase().includes(q);
    const rows = tours.filter((t) => match(t) && (q || !recent.includes(t)));

    let html = `<div class="search-step__search">
      <label class="visually-hidden" for="search-dest-q">Search destinations</label>
      <input id="search-dest-q" class="search-step__input" type="text" placeholder="Search destinations" autocomplete="off" value="${state.query}" data-dest-query />
      <img class="search-step__search-icon" src="${searchIconUrl}" alt="" width="32" height="32" />
    </div>`;

    const row = isDesktop ? destTile : destRowList;
    const listClass = isDesktop ? 'search-tile-row' : 'search-row-list';

    if (!q) {
      if (recent.length) {
        html += `<p class="search-step__label">Recent searches</p><div class="search-row-list">${recent.map(destRowList).join('')}</div>`;
      }
      html += `<p class="search-step__label">Recommended destinations</p>`;
    }
    if (q && rows.length === 0) {
      html += `<p class="search-step__empty">No destinations found for "${state.query}".</p>`;
    } else {
      html += `<div class="${listClass}">${rows.map(row).join('')}</div>`;
    }
    return html;
  }

  // ---------- dates step ----------
  function depCardHTML(d, tour) {
    const selected = state.departure === d.start;
    const statusText = d.spotsLeft === 0 ? 'Full' : d.spotsLeft <= 3 ? d.chip : 'Available';
    return `<button type="button" class="search-depcard${selected ? ' is-selected' : ''}" data-pick-dep="${d.start}" ${d.spotsLeft === 0 ? 'disabled' : ''}>
      <span class="search-depcard__range">${d.label.replace('–', '—')}</span>
      <span class="search-depcard__days">${tour.durationDays} days</span>
      <span class="search-depcard__status">${statusText}</span>
    </button>`;
  }
  function calendarHTML(tour) {
    ensureCalendarMonth();
    const { year, month } = state.calendarMonth;
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startOffset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells = [];
    const cur = new Date(gridStart);
    for (let i = 0; i < 42; i++) {
      const d = new Date(cur);
      const inMonth = d.getMonth() === month;
      let dep = null;
      tour.departures.forEach((candidate) => {
        if (inRange(d, candidate.start, candidate.end)) dep = candidate;
      });
      let cls = 'search-cal__day';
      if (!inMonth) cls += ' search-cal__day--muted';
      if (sameDay(d, today)) cls += ' search-cal__day--today';
      let clickable = false;
      if (dep) {
        const start = new Date(`${dep.start}T00:00:00`);
        const end = new Date(`${dep.end}T00:00:00`);
        const isEdge = sameDay(d, start) || sameDay(d, end);
        const selected = state.departure === dep.start;
        clickable = dep.spotsLeft > 0;
        if (selected) cls += isEdge ? ' search-cal__day--edge' : ' search-cal__day--fill';
        else cls += dep.spotsLeft <= 3 ? ' search-cal__day--scarce' : ' search-cal__day--ok';
      }
      cells.push(
        `<button type="button" class="${cls}" ${dep && clickable ? `data-pick-dep="${dep.start}"` : 'disabled'}>${d.getDate()}</button>`,
      );
      cur.setDate(cur.getDate() + 1);
    }

    return `<div class="search-cal">
      <div class="search-cal__head">
        <button type="button" class="search-cal__nav" data-cal-nav="-1" aria-label="Previous month"><img src="${arrowLeftUrl}" alt="" width="20" height="20" /></button>
        <span class="search-cal__title">${MONTH_NAMES[month]} ${year}</span>
        <button type="button" class="search-cal__nav" data-cal-nav="1" aria-label="Next month"><img src="${arrowRightUrl}" alt="" width="20" height="20" /></button>
      </div>
      <div class="search-cal__weekdays">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="search-cal__grid">${cells.join('')}</div>
      <div class="search-cal__legend">
        <span><i class="search-cal__dot search-cal__dot--today"></i>Today</span>
        <span><i class="search-cal__dot search-cal__dot--selected"></i>Selected</span>
      </div>
    </div>`;
  }
  // Empty-state card shown when a step's prerequisite hasn't been picked yet.
  // Matches reference/figma/components/dropdown-travelers-data.png exactly —
  // same layout for every "choose X first" case, just different copy.
  function gateHTML(heading, body, buttonText, gotoStep) {
    return `<div class="search-gate">
      <h3 class="search-gate__heading">${heading}</h3>
      <p class="search-gate__body">${body}</p>
      <button type="button" class="btn btn--solid search-gate__btn" data-goto-segment="${gotoStep}">${buttonText}</button>
      <button type="button" class="search-gate__close" data-search-close-gate>Close</button>
    </div>`;
  }

  function datesStepHTML() {
    const tour = currentTour();
    if (!tour) {
      return gateHTML(
        'Choose a destination first',
        "We'll show you available dates once you pick a destination.",
        'Choose a destination',
        'dest',
      );
    }
    let html = `<p class="search-step__label">Upcoming departure dates</p>
      <div class="search-depcard-row">${tour.departures.map((d) => depCardHTML(d, tour)).join('')}</div>`;
    html += calendarHTML(tour);
    return html;
  }

  // ---------- travelers step ----------
  function travStepHTML() {
    const tour = currentTour();
    const departure = currentDeparture();
    if (!tour) {
      return gateHTML(
        'Choose a destination first',
        "We'll show you available spots once you pick a destination.",
        'Choose a destination',
        'dest',
      );
    }
    if (!departure) {
      return gateHTML(
        'Choose a tour date first',
        "We'll show how many spots are already taken as soon as you pick a departure date.",
        'Choose a date',
        'dates',
      );
    }
    const cap = departure ? departure.spotsLeft : null;
    const party = partySize();
    const remaining = cap != null ? cap - party : null;
    let html = '';
    if (departure) {
      html += `<p class="search-step__heading">${fullDateRange(departure.start, departure.end)}</p>`;
    }
    if (cap != null) {
      const pct = Math.min(100, Math.round((party / cap) * 100));
      html += `<p class="search-step__taken">Spots taken: <strong>${party} of ${cap}</strong><span class="search-step__taken-right">${remaining} left</span></p>
        <div class="search-step__bar"><span style="width:${pct}%"></span></div>`;
    }
    html += `<div class="search-step__row">
        <div><p class="search-step__row-title">Travelers</p><p class="search-step__row-sub">age 6+ · ${formatPrice(tour ? tour.priceAdult : 0)}</p></div>
        <div class="stepper">
          <button type="button" data-trav-step="adults" data-trav-delta="-1" aria-label="Fewer adults" ${state.adults <= 1 ? 'disabled' : ''}><img src="${minusIconUrl}" alt="" width="24" height="24" /></button>
          <span>${state.adults}</span>
          <button type="button" data-trav-step="adults" data-trav-delta="1" aria-label="More adults" ${remaining != null && remaining <= 0 ? 'disabled' : ''}><img src="${plusIconUrl}" alt="" width="24" height="24" /></button>
        </div>
      </div>
      <div class="search-step__row">
        <div><p class="search-step__row-title">Children</p><p class="search-step__row-sub">under 6 · ${formatPrice(tour ? tour.priceChild : 0)} · also takes a spot</p></div>
        <div class="stepper">
          <button type="button" data-trav-step="children" data-trav-delta="-1" aria-label="Fewer children" ${state.children <= 0 ? 'disabled' : ''}><img src="${minusIconUrl}" alt="" width="24" height="24" /></button>
          <span>${state.children}</span>
          <button type="button" data-trav-step="children" data-trav-delta="1" aria-label="More children" ${remaining != null && remaining <= 0 ? 'disabled' : ''}><img src="${plusIconUrl}" alt="" width="24" height="24" /></button>
        </div>
      </div>`;
    if (remaining != null) {
      html += `<p class="search-step__hint">${remaining > 0 ? `You can add ${remaining} more spot${remaining === 1 ? '' : 's'}.` : "You've filled this date."}</p>`;
    }
    return html;
  }

  function stepHTML(step, isDesktop) {
    if (step === 'dest') return destStepHTML(isDesktop);
    if (step === 'dates') return datesStepHTML();
    return travStepHTML();
  }

  // ---------- matching results ----------
  function matchingCount() {
    const party = partySize();
    return tours.filter((t) => {
      if (state.destSlug && t.slug !== state.destSlug) return false;
      if (state.departure) {
        const dep = t.departures.find((d) => d.start === state.departure);
        return Boolean(dep) && dep.spotsLeft >= party;
      }
      return t.departures.some((d) => d.spotsLeft >= party);
    }).length;
  }

  // ---------- labels ----------
  function segmentValue(step) {
    if (step === 'dest') {
      const tour = currentTour();
      return tour ? tour.place : 'Search destinations';
    }
    if (step === 'dates') {
      const dep = currentDeparture();
      return dep ? dep.label : 'Add dates';
    }
    return state.touched ? `${partySize()} ${plural(partySize(), 'guest', 'guests')}` : 'Add guests';
  }
  // ---------- DOM refs ----------
  const desktopTrigger = $('[data-search-trigger-desktop]', widget);
  const mobileTrigger = $('[data-search-trigger-mobile]', widget);
  const bar = $('[data-search-bar]', widget);
  const panel = $('[data-search-panel]', widget);
  const sheet = $('[data-search-sheet]', widget);
  const backdrop = $('[data-search-backdrop]', widget);

  function closePanel() {
    if (panel) panel.hidden = true;
    if (backdrop) backdrop.hidden = true;
    if (bar) bar.classList.remove('is-panel-open');
    state.activeSegment = null;
    $$('[data-segment-trigger]', widget).forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  function renderDesktop() {
    const segments = $$('[data-segment-trigger]', widget);
    const anyActive = Boolean(state.activeSegment);
    segments.forEach((b, i) => {
      const step = b.dataset.segmentTrigger;
      const isActive = step === state.activeSegment;
      b.classList.toggle('is-active', isActive);
      // Only the active segment stays dark; every other segment is muted
      // while one is open, filled in or not — in the neutral "just expanded,
      // nothing picked yet" state (no segment active) all three stay dark.
      b.classList.toggle('is-muted', anyActive && !isActive);
      $('[data-segment-value]', b).textContent = segmentValue(step);
      // hide the divider that sits right before this segment when this
      // segment, or the one before it, is active (their pill backgrounds touch it)
      const divider = b.previousElementSibling;
      if (divider && divider.classList.contains('search-bar__divider')) {
        const prevStep = segments[i - 1]?.dataset.segmentTrigger;
        divider.classList.toggle('is-hidden', isActive || prevStep === state.activeSegment);
      }
    });
    // The last segment (Travelers) sits flush against the search button —
    // when it's active its fill extends into the button's own padding so
    // the two read as one capsule, instead of stopping short at the seam.
    const goWrap = $('.search-bar__go-wrap', widget);
    if (goWrap) {
      const lastStep = segments[segments.length - 1]?.dataset.segmentTrigger;
      goWrap.classList.toggle('is-active', state.activeSegment === lastStep);
    }
    // The bar's own border is only useful while it floats over the plain
    // page; once a panel opens and the backdrop blurs the page behind it,
    // the border reads as a stray line, so it's dropped in that state.
    if (bar) bar.classList.toggle('is-panel-open', Boolean(state.activeSegment));
    if (state.activeSegment && panel) {
      panel.hidden = false;
      if (backdrop) backdrop.hidden = false;
      $$('[data-step-content]', panel).forEach((el) => {
        const match = el.dataset.stepContent === state.activeSegment;
        el.hidden = !match;
        if (match) el.innerHTML = stepHTML(state.activeSegment, true);
      });
    }
    const triggerText = currentTour() ? currentTour().place : 'Search trips';
    $$('[data-trigger-text]', widget).forEach((el) => (el.textContent = triggerText));
  }

  function renderMobile() {
    $$('[data-accordion-value]', widget).forEach((el) => {
      el.textContent = segmentValue(el.dataset.accordionValue);
    });
    $$('[data-accordion-body]', sheet || widget).forEach((el) => {
      el.innerHTML = stepHTML(el.dataset.accordionBody, false);
    });
    const count = matchingCount();
    const goBtn = $('[data-search-go-mobile]', widget);
    if (goBtn) {
      goBtn.disabled = count === 0;
      goBtn.textContent = count ? `Show ${count} ${plural(count, 'trip', 'trips')}` : 'No trips match';
    }
  }

  function renderAll() {
    renderDesktop();
    renderMobile();
  }

  // ---------- desktop open/close ----------
  desktopTrigger?.addEventListener('click', () => {
    const fromRect = desktopTrigger.getBoundingClientRect();
    bar.hidden = false;
    desktopTrigger.hidden = true;
    // Expanding shows the neutral bar only (header-open.png) — no segment
    // opens until the visitor actually clicks one, and no blur until then either.
    state.activeSegment = null;
    renderAll();
    animateMorph(bar, fromRect);
  });

  $$('[data-segment-trigger]', widget).forEach((btn) => {
    btn.addEventListener('click', () => {
      const step = btn.dataset.segmentTrigger;
      state.activeSegment = state.activeSegment === step ? null : step;
      state.calendarMonth = null;
      if (!state.activeSegment) closePanel();
      renderAll();
    });
  });

  function collapseBar() {
    closePanel();
    const wasOpen = Boolean(bar && !bar.hidden);
    const fromRect = wasOpen ? bar.getBoundingClientRect() : null;
    if (bar) bar.hidden = true;
    if (desktopTrigger) {
      desktopTrigger.hidden = false;
      if (fromRect) animateMorph(desktopTrigger, fromRect);
    }
  }

  backdrop?.addEventListener('click', collapseBar);
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Node)) return;
    // composedPath(), not widget.contains(e.target): actions that stay on
    // the same step (calendar month nav, traveler +/-) re-render that
    // step's innerHTML while the click is still bubbling, which detaches
    // the original target from the document — widget.contains(e.target)
    // would then wrongly read as "outside" and close the whole bar.
    // composedPath() is captured at dispatch time, so it isn't affected.
    if (bar && !bar.hidden && !e.composedPath().includes(widget)) collapseBar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (panel && !panel.hidden) {
      closePanel();
      return;
    }
    if (bar && !bar.hidden) collapseBar();
    if (sheet && !sheet.hidden) closeSheet();
  });

  $('[data-search-go]', widget)?.addEventListener('click', () => submit());

  // ---------- mobile open/close ----------
  function openSheet() {
    if (!sheet) return;
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
    state.activeSegment = null;
    renderAll();
  }
  function closeSheet() {
    if (!sheet) return;
    sheet.hidden = true;
    document.body.style.overflow = '';
  }
  mobileTrigger?.addEventListener('click', openSheet);
  $('[data-search-close]', widget)?.addEventListener('click', closeSheet);
  $$('[data-accordion-trigger]', widget).forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.accordionTrigger;
      const body = $(`[data-accordion-body="${key}"]`, sheet);
      const wasOpen = body && !body.hidden;
      $$('[data-accordion-body]', sheet).forEach((b) => {
        b.hidden = true;
      });
      $$('[data-accordion-trigger]', widget).forEach((b) => b.setAttribute('aria-expanded', 'false'));
      if (!wasOpen && body) {
        state.calendarMonth = null;
        body.innerHTML = stepHTML(key, false);
        body.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
  $('[data-search-clear]', widget)?.addEventListener('click', () => {
    Object.assign(state, { destSlug: null, departure: null, adults: 1, children: 0, touched: false, query: '', calendarMonth: null });
    renderAll();
    $('[data-accordion-trigger="dest"]', sheet)?.click();
  });
  $('[data-search-go-mobile]', widget)?.addEventListener('click', () => submit());

  // ---------- shared interactions (delegated) ----------
  widget.addEventListener('click', (e) => {
    const calNav = e.target.closest('[data-cal-nav]');
    if (calNav) {
      const delta = Number(calNav.dataset.calNav);
      ensureCalendarMonth();
      let { year, month } = state.calendarMonth;
      month += delta;
      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }
      state.calendarMonth = { year, month };
      renderAll();
      return;
    }
    const pickDest = e.target.closest('[data-pick-dest]');
    if (pickDest) {
      const slug = pickDest.dataset.pickDest;
      state.destSlug = slug || null;
      state.query = '';
      state.calendarMonth = null;
      if (slug) pushRecent(slug);
      if (state.departure && slug) {
        const tour = tours.find((t) => t.slug === slug);
        if (!tour.departures.some((d) => d.start === state.departure)) state.departure = null;
      } else if (!slug) {
        state.departure = null;
      }
      state.activeSegment = 'dates';
      renderAll();
      $('[data-accordion-trigger="dates"]', sheet)?.click();
      return;
    }
    const pickDep = e.target.closest('[data-pick-dep]');
    if (pickDep && !pickDep.disabled) {
      state.departure = pickDep.dataset.pickDep;
      state.activeSegment = 'trav';
      renderAll();
      $('[data-accordion-trigger="trav"]', sheet)?.click();
      return;
    }
    const gotoSegment = e.target.closest('[data-goto-segment]');
    if (gotoSegment) {
      state.activeSegment = gotoSegment.dataset.gotoSegment;
      renderAll();
      $(`[data-accordion-trigger="${gotoSegment.dataset.gotoSegment}"]`, sheet)?.click();
      return;
    }
    if (e.target.closest('[data-search-close-gate]')) {
      collapseBar();
      closeSheet();
      return;
    }
    const travStep = e.target.closest('[data-trav-step]');
    if (travStep) {
      const key = travStep.dataset.travStep;
      const delta = Number(travStep.dataset.travDelta);
      const next = state[key] + delta;
      if (key === 'adults' && next < 1) return;
      if (key === 'children' && next < 0) return;
      const dep = currentDeparture();
      const nextParty = key === 'adults' ? next + state.children : state.adults + next;
      if (dep && nextParty > dep.spotsLeft) return;
      state[key] = next;
      state.touched = true;
      renderAll();
    }
  });

  widget.addEventListener('input', (e) => {
    if (e.target.matches('[data-dest-query]')) {
      state.query = e.target.value;
      const isDesktopInput = Boolean(e.target.closest('[data-search-panel]'));
      $$('[data-step-content="dest"]', widget).forEach((el) => {
        el.innerHTML = destStepHTML(Boolean(el.closest('[data-search-panel]')));
      });
      $$('[data-accordion-body="dest"]', widget).forEach((el) => {
        el.innerHTML = destStepHTML(false);
      });
      void isDesktopInput;
    }
  });

  function submit() {
    const tour = currentTour();
    const params = new URLSearchParams();
    if (state.touched) {
      params.set('adults', String(state.adults));
      if (state.children) params.set('children', String(state.children));
    }
    closeSheet();
    closePanel();
    if (bar) bar.hidden = true;
    if (desktopTrigger) desktopTrigger.hidden = false;
    if (tour) {
      if (state.departure) params.set('departure', state.departure);
      window.location.href = `/tours/${tour.slug}${params.toString() ? `?${params}` : ''}`;
    } else {
      window.location.href = `/tours${params.toString() ? `?${params}` : ''}`;
    }
  }

  renderAll();
});
