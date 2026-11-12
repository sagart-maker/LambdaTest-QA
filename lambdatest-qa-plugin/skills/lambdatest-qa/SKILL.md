---
name: lambdatest-qa
description: "Front door for website QA on LambdaTest / TestMu AI. Asks for the requirements doc (BRD/PRD), test types (unit, smoke, sanity, functional/UI, regression, responsive/cross-browser, accessibility, performance, SEO), devices (default: latest iOS and Android phones), pages/flows and LambdaTest credentials, then hands off to the lambdatest-qa agent to write test cases, run them on LambdaTest and produce the test report. Use when the user says 'test my site on LambdaTest', 'QA this website', 'check these pages on real devices', or names any of these test types for a website."
argument-hint: "[website URL] [optional: path or link to BRD/requirements doc]"
---

# LambdaTest QA — intake and hand-off

You run in the main conversation, so you are the one who asks the user questions. The `lambdatest-qa` **agent** can't ask anything: it plans, executes and reports from the brief you give it. Your job is to collect a complete brief, get plan approval, and relay results.

Flow: **0 Connect → 1 Intake → 2 Brief → 3 Plan (agent) → approve → 4 Execute (agent) → 5 Results & follow-up.** Never execute before the user approves the plan.

If the user passed arguments (`$ARGUMENTS`), treat a URL as the target site and a file path or link as the requirements doc, and skip those questions. If the user says "just use defaults", stop asking and go to step 2 with defaults for everything not yet given (the target URL is still required).

---

## 0 — Connection check (silent, then one line to the user)

1. `ToolSearch` for `lambdatest`, `testmu`, `kaneai`, `smartui`, `hyperexecute`. Note any matches.
2. Credentials: check the `LT_USERNAME` / `LT_ACCESS_KEY` env vars, then `~/.lambdatest/.env`. Never print the values, only whether they're present.
3. Tooling: `node --version`, `npx playwright --version`, `python --version` (on Windows a Microsoft Store stub counts as missing).

Tell the user in one line which of these applies: **A: MCP**, **B: credentials + scripts**, or **C: plan only (no credentials yet)**. Credentials are asked for in round 3, so mode C at this point isn't final.

---

## 1 — Intake (AskUserQuestion, at most 3 rounds, defaults as options)

Read anything the user already gave first and ask only for what's missing. Keep each question self-contained.

### Round 1 — Scope
1. **Target and environment.** URL plus prod / staging-UAT / localhost. Localhost or private networks need the LambdaTest Tunnel.
2. **Requirements doc.** BRD, PRD, SRS, user stories, Figma, Jira epic or acceptance criteria, as a file path or a Jira/Confluence/Google Drive link. Options: "No doc, use heuristics" / "Local file" / "Jira/Confluence/Drive link". If a link is given, check you can read it with the matching connector before handing off.
3. **Pages and flows.** Options: "Crawl from the homepage (Recommended)" (sitemap.xml or internal links, depth 2) / "I'll list the URLs and flows". Ask which flows are critical path (P0), e.g. Home → Search → Product → Cart → Checkout.

### Round 2 — Test types and devices
AskUserQuestion allows at most 4 options per question, so split the test types across questions (all multiSelect):

- **Core QA:** Smoke · Sanity · Functional · Regression
- **Look & feel:** UI testing (design vs live site) · Responsive / cross-browser
- **Quality:** Accessibility (WCAG 2.2 AA) · Performance (Lighthouse, Core Web Vitals) · SEO
- **Code-level:** Unit testing (needs the source repo path; runs locally, not on the LambdaTest browser grid)

Default if nothing is chosen: Smoke + UI + Functional + Responsive + Accessibility + SEO.

- **Design reference (ask whenever UI testing is selected).** "Do you have the design for these pages?" Options:
  - "Figma link": ask for the file or frame links. Load the Figma connector (`ToolSearch` "figma"). If it needs auth, run its authenticate tool and have the user complete it. Then export each relevant frame as PNG (2x) into `<run folder>/design/`, and save colour, type, spacing and radius tokens to `design/tokens.json` if the connector exposes them. If the connector isn't available, ask the user to export the frames as PNG and give the folder path.
  - "Images / mockups": ask for the file paths (PNG, JPG or PDF) and copy them into `design/`.
  - "No design": UI testing runs heuristic checks only, labelled "no design reference".

  Then confirm the **frame → page mapping** (which design goes with which URL, at which viewport/device). Propose it from the frame names and widths, and let the user correct it. Save it to `design/mapping.md`.

- **Devices.** Options: "Latest iOS + Android phones (Recommended)" / "Phones + desktop browsers" / "Phones + desktop + tablet" / "Custom list".
  Default = latest iPhone (Safari), latest Samsung Galaxy S and latest Google Pixel (Chrome) on LambdaTest real devices. Desktop adds Chrome + Edge on Windows 11 and Safari on macOS. Tablet adds the latest iPad. The agent resolves exact model names at run time. Also ask: real devices only, or emulators OK for broad UI coverage?

### Round 3 — LambdaTest credentials and run details
4. **LambdaTest credentials** (skip if already found in step 0). Options:
   - "Already set as env vars": re-check.
   - "I'll paste them now": ask for the username and access key (found under LambdaTest → Account Settings → Password & Security). Warn first that anything pasted stays in this conversation's transcript.
   - "I'll set them myself (Recommended)": tell the user to run `! notepad %USERPROFILE%\.lambdatest\.env` and add two lines, `LT_USERNAME=...` and `LT_ACCESS_KEY=...`. Create the folder first if needed.
   - "No account (plan + scripts only)": mode C.

   If pasted, write them to `~/.lambdatest/.env` (outside any repo) without echoing them. Then validate:
   `curl -s -o /dev/null -w "%{http_code}" -u "$LT_USERNAME:$LT_ACCESS_KEY" "https://api.lambdatest.com/automation/api/v1/builds?limit=1"` (load the vars from the file first). Report only "valid" (200) or "invalid" (401/403). Never print the key, and never put it in the brief, the plan or the report.
5. **Auth and test data:** test accounts, OTP/MFA handling, test cards, coupons, search terms. Flag destructive actions (orders, emails, payments) and keep them on staging.
6. **Thresholds:** offer "Use defaults (Recommended)": LCP < 2.5s, CLS < 0.1, INP < 200ms, Lighthouse Performance ≥ 80, WCAG 2.2 AA with no critical issues, visual diff ≤ 0.5%, 0 broken internal links, unit coverage ≥ 80% on changed files. Release blockers: any P0 failure or any Critical/High defect.
7. **Test report format.** Always ask with AskUserQuestion (multiSelect, so the user can pick several): *"In which format do you want the test report?"* Options:
   - **Excel (.xlsx):** one sheet each for the summary, test cases, results matrix, defects, scorecards and traceability. Good for filtering and tracking.
   - **PDF (.pdf):** a formatted, read-only report to share with stakeholders.
   - **Word (.docx):** an editable document with the same sections as the PDF.
   - **Markdown only:** just `report.md` in the run folder.

   `report.md` is always written as the source. The chosen formats are generated from it. Then ask where defects go: a list in the report, Jira, Pulse or GitHub (only if a connector exists).
8. Exclusions, parallel sessions and cadence: ask only if relevant. Defaults: no captcha bypass, no payments on prod, 5 parallel sessions, one-off run.

---

## 2 — Write the brief

Create the run folder `./lambdatest-qa/<site>-<YYYY-MM-DD>/` (absolute path) and write `intake.md` there with every answer: target, environment, tunnel yes/no, requirements source, pages/flows with priorities, chosen test types, design source (Figma / images / none) with the `design/` folder and `mapping.md` path, devices, the credential *location* (`env` or `~/.lambdatest/.env`, never the values), test data, thresholds, exclusions, report format, defect routing, cadence, and anything left as default.

---

## 3 — Plan (agent), then approval

Call the Agent tool with `subagent_type: "lambdatest-qa:lambdatest-qa"` (the plugin agent; if it is not listed, use "lambdatest-qa") and a prompt like:
`PLAN: brief at <absolute path to intake.md>. Write test-cases and test-plan in that folder.`

When it returns, show the user the plan summary: connection mode, scope, test matrix, TC count by type and priority, estimated sessions and runtime, assumptions and open questions. Include the plan path. Then ask with AskUserQuestion: **Approve / Adjust / Reduce scope**.
- Adjust or reduce: update `intake.md` and re-run PLAN.
- Approve: go to step 4.

## 4 — Execute (agent)

Call the agent again with
`EXECUTE: plan approved at <absolute path to test-plan.md>. Brief at <intake.md path>.`
Large matrices can run in the background (`run_in_background`). Tell the user it's running, and don't predict results.

## 5 — Results and follow-up

Relay the agent's summary: Go/No-Go, Passed / Failed / Blocked / Flaky totals, top defects, and the absolute path of every report file (`report.md`, plus `.xlsx` / `.pdf` / `.docx` as chosen). If the format wasn't chosen during intake, ask now (Excel / PDF / Word, multiSelect) and generate the files from `report.md` using the `lt-test-report` skill. Then offer:
- publishing the report (an HTML artifact, or a Claude Doc if the user wants an editable doc)
- filing defects in Jira or Pulse, if requested and a connector exists
- re-running failed and blocked tests after fixes (EXECUTE with a TC filter)
- saving the suite as a regression pack, scheduling recurring runs (the `schedule` skill), or wiring it into CI

## Guardrails
- Only test sites the user owns or is authorized to test. No load, stress or security testing beyond light smoke checks without explicit approval.
- Never fabricate run IDs, links, metrics, device availability or results. Relay the agent's numbers as given.
- Credentials never appear in chat output, the brief, plans, reports or scripts. Scripts read them from env vars or `~/.lambdatest/.env`.
