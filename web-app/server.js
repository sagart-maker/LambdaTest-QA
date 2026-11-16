// Local web app for the LambdaTest QA agent.
// The browser replaces the /lambdatest-qa front-door skill (intake, approval, results);
// the existing plugin agent does the work, launched headless through the Claude Code CLI.

const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PLUGIN_DIR = path.resolve(ROOT, '..', 'lambdatest-qa-plugin');
const RUNS_DIR = path.join(ROOT, 'runs');
const LT_ENV_DIR = path.join(os.homedir(), '.lambdatest');
const LT_ENV_FILE = path.join(LT_ENV_DIR, '.env');
const AGENT = 'lambdatest-qa:lambdatest-qa';

fs.mkdirSync(RUNS_DIR, { recursive: true });

// ---------- environment checks ----------

function resolveClaudeBin() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  if (process.platform !== 'win32') return 'claude';
  // On Windows, claude.cmd is a wrapper around claude.exe; spawn the exe directly (no shell quoting).
  try {
    const cmd = execFileSync('where', ['claude.cmd'], { encoding: 'utf8' }).split(/\r?\n/)[0].trim();
    const exe = path.join(path.dirname(cmd), 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
    if (fs.existsSync(exe)) return exe;
  } catch { /* fall through */ }
  return 'claude.exe';
}
const CLAUDE_BIN = resolveClaudeBin();

function readLtEnvFile() {
  try {
    const out = {};
    for (const line of fs.readFileSync(LT_ENV_FILE, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  } catch { return {}; }
}

function credentialStatus() {
  if (process.env.LT_USERNAME && process.env.LT_ACCESS_KEY) return { present: true, location: 'env' };
  const f = readLtEnvFile();
  if (f.LT_USERNAME && f.LT_ACCESS_KEY) return { present: true, location: '~/.lambdatest/.env' };
  return { present: false, location: null };
}

// Values that must never reach the browser (logs are streamed live).
function secretsToRedact() {
  const f = readLtEnvFile();
  return [process.env.LT_ACCESS_KEY, f.LT_ACCESS_KEY, process.env.ANTHROPIC_API_KEY]
    .filter((s) => s && s.length >= 6);
}
function redact(text) {
  let t = String(text);
  for (const s of secretsToRedact()) t = t.split(s).join('[redacted]');
  return t;
}

function claudeVersion() {
  try { return execFileSync(CLAUDE_BIN, ['--version'], { encoding: 'utf8', timeout: 15000 }).trim(); }
  catch { return null; }
}

// ---------- run storage ----------

const runs = new Map(); // id -> { state, proc, listeners:Set, log:[] }

function runDir(id) { return path.join(RUNS_DIR, id); }
function statePath(id) { return path.join(runDir(id), 'state.json'); }

function saveState(id) {
  const r = runs.get(id);
  fs.writeFileSync(statePath(id), JSON.stringify(r.state, null, 2));
}

function loadRuns() {
  for (const id of fs.readdirSync(RUNS_DIR)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath(id), 'utf8'));
      if (state.status === 'planning' || state.status === 'executing') {
        state.status = 'interrupted';
        state.message = 'The server stopped while this step was running. Re-run it.';
      }
      let log = [];
      try { log = fs.readFileSync(path.join(runDir(id), 'agent-log.txt'), 'utf8').split('\n').filter(Boolean).slice(-2000); } catch { /* none */ }
      runs.set(id, { state, proc: null, listeners: new Set(), log });
    } catch { /* not a run folder */ }
  }
}
loadRuns();

function emit(id, event, data) {
  const r = runs.get(id);
  if (!r) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of r.listeners) res.write(payload);
}

function addLog(id, line) {
  const r = runs.get(id);
  const clean = redact(line);
  r.log.push(clean);
  if (r.log.length > 2000) r.log.shift();
  fs.appendFileSync(path.join(runDir(id), 'agent-log.txt'), clean + '\n');
  emit(id, 'log', clean);
}

function setStatus(id, status, message) {
  const r = runs.get(id);
  r.state.status = status;
  r.state.message = message || '';
  r.state.updatedAt = new Date().toISOString();
  saveState(id);
  emit(id, 'status', r.state);
}

function listFiles(id) {
  const dir = runDir(id);
  const hidden = new Set(['state.json']);
  const out = [];
  const walk = (rel) => {
    for (const ent of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) { if (r.split('/').length < 3) walk(r); }
      else if (!hidden.has(r)) out.push({ name: r, size: fs.statSync(path.join(dir, r)).size });
    }
  };
  walk('');
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function safeFile(id, rel) {
  const dir = path.resolve(runDir(id));
  const full = path.resolve(dir, rel);
  if (!full.startsWith(dir + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
  return full;
}

// ---------- brief (intake.md) ----------

// Device chips offered in the UI -> what the brief tells the agent. Exact models are resolved at run time.
const DEVICE_OPTIONS = {
  iphone: 'Latest iPhone, Safari',
  galaxy: 'Latest Samsung Galaxy S, Chrome',
  pixel: 'Latest Google Pixel, Chrome',
  ipad: 'Latest iPad, Safari',
  'win-chrome': 'Chrome on Windows 11 (desktop)',
  'mac-safari': 'Safari on macOS (desktop)',
  'win-edge': 'Edge on Windows 11 (desktop)',
  broad: [
    'Broad mobile set (about 20 devices) on top of the above. Resolve exact models from the LambdaTest device list at run time; never hardcode one you have not confirmed.',
    '  - iOS: latest iPhone Pro Max, an iPhone SE / small screen, one iPhone on iOS N-1 and one on iOS N-2.',
    '  - Android: a Galaxy A mid-range, a Pixel on Android N-1/N-2, plus OnePlus, Xiaomi/Redmi, Motorola and Oppo/Vivo where available; one Android tablet.',
    '  - Cover small (<= 375px), standard and large (>= 428px) viewports and Android 12 to latest.',
    '  - Run the full selected suite on the primary phones. Run smoke + responsive (+ UI if selected) on the broad set.',
  ].join('\n'),
};

function deviceLines(f) {
  const keys = Array.isArray(f.devices) && f.devices.length ? f.devices : ['iphone', 'galaxy', 'pixel'];
  const lines = keys.filter((k) => DEVICE_OPTIONS[k]).map((k) => `- ${DEVICE_OPTIONS[k]}`);
  if (f.customDevices) lines.push(`- Also: ${f.customDevices}`);
  return lines.join('\n') + '\n- Portrait by default.';
}

function buildIntake(f, runFolder) {
  const types = (f.testTypes && f.testTypes.length) ? f.testTypes.join(', ') : 'Default: Smoke + UI + Functional + Responsive + Accessibility + SEO';
  const formats = (f.reportFormats && f.reportFormats.length) ? f.reportFormats.join(', ') : 'Markdown only';
  const devices = deviceLines(f);
  const cred = credentialStatus();
  const lines = [
    `# QA brief — ${f.url}`,
    '',
    `Created by the LambdaTest QA web app on ${new Date().toISOString()}.`,
    `Run folder: ${runFolder}`,
    '',
    '## Target',
    `- URL: ${f.url}`,
    `- Environment: ${f.environment || 'production'}${f.environment === 'production' ? ' (read-only and non-destructive only)' : ''}`,
    `- LambdaTest Tunnel needed: ${f.environment === 'localhost' ? 'yes' : 'no'}`,
    '',
    '## Requirements source',
    f.requirements ? f.requirements : 'No doc — derive heuristically (label "no BRD").',
    '',
    '## Pages and flows',
    f.pagesMode === 'list' && f.pages ? `Listed pages:\n${f.pages}` : 'Crawl from the homepage (sitemap.xml or internal links, depth 2).',
    `- Critical-path (P0) flows: ${f.p0Flows || 'not given — propose them and mark as proposed'}`,
    '',
    '## Test types',
    types,
    '',
    '**Scope lock:** run ONLY the test types listed above. Do not add, expand or substitute any other test type, even if a default would normally include it.',
    '',
    '## Design reference (UI testing)',
    f.design ? f.design : 'None — heuristic UI checks only, labelled "no design reference".',
    '',
    '## Devices',
    devices,
    `- Device pool: ${f.realOnly
      ? 'real devices only (`isRealMobile: true`) — needs the Real Device Automation add-on; if the plan rejects a real-device session, mark those tests **Blocked**, do not fall back to an emulator or desktop browser.'
      : 'LambdaTest emulators/simulators by default (`isRealMobile: false`); use a real device only if one is explicitly listed above.'}`,
    '- **Scope lock:** run the suite on exactly the devices/browsers listed above and nothing else. Each resolved model must be one that actually exists on LambdaTest (resolve from the device list / capabilities generator at run time). Do NOT add, propose-and-run, or substitute any device or browser that is not in this list. If a listed device cannot run on the current plan, mark its tests **Blocked** and say why — never silently swap in a different device, engine or desktop browser to fill the gap.',
    '',
    '## Credentials',
    `- LambdaTest credentials: ${cred.present ? `present (location: ${cred.location})` : 'not found — plan only (mode C) unless they are added before execution'}. Never print or write the values.`,
    '',
    '## Auth and test data',
    f.testData || 'None given. Do not create accounts, submit payments or send real emails on production.',
    '',
    '## Thresholds',
    f.thresholds || 'Defaults: LCP < 2.5s, CLS < 0.1, INP < 200ms, Lighthouse Performance >= 80, WCAG 2.2 AA with no critical issues, visual diff <= 0.5%, 0 broken internal links, unit coverage >= 80% on changed files. Blockers: any P0 failure or any Critical/High defect.',
    '',
    '## Report',
    `- Formats: report.md always, plus: ${formats}`,
    '- Defect routing: list in the report.',
    '',
    '## Run settings',
    `- Parallel sessions: ${f.parallel || 5}`,
    '- Exclusions: no captcha bypass, no payments on production. ' + (f.exclusions || ''),
    '- Cadence: one-off run.',
    '',
    '## Notes',
    f.notes || '(none)',
    '',
  ];
  return lines.join('\n');
}

function slug(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '-'); }
  catch { return 'site'; }
}

// ---------- agent runner ----------

function summarizeTool(block) {
  const i = block.input || {};
  const pick = i.file_path || i.path || i.url || i.pattern || i.skill || i.command || i.query || i.description || '';
  return `[tool] ${block.name}${pick ? ': ' + String(pick).slice(0, 160) : ''}`;
}

function runAgent(id, phase) {
  const r = runs.get(id);
  const dir = runDir(id);
  const intake = path.join(dir, 'intake.md');
  // The PLAN:/EXECUTE: line is the plugin's contract; the extra paragraph only asks for machine-readable
  // side files the web UI renders (progress bar, Go/No-Go panel). They must carry real values only.
  const prompt = phase === 'plan'
    ? `PLAN: brief at ${intake}. Write test-cases and test-plan in that folder.`
    : [
      `EXECUTE: plan approved at ${path.join(dir, 'test-plan.md')}. Brief at ${intake}.`,
      '',
      'This run is driven by a web UI that reads two extra JSON files in the run folder. Write them with real values only; never estimate or invent results.',
      '1. progress.json — create it before the smoke gate and rewrite it after each test batch: {"total": <planned test executions>, "done": <finished>, "current": "<what is running now>", "devices": [{"name": "<resolved device/browser>", "status": "queued|running|done|blocked"}]}.',
      '2. results.json — write it right after report.md: {"verdict": "Go"|"No-Go", "reason": "<one sentence>", "totals": {"total": n, "passed": n, "failed": n, "blocked": n, "flaky": n}, "byType": [{"type": "<test type>", "passed": n, "failed": n, "blocked": n, "status": "Pass"|"Fail"|"Blocked"}], "defects": [{"id": "BUG-###", "severity": "Critical|High|Medium|Low", "title": "...", "type": "<test type>", "device": "..."}]}. Defects most severe first.',
    ].join('\n');

  const readOnly = ['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Skill', 'ToolSearch', 'TodoWrite', 'Write', 'Edit'];
  const execTools = ['Bash(node:*)', 'Bash(npm:*)', 'Bash(npx:*)', 'Bash(curl:*)', 'Bash(python:*)', 'Bash(python3:*)', 'Bash(py:*)', 'Bash(ls:*)', 'Bash(mkdir:*)', 'Bash(cat:*)', 'Bash(cd:*)'];
  const tools = phase === 'plan' ? readOnly.concat(['Bash(node --version)', 'Bash(npx playwright --version)']) : readOnly.concat(execTools);

  const args = [
    '-p',
    '--agent', AGENT,
    '--plugin-dir', PLUGIN_DIR,
    '--output-format', 'stream-json',
    '--verbose',
    '--permission-mode', 'acceptEdits',
    '--add-dir', dir,
    '--add-dir', LT_ENV_DIR,
    '--allowedTools', ...tools,
  ];

  addLog(id, `=== ${phase.toUpperCase()} started ${new Date().toLocaleString()} ===`);
  addLog(id, `> ${prompt}`);
  setStatus(id, phase === 'plan' ? 'planning' : 'executing', phase === 'plan' ? 'The agent is writing test cases and the test plan.' : 'The agent is running tests on LambdaTest.');

  const proc = spawn(CLAUDE_BIN, args, { cwd: dir, env: process.env, windowsHide: true });
  r.proc = proc;
  // Prompt goes on stdin: a positional argument would be swallowed by the variadic --allowedTools.
  proc.stdin.on('error', () => { /* process failed to start; handled by 'error' */ });
  proc.stdin.end(prompt);
  let finalText = '';
  let isError = false;
  let buf = '';

  proc.stdout.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { addLog(id, line); continue; }
      if (msg.type === 'system' && msg.subtype === 'init') {
        addLog(id, `[init] model ${msg.model || '?'}; ${Array.isArray(msg.tools) ? msg.tools.length : 0} tools`);
      } else if (msg.type === 'assistant' && msg.message && Array.isArray(msg.message.content)) {
        for (const b of msg.message.content) {
          if (b.type === 'text' && b.text.trim()) addLog(id, b.text.trim());
          else if (b.type === 'tool_use') addLog(id, summarizeTool(b));
        }
      } else if (msg.type === 'user' && msg.message && Array.isArray(msg.message.content)) {
        for (const b of msg.message.content) {
          if (b.type === 'tool_result' && b.is_error) {
            const t = Array.isArray(b.content) ? b.content.map((c) => c.text || '').join(' ') : String(b.content || '');
            addLog(id, `[tool error] ${t.slice(0, 300)}`);
          }
        }
      } else if (msg.type === 'result') {
        finalText = msg.result || '';
        isError = !!msg.is_error;
        const cost = typeof msg.total_cost_usd === 'number' ? ` · cost $${msg.total_cost_usd.toFixed(2)}` : '';
        const mins = msg.duration_ms ? ` · ${(msg.duration_ms / 60000).toFixed(1)} min` : '';
        addLog(id, `[done] ${msg.subtype || ''}${mins}${cost}`);
      }
    }
  });
  proc.stderr.on('data', (c) => addLog(id, `[stderr] ${c.toString('utf8').trim()}`));
  proc.on('error', (err) => {
    addLog(id, `[error] could not start Claude Code: ${err.message}`);
    r.proc = null;
    setStatus(id, phase === 'plan' ? 'plan_failed' : 'exec_failed', `Could not start Claude Code (${err.message}).`);
  });
  proc.on('close', (code) => {
    r.proc = null;
    if (r.state.status === 'cancelled') return;
    if (finalText) {
      fs.writeFileSync(path.join(dir, phase === 'plan' ? 'agent-plan-summary.md' : 'agent-execute-summary.md'), redact(finalText));
    }
    if (phase === 'plan') {
      const ok = fs.existsSync(path.join(dir, 'test-plan.md'));
      setStatus(id, ok && !isError ? 'plan_ready' : 'plan_failed',
        ok && !isError ? 'Plan ready. Review it, then approve or adjust.' : `Planning did not produce test-plan.md (exit ${code}). See the log.`);
    } else {
      const ok = fs.existsSync(path.join(dir, 'report.md'));
      setStatus(id, ok && !isError ? 'done' : 'exec_failed',
        ok && !isError ? 'Run complete. The report is ready.' : `Execution did not produce report.md (exit ${code}). See the log.`);
    }
  });
}

// ---------- HTTP ----------

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(ROOT, 'public')));

app.get('/api/status', (_req, res) => {
  res.json({
    claude: claudeVersion(),
    pluginFound: fs.existsSync(path.join(PLUGIN_DIR, '.claude-plugin', 'plugin.json')),
    credentials: credentialStatus(),
    node: process.version,
  });
});

app.get('/api/runs', (_req, res) => {
  const list = [...runs.values()].map((r) => r.state).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});

app.post('/api/runs', (req, res) => {
  const f = req.body || {};
  let url;
  try { url = new URL(f.url); if (!/^https?:$/.test(url.protocol)) throw new Error(); }
  catch { return res.status(400).json({ error: 'Enter a full website URL starting with http:// or https://' }); }
  if (!f.authorized) return res.status(400).json({ error: 'Confirm that you own or are authorized to test this site.' });

  const now = new Date();
  const stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1-');
  let id = `${slug(f.url)}-${stamp}`;
  for (let n = 2; fs.existsSync(runDir(id)); n++) id = `${slug(f.url)}-${stamp}-${n}`;
  fs.mkdirSync(runDir(id), { recursive: true });
  fs.writeFileSync(path.join(runDir(id), 'intake.md'), buildIntake(f, runDir(id)));

  const state = { id, url: f.url, createdAt: now.toISOString(), updatedAt: now.toISOString(), status: 'created', message: '', form: f };
  runs.set(id, { state, proc: null, listeners: new Set(), log: [] });
  saveState(id);
  runAgent(id, 'plan');
  res.json(state);
});

function readJson(id, name) {
  try { return JSON.parse(fs.readFileSync(path.join(runDir(id), name), 'utf8')); } catch { return null; }
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

// Test cases for the plan table, from the agent's test-cases.csv (columns per the lt-test-cases skill).
function readCases(id) {
  let text;
  try { text = fs.readFileSync(path.join(runDir(id), 'test-cases.csv'), 'utf8').replace(/^﻿/, ''); } catch { return null; }
  const [head, ...body] = parseCsv(text);
  if (!head) return [];
  const find = (...names) => head.findIndex((h) => names.some((n) => h.trim().toLowerCase() === n));
  const col = { id: find('tc id', 'id', 'tc'), title: find('title', 'test case', 'name'), type: find('type', 'test type'), priority: find('priority'), status: find('status') };
  return body.map((r) => ({
    id: r[col.id] || '', title: r[col.title] || '', type: r[col.type] || '', priority: r[col.priority] || '', status: col.status >= 0 ? r[col.status] || '' : '',
  }));
}

app.get('/api/runs/:id', (req, res) => {
  const id = req.params.id;
  const r = runs.get(id);
  if (!r) return res.status(404).json({ error: 'Run not found' });
  const f = r.state.form || {};
  const deviceKeys = Array.isArray(f.devices) && f.devices.length ? f.devices : ['iphone', 'galaxy', 'pixel'];
  res.json({
    ...r.state,
    files: listFiles(id),
    running: !!r.proc,
    cases: readCases(id),
    progress: readJson(id, 'progress.json'),
    results: readJson(id, 'results.json'),
    deviceLabels: deviceKeys.map((k) => DEVICE_OPTIONS[k] && DEVICE_OPTIONS[k].split('\n')[0].replace(/ on top of the above.*$/, '')).filter(Boolean),
  });
});

// Save LambdaTest keys to ~/.lambdatest/.env (outside the repo) after checking them against the LambdaTest API.
app.post('/api/credentials', async (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  const accessKey = String((req.body && req.body.accessKey) || '').trim();
  if (!username || !accessKey) return res.status(400).json({ error: 'Enter both the username and the access key.' });
  let code = 0;
  try {
    const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');
    const resp = await fetch('https://api.lambdatest.com/automation/api/v1/builds?limit=1', { headers: { Authorization: `Basic ${auth}` } });
    code = resp.status;
  } catch {
    return res.status(502).json({ error: 'Could not reach LambdaTest to check the keys. Check your connection.' });
  }
  if (code !== 200) return res.status(400).json({ error: `LambdaTest rejected these keys (HTTP ${code}).` });
  fs.mkdirSync(LT_ENV_DIR, { recursive: true });
  let keep = [];
  try { keep = fs.readFileSync(LT_ENV_FILE, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !/^\s*LT_(USERNAME|ACCESS_KEY)\s*=/.test(l)); } catch { /* new file */ }
  fs.writeFileSync(LT_ENV_FILE, [...keep, `LT_USERNAME=${username}`, `LT_ACCESS_KEY=${accessKey}`, ''].join('\n'), { mode: 0o600 });
  res.json({ ok: true, credentials: credentialStatus() });
});

app.get('/api/runs/:id/events', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).end();
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(`event: backlog\ndata: ${JSON.stringify(r.log)}\n\n`);
  r.listeners.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  req.on('close', () => { clearInterval(ping); r.listeners.delete(res); });
});

function guardIdle(r, res) {
  if (r.proc) { res.status(409).json({ error: 'A step is already running for this run.' }); return false; }
  return true;
}

app.post('/api/runs/:id/approve', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Run not found' });
  if (!guardIdle(r, res)) return;
  if (!fs.existsSync(path.join(runDir(req.params.id), 'test-plan.md'))) return res.status(400).json({ error: 'There is no test plan to approve yet.' });
  r.state.approvedAt = new Date().toISOString();
  runAgent(req.params.id, 'execute');
  res.json(r.state);
});

app.post('/api/runs/:id/replan', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Run not found' });
  if (!guardIdle(r, res)) return;
  const note = String((req.body && req.body.feedback) || '').trim();
  r.state.planVersion = (r.state.planVersion || 1) + 1;
  if (note) {
    fs.appendFileSync(path.join(runDir(req.params.id), 'intake.md'),
      `\n## Plan adjustment (${new Date().toISOString()})\n${note}\n`);
  }
  runAgent(req.params.id, 'plan');
  res.json(r.state);
});

app.post('/api/runs/:id/rerun-execute', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Run not found' });
  if (!guardIdle(r, res)) return;
  runAgent(req.params.id, 'execute');
  res.json(r.state);
});

app.post('/api/runs/:id/cancel', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Run not found' });
  if (r.proc) {
    r.state.status = 'cancelled';
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(r.proc.pid), '/T', '/F']);
    else r.proc.kill('SIGTERM');
    addLog(req.params.id, '=== cancelled by user ===');
    setStatus(req.params.id, 'cancelled', 'Cancelled. You can re-plan or re-run.');
  }
  res.json(r.state);
});

app.get('/api/runs/:id/file', (req, res) => {
  const full = safeFile(req.params.id, String(req.query.name || ''));
  if (!full) return res.status(404).send('File not found');
  if (req.query.download) return res.download(full);
  const ext = path.extname(full).toLowerCase();
  if (['.md', '.csv', '.txt', '.json', '.log', '.js', '.ts', '.html'].includes(ext)) {
    res.type('text/plain; charset=utf-8').send(redact(fs.readFileSync(full, 'utf8')));
  } else {
    res.sendFile(full);
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`LambdaTest QA web app running at http://localhost:${PORT}`);
  console.log(`Claude Code: ${CLAUDE_BIN}`);
  console.log(`Plugin: ${PLUGIN_DIR}`);
});
