# LambdaTest QA — local web app

A browser front end for the `lambdatest-qa` plugin agent. It does what the `/lambdatest-qa` skill does in Claude Code: intake, plan approval and results. The work itself is done by the unchanged agent in `../lambdatest-qa-plugin`, which the server runs headless through the Claude Code CLI.

## Run

```
cd web-app
npm install
npm start          # http://localhost:3000  (PORT=xxxx to change)
```

Needs Node 18+, Claude Code installed and logged in (`claude` on PATH, or set `CLAUDE_BIN`), and LambdaTest keys in `LT_USERNAME` / `LT_ACCESS_KEY` or `~/.lambdatest/.env`. Without keys the agent works in plan-only mode (mode C).

## Flow

1. **New test run**: URL, environment, pages, test types, device tier (Core / Broad mobile / desktop / iPad / custom), report formats.
2. The server writes `runs/<site>-<stamp>/intake.md` and runs `PLAN:`. The agent writes `test-cases.md/.csv` and `test-plan.md`.
3. **Approve**: runs `EXECUTE:` on LambdaTest. **Adjust plan**: appends your notes to the brief and re-plans.
4. View the report, test plan and cases in the browser, and download every file (xlsx/pdf/docx, scripts, screenshots).

The live log streams the agent's steps. LambdaTest access keys are redacted from logs and file views. The server only listens on `127.0.0.1`.
