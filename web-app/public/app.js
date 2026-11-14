// Single-page UI: #/ = new run + run list, #/run/<id> = run detail.
const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
let eventSource = null;
let pollTimer = null;

const STATUS = {
  created: ['Starting', 'wait'],
  planning: ['Planning…', 'wait'],
  plan_ready: ['Awaiting approval', 'wait'],
  plan_failed: ['Planning failed', 'bad'],
  executing: ['Running tests…', 'wait'],
  done: ['Complete', 'ok'],
  exec_failed: ['Run failed', 'bad'],
  cancelled: ['Cancelled', 'bad'],
  interrupted: ['Interrupted', 'bad'],
};
const DOCS = [
  ['report.md', 'Report'],
  ['test-plan.md', 'Test plan'],
  ['test-cases.md', 'Test cases'],
  ['agent-execute-summary.md', 'Run summary'],
  ['agent-plan-summary.md', 'Plan summary'],
  ['intake.md', 'Brief'],
];

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(body.error || body || res.statusText);
  return body;
}

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function md(text) {
  const html = window.marked ? marked.parse(text) : `<pre>${esc(text)}</pre>`;
  return window.DOMPurify ? DOMPurify.sanitize(html) : `<pre>${esc(text)}</pre>`;
}
function csvTable(text) {
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
  if (!rows.length) return '<p class="muted">Empty.</p>';
  const [head, ...body] = rows;
  return `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

async function renderEnv() {
  try {
    const s = await api('/api/status');
    $('#envStatus').innerHTML = [
      s.claude ? `<span class="pill ok">Claude Code ${esc(s.claude.split(' ')[0])}</span>` : '<span class="pill bad">Claude Code not found</span>',
      s.pluginFound ? '<span class="pill ok">QA agent plugin</span>' : '<span class="pill bad">Plugin missing</span>',
      s.credentials.present ? `<span class="pill ok">LambdaTest keys (${esc(s.credentials.location)})</span>` : '<span class="pill bad">No LambdaTest keys: plan only</span>',
    ].join('');
  } catch { $('#envStatus').innerHTML = '<span class="pill bad">Server offline</span>'; }
}

function cleanup() {
  if (eventSource) { eventSource.close(); eventSource = null; }
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ---------- home ----------

async function renderHome() {
  app.innerHTML = $('#tpl-home').innerHTML;
  const form = $('#runForm');
  form.pagesMode.addEventListener('change', () => $('.pages-list').classList.toggle('hidden', form.pagesMode.value !== 'list'));
  form.addEventListener('change', () => $('.custom-devices').classList.toggle('hidden', form.deviceTier.value !== 'custom'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    const data = Object.fromEntries(new FormData(form).entries());
    data.realOnly = form.realOnly.checked;
    data.authorized = form.authorized.checked;
    data.testTypes = [...document.querySelectorAll('#testTypes input:checked')].map((i) => i.value);
    data.reportFormats = [...document.querySelectorAll('#reportFormats input:checked')].map((i) => i.value);
    btn.disabled = true;
    $('#formError').classList.add('hidden');
    try {
      const run = await api('/api/runs', { method: 'POST', body: JSON.stringify(data) });
      location.hash = `#/run/${run.id}`;
    } catch (err) {
      $('#formError').textContent = err.message;
      $('#formError').classList.remove('hidden');
      btn.disabled = false;
    }
  });

  const runs = await api('/api/runs');
  if (runs.length) {
    $('#runList').innerHTML = runs.map((r) => {
      const [label, cls] = STATUS[r.status] || [r.status, ''];
      return `<a href="#/run/${encodeURIComponent(r.id)}"><div class="url">${esc(r.url)}</div>
        <div class="muted small">${new Date(r.createdAt).toLocaleString()} · <span class="badge ${cls}">${esc(label)}</span></div></a>`;
    }).join('');
  }
}

// ---------- run detail ----------

let currentDoc = null;

async function renderRun(id) {
  app.innerHTML = $('#tpl-run').innerHTML;
  const log = $('#log');
  const appendLog = (line) => {
    const nearBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 40;
    log.textContent += line + '\n';
    if (nearBottom) log.scrollTop = log.scrollHeight;
  };

  eventSource = new EventSource(`/api/runs/${encodeURIComponent(id)}/events`);
  eventSource.addEventListener('backlog', (e) => { log.textContent = ''; JSON.parse(e.data).forEach(appendLog); log.scrollTop = log.scrollHeight; });
  eventSource.addEventListener('log', (e) => appendLog(JSON.parse(e.data)));
  eventSource.addEventListener('status', () => refresh(id));

  $('#adjustSend').addEventListener('click', async () => {
    await act(id, 'replan', { feedback: $('#adjustText').value });
    $('#adjustBox').classList.add('hidden');
    $('#adjustText').value = '';
  });

  await refresh(id);
  pollTimer = setInterval(() => refresh(id, true), 8000); // picks up new files while a step runs
}

async function act(id, action, body) {
  try { await api(`/api/runs/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: JSON.stringify(body || {}) }); }
  catch (err) { alert(err.message); }
  refresh(id);
}

async function refresh(id, filesOnly) {
  let run;
  try { run = await api(`/api/runs/${encodeURIComponent(id)}`); }
  catch { app.innerHTML = '<div class="card"><p>Run not found.</p><a href="#/">Back</a></div>'; cleanup(); return; }

  renderFiles(id, run.files);
  renderTabs(id, run.files);
  if (filesOnly && !run.running) return;

  $('#runUrl').textContent = run.url;
  $('#runId').textContent = `Run ${run.id} · started ${new Date(run.createdAt).toLocaleString()}`;
  const [label, cls] = STATUS[run.status] || [run.status, ''];
  $('#runBadge').className = `badge ${cls}`;
  $('#runBadge').innerHTML = (run.running ? '<span class="spinner"></span>' : '') + esc(label);
  $('#runMessage').textContent = run.message || '';

  const order = ['plan', 'approve', 'execute', 'report'];
  const at = { created: 0, planning: 0, plan_failed: 0, plan_ready: 1, executing: 2, exec_failed: 2, done: 4, cancelled: run.approvedAt ? 2 : 0, interrupted: run.approvedAt ? 2 : 0 }[run.status] ?? 0;
  document.querySelectorAll('#steps li').forEach((li) => {
    const i = order.indexOf(li.dataset.step);
    li.className = i < at ? 'done' : i === at ? 'active' : '';
  });

  const a = $('#actions');
  a.innerHTML = '';
  const add = (text, cls, fn) => { const b = document.createElement('button'); b.textContent = text; if (cls) b.className = cls; b.onclick = fn; a.appendChild(b); };
  if (run.running) add('Cancel', 'danger', () => confirm('Stop the agent?') && act(id, 'cancel'));
  else {
    const hasPlan = run.files.some((f) => f.name === 'test-plan.md');
    if (run.status === 'plan_ready' || (hasPlan && ['cancelled', 'interrupted', 'exec_failed'].includes(run.status))) {
      add(run.status === 'plan_ready' ? 'Approve & run on LambdaTest' : 'Run tests again', 'primary', () => confirm('Run the approved plan on LambdaTest? This uses device sessions.') && act(id, run.status === 'plan_ready' ? 'approve' : 'rerun-execute'));
    }
    add(hasPlan ? 'Adjust plan' : 'Retry planning', '', () => hasPlan ? $('#adjustBox').classList.toggle('hidden') : act(id, 'replan'));
    if (run.status === 'done') add('Re-run tests', '', () => confirm('Run the tests again?') && act(id, 'rerun-execute'));
  }
}

function fileUrl(id, name, download) {
  return `/api/runs/${encodeURIComponent(id)}/file?name=${encodeURIComponent(name)}${download ? '&download=1' : ''}`;
}

function renderFiles(id, files) {
  const ul = $('#fileList');
  if (!ul) return;
  ul.innerHTML = files.length ? files.map((f) =>
    `<li><span class="name">${esc(f.name)} <span class="muted">${(f.size / 1024).toFixed(1)} KB</span></span>
      <span><a href="${fileUrl(id, f.name)}" target="_blank" rel="noopener">open</a> · <a href="${fileUrl(id, f.name, true)}">download</a></span></li>`).join('')
    : '<li class="muted">No files yet.</li>';
}

function renderTabs(id, files) {
  const names = new Set(files.map((f) => f.name));
  const docs = DOCS.filter(([n]) => names.has(n));
  if (names.has('test-cases.csv')) docs.splice(docs.findIndex(([n]) => n === 'test-cases.md') + 1 || docs.length, 0, ['test-cases.csv', 'Cases (table)']);
  const tabs = $('#docTabs');
  if (!tabs) return;
  const key = docs.map(([n]) => n).join('|');
  if (tabs.dataset.key !== key) {
    tabs.dataset.key = key;
    tabs.innerHTML = '';
    for (const [name, label] of docs) {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.name = name;
      b.onclick = () => showDoc(id, name);
      tabs.appendChild(b);
    }
    if (!currentDoc || !names.has(currentDoc)) currentDoc = docs[0] && docs[0][0];
    if (currentDoc) showDoc(id, currentDoc);
  }
}

async function showDoc(id, name) {
  currentDoc = name;
  document.querySelectorAll('#docTabs button').forEach((b) => b.classList.toggle('on', b.dataset.name === name));
  const text = await (await fetch(fileUrl(id, name))).text();
  $('#docView').innerHTML = name.endsWith('.csv') ? csvTable(text) : md(text);
}

// ---------- router ----------

function route() {
  cleanup();
  currentDoc = null;
  const m = location.hash.match(/^#\/run\/(.+)$/);
  if (m) renderRun(decodeURIComponent(m[1])); else renderHome();
}
window.addEventListener('hashchange', route);
renderEnv();
route();
