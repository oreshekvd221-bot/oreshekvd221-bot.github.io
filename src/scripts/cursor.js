// Custom pointer: while the mouse is over a tour photo or a button, swap
// the native cursor for a blurred dot — white over a photo or the solid
// accent button, accent-colored (terracotta) over the ghost/outline
// buttons (see global.css for the dot styles and the `cursor-active` state
// that hides the native cursor). Everywhere else — including icons and the
// logo, which are also plain <img> tags — the normal system cursor is left
// alone, so it stays practical: resize handles, the text caret, OS
// pointer-accessibility settings, etc. all keep working as usual.
//
// Checks the whole stack under the cursor (elementsFromPoint), not just
// e.target: tour photos (cards, the gallery) sit under an invisible
// full-card link, which would otherwise be the only thing mouse events
// ever see there.
const DOT_SIZE = 36;
const PHOTO_SELECTOR = '.tour-card__media img, .gallery__main-wrap img, .gallery__thumb-wrap img, .lightbox__image';
const WHITE_SELECTOR = `${PHOTO_SELECTOR}, .btn--solid`;
const ACCENT_SELECTOR = '.btn--ghost, .btn--outline';
const dot = document.querySelector('[data-cursor-dot]');

if (dot && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let raf = null;

  function update() {
    dot.style.transform = `translate(${x - DOT_SIZE / 2}px, ${y - DOT_SIZE / 2}px)`;
    const stack = document.elementsFromPoint(x, y);
    const overWhiteTarget = stack.some((el) => el.matches?.(WHITE_SELECTOR));
    const overAccentTarget = !overWhiteTarget && stack.some((el) => el.matches?.(ACCENT_SELECTOR));
    document.documentElement.classList.toggle('cursor-active', overWhiteTarget || overAccentTarget);
    dot.classList.toggle('cursor-dot--accent', overAccentTarget);
    raf = null;
  }

  document.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    if (!raf) raf = requestAnimationFrame(update);
  });

  document.addEventListener('mouseleave', () => {
    document.documentElement.classList.remove('cursor-active');
  });
}
