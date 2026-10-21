// Catalog filtering: client-side only. Every tour card is in the page already
// (see Catalog.astro); this script shows/hides them based on the filter chips
// and keeps the choices in the URL so a filtered view can be bookmarked or
// linked (e.g. from the header search once it's built).
import { formatPrice } from './tours.js';

const bar = document.querySelector('[data-filter-bar]');
const cards = Array.from(document.querySelectorAll('[data-tour-card]'));
const countEl = document.querySelector('[data-result-count]');
const emptyEl = document.querySelector('[data-empty-message]');
const triggers = Array.from(document.querySelectorAll('[data-filter-trigger]'));
const panels = Array.from(document.querySelectorAll('[data-filter-panel]'));
const optionButtons = Array.from(document.querySelectorAll('[data-filter-option]'));
const chipLabelEls = Array.from(document.querySelectorAll('[data-chip-label]'));
const clearButtons = Array.from(document.querySelectorAll('[data-filter-clear]'));
const filterBackdrop = document.querySelector('[data-filter-backdrop]');

const priceMinInput = document.querySelector('[data-price-input="min"]');
const priceMaxInput = document.querySelector('[data-price-input="max"]');
const priceMinLabel = document.querySelector('[data-price-label="min"]');
const priceMaxLabel = document.querySelector('[data-price-label="max"]');
const priceFill = document.querySelector('[data-price-fill]');

// Nothing to wire up if this page has no catalog (shouldn't happen, but keeps
// this script safe to include everywhere).
if (bar && cards.length) {
  const basePriceMin = Number(priceMinInput.min);
  const basePriceMax = Number(priceMaxInput.max);

  const DURATION_TESTS = {
    'up-to-5': (days) => days <= 5,
    '6-8': (days) => days >= 6 && days <= 8,
    '9-plus': (days) => days >= 9,
  };

  chipLabelEls.forEach((el) => {
    el.dataset.defaultLabel = el.textContent ?? '';
  });

  function readStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    const num = (key) => (params.has(key) ? Number(params.get(key)) : null);
    return {
      dest: params.get('dest') || '',
      month: params.get('month') || '',
      type: params.get('type') || '',
      duration: params.get('duration') || '',
      difficulty: params.get('difficulty') || '',
      priceMin: num('priceMin'),
      priceMax: num('priceMax'),
      spots: num('spots'),
      adults: num('adults') || 0,
      children: num('children') || 0,
    };
  }

  const state = readStateFromURL();

  function writeStateToURL() {
    const params = new URLSearchParams();
    if (state.dest) params.set('dest', state.dest);
    if (state.month) params.set('month', state.month);
    if (state.type) params.set('type', state.type);
    if (state.duration) params.set('duration', state.duration);
    if (state.difficulty) params.set('difficulty', state.difficulty);
    if (state.priceMin != null) params.set('priceMin', String(state.priceMin));
    if (state.priceMax != null) params.set('priceMax', String(state.priceMax));
    if (state.spots != null) params.set('spots', String(state.spots));
    if (state.adults) params.set('adults', String(state.adults));
    if (state.children) params.set('children', String(state.children));
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  }

  function cardMatches(card) {
    if (state.dest && card.dataset.country !== state.dest) return false;
    if (state.month && card.dataset.month !== state.month) return false;
    if (state.type && card.dataset.type !== state.type) return false;
    if (state.difficulty && card.dataset.difficulty !== state.difficulty) return false;
    if (state.duration) {
      const test = DURATION_TESTS[state.duration];
      if (test && !test(Number(card.dataset.duration))) return false;
    }
    const price = Number(card.dataset.price);
    if (state.priceMin != null && price < state.priceMin) return false;
    if (state.priceMax != null && price > state.priceMax) return false;

    const spots = Number(card.dataset.spots);
    if (state.spots != null) {
      const min = state.spots >= 4 ? 4 : state.spots;
      if (spots < min) return false;
    }
    const groupSize = state.adults + state.children;
    if (groupSize > 0 && spots < groupSize) return false;

    return true;
  }

  function optionLabel(key, value) {
    const btn = optionButtons.find((b) => b.dataset.filterKey === key && b.dataset.value === String(value));
    return btn ? btn.textContent.trim() : String(value);
  }

  function hasActiveFilters() {
    return Boolean(
      state.dest ||
        state.month ||
        state.type ||
        state.duration ||
        state.difficulty ||
        state.priceMin != null ||
        state.priceMax != null ||
        state.spots != null,
    );
  }

  function updateChipLabels() {
    chipLabelEls.forEach((el) => {
      const key = el.dataset.chipLabel;
      const def = el.dataset.defaultLabel;
      if (key === 'price') {
        el.textContent =
          state.priceMin != null || state.priceMax != null
            ? `Price: ${formatPrice(state.priceMin ?? basePriceMin)}–${formatPrice(state.priceMax ?? basePriceMax)}`
            : def;
        return;
      }
      const value = state[key];
      if (value == null || value === '') {
        el.textContent = def;
        return;
      }
      const label = key === 'spots' ? (value >= 4 ? '4+' : String(value)) : optionLabel(key, value);
      el.textContent = `${def}: ${label}`;
    });

    triggers.forEach((trigger) => {
      const key = trigger.dataset.filterTrigger;
      const active =
        key === 'price' ? state.priceMin != null || state.priceMax != null : state[key] != null && state[key] !== '';
      trigger.classList.toggle('is-active', active);
    });

    clearButtons.forEach((btn) => {
      if (btn.closest('.filter-bar__row')) btn.hidden = !hasActiveFilters();
    });
  }

  function applyFilters() {
    let visible = 0;
    cards.forEach((card) => {
      const show = cardMatches(card);
      card.hidden = !show;
      if (show) visible += 1;
    });
    countEl.textContent = visible === cards.length ? `${cards.length} trips` : `${visible} of ${cards.length} trips`;
    if (emptyEl) emptyEl.hidden = visible !== 0;
    updateChipLabels();
  }

  function closeAllPanels() {
    panels.forEach((panel) => {
      panel.hidden = true;
      panel.style.transform = '';
    });
    triggers.forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'));
    if (filterBackdrop) filterBackdrop.hidden = true;
  }

  // The panel is centered under its chip by default (see FilterBar.astro),
  // which keeps it clear of a chip sitting right at either end of the
  // (often horizontally-scrolled, on mobile) row. For a chip close enough
  // to an edge that centering still runs it off-screen, nudge it back in.
  // Mobile has its own fixed bottom-sheet layout (see FilterBar.astro) that
  // this nudging would fight with, so it's desktop-only.
  function keepPanelOnScreen(panel) {
    if (window.innerWidth < 768) return;
    const margin = 8;
    const rect = panel.getBoundingClientRect();
    const overflowRight = rect.right - (window.innerWidth - margin);
    const overflowLeft = margin - rect.left;
    if (overflowRight > 0) {
      panel.style.transform = `translateX(calc(-50% - ${overflowRight}px))`;
    } else if (overflowLeft > 0) {
      panel.style.transform = `translateX(calc(-50% + ${overflowLeft}px))`;
    }
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const key = trigger.dataset.filterTrigger;
      const panel = document.getElementById(`panel-${key}`);
      if (!panel) return;
      const isOpen = !panel.hidden;
      closeAllPanels();
      if (!isOpen) {
        panel.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        keepPanelOnScreen(panel);
        if (filterBackdrop) filterBackdrop.hidden = false;
      }
    });
  });

  filterBackdrop?.addEventListener('click', closeAllPanels);

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Node)) return;
    if (!bar.contains(event.target)) closeAllPanels();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllPanels();
  });

  optionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.filterKey;
      const isActive = btn.getAttribute('aria-pressed') === 'true';

      optionButtons
        .filter((b) => b.dataset.filterKey === key)
        .forEach((b) => b.setAttribute('aria-pressed', 'false'));

      if (isActive) {
        state[key] = key === 'spots' ? null : '';
      } else {
        btn.setAttribute('aria-pressed', 'true');
        state[key] = key === 'spots' ? Number(btn.dataset.value) : btn.dataset.value;
      }

      writeStateToURL();
      applyFilters();
      closeAllPanels();
    });
  });

  function syncPriceLabels() {
    let min = Number(priceMinInput.value);
    let max = Number(priceMaxInput.value);
    if (min > max) {
      min = max;
      priceMinInput.value = String(min);
    }
    priceMinLabel.textContent = formatPrice(min);
    priceMaxLabel.textContent = formatPrice(max);

    if (priceFill) {
      const span = basePriceMax - basePriceMin || 1;
      priceFill.style.left = `${((min - basePriceMin) / span) * 100}%`;
      priceFill.style.right = `${((basePriceMax - max) / span) * 100}%`;
    }
  }

  // No Apply button: the labels/fill track the slider live as it's dragged,
  // and the grid itself re-filters once a drag ends (`change`), not on
  // every pixel of `input` — filtering 12 cards is cheap, but no need to
  // thrash the DOM mid-drag.
  function commitPriceFilter() {
    const min = Number(priceMinInput.value);
    const max = Number(priceMaxInput.value);
    state.priceMin = min > basePriceMin ? min : null;
    state.priceMax = max < basePriceMax ? max : null;
    writeStateToURL();
    applyFilters();
  }

  if (priceMinInput && priceMaxInput) {
    priceMinInput.addEventListener('input', syncPriceLabels);
    priceMaxInput.addEventListener('input', syncPriceLabels);
    priceMinInput.addEventListener('change', commitPriceFilter);
    priceMaxInput.addEventListener('change', commitPriceFilter);
  }

  function clearFilters() {
    state.dest = '';
    state.month = '';
    state.type = '';
    state.duration = '';
    state.difficulty = '';
    state.priceMin = null;
    state.priceMax = null;
    state.spots = null;

    optionButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    priceMinInput.value = String(basePriceMin);
    priceMaxInput.value = String(basePriceMax);
    syncPriceLabels();

    writeStateToURL();
    applyFilters();
    closeAllPanels();
  }

  clearButtons.forEach((btn) => btn.addEventListener('click', clearFilters));

  // Reflect whatever came in through the URL (e.g. a link from the header
  // search once it exists) onto the option buttons and the price slider.
  optionButtons.forEach((btn) => {
    const key = btn.dataset.filterKey;
    const value = key === 'spots' ? Number(btn.dataset.value) : btn.dataset.value;
    if (state[key] === value) btn.setAttribute('aria-pressed', 'true');
  });
  if (state.priceMin != null) priceMinInput.value = String(state.priceMin);
  if (state.priceMax != null) priceMaxInput.value = String(state.priceMax);
  syncPriceLabels();

  applyFilters();
}
