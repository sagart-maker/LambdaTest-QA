---
name: lt-responsive-testing
description: "Responsive and cross-browser testing playbook for websites on LambdaTest: layout at breakpoints, iOS/Android emulators, simulators or real devices, orientation, overflow, tap targets, and browser differences across Chrome, Safari, Edge and Firefox. Used by the lambdatest-qa agent."
---

# Responsive / cross-browser testing

## Matrix
- **Mobile (default):** latest iPhone (Safari), latest Samsung Galaxy S and latest Pixel (Chrome) — LambdaTest emulators/simulators (`isRealMobile: false`) by default, real devices only if the brief asks and the plan allows; portrait, with landscape on P0 pages.
- **Desktop/tablet if in scope:** Chrome + Edge (Windows 11), Safari (macOS), Firefox; 1366×768 and 1920×1080; latest iPad.
- **Breakpoint sweep** (desktop browser, resized viewport): 360, 390, 412, 768, 1024, 1280, 1440 px wide.

## Checks per page × device
1. **No horizontal scroll:** `document.documentElement.scrollWidth <= window.innerWidth` (+1px tolerance).
2. **No clipped/overlapping content:** text cut off, elements overlapping, content hidden behind sticky header/footer/cookie banner.
3. **Navigation adapts:** hamburger appears at the right breakpoint, opens/closes, all items reachable.
4. **Images/media:** scale without distortion, no broken images, correct `srcset` variant, video fits.
5. **Tap targets:** ≥ 24×24 CSS px (WCAG 2.5.8), 44×44 recommended for primary actions; enough spacing.
6. **Typography:** body ≥ 16px on mobile, no text needs horizontal scrolling, line length readable.
7. **Forms on mobile:** correct keyboard type (email/tel/number), fields not hidden by the on-screen keyboard, no iOS auto-zoom (input font ≥ 16px). Soft-keyboard behaviour shows on emulators/simulators; confirm on a real device when the brief needs real-hardware sign-off.
8. **Orientation change:** layout reflows without losing state.
9. **Sticky/fixed elements:** don't cover more than ~25% of the viewport on mobile.
10. **Cross-browser:** same layout/behaviour across browsers; note CSS/JS features failing on Safari/Firefox.

## LambdaTest
- Full-page screenshots for every page × device (Mode B: `page.screenshot({fullPage:true})` or LT's `lambdatest_action` screenshot; Mode A: Real Device Cloud / KaneAI).
- Optional SmartUI snapshots to create a visual baseline for future regression.
- Overflow check snippet (Playwright):
```js
const overflow = await page.evaluate(() => {
  const w = window.innerWidth;
  return [...document.querySelectorAll('body *')]
    .filter(el => el.getBoundingClientRect().right > w + 1)
    .slice(0, 10).map(el => el.tagName + (el.id ? '#' + el.id : '') + '.' + [...el.classList].join('.'));
});
```

## TC patterns
`TC-RSP-###` — "PDP has no horizontal scroll at 360px", "Menu collapses to hamburger below 1024px", "Checkout form usable with keyboard open on iPhone".

## Pass/fail
Pass when all checks hold on every device in the matrix. Broken layout on a P0 page on any primary mobile device = High; cosmetic misalignment = Low.

## Report section — "Responsive / cross-browser"
Page × device grid (✅/❌ with screenshot links) · breakpoint sweep results · overflow offenders · browser-specific issues.
