---
name: figma-fidelity-check
description: Compare the built Wanderloop pages with the Figma PNG exports in reference/figma (sizes, spacing, radii, colors, type) and fix CSS differences. Use when the user asks to check, compare or match the site with the Figma mockup.
---

# Figma fidelity check

Goal: the site looks like the Figma mockup. Veronika's decision: Figma colors are exact, never darken them.

## Inputs
- Figma PNGs in `reference/figma/desktop`, `reference/figma/mobile`, `reference/figma/components`. They are 2x: desktop 2880 px wide (1440 design), mobile 804 px wide (402 design).
- Tokens in `src/styles/tokens.css`. Content in `src/data/tours.json`.
- Text, dates, prices and spot counts in the PNGs are placeholders. Compare layout, not words.

## Steps (per page and per state that has a PNG)
1. Start the site (`npm run dev` or `npm run build && npm run preview`). If a state needs setup (hold expired, sold out, error), open it through the URL or the page's own data attributes.
2. Screenshot with Playwright: viewport 1440 wide (desktop) or 402 wide (mobile), `deviceScaleFactor: 2`, `fullPage: true`. Wait for fonts (`document.fonts.ready`). Save to `qa/screens/`.
3. Make a side-by-side image and a diff image against the matching PNG in `qa/diff/`. If the heights differ because of content, align by sections (header, hero, cards, footer) instead of the whole page. Ask before adding a dev dependency such as `pixelmatch` and `pngjs`.
4. Measure, do not guess. For each mismatch find the exact pixel value in the PNG (divide by 2 for CSS px): padding and gaps between blocks, block and button heights, field heights, border radius, border width, icon size, font size, weight and line height, colors (sample pixels and compare with tokens).
5. Fix in CSS. Use tokens only. If a needed value is not in `tokens.css` and cannot be read from the PNG, ask Veronika. Never darken colors, never hardcode a color that exists as a token, never change tokens to improve contrast.
6. Re-screenshot and repeat until every difference is 2 CSS px or less (colors: exact).
7. Check both widths (402 and 1440), plus 768 for the breakpoint, that nothing breaks.

## Report (in Russian, short)
A table: page / state, what differed, what was fixed, what is left and why. Mention anything caused by placeholder content separately. Show where the diff images are (`qa/diff/`).

## Rules
- Do not edit `tours.json`.
- Do not add pages, features or dependencies without asking.
- Keep keyboard focus, labels, aria and the other accessibility measures from CLAUDE.md.
- Small commits: one page or one component per commit.
