---
name: lt-accessibility-testing
description: "Accessibility testing playbook for websites on LambdaTest against WCAG 2.2 AA: automated axe/LambdaTest scans plus scripted keyboard, focus, zoom and target-size checks, grouped by WCAG criterion. Used by the lambdatest-qa agent."
---

# Accessibility testing (WCAG 2.2 AA)

## Automated scan (every page × at least 1 mobile + 1 desktop)
- **LambdaTest:** `"accessibility": true, "accessibility.wcagVersion": "wcag22aa"` in LT:Options (verify on the plan), or the LambdaTest accessibility tools in Mode A.
- **Fallback / local:** `@axe-core/playwright` with tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`; save JSON per page under `evidence/a11y/`.
- Automated tools catch only ~30–40% of issues — the scripted checks below are mandatory, and items that need a human are listed as "manual review needed", not marked passed.

## Scripted checks
| Check | WCAG |
|---|---|
| Keyboard only: every interactive element reachable with Tab, operable with Enter/Space, no traps | 2.1.1, 2.1.2 |
| Logical focus order; visible focus indicator | 2.4.3, 2.4.7 |
| Focused element not hidden by sticky header/banner | 2.4.11 |
| Skip link present and works | 2.4.1 |
| Page `<title>` unique and descriptive; `lang` set | 2.4.2, 3.1.1 |
| One H1, logical heading order, landmarks present | 1.3.1, 2.4.6 |
| Images: meaningful alt; decorative `alt=""` | 1.1.1 |
| Form fields have labels; errors identified in text and linked | 1.3.1, 3.3.1, 3.3.2, 4.1.2 |
| Colour contrast ≥ 4.5:1 text, 3:1 large text & UI components | 1.4.3, 1.4.11 |
| 200% zoom and 320px reflow without loss of content | 1.4.4, 1.4.10 |
| Target size ≥ 24×24 px | 2.5.8 |
| Dragging has a single-pointer alternative | 2.5.7 |
| No re-entering info already given in the same flow | 3.3.7 |
| Login doesn't require a cognitive test (allows paste/password managers) | 3.3.8 |
| Media: captions, no autoplay audio > 3s without controls | 1.2.2, 1.4.2 |

**Manual review (list, don't auto-pass):** VoiceOver on real iPhone and TalkBack on real Android for P0 flows — announced names/roles/states, reading order. On LambdaTest real devices these can be run interactively by a tester.

## Severity mapping
axe `critical` → Critical (if it blocks a P0 task) else High · `serious` → High · `moderate` → Medium · `minor` → Low.

## TC patterns
`TC-A11Y-###` — "Checkout operable by keyboard only", "Login errors announced and linked to fields", "Homepage passes axe WCAG 2.2 AA with 0 critical".

## Pass/fail
Pass: 0 critical issues and every P0 flow keyboard-operable. Report all AA violations regardless.

## Report section — "Accessibility"
Issues by WCAG criterion (criterion · impact · count · pages · example selector · fix) · per-page counts · scripted check results · manual review list.
