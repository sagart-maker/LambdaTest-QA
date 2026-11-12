---
name: lt-ui-testing
description: "UI testing playbook for websites on LambdaTest: compares the live site against the design (Figma frames or design images/mockups) for layout, spacing, typography, colours, components and states, on real iOS/Android devices and desktop browsers. Falls back to heuristic UI checks when no design is provided. Used by the lambdatest-qa agent."
---

# UI testing (design vs implementation)

## Inputs
- **Design source** (from the brief), stored in the run folder under `design/`:
  - **Figma:** file/frame links. The main session exports each frame as PNG (2x) into `design/` and saves design tokens (colours, type styles, spacing, radii) to `design/tokens.json` when the Figma connector is available. Don't call Figma yourself unless its tools are loaded and authenticated.
  - **Images:** PNG/JPG mockups or screenshots given by the user, copied into `design/`.
  - **None:** run the **heuristic UI checks** only, and label the section "no design reference".
- **Frame → page mapping** in `design/mapping.md`: `design file | page URL | viewport width | device | state` (e.g. `home-mobile.png | / | 390 | iPhone | default`). If the mapping is missing, infer it from frame names and widths (≤ 430 = mobile, 768–1024 = tablet, ≥ 1280 = desktop), and list the guesses as assumptions.

## Comparison method (per mapped frame)
1. **Capture** the live page on LambdaTest at the frame's viewport: a real device of matching width for mobile, desktop browser at the matching resolution otherwise. Full-page screenshot saved as `evidence/ui/<page>-<device>.png`. Disable animations, wait for fonts and images to load, dismiss the cookie banner only if the design doesn't show it.
2. **Visual comparison:** view the design and the screenshot side by side (Read both images). Note every difference by region: header, hero, cards, forms, footer.
3. **Pixel diff (guide only):**
   - **SmartUI:** if Figma comparison is available on the account, upload the Figma frames as the baseline and compare (`PROJECT_TOKEN` comes from env only).
   - **Local:** `pixelmatch` + `pngjs` on images resized to the same width. Report the diff % and save a diff image.
   - Live content (prices, dates, copy, photos) legitimately differs, so use a loose tolerance (default ≤ 5% vs design, unlike ≤ 0.5% build vs build) and ignore dynamic regions.
4. **Measured checks:** pull computed styles with Playwright `getComputedStyle` for key elements (H1–H3, body text, buttons, links, inputs, cards) and compare them to the design tokens:
   - **Typography:** font family, size, weight, line height, letter spacing (±1px tolerance)
   - **Colours:** text, background, button, border, link and states (exact hex, or ΔE < 2)
   - **Spacing and sizing:** padding, margin, gaps, element widths/heights, border radius (±2px, or ±4px on mobile)
   - **Alignment and grid:** column count per breakpoint, container max-width, consistent left edges
5. **Components and states:** buttons, links, inputs, dropdowns, tabs, modals, toasts, cards, badges. Check default, hover (desktop), focus, active, disabled, loading, error and empty states wherever the design has them.
6. **Assets:** icons are the right ones (no fallback squares), images use the right crop and aspect ratio, logo is sharp (SVG or 2x), favicon is present.
7. **Content:** headings, labels and CTA copy match the design (flag typos and truncation). Placeholder text like "Lorem ipsum" or "TODO" must never be live.

## Heuristic UI checks (always run; the only checks when there's no design)
Consistent fonts and colour palette across pages · consistent button styles · no overlapping or clipped elements · images not stretched or broken · consistent spacing rhythm · visible focus states · nothing hidden behind sticky bars · readable contrast · no layout shift once loaded · dark mode correct if the site supports it.

## LambdaTest
- **Mode A:** Real Device Cloud and KaneAI for screenshots and state interactions. SmartUI for comparisons.
- **Mode B:** Playwright (desktop, Android Chrome) or selenium-webdriver (iOS Safari real device) from the templates. Capture screenshots and computed styles in the same session, and mark sessions passed or failed via the API.

## TC patterns
`TC-UI-###`: "Homepage hero matches Figma frame 'Home / Mobile' on iPhone", "Primary button uses brand colour #0A5FFF with 8px radius", "Product card typography matches design tokens", "Form error state matches design".

## Severity
| Severity | Example |
|---|---|
| High | Wrong layout or missing section on a P0 page, broken component, brand colour or logo wrong on key pages |
| Medium | Spacing/size off beyond tolerance, wrong font weight or size, missing state (hover/focus/error) |
| Low | Small alignment drift, minor copy or icon differences |

## Pass/fail
Pass when every mapped P0 frame has no High or Medium differences on its device, and the heuristic checks pass.

## Report section — "UI testing"
Design source (Figma / images / none) · frame → page → device table with a result and a diff % · side-by-side evidence (design | live | diff image paths or SmartUI links) · token mismatch table (element · property · design · live) · component state results · prioritised fix list.
