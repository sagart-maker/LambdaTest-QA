---
name: lt-unit-testing
description: "Unit testing playbook for a website's source code within a LambdaTest QA run: detect the framework, run tests with coverage, write missing unit tests, report results. Unit tests run locally or in CI (optionally on HyperExecute), not on the LambdaTest browser grid. Used by the lambdatest-qa agent."
---

# Unit testing

## Scope
Unit tests check functions/components in isolation from the **source code** — they need a repo path. A live URL alone is not enough: if the brief has no repo, mark all UNIT TCs **Blocked — needs source repo** and move on.

LambdaTest note: unit tests don't use real devices or the browser grid. Run them locally. For large suites, they can be distributed on **HyperExecute** (YAML pointing at the test command). Browser-dependent component tests (Playwright Component Testing, Vitest browser mode) can target the LambdaTest grid via the Playwright CDP endpoint in the templates.

## Steps
1. **Detect** the stack from `package.json` / `pyproject.toml` / `pom.xml` etc.: Jest, Vitest, Mocha, Jasmine, Playwright CT, pytest, JUnit, PHPUnit.
2. **Install & run** with coverage, using the project's own script when it exists (`npm test -- --coverage`, `npx vitest run --coverage`, `pytest --cov`). Don't change project config.
3. **Collect:** total/passed/failed/skipped, failing test names + first error lines, coverage (lines, branches) overall and for changed files.
4. **Gaps:** list critical modules with no tests (form validation, price/cart calculations, auth helpers, formatters, API clients).
5. **Write missing tests only if the brief allows code changes**, and only in a new branch or a `generated-tests/` folder in the run folder. Match the project's conventions (naming, folders, mocking style). Cover happy path, boundaries, invalid input, error handling. Re-run and report.

## TC patterns
- `TC-UNIT-###` per module/function: "cart total applies coupon before tax", "email validator rejects missing @", "date formatter handles timezone offset".

## Pass/fail
- Pass: 0 failing tests and coverage ≥ threshold (default 80% lines on changed files; report overall too).
- A failing unit test on a P0 module = High defect.

## Report section — "Unit tests"
Framework · command run · totals · coverage table (overall + changed files) · failing tests with error · untested critical modules · tests generated (paths).
