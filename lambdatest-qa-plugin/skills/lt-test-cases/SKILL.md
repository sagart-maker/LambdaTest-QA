---
name: lt-test-cases
description: "How to write website test cases for a LambdaTest QA run: ID scheme, fields, design techniques, coverage rules, and test-cases.md / test-cases.csv output. Used by the lambdatest-qa agent; also usable directly when the user asks to write test cases for a website or BRD."
---

# Writing test cases

## Sources
- **BRD/PRD/stories given:** first build a requirements table — `REQ-001…` | flow/feature | business rule | acceptance criterion | priority. Every TC links to ≥1 REQ. List REQs with no TC as coverage gaps.
- **No BRD:** derive from the pages/flows plus heuristics (below). Mark the file "heuristic-derived (no BRD)" and use `REQ-H##` for inferred requirements.

## Fields (one row per TC)
| Field | Rule |
|---|---|
| TC ID | `TC-<TYPE>-###` — types: UNIT, SMK, SAN, FUN, UI, REG, RSP, A11Y, PERF, SEO |
| Title | Verb + object + condition: "Login fails with wrong password" |
| REQ ID | `REQ-###` / `REQ-H##` |
| Type | unit / smoke / sanity / functional / UI / regression / responsive / accessibility / performance / SEO |
| Priority | **P0** critical path, release blocker · **P1** important · **P2** nice to have |
| Preconditions | State, account, data needed |
| Test data | Concrete values (never real personal data; never credentials — reference "test account A") |
| Steps | Numbered, one action each, unambiguous selectors/labels |
| Expected result | Observable and checkable; one per step where it matters |
| Devices | Device/browser IDs from the matrix, or "all mobile" |
| Automation | KaneAI / Playwright / Selenium-Appium / Lighthouse / axe / manual |
| Status | Not run (filled during execution: Passed / Failed / Blocked / Flaky) |

## Design techniques (apply per feature)
- **Happy path** first, then **negative paths** (invalid input, empty, wrong format).
- **Equivalence partitioning + boundary values** for every input with limits (min-1, min, max, max+1; length limits; quantities 0/1/max).
- **State transitions:** logged out ↔ in, empty ↔ filled cart, session expiry, back/refresh mid-flow.
- **Error guessing:** double submit, slow network, special chars/emoji/unicode, very long strings, copy-paste whitespace.
- **Business rules:** one TC per rule in the BRD (discounts, eligibility, limits).

## Coverage rules
- Every P0 flow: ≥1 happy + ≥1 negative TC, run on **every** mobile device in the matrix.
- Every form: required-field validation, format validation, success message, error message accessibility (announced, linked to the field).
- Every page in scope gets at least: smoke load, responsive, a11y scan, SEO checks (if those types are selected).
- Keep it lean: no duplicate TCs that differ only by device — devices go in the Devices column.

## Output
1. `test-cases.md`: requirements table (or heuristic note) → summary counts by type × priority → TC tables grouped by type.
2. `test-cases.csv`: same columns, steps joined with ` | `, UTF-8 with header row (opens in Excel; importable to Jira/TestRail/KaneAI).
3. For KaneAI, also write the step list format from the `lt-lambdatest-setup` skill.
