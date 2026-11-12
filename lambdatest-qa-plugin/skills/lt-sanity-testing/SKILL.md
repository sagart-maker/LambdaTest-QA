---
name: lt-sanity-testing
description: "Sanity testing playbook for websites on LambdaTest: a narrow, deep check that a specific fix or small change works and didn't break its immediate neighbours. Used by the lambdatest-qa agent after smoke passes."
---

# Sanity testing

## Purpose
After a bug fix or small change: "does this specific thing now work, and is the area around it still fine?" Narrow and deep, unlike smoke (wide and shallow).

## Inputs
What changed — from the brief: release notes, ticket IDs (Jira/Pulse), PR/diff, or the user's description. If nothing is given, mark sanity **Not run — no change list provided** (don't invent one).

## Selection
1. For each change: the TC(s) that verify the fix/feature directly (including the original bug's repro steps).
2. Immediate neighbours: same page/form/component, upstream and downstream steps of the same flow.
3. 5–20 TCs total. Pull existing TCs from previous `test-cases.csv` where possible; write new `TC-SAN-###` otherwise.

## Devices
The device/browser where the bug was reported (must be included) + one device from the other platform (iOS ↔ Android).

## LambdaTest
- Re-use the original failing session's capabilities (OS, browser, device, resolution, geo) to reproduce the exact environment.
- Mode A: re-run the saved KaneAI test for the bug; Mode B: targeted Playwright/Selenium tests, build name `"<site> sanity <ticket>"`.

## Pass/fail
- Pass: every fix-verification TC passes and no neighbouring TC regresses.
- Fix not working → reopen the defect (same BUG ID), severity unchanged. New neighbour breakage → new defect, tagged "regression from <ticket>".

## Report section — "Sanity"
Change list → TC → result table · original bug repro: now Passed/Failed · neighbour results · recommendation (proceed to regression / send back to dev).
