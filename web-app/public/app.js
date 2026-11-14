// LambdaTest QA Agent web UI — screens and look follow Prototype/source/Main.dc.html,
// but every number comes from the real agent's files (no sample data).
const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');

const TYPES = [
  ['Smoke', 'Smoke', true], ['Sanity', 'Sanity', false], ['Functional', 'Functional', true],
  ['UI', 'UI vs design', true], ['Regression', 'Regression', false], ['Responsive / cross-browser', 'Responsive', true],
  ['Accessibility (WCAG 2.2 AA)', 'Accessibility', true], ['Performance (Lighthouse, Core Web Vitals)', 'Performance', false],
  ['SEO', 'SEO', true], ['Unit', 'Unit', false],
];
const DEVICES = [
  ['iphone', 'Latest iPhone · iOS', true], ['galaxy', 'Latest Galaxy S · Android', true], ['pixel', 'Latest Pixel · Android', true],
  ['ipad', 'Latest iPad · iPadOS', false], ['win-chrome', 'Chrome · Windows 11', false], ['mac-safari', 'Safari · macOS', false],
  ['win-edge', 'Edge · Windows 11', false], ['broad', 'Broad mobile set (~20 devices)', false],
];
const FORMATS = [['Excel (.xlsx)', 'Excel', true], ['PDF (.pdf)', 'PDF', true], ['Word (.docx)', 'Word', false]];
const STATUS_TAG = {
  created: ['Starting', 'wait'], planning: ['Planning', 'wait'], plan_ready: ['Awaiting approval', 'wait'],
  plan_failed: ['Planning failed', 'bad'], executing: ['Running', 'wait'], done: ['Complete', 'good'],
  exec_failed: ['Run failed', 'bad'], cancelled: ['Cancelled', 'bad'], interrupted: ['Interrupted', 'bad'],
};

let env = null;
let cleanupFns = [];

// ---------- helpers ----------

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const body = (res.headers.get('content-type') || '').includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((body && body.error) || body || res.statusText);
  return body;
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function md(text) {
  if (!window.marked || !window.DOMPurify) return `<pre>${esc(text)}</pre>`;
  return DOMPurify.sanitize(marked.parse(text));
}
function fileUrl(id, name, download) {
  return `/api/runs/${encodeURIComponent(id)}/file?name=${encodeURIComponent(name)}${download ? '&download=1' : ''}`;
}
async function fileText(id, name) { const r = await fetch(fileUrl(id, name)); return r.ok ? r.text() : ''; }
function n(v) { return Number.isFinite(Number(v)) ? Number(v) : 0; }

function renderSteps(current, done, clickable) {
  const labels = ['Brief', 'Plan & approve', 'Run on LambdaTest', 'Report'];
  $('#steps').innerHTML = labels.map((label, i) => {
    const isDone = i < done && i !== current;
    const isActive = i === current;
    const inner = `<span class="dot ${isActive ? 'active' : isDone ? 'done' : ''}">${isDone ? '✓' : i + 1}</span><span class="step-label ${isActive ? 'active' : ''}">${label}</span>`;
    return `<li>${clickable && clickable[i] && !isActive ? `<button type="button" data-step="${i}">${inner}</button>` : inner}</li>`;
  }).join('');
}

function setSite(url) { $('#siteUnderTest').textContent = url || '—'; }

async function loadEnv() {
  try {
    env = await api('/api/status');
    const parts = [env.claude ? 'Claude Code ready' : 'Claude Code not found', env.pluginFound ? 'agent plugin loaded' : 'plugin missing',
      env.credentials.present ? 'LambdaTest keys found' : 'no LambdaTest keys (plan only)'];
    $('#envLine').textContent = parts.join(' · ');
  } catch { $('#envLine').textContent = 'Server offline'; }
}

// ---------- 1. Brief ----------

function chipGroup(id, items, selected) {
  return `<div class="chips" id="${id}">${items.map(([value, label]) => {
    const on = selected.includes(value);
    return `<button type="button" class="chip" data-value="${esc(value)}" aria-pressed="${on}">${on ? '✓' : '+'} ${esc(label)}</button>`;
  }).join('')}</div>`;
}
function chipValues(id) { return [...document.querySelectorAll(`#${id} .chip[aria-pressed="true"]`)].map((b) => b.dataset.value); }

async function renderBrief() {
  let pre = {};
  try { pre = JSON.parse(sessionStorage.getItem('prefill') || '{}'); } catch { /* none */ }
  sessionStorage.removeItem('prefill');
  const types = pre.testTypes || TYPES.filter((t) => t[2]).map((t) => t[0]);
  const devices = pre.devices || DEVICES.filter((d) => d[2]).map((d) => d[0]);
  const formats = pre.reportFormats || FORMATS.filter((f) => f[2]).map((f) => f[0]);
  const cred = env && env.credentials;
  renderSteps(0, 0);
  setSite(pre.url || '');

  app.innerHTML = `
  <section class="screen" aria-labelledby="h-brief">
    <div>
      <h1 id="h-brief">1. Give the brief</h1>
      <p class="lead">Tell the agent what to test. It will write test cases and a plan for your approval.</p>
    </div>

    <div class="cols">
      <div class="card">
        <h2>Website &amp; requirements</h2>
        <label class="field">Website URL
          <input id="url" type="url" required placeholder="https://staging.example.com" value="${esc(pre.url || '')}">
        </label>
        <label class="field">Environment
          <select id="environment">
            ${[['staging', 'Staging / UAT'], ['production', 'Production (read-only checks)'], ['localhost', 'Localhost / private network (needs tunnel)']]
              .map(([v, l]) => `<option value="${v}" ${pre.environment === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <label class="field">Requirements doc (BRD / PRD)
          <input id="requirements" type="text" placeholder="Link, file path or pasted acceptance criteria" value="${esc(pre.requirements || '')}">
        </label>
        <label class="field">Pages and flows to test
          <textarea id="pages" rows="3" placeholder="Leave empty to crawl from the homepage, e.g. Home, Product page, Cart, Checkout, Contact form">${esc(pre.pages || '')}</textarea>
        </label>
        <label class="field">Critical (P0) flows
          <input id="p0Flows" type="text" placeholder="Home → Search → Product → Cart → Checkout" value="${esc(pre.p0Flows || '')}">
        </label>
      </div>

      <div class="card">
        <h2>LambdaTest account</h2>
        ${cred && cred.present ? `<p class="ok-line">✓ Keys found in ${esc(cred.location)}. Enter new ones below only to replace them.</p>` : '<p class="hint">No keys found yet. Without them the agent writes the plan and scripts but cannot run on LambdaTest.</p>'}
        <label class="field">Username
          <input id="ltUser" type="text" placeholder="LT_USERNAME" autocomplete="off">
        </label>
        <label class="field">Access key
          <input id="ltKey" type="password" placeholder="LT_ACCESS_KEY" autocomplete="off">
        </label>
        <div class="actions"><button type="button" class="btn btn-outline" id="saveKeys">Save &amp; check keys</button></div>
        <p class="hint" id="keyMsg">Kept in a local .env file (~/.lambdatest/.env). Never written into reports.</p>
      </div>
    </div>

    <div class="card">
      <h2>Test types <span class="count" id="typeCount"></span></h2>
      ${chipGroup('types', TYPES, types)}
      <label class="field">Design reference for UI testing (optional)
        <input id="design" type="text" placeholder="Figma link or folder of PNG mockups" value="${esc(pre.design || '')}">
      </label>
    </div>

    <div class="card">
      <h2>Devices <span class="count">(default: latest iPhone and Android)</span></h2>
      ${chipGroup('devices', DEVICES, devices)}
      <label class="check"><input type="checkbox" id="realOnly" ${pre.realOnly === false ? '' : 'checked'}> Real devices only (no emulators)</label>
    </div>

    <details class="more">
      <summary>More options</summary>
      <div class="more-grid">
        <label class="field">Report formats <span class="hint">report.md is always written</span>
          ${chipGroup('formats', FORMATS, formats)}
        </label>
        <label class="field">Parallel sessions
          <input id="parallel" type="number" min="1" max="50" value="${esc(pre.parallel || 5)}">
        </label>
        <label class="field">Test accounts &amp; data
          <textarea id="testData" rows="2" placeholder="Test login, coupon codes, search terms. Use test accounts only.">${esc(pre.testData || '')}</textarea>
        </label>
        <label class="field">Thresholds (blank = defaults)
          <textarea id="thresholds" rows="2" placeholder="LCP < 2.5s, CLS < 0.1, INP < 200ms, Lighthouse ≥ 80, WCAG 2.2 AA">${esc(pre.thresholds || '')}</textarea>
        </label>
        <label class="field">Exclusions
          <input id="exclusions" type="text" placeholder="e.g. skip /checkout/pay" value="${esc(pre.exclusions || '')}">
        </label>
        <label class="field">Notes for the agent
          <textarea id="notes" rows="2">${esc(pre.notes || '')}</textarea>
        </label>
      </div>
    </details>

    <label class="check"><input type="checkbox" id="authorized"> I own this site or am authorized to test it.</label>

    <div class="actions">
      <button type="button" class="btn btn-primary" id="goPlan">Generate test plan →</button>
      <p role="alert" class="err-line hidden" id="briefError"></p>
    </div>

    <div class="card" id="recent">
      <h2>Recent runs</h2>
      <div class="runs" id="runList"><p class="hint">No runs yet.</p></div>
    </div>
  </section>`;

  const updateCount = () => { $('#typeCount').textContent = `(${chipValues('types').length} selected)`; };
  updateCount();
  app.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    b.firstChild.textContent = (on ? '✓' : '+') + b.firstChild.textContent.slice(1);
    updateCount();
    $('#briefError').classList.add('hidden');
  }));
  $('#url').addEventListener('input', (e) => setSite(e.target.value));

  $('#saveKeys').addEventListener('click', async () => {
    const msg = $('#keyMsg');
    const btn = $('#saveKeys');
    btn.disabled = true;
    msg.className = 'hint';
    msg.textContent = 'Checking the keys with LambdaTest…';
    try {
      await api('/api/credentials', { method: 'POST', body: JSON.stringify({ username: $('#ltUser').value, accessKey: $('#ltKey').value }) });
      $('#ltKey').value = '';
      msg.className = 'ok-line';
      msg.textContent = '✓ Keys are valid and saved to ~/.lambdatest/.env.';
      await loadEnv();
    } catch (err) {
      msg.className = 'err-line';
      msg.textContent = err.message;
    }
    btn.disabled = false;
  });

  $('#goPlan').addEventListener('click', async () => {
    const err = $('#briefError');
    const show = (m) => { err.textContent = m; err.classList.remove('hidden'); };
    const pages = $('#pages').value.trim();
    const data = {
      url: $('#url').value.trim(),
      environment: $('#environment').value,
      requirements: $('#requirements').value.trim(),
      pagesMode: pages ? 'list' : 'crawl',
      pages,
      p0Flows: $('#p0Flows').value.trim(),
      testTypes: chipValues('types'),
      design: $('#design').value.trim(),
      devices: chipValues('devices'),
      realOnly: $('#realOnly').checked,
      reportFormats: chipValues('formats'),
      parallel: $('#parallel').value,
      testData: $('#testData').value.trim(),
      thresholds: $('#thresholds').value.trim(),
      exclusions: $('#exclusions').value.trim(),
      notes: $('#notes').value.trim(),
      authorized: $('#authorized').checked,
    };
    if (!data.url) return show('Enter the website URL.');
    if (!data.testTypes.length || !data.devices.length) return show('Pick at least one test type and one device.');
    if (!data.authorized) return show('Confirm that you own or are authorized to test this site.');
    const btn = $('#goPlan');
    btn.disabled = true;
    try {
      const run = await api('/api/runs', { method: 'POST', body: JSON.stringify(data) });
      location.hash = `#/run/${encodeURIComponent(run.id)}`;
    } catch (e) { show(e.message); btn.disabled = false; }
  });

  try {
    const runs = await api('/api/runs');
    if (runs.length) {
      $('#runList').innerHTML = runs.slice(0, 15).map((r) => {
        const [label, cls] = STATUS_TAG[r.status] || [r.status, ''];
        return `<a href="#/run/${encodeURIComponent(r.id)}"><span class="u">${esc(r.url)}</span>
          <span class="small muted">${new Date(r.createdAt).toLocaleString()} <span class="tag ${cls}">${esc(label)}</span></span></a>`;
      }).join('');
    } else $('#recent').classList.add('hidden');
  } catch { /* server offline */ }
}

// ---------- run detail (plan / run / report) ----------

function defaultView(run) {
  if (run.status === 'done') return 'report';
  if (run.status === 'executing' || run.status === 'exec_failed') return 'run';
  if ((run.status === 'cancelled' || run.status === 'interrupted') && run.approvedAt) return 'run';
  return 'plan';
}

async function renderRun(id) {
  const ui = { view: null, userView: false, sig: '', showChanges: false, changesText: '', logOpen: null, run: null };
  const logEl = document.createElement('pre');
  logEl.className = 'log';
  const appendLog = (line) => {
    const atBottom = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 40;
    logEl.textContent += line + '\n';
    if (atBottom) logEl.scrollTop = logEl.scrollHeight;
  };

  const es = new EventSource(`/api/runs/${encodeURIComponent(id)}/events`);
  es.addEventListener('backlog', (e) => { logEl.textContent = ''; JSON.parse(e.data).forEach(appendLog); logEl.scrollTop = logEl.scrollHeight; });
  es.addEventListener('log', (e) => appendLog(JSON.parse(e.data)));
  es.addEventListener('status', () => refresh());
  const timer = setInterval(() => refresh(), 5000);
  const ticker = setInterval(() => { const el = $('#elapsed'); if (el && ui.run) el.textContent = elapsed(ui.run.updatedAt); }, 1000);
  cleanupFns.push(() => es.close(), () => clearInterval(timer), () => clearInterval(ticker));

  async function act(action, body) {
    try { await api(`/api/runs/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: JSON.stringify(body || {}) }); }
    catch (err) { alert(err.message); }
    ui.userView = false;
    await refresh(true);
  }

  async function refresh(force) {
    let run;
    try { run = await api(`/api/runs/${encodeURIComponent(id)}`); }
    catch { app.innerHTML = '<section class="screen"><div class="card"><h2>Run not found</h2><a href="#/">Start a new run</a></div></section>'; return; }
    ui.run = run;
    if (!ui.userView) ui.view = defaultView(run);
    const sig = JSON.stringify([run.status, run.running, run.files.map((f) => f.name + f.size), run.progress, run.planVersion, ui.view, ui.showChanges]);
    if (!force && sig === ui.sig) return;
    ui.sig = sig;
    const ta = $('#changesText');
    if (ta) ui.changesText = ta.value;
    const logDetails = $('#logPanel');
    if (logDetails) ui.logOpen = logDetails.open;
    draw(run);
  }

  function prefillAndEdit() {
    sessionStorage.setItem('prefill', JSON.stringify(ui.run.form || {}));
    location.hash = '#/';
  }

  function draw(run) {
    setSite(run.url);
    const hasPlan = run.files.some((f) => f.name === 'test-plan.md');
    const hasReport = run.files.some((f) => f.name === 'report.md');
    const doneCount = run.status === 'done' ? 4 : run.approvedAt ? 2 : hasPlan ? 1 : 1;
    const current = { plan: 1, run: 2, report: 3 }[ui.view];
    renderSteps(current, Math.max(doneCount, current), [true, hasPlan, !!run.approvedAt, hasReport]);
    $('#steps').querySelectorAll('button[data-step]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.step);
      if (i === 0) return prefillAndEdit();
      ui.view = ['brief', 'plan', 'run', 'report'][i];
      ui.userView = true;
      refresh(true);
    }));

    if (ui.view === 'plan') drawPlan(run, hasPlan);
    else if (ui.view === 'run') drawRunning(run);
    else drawReport(run);

    const slot = $('#logSlot');
    if (slot) {
      slot.appendChild(logEl);
      const details = $('#logPanel');
      details.open = ui.logOpen ?? run.running;
      logEl.scrollTop = logEl.scrollHeight;
    }
    wire(run);
  }

  function filesPanel(run) {
    return `<details class="panel"><summary>All files (${run.files.length})</summary>
      <ul class="files">${run.files.map((f) => `<li><span class="name">${esc(f.name)} <span class="muted small">${(f.size / 1024).toFixed(1)} KB</span></span>
        <span><a href="${fileUrl(run.id, f.name)}" target="_blank" rel="noopener">open</a> · <a href="${fileUrl(run.id, f.name, true)}">download</a></span></li>`).join('')}</ul></details>`;
  }
  const logPanel = `<details class="panel" id="logPanel"><summary>Live agent log</summary><div id="logSlot"></div></details>`;

  // ----- 2. Plan -----
  function drawPlan(run, hasPlan) {
    const planning = run.running && run.status === 'planning';
    const approved = !!run.approvedAt;
    let body = '';
    if (planning || (!hasPlan && run.status === 'created')) {
      body = `<div class="card"><p class="notice info"><span class="spinner"></span>The agent is reading the site and writing test cases. This usually takes a few minutes.</p>
        <p class="hint">Started <span id="elapsed">${elapsed(run.updatedAt)}</span> ago. You can leave this page; the run keeps going.</p>
        <div class="actions"><button type="button" class="btn btn-danger" data-act="cancel">Cancel</button></div></div>`;
    } else if (!hasPlan) {
      body = `<p class="notice bad">${esc(run.message || 'Planning did not finish.')}</p>
        <div class="actions"><button type="button" class="btn btn-ghost" data-act="edit">← Edit brief</button><button type="button" class="btn btn-primary" data-act="replan">Retry planning</button></div>`;
    } else {
      const cases = run.cases || [];
      const typeCount = new Set(cases.map((c) => c.type.toLowerCase()).filter(Boolean)).size || (run.form.testTypes || []).length;
      const deviceCount = (run.form.devices || []).includes('broad') ? `~${(run.deviceLabels || []).length - 1 + 20}` : (run.deviceLabels || []).length;
      body = `
        ${run.planVersion > 1 ? `<p role="status" class="notice info">Plan updated with your feedback (version ${run.planVersion}).</p>` : ''}
        ${run.status === 'plan_failed' ? `<p class="notice bad">${esc(run.message)}</p>` : ''}
        <div class="tiles">
          <div class="tile"><div class="num">${cases.length || '—'}</div><div class="lbl">Test cases</div></div>
          <div class="tile"><div class="num">${typeCount}</div><div class="lbl">Test types</div></div>
          <div class="tile"><div class="num">${deviceCount}</div><div class="lbl">Devices</div></div>
        </div>
        ${cases.length ? `<div class="card flush"><table class="grid min"><thead><tr><th>ID</th><th>Test case</th><th>Type</th><th>Priority</th></tr></thead><tbody>
          ${cases.map((c) => `<tr><td class="mono">${esc(c.id)}</td><td>${esc(c.title)}</td><td class="type">${esc(c.type)}</td><td class="pri">${esc(c.priority)}</td></tr>`).join('')}
          </tbody></table></div>` : '<p class="notice info">No test-cases.csv was written, so the test cases are in the full plan below.</p>'}
        <p class="hint" style="font-size:14px">Each case runs on: ${esc((run.deviceLabels || []).join(', '))}</p>
        ${approved ? `<p class="notice good">Approved ${new Date(run.approvedAt).toLocaleString()}.</p>` : `
        ${ui.showChanges ? `<div class="card"><label class="field">What should change?
            <textarea id="changesText" rows="3" placeholder="e.g. Add a test for coupon codes at checkout">${esc(ui.changesText)}</textarea></label>
            <div><button type="button" class="btn btn-outline" data-act="send">Send to AI</button></div></div>` : ''}
        <div class="actions">
          <button type="button" class="btn btn-ghost" data-act="edit">← Edit brief</button>
          <button type="button" class="btn btn-warn" data-act="toggle">Request changes</button>
          <button type="button" class="btn btn-primary" data-act="approve">Approve &amp; run on LambdaTest →</button>
        </div>`}
        <details class="panel" id="planDoc"><summary>Full test plan</summary><div class="doc" id="planBody">Loading…</div></details>
        ${filesPanel(run)}`;
    }
    app.innerHTML = `<section class="screen" aria-labelledby="h-plan">
      <div><h1 id="h-plan">2. Review and approve the plan</h1>
      <p class="lead">The AI wrote these test cases. Nothing runs on LambdaTest until you approve.</p></div>
      ${body}${logPanel}</section>`;
    const planDoc = $('#planDoc');
    if (planDoc) planDoc.addEventListener('toggle', async () => { if (planDoc.open) $('#planBody').innerHTML = md(await fileText(run.id, 'test-plan.md')); }, { once: true });
  }

  // ----- 3. Run -----
  function drawRunning(run) {
    const p = run.progress;
    const casesN = (run.cases || []).length;
    const devN = (run.deviceLabels || []).length;
    const pct = p && n(p.total) ? Math.min(100, Math.round((n(p.done) / n(p.total)) * 100)) : null;
    const devices = p && Array.isArray(p.devices) && p.devices.length ? p.devices
      : (run.deviceLabels || []).map((d) => ({ name: d, status: run.status === 'done' ? 'done' : 'queued' }));
    const stLabel = { queued: 'Queued', running: 'Running…', done: 'Done', blocked: 'Blocked' };
    let foot = '';
    if (run.running) foot = '<div class="actions"><button type="button" class="btn btn-danger" data-act="cancel">Cancel run</button></div>';
    else if (run.status === 'done') foot = '<div class="actions"><button type="button" class="btn btn-primary" data-act="report">View test report →</button></div>';
    else foot = `<p class="notice bad">${esc(run.message || 'The run stopped.')}</p><div class="actions"><button type="button" class="btn btn-ghost" data-act="toPlan">← Back to plan</button><button type="button" class="btn btn-primary" data-act="rerun">Run tests again</button></div>`;

    app.innerHTML = `<section class="screen" aria-labelledby="h-run">
      <div><h1 id="h-run">3. Running on LambdaTest</h1>
      <p class="lead">${casesN ? `${casesN} test cases` : 'The approved test cases'} on ${devN} ${devN === 1 ? 'device' : 'devices and browsers'}${(run.form.devices || []).includes('broad') ? ' plus the broad mobile set' : ''}. Smoke runs first as a gate.</p></div>
      <div class="card">
        <div class="progress-head"><span>Overall progress</span><span>${pct === null ? (run.running ? 'Starting…' : '') : pct + '%'}</span></div>
        <div role="progressbar" aria-valuemin="0" aria-valuemax="100" ${pct === null ? '' : `aria-valuenow="${pct}"`} aria-label="Test run progress" class="bar ${pct === null && run.running ? 'indeterminate' : ''}">
          <div style="width:${pct === null ? (run.status === 'done' ? 100 : 0) : pct}%"></div>
        </div>
        <p class="hint">${p && p.current ? `Now: ${esc(p.current)} · ` : ''}${p ? `${n(p.done)} of ${n(p.total)} test executions finished` : run.running ? 'Waiting for the agent\'s first progress update' : ''}${run.running ? ` · running for <span id="elapsed">${elapsed(run.updatedAt)}</span>` : ''}</p>
      </div>
      <div class="card flush rows">
        ${devices.map((d) => { const s = String(d.status || 'queued').toLowerCase(); return `<div><span class="name">${esc(d.name)}</span><span class="st ${esc(s)}">${esc(stLabel[s] || d.status)}</span></div>`; }).join('')}
      </div>
      ${foot}
      ${filesPanel(run)}
      ${logPanel}
    </section>`;
  }

  // ----- 4. Report -----
  function drawReport(run) {
    const r = run.results;
    const files = run.files.map((f) => f.name);
    const dl = files.filter((f) => /^report.*\.(xlsx|pdf|docx|md)$/i.test(f) || (/\.(xlsx|pdf|docx)$/i.test(f) && !f.includes('/')));
    let summary = '';
    if (r && r.verdict) {
      const nogo = /no/i.test(r.verdict);
      const t = r.totals || {};
      const defects = Array.isArray(r.defects) ? r.defects : [];
      const byType = Array.isArray(r.byType) ? r.byType : [];
      summary = `
        <div class="verdict ${nogo ? 'nogo' : 'go'}"><div class="k">Release decision</div><div class="v">${nogo ? 'No-Go' : 'Go'}</div><div>${esc(r.reason || '')}</div></div>
        <div class="tiles">
          <div class="tile"><div class="num">${n(t.total)}</div><div class="lbl">Test runs</div></div>
          <div class="tile"><div class="num green">${n(t.passed)}</div><div class="lbl">Passed</div></div>
          <div class="tile"><div class="num red">${n(t.failed)}</div><div class="lbl">Failed</div></div>
          ${n(t.blocked) ? `<div class="tile"><div class="num">${n(t.blocked)}</div><div class="lbl">Blocked</div></div>` : ''}
          ${n(t.flaky) ? `<div class="tile"><div class="num">${n(t.flaky)}</div><div class="lbl">Flaky</div></div>` : ''}
          <div class="tile"><div class="num">${defects.length}</div><div class="lbl">Bugs found</div></div>
        </div>
        <div class="cols-wide">
          <div class="card flush"><h2>Results by test type</h2>
            <table class="grid"><thead><tr><th>Type</th><th>Passed</th><th>Failed</th><th>Status</th></tr></thead><tbody>
            ${byType.map((m) => { const s = String(m.status || '').toLowerCase(); return `<tr><td>${esc(m.type)}</td><td>${n(m.passed)}</td><td>${n(m.failed)}${n(m.blocked) ? ` <span class="muted small">(${n(m.blocked)} blocked)</span>` : ''}</td><td class="${s.startsWith('pass') ? 'pass' : s.startsWith('fail') ? 'fail' : 'blocked'}">${esc(m.status)}</td></tr>`; }).join('')}
            </tbody></table></div>
          <div class="card flush"><h2>Bugs, most severe first</h2>
            ${defects.length ? defects.map((b) => `<div class="bug"><div class="meta"><span class="id">${esc(b.id)}</span><span class="sev ${esc(String(b.severity || '').toLowerCase())}">${esc(b.severity)}</span><span class="where">${esc(b.type)} · ${esc(b.device)}</span></div><div class="title">${esc(b.title)}</div></div>`).join('')
              : '<p class="none">No bugs found in the selected test types.</p>'}
          </div>
        </div>`;
    } else {
      summary = '<p class="notice info">The agent did not write a results summary file, so the full report is shown below.</p>';
    }
    app.innerHTML = `<section class="screen" aria-labelledby="h-report">
      <div><h1 id="h-report">4. Test report</h1>
      <p class="lead">Results for ${esc(run.url)} from the LambdaTest run finished ${new Date(run.updatedAt).toLocaleString()}.</p></div>
      ${summary}
      ${dl.length ? `<div class="card"><h2>Download the report</h2><div class="downloads">${dl.map((f) => `<a class="btn btn-outline" href="${fileUrl(run.id, f, true)}">${esc(f)}</a>`).join('')}</div></div>` : ''}
      <details class="panel" id="reportDoc" ${r && r.verdict ? '' : 'open'}><summary>Full report</summary><div class="doc" id="reportBody">Loading…</div></details>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-act="new">Start a new run</button>
        <button type="button" class="btn btn-ghost" data-act="edit">Change brief and re-run</button>
        <button type="button" class="btn btn-ghost" data-act="rerun">Re-run the same plan</button>
      </div>
      ${filesPanel(run)}
      ${logPanel}
    </section>`;
    const doc = $('#reportDoc');
    const load = async () => { $('#reportBody').innerHTML = md(await fileText(run.id, 'report.md')); };
    if (doc.open) load(); else doc.addEventListener('toggle', load, { once: true });
  }

  function wire(run) {
    app.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'edit') return prefillAndEdit();
      if (a === 'new') { location.hash = '#/'; return; }
      if (a === 'toggle') { ui.showChanges = !ui.showChanges; return refresh(true); }
      if (a === 'send') {
        const text = ($('#changesText') || {}).value || '';
        if (!text.trim()) return alert('Describe what should change first.');
        ui.showChanges = false; ui.changesText = '';
        return act('replan', { feedback: text });
      }
      if (a === 'approve') { if (confirm('Run the approved plan on LambdaTest? This uses device sessions and Claude credits.')) act('approve'); return; }
      if (a === 'rerun') { if (confirm('Run the tests again on LambdaTest?')) act('rerun-execute'); return; }
      if (a === 'replan') return act('replan');
      if (a === 'cancel') { if (confirm('Stop the agent?')) act('cancel'); return; }
      if (a === 'report') { ui.view = 'report'; ui.userView = true; return refresh(true); }
      if (a === 'toPlan') { ui.view = 'plan'; ui.userView = true; return refresh(true); }
    }));
  }

  await refresh(true);
}

function elapsed(since) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m} min ${s % 60} s` : `${s} s`;
}

// ---------- router ----------

function route() {
  cleanupFns.forEach((f) => f());
  cleanupFns = [];
  window.scrollTo(0, 0);
  const m = location.hash.match(/^#\/run\/(.+)$/);
  if (m) renderRun(decodeURIComponent(m[1])); else renderBrief();
}
window.addEventListener('hashchange', route);
loadEnv().then(route);
