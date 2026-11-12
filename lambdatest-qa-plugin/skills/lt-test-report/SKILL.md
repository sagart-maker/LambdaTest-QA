---
name: lt-test-report
description: "Structure and rules for a website QA test report from a LambdaTest run: Go/No-Go, status and severity definitions, results matrix, defect template, scorecards, traceability. Used by the lambdatest-qa agent; also usable directly when the user asks for a test report from LambdaTest results."
---

# Writing the test report

## Honesty rules
- Only report what actually ran. Every number, session link and metric must come from a real run, API response or tool output.
- Label every result's origin: **LambdaTest** (with session link) · **Local** (ran on this machine) · **Planned only** (not executed).
- Missing data is written as "not captured", never estimated.

## Status definitions
| Status | Meaning |
|---|---|
| Passed | Ran; all expected results met |
| Failed | Ran; ≥1 expected result not met (reproduced on retry) |
| Flaky | Failed once, passed on the single retry |
| Blocked | Could not run: auth/OTP, captcha, WAF/bot block, device unavailable, env down |
| Not run | Out of time/scope or skipped after smoke failure |

## Severity
| Severity | Examples |
|---|---|
| Critical | P0 flow broken, site down, data loss, payment/checkout blocked, security exposure |
| High | Major feature broken for a device/browser group, WCAG A failure blocking a task, LCP > 4s on key page |
| Medium | Feature degraded with workaround, layout broken at one breakpoint, WCAG AA issue, threshold miss |
| Low | Cosmetic, copy, minor SEO/meta issues |

**Go / No-Go:** No-Go if any P0 TC Failed, or any Critical/High defect is open. Blocked P0 TCs → "Conditional — P0 coverage incomplete".

## Report structure (`report.md`)
1. **Header** — site, environment, date, build name, connection mode, test types run, devices.
2. **Executive summary** — Go/No-Go + reason; totals Passed/Failed/Blocked/Flaky/Not run; defects by severity; top 3 risks.
3. **Results by type** — one row per test type: TCs, pass rate, key finding.
4. **Device × type matrix** — cells ✅ / ❌ / ⚠️ flaky / ⛔ blocked / — not run, with LambdaTest session links.
5. **Defects** — `BUG-###`: title, severity, priority, page/flow, device/browser/OS, steps to reproduce, expected vs actual, evidence (screenshot/video/session link), REQ ID, TC ID, suggested fix.
6. **Scorecards** — include the section each type skill defines (performance CWV table, a11y by WCAG criterion, SEO checklist, responsive breakpoint grid, unit coverage, regression delta).
7. **Traceability** — REQ → TC → result; list uncovered REQs.
8. **Blocked & not-run** — what, why, what's needed to unblock.
9. **Recommendations** — fix order, regression suite to keep, next run scope.

## Formats
The user picks one or more: **Excel, PDF, Word** (or Markdown only). The choice is recorded in `intake.md`. Always write `report.md` first as the single source, then generate each chosen format from it, so every file contains the same numbers. Name them `<site>-test-report-<YYYY-MM-DD>.<ext>` in the run folder.

**How to generate:** first try the matching skill via the Skill tool (`anthropic-skills:xlsx`, `anthropic-skills:pdf`, `anthropic-skills:docx`) and follow it. If its tooling isn't available (e.g. Python missing), use the Node fallback, installing it in the run folder (`npm i <pkg>`).

| Format | Content | Node fallback |
|---|---|---|
| **Excel (.xlsx)** | Sheets: `Summary` (Go/No-Go, totals, defects by severity) · `Test Cases` (all TC fields + status) · `Results Matrix` (device × type) · `Defects` (full defect template) · `Scorecards` (perf / a11y / SEO / UI / unit) · `Traceability` (REQ → TC → result). Header row frozen and bold, autofilter on, column widths fitted, status cells coloured (Passed green, Failed red, Flaky amber, Blocked grey), hyperlinks for session/evidence links. | `exceljs` |
| **PDF (.pdf)** | Cover (site, environment, date, Go/No-Go), then the report sections in order. Tables with repeated headers, screenshots embedded at readable size, page numbers, A4. | Render `report.md` → styled HTML, then Playwright `page.pdf({ format: 'A4', printBackground: true })` |
| **Word (.docx)** | Same sections as the PDF, editable: heading styles (for navigation pane and TOC), real Word tables, embedded screenshots, a defects table the team can edit. | `docx` |

Check every generated file opens and isn't empty (file size > 0; for xlsx, re-read the sheet names). Report any format that failed to generate instead of skipping it silently.

HTML artifact or Claude Doc only when the caller asks — the main session publishes it.
- Screenshots: link to LambdaTest assets or save under `evidence/` in the run folder; redact personal data.
