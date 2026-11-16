# lambdatest-qa plugin

Website QA on LambdaTest / TestMu AI from Claude Code.

## Install

```
/plugin marketplace add <path-or-git-url-of-the-claude-plugins-folder>
/plugin install lambdatest-qa@qa-plugins
```
Restart Claude Code after installing.

## Use

```
/lambdatest-qa https://your-site.com
```

The `lambdatest-qa` skill asks for:
1. A requirements doc (BRD/PRD, Jira/Confluence/Drive link), if you have one
2. Test types: unit, smoke, sanity, functional, UI, regression, responsive/cross-browser, accessibility, performance, SEO
3. The design for UI testing: a Figma link or images
4. Devices. Default: the latest iPhone, Samsung Galaxy S and Google Pixel on LambdaTest emulators/simulators (`isRealMobile: false`); real devices on request (needs the Real Device Automation add-on)
5. Pages/flows to test
6. LambdaTest credentials. These are stored in `~/.lambdatest/.env` and never written to reports
7. Test report format: Excel, PDF and/or Word

It then runs the `lambdatest-qa` agent twice: **PLAN** (test cases + test plan, for your approval), then **EXECUTE** (runs the tests on LambdaTest and writes the report).

## Contents

| Component | Purpose |
|---|---|
| `agents/lambdatest-qa.md` | QA agent: plans, executes, reports (it can't ask questions) |
| `skills/lambdatest-qa` | Front door: intake questions, plan approval, results |
| `skills/lt-test-cases` | Test case format, IDs, design techniques |
| `skills/lt-test-report` | Report structure, Go/No-Go, Excel / PDF / Word output |
| `skills/lt-lambdatest-setup` | Script templates: capabilities, real devices, tunnel, REST API, KaneAI |
| `skills/lt-unit-testing` | Unit tests + coverage (needs the source repo) |
| `skills/lt-smoke-testing` | Critical-path gate, runs first |
| `skills/lt-sanity-testing` | Verifies a fix and the area around it |
| `skills/lt-functional-testing` | Forms, navigation, search, cart, auth, business rules |
| `skills/lt-ui-testing` | Live site vs Figma/design images |
| `skills/lt-regression-testing` | Baseline comparison, SmartUI visual diffs |
| `skills/lt-responsive-testing` | Breakpoints, real devices, cross-browser |
| `skills/lt-accessibility-testing` | WCAG 2.2 AA |
| `skills/lt-performance-testing` | Lighthouse, Core Web Vitals |
| `skills/lt-seo-testing` | Technical SEO |

## Requirements
- A LambdaTest account (username + access key) to run tests on LambdaTest. Without one, you get the plan and scripts only.
- Node.js 18+ for Mode B scripts and report generation.
- Optional: the Figma connector, for UI testing against Figma frames.
