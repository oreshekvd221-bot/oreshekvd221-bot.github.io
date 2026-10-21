// Fullscreen photo viewer for the tour page gallery (src/pages/tours/[slug].astro).
// Opens on clicking any gallery photo; closes on Esc, the close button or a
// click on the backdrop. Same focus-trap pattern as AuthModals: focus moves
// into the viewer on open and returns to the photo that opened it on close.
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const lightbox = $('[data-lightbox]');
const triggers = $$('[data-gallery-trigger]');

if (lightbox && triggers.length) {
  const image = $('[data-lightbox-image]', lightbox);
  const countEl = $('[data-lightbox-count]', lightbox);
  const prevBtn = $('[data-lightbox-prev]', lightbox);
  const nextBtn = $('[data-lightbox-next]', lightbox);

  const photos = triggers.map((trigger) => ({
    src: trigger.dataset.fullSrc,
    alt: trigger.querySelector('img')?.alt || '',
  }));

  if (photos.length <= 1) {
    prevBtn.hidden = true;
    nextBtn.hidden = true;
  }

  let index = 0;
  let lastFocused = null;

  function focusableIn(container) {
    return $$('button', container).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function render() {
    const photo = photos[index];
    image.src = photo.src;
    image.alt = photo.alt;
    countEl.textContent = `${index + 1} / ${photos.length}`;
  }

  function show(newIndex) {
    index = (newIndex + photos.length) % photos.length;
    render();
  }

  function open(startIndex, opener) {
    lastFocused = opener;
    show(startIndex);
    lightbox.hidden = false;
    document.addEventListener('keydown', onKeydown);
    $('[data-lightbox-close]', lightbox)?.focus();
  }

  function close() {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    document.removeEventListener('keydown', onKeydown);
    lastFocused?.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'ArrowLeft') {
      show(index - 1);
      return;
    }
    if (e.key === 'ArrowRight') {
      show(index + 1);
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = focusableIn(lightbox);
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

  triggers.forEach((trigger, i) => {
    trigger.addEventListener('click', () => open(i, trigger));
  });

  $('[data-lightbox-close]', lightbox)?.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(index - 1));
  nextBtn.addEventListener('click', () => show(index + 1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });
}
