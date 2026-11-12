# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code **plugin** (`lambdatest-qa-plugin/`) for website QA on LambdaTest / TestMu AI, plus supporting collateral for it. There is no application code, build, lint or test suite: the "source" is Markdown prompt files (agent + skills) with YAML frontmatter. Editing behaviour means editing those prompts.

- `lambdatest-qa-plugin/` — the plugin (manifest in `.claude-plugin/plugin.json`, see its `README.md` for install/usage).
- `BRD/` — the business requirements doc for the agent (HTML source + exported PDF).
- `Slides/`, `Prototype/` — pitch deck and clickable prototype. `source/` holds the files published as claude.ai artifacts (`deck.json` + `slides/*.html`; `canvas.json` + `Main.dc.html`); the `.url` files point at the published artifacts. Republish to those same artifact URLs rather than creating new ones.

## Plugin architecture

Three layers, and the split between them is deliberate:

1. **Front-door skill** `skills/lambdatest-qa/SKILL.md` — runs in the main conversation, so it is the only component that talks to the user (AskUserQuestion intake in ≤3 rounds, plan approval, relaying results). It writes the brief `intake.md` into a run folder `./lambdatest-qa/<site>-<YYYY-MM-DD>/` and launches the agent.
2. **Agent** `agents/lambdatest-qa.md` — a subagent that **cannot ask questions**; it works only from `intake.md`, filling gaps with its documented defaults and listing them as assumptions. It is called twice with a prompt-prefix protocol:
   - `PLAN: brief at <intake.md>` → writes `test-cases.md`, `test-cases.csv`, `test-plan.md`, then stops.
   - `EXECUTE: plan approved at <test-plan.md>. Brief at <intake.md>.` → runs tests (smoke first as a gate), writes `report.md` and any chosen `.xlsx`/`.pdf`/`.docx`.
3. **Per-type playbook skills** `skills/lt-*/SKILL.md` — loaded on demand by the agent via the Skill tool as `lambdatest-qa:<name>` (falling back to bare `<name>`, then to reading the file). `lt-test-cases` and `lt-test-report` are always loaded; `lt-lambdatest-setup` holds script templates for Mode B; the rest map 1:1 to test types.

Connection modes, decided by both the skill and the agent in step 0: **A** = LambdaTest MCP tools found, **B** = credentials + generated Playwright/Selenium scripts + REST API, **C** = plan only (local-only checks labelled as such).

`extra-skills/lambdatest-website-qa-agent/` is an older single-file, all-in-one version of the workflow. It is not under `skills/`, so the plugin does not load it.

## Keeping files consistent when editing

Several facts are duplicated across files and must be changed together:
- Default test types, devices, thresholds (LCP/CLS/INP, Lighthouse ≥ 80, WCAG 2.2 AA, visual diff ≤ 0.5%, coverage ≥ 80%) and run settings appear in both `skills/lambdatest-qa/SKILL.md` and `agents/lambdatest-qa.md`.
- The test-type list and skill names appear in the agent's skill table, the front-door intake questions, the plugin `README.md` table, and `plugin.json`'s description.
- The `PLAN:` / `EXECUTE:` prompt formats are a contract between the front-door skill and the agent.
- Execution order (unit → smoke → sanity → functional → UI → responsive → accessibility → performance → SEO → regression) lives in the agent.

Skill/agent `name` frontmatter must match the directory name; the agent is invoked as `subagent_type: "lambdatest-qa:lambdatest-qa"`.

## Invariants the prompts enforce

- Credentials (`LT_USERNAME` / `LT_ACCESS_KEY`, env vars or `~/.lambdatest/.env`) are never echoed or written into briefs, plans, scripts or reports; only their location is recorded.
- Never fabricate results, session IDs, metrics or device models; resolve device models at run time. Results are Passed / Failed / Blocked / Flaky, and Blocked is never counted as pass or fail.
- No execution before the user approves the plan; destructive flows only on non-production unless the brief approves them.

## Trying changes

Install locally with `/plugin marketplace add <path>` then `/plugin install lambdatest-qa@qa-plugins`, restart Claude Code, and run `/lambdatest-qa <url>`. Running tests needs a LambdaTest account and Node.js 18+ (for Mode B scripts and report generation).
