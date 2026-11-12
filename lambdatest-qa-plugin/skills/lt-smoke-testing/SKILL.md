---
name: lt-smoke-testing
description: "Smoke testing playbook for websites on LambdaTest: a fast build-verification pass over the critical path on the primary devices, run first as a gate before the full matrix. Used by the lambdatest-qa agent."
---

# Smoke testing

## Purpose
"Is this build stable enough to test?" A shallow, wide, fast check of P0 paths. It runs **first**; if it fails, stop and report — don't spend sessions on the full matrix.

## Devices
Primary mobile (latest iPhone, Safari, real device) + primary Android (latest Galaxy S or Pixel, Chrome). Add desktop Chrome on Windows 11 if desktop is in scope. Time box: ≤ 15 minutes total.

## Checks (pick those that exist on the site; 8–15 TCs)
1. Homepage returns 200 and renders the main content (logo, nav, hero/primary CTA visible).
2. No uncaught JS errors / failed critical requests (5xx, failed JS/CSS bundles) in console + network logs.
3. Primary navigation: each top-level menu link opens a 200 page (mobile: hamburger opens/closes).
4. Search: a known term returns results; results page renders.
5. Listing → detail page opens (product/article/service).
6. Key CTA works: add to cart / book / contact / sign up — reaches the next step.
7. Cart/checkout or form page loads (do **not** submit payment or real orders on production).
8. Login page loads and fields are usable (log in only with a provided test account).
9. Footer links and contact info present; 404 page renders for a bogus URL.
10. HTTPS valid, no mixed-content warnings.

## LambdaTest
- Mode A: KaneAI test per check, or one KaneAI flow for the P0 journey.
- Mode B: one Playwright/Selenium script `smoke.spec` with one test per check; build name `"<site> smoke <date>"`; `console: true, network: true, video: true`; mark each session passed/failed via `lambdatest_action` / REST API.

## TC patterns
`TC-SMK-###` — "Homepage loads with hero and nav on iPhone", "Search 'shoes' returns ≥1 result".

## Pass/fail & gate
- Smoke **passes** only if every P0 smoke TC passes on the primary devices.
- Any failure → retry once (flaky handling) → still failing: report **No-Go: smoke failed**, list failures with session links, skip remaining types (status "Not run — smoke gate").

## Report section — "Smoke"
Gate result (Pass/Fail) · checks table (check × device with session links) · console/network errors captured · time taken.
