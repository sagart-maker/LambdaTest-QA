---
name: lt-functional-testing
description: "Functional testing playbook for websites on LambdaTest: forms, validation, navigation, search, cart, auth, business rules and UI correctness, on real iOS/Android devices and desktop browsers. Used by the lambdatest-qa agent."
---

# Functional testing

## Scope
Does every feature behave as the BRD (or common sense) says, and does the UI show the right thing? Covers the P0 → P2 flows from the plan.

## Areas and checks
- **Forms:** required fields, format validation (email, phone, postcode, dates), boundaries (length, numeric min/max), error message text + placement, success state, double-submit protection, data retained after a validation error.
- **Navigation:** menus, breadcrumbs, back/forward, deep links, pagination, 404 handling, external links open as intended.
- **Search / filter / sort:** valid term, no-results term, special characters, filter combos, sort order correct, result counts.
- **Cart / checkout** (staging for anything that creates orders): add/remove/update qty, price × qty, coupons valid/invalid/expired, shipping/tax rules, persistence across refresh and login.
- **Auth:** login valid/invalid, lockout message, logout, password reset request, session expiry, protected pages redirect when logged out. Only with test accounts from the brief; OTP/MFA without a test bypass → **Blocked**.
- **Business rules:** one TC per BRD rule (eligibility, pricing, limits, role permissions).
- **UI behaviour** (visual match to the design lives in lt-ui-testing): correct labels/copy, images load, icons/buttons states (hover/disabled/loading), modals/toasts appear and dismiss, no overlapping elements, cookie banner works and doesn't block content.

## LambdaTest
- **Mode A:** KaneAI tests written as step lists (format in the `lt-lambdatest-setup` skill); real devices for mobile.
- **Mode B:** Playwright (desktop, Android Chrome) / Selenium-Appium (iOS Safari real devices) from the templates; data-driven where inputs vary; screenshots at each assertion; mark sessions via API.
- Geo-specific content: `geoLocation` capability.

## TC patterns
`TC-FUN-###` — happy + negative per feature (see lt-test-cases techniques).

## Pass/fail
Expected result met on every listed device. P0 failure = Critical/High defect; functional mismatch on one browser only = High/Medium depending on audience share.

## Report section — "Functional"
Feature × result table · failures with repro steps, device, session link, screenshot · business-rule coverage vs BRD · blocked TCs and why.
