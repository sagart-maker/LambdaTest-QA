---
name: lt-regression-testing
description: "Regression testing playbook for websites on LambdaTest: re-run a saved suite against a baseline (previous run, SmartUI visual baseline, saved KaneAI tests), find new failures, and maintain the regression pack. Used by the lambdatest-qa agent."
---

# Regression testing

## Purpose
"Did anything that used to work break?" Compare this build against a known-good baseline.

## Baseline sources (use what exists; say which)
1. Previous run folder: `./lambdatest-qa/<site>-<date>/test-cases.csv` + `report.md` results.
2. Saved KaneAI test plan / test run in LambdaTest.
3. Script repo (Playwright/Selenium suite).
4. SmartUI project baseline (visual).
No baseline at all → this run **becomes** the baseline; say so, and report results without a delta.

## Selection
- **Full regression** when a release is major or the brief asks.
- **Risk-based** (default): all P0 TCs + P1 TCs touching changed areas (from the brief's change list) + every TC that failed or was flaky last run.

## Execution
- Run in parallel up to the agreed limit; for large suites use **HyperExecute** (auto-split, retries, artifacts).
- **Visual regression:** SmartUI — `npx smartui exec -- <test command>` with `PROJECT_TOKEN` (env var, never in files), `smartuiSnapshot(page, '<page>-<device>')` per page/device. Tolerance default ≤ 0.5% diff; ignore dynamic regions (dates, carousels, ads) via SmartUI ignore options. First run creates the baseline — no diffs yet.
- Same device/browser/OS matrix as the baseline, so results are comparable.

## Delta classification
| Last run | This run | Class |
|---|---|---|
| Passed | Failed | **Regression** (new defect, tag `regression`) |
| Failed | Passed | Fixed |
| Failed | Failed | Still failing (link existing defect) |
| — | any | New TC |
| any | Flaky | Flaky — investigate stability |

## Pass/fail
Pass if zero regressions on P0/P1 and visual diffs within tolerance (or approved in SmartUI).

## Report section — "Regression"
Baseline used · TCs selected and why · delta table counts (regressions / fixed / still failing / new / flaky) · regression defects first · SmartUI diff summary with build link · updated regression pack location.
