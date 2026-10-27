/* Контроль задач — застосунок. Дані: localStorage (кеш і офлайн) + /api/tasks (синхронізація). */
(function () {
'use strict';
const K = window.KZImport;
const { pad, ymd, parseYmd, todayStr, addDays, diffDays, parseQuick } = K;

/* ---------- іконки ---------- */
const svg = (p, sw) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
const I = {
  today: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  list: svg('<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="3"/>'),
  cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  board: svg('<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>'),
  stats: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2.4),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3.5),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  repeat: svg('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>'),
  subs: svg('<path d="M4 4v10a3 3 0 0 0 3 3h13"/><path d="M16 13l4 4-4 4"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 2.2),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  left: svg('<path d="M15 6l-6 6 6 6"/>', 2.2),
  right: svg('<path d="M9 6l6 6-6 6"/>', 2.2),
  tag: svg('<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/>'),
  clip: svg('<path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7-7l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9"/>'),
  note: svg('<path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>'),
  upload: svg('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'),
  download: svg('<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  select: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><path d="M5 6.5l1.3 1.3L8.5 5"/><path d="M14 6.5h7M14 17.5h7"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  grip: svg('<circle cx="9" cy="6" r="1.3" fill="currentColor"/><circle cx="15" cy="6" r="1.3" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="9" cy="18" r="1.3" fill="currentColor"/><circle cx="15" cy="18" r="1.3" fill="currentColor"/>', 0),
  promote: svg('<path d="M7 17L17 7M9 7h8v8"/>'),
  toTasks: svg('<path d="M9 6h11M9 12h11M9 18h6"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="3"/><path d="M19 15v6M16 18h6"/>'),
  bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  restore: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  postpone: svg('<path d="M4 12h13M13 6l6 6-6 6"/>'),
  history: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),
  importI: svg('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
  mark: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l3 3 5-6" stroke="#3FC5A1"/><path d="M14 7h6M4 15h16M4 20h10" stroke="#ffffff"/></svg>'
};

/* ---------- допоміжне ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const rid = (p) => (p || 't') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return f[2]; if (b > 1 && b < 5) return f[1]; if (b === 1) return f[0]; return f[2]; };
const DAYS = ['день', 'дні', 'днів'], TASKS_W = ['задачу', 'задачі', 'задач'], TASKS_N = ['задача', 'задачі', 'задач'];
// Некоректна дата не повинна зупиняти відмальовування всього застосунку.
const fmt = (s, o) => { const d = typeof s === 'string' ? parseYmd(s) : new Date(NaN); return isNaN(d) ? '—' : new Intl.DateTimeFormat('uk-UA', o).format(d); };
const fmtDT = (iso) => { const d = new Date(iso); return iso == null || isNaN(d) ? '—' : new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(d); };
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parseYmd(s)) === s;
const isHm = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const isIso = (s) => typeof s === 'string' && !isNaN(Date.parse(s));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nowIso = () => new Date().toISOString();
const PRIO = { 1: 'Критичний', 2: 'Високий', 3: 'Звичайний', 4: 'Низький' };
const STATUS = { todo: 'Заплановано', doing: 'В роботі', done: 'Виконано' };
const REPEAT = { none: 'Не повторюється', daily: 'Щодня', weekdays: 'Щобудня (пн–пт)', weekly: 'Щотижня', monthly: 'Щомісяця', yearly: 'Щороку', custom: 'Своє…' };
const REMIND = { none: 'Без нагадування', at: 'У час задачі', '15m': 'За 15 хвилин', '1h': 'За 1 годину', '3h': 'За 3 години', '1d': 'За день (о 9:00)', custom: 'Обрати час…' };
const WDN = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const UNIT = { day: ['день', 'дні', 'днів'], week: ['тиждень', 'тижні', 'тижнів'], month: ['місяць', 'місяці', 'місяців'], year: ['рік', 'роки', 'років'] };
const HIST = { created: 'Створено', deleted: 'Переміщено в кошик', restored: 'Відновлено з кошика', title: 'Назва', due: 'Термін', time: 'Час', priority: 'Пріоритет', status: 'Статус', project: 'Проєкт' };
const TRACK = ['title', 'due', 'time', 'priority', 'status', 'project'];
const TRASH_DAYS = 30;
const PROJ_COLORS = ['#0D6A56', '#2C6BD0', '#B0457A', '#D57C22', '#6B5BD2', '#3E8E9E', '#8A6A2E', '#C8352B'];
function projColor(name) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PROJ_COLORS[h % PROJ_COLORS.length]; }
const fsize = (n) => n < 1024 ? n + ' Б' : n < 1048576 ? (n / 1024).toFixed(0) + ' КБ' : (n / 1048576).toFixed(1).replace('.', ',') + ' МБ';
const shortT = (t) => (t.length > 42 ? t.slice(0, 42) + '…' : t);
function nextMonday(from) { const d = parseYmd(from); const k = ((8 - d.getDay()) % 7) || 7; return addDays(from, k); }

/* ---------- стан ---------- */
const S = {
  tasks: [], pending: {}, mode: 'loading', sync: 'ok', lastSync: null,
  view: 'today',
  f: { q: '', project: '', prio: '', status: 'active', sort: 'due' },
  calMonth: todayStr().slice(0, 7), selDay: todayStr(),
  openId: null, draft: null,
  selectMode: false, sel: new Set(), visible: [], bulkNewProj: false, bulkPickDate: false,
  undo: null, modal: null, imp: null, uploads: {}, loginErr: '',
  pushInfo: null, pushBusy: false, backups: null
};
try { S.f.group = localStorage.getItem('kz.group') || 'none'; } catch (e) { S.f.group = 'none'; }
try { const v = localStorage.getItem('kz.view'); if (v) S.view = v; } catch (e) {}

/* ---------- сховище і синхронізація ---------- */
const LKEY = 'kz.tasks.v2', PKEY = 'kz.pending.v2', TKEY = 'kz.token';
let TOKEN = null; try { TOKEN = localStorage.getItem(TKEY); } catch (e) {}
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function persistLocal() { lsSet(LKEY, S.tasks); lsSet(PKEY, S.pending); }
function loadLocal() {
  const tasks = lsGet(LKEY, []), pending = lsGet(PKEY, {});
  S.tasks = Array.isArray(tasks) ? tasks.filter(t => t && typeof t === 'object' && t.id).map(normalize) : [];
  S.pending = pending && typeof pending === 'object' && !Array.isArray(pending) ? pending : {};
  for (const [id, op] of Object.entries(S.pending)) {
    if (!op || !['put', 'del'].includes(op.op) || (op.op === 'put' && !op.task)) delete S.pending[id];
  }
}

async function api(method, path, body, raw) {
  const r = await fetch(path, {
    method, cache: 'no-store',
    headers: Object.assign({ Authorization: 'Bearer ' + TOKEN }, raw ? { 'Content-Type': 'application/octet-stream' } : body ? { 'Content-Type': 'application/json' } : {}),
    body: raw || (body ? JSON.stringify(body) : undefined)
  });
  if (r.status === 401) { const e = new Error('Невірний пароль'); e.code = 'auth'; throw e; }
  if (!r.ok) {
    let j = null; try { j = await r.json(); } catch (e) {}
    const e = new Error((j && j.message) || ('Помилка сервера ' + r.status)); e.code = (j && j.error) || 'server'; throw e;
  }
  return r;
}
const apiJson = (m, p, b) => api(m, p, b).then((r) => r.json());

let flushing = false, flushTimer = null;
function scheduleFlush(ms) { clearTimeout(flushTimer); flushTimer = setTimeout(flush, ms == null ? 350 : ms); }
async function flush() {
  if (flushing || !TOKEN) return false;
  const ids = Object.keys(S.pending);
  if (!ids.length) { S.sync = 'ok'; renderSync(); return true; }
  flushing = true;
  const snap = {}; ids.forEach((id) => { snap[id] = S.pending[id]; });
  const put = [], del = [];
  ids.forEach((id) => { if (snap[id].op === 'put') put.push(snap[id].task); else del.push(id); });
  let ok = false;
  try {
    const chunks = []; let cur = { put: [], del: [] }, size = 0;
    for (const t of put) { const sz = JSON.stringify(t).length; if (size + sz > 900000 && cur.put.length) { chunks.push(cur); cur = { put: [], del: [] }; size = 0; } cur.put.push(t); size += sz; }
    cur.del = del; chunks.push(cur);
    for (const c of chunks) await apiJson('POST', '/api/tasks', c);
    ids.forEach((id) => { if (S.pending[id] === snap[id]) delete S.pending[id]; });
    lsSet(PKEY, S.pending);
    S.sync = Object.keys(S.pending).length ? 'pending' : 'ok'; S.lastSync = new Date(); ok = true;
  } catch (e) {
    if (e.code === 'auth') { flushing = false; return logout('Пароль змінився. Увійдіть знову.'); }
    S.sync = navigator.onLine === false ? 'offline' : 'error'; S.syncErr = e.message;
  } finally {
    flushing = false; renderSync();
    if (ok && Object.keys(S.pending).length) scheduleFlush(200);
  }
  return ok;
}
let pulling = false, pullEdits = null;
async function pull() {
  if (!TOKEN || flushing || pulling) return false;
  pulling = true;
  const token = TOKEN;
  const pendingAtStart = { ...S.pending };
  pullEdits = pendingAtStart;
  try { return await pullTasks(token, pendingAtStart); } finally { pulling = false; pullEdits = null; }
}
async function pullTasks(token, pendingAtStart) {
  try {
    const j = await apiJson('GET', '/api/tasks');
    if (TOKEN !== token) return false;
    const map = new Map((j.tasks || []).map((t) => [t.id, normalize(t)]));
    // Keep edits acknowledged while this older GET was in flight.
    for (const [id, op] of Object.entries(pendingAtStart)) {
      if (op.op === 'put') map.set(id, op.task); else map.delete(id);
    }
    for (const id of Object.keys(S.pending)) { const op = S.pending[id]; if (op.op === 'put') map.set(id, op.task); else map.delete(id); }
    const next = [...map.values()];
    const changed = JSON.stringify(next) !== JSON.stringify(S.tasks);
    S.tasks = next; S.lastSync = new Date(); S.mode = 'app';
    S.sync = Object.keys(S.pending).length ? 'pending' : 'ok';
    persistLocal();
    if (changed) afterRemoteChange(); else renderSync();
    if (Object.keys(S.pending).length) scheduleFlush(0);
    return true;
  } catch (e) {
    if (e.code === 'auth') return logout('Невірний пароль.');
    S.sync = navigator.onLine === false ? 'offline' : 'error'; S.syncErr = e.message;
    renderSync();
    return false;
  }
}
function afterRemoteChange() {
  renderMain();
  const ot = S.openId && getTask(S.openId);
  if (S.openId && (!ot || ot.deletedAt)) closeDrawer();
  else if (S.openId && !drawerBusy()) renderDrawer();
}
function drawerBusy() { const ae = document.activeElement; const dr = document.querySelector('.drawer'); return !!(dr && dr.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)); }

function upsertLocal(t) { const i = S.tasks.findIndex((x) => x.id === t.id); if (i >= 0) S.tasks[i] = t; else S.tasks.push(t); }
/* Єдина точка змін: зберігає, ставить у чергу синхронізації, за потреби дає «Скасувати». */
function apply(puts, dels, label, opts) {
  puts = puts || []; dels = dels || []; opts = opts || {};
  // «Скасувати» повернув би старий стан і стер би пізніші правки тих самих задач
  if (!label && S.undo) { const ids = new Set(puts.map((t) => t.id).concat(dels)); if (S.undo.before.some((b) => ids.has(b.id))) S.undo = null; }
  const before = [];
  const stamp = nowIso();
  for (const t of puts) {
    const prev = getTask(t.id);
    before.push(prev ? clone(prev) : { id: t.id, __new: true });
    if (!opts.keepStamp) t.updatedAt = stamp;
    t.remindAt = computeRemindAt(t);
    if (!opts.noHistory) recordHistory(prev, t, stamp);
    upsertLocal(t);
    S.pending[t.id] = { op: 'put', task: t };
    if (pullEdits) pullEdits[t.id] = S.pending[t.id];
  }
  for (const id of dels) {
    const prev = getTask(id); if (!prev) continue;
    before.push(clone(prev));
    S.tasks = S.tasks.filter((x) => x.id !== id);
    S.pending[id] = { op: 'del' };
    if (pullEdits) pullEdits[id] = S.pending[id];
    S.sel.delete(id);
  }
  S.sync = 'pending';
  persistLocal(); renderMain(); scheduleFlush(opts.flushDelay);
  if (label) { S.undo = { before, label }; toast(label, { undo: true }); }
}
function undo() {
  const u = S.undo; if (!u) return;
  S.undo = null;
  const puts = [], dels = [];
  u.before.forEach((b) => (b.__new ? dels.push(b.id) : puts.push(clone(b))));
  apply(puts, dels, null, { noHistory: true });
  if (S.openId) { const ot = getTask(S.openId); if (ot && !ot.deletedAt) renderDrawer(); else closeDrawer(); }
  toast('Скасовано: ' + u.label.toLowerCase());
}
const getTask = (id) => S.tasks.find((t) => t.id === id);
const live = () => S.tasks.filter((t) => !t.deletedAt);
function trashTasks(ids, label) {
  const stamp = nowIso();
  const puts = ids.map(getTask).filter((t) => t && !t.deletedAt).map((t) => Object.assign(clone(t), { deletedAt: stamp }));
  ids.forEach((id) => S.sel.delete(id));
  if (puts.length) apply(puts, [], label);
}
function recordHistory(prev, t, stamp) {
  const h = clone((prev ? prev.history : t.history) || []);
  if (!prev) { if (!h.length) h.push({ at: stamp, f: 'created' }); }
  else {
    if (!!prev.deletedAt !== !!t.deletedAt) h.push({ at: stamp, f: t.deletedAt ? 'deleted' : 'restored' });
    for (const f of TRACK) {
      const a = prev[f] == null ? null : prev[f], b = t[f] == null ? null : t[f];
      if (a === b) continue;
      const last = h[h.length - 1];
      if (last && last.f === f && Date.parse(stamp) - Date.parse(last.at) < 120000) {
        last.to = b; last.at = stamp;
        if (last.from === b) h.pop();
      } else h.push({ at: stamp, f, from: a, to: b });
    }
  }
  t.history = h.slice(-80);
}
const postponed = (t) => (t.history || []).filter((h) => h.f === 'due' && h.from && h.to && h.to > h.from).length;
function computeRemindAt(t) {
  const k = t.remind || 'none';
  if (k === 'none' || isDone(t) || t.deletedAt) return null;
  if (k === 'custom') { if (!t.remindCustom) return null; const d = new Date(t.remindCustom); return isNaN(d) ? null : d.toISOString(); }
  if (!t.due) return null;
  const [y, m, d] = t.due.split('-').map(Number);
  if (k === '1d') return new Date(y, m - 1, d - 1, 9, 0).toISOString();
  const [hh, mm] = (t.time || '09:00').split(':').map(Number);
  const off = { at: 0, '15m': 15, '1h': 60, '3h': 180 }[k] || 0;
  return new Date(new Date(y, m - 1, d, hh, mm).getTime() - off * 60000).toISOString();
}
function repeatLabel(t) {
  const r = t.repeat || 'none';
  if (r !== 'custom') return REPEAT[r] || '';
  const n = Math.max(1, +t.repeatEvery || 1), u = t.repeatUnit || 'day';
  const days = u === 'week' && (t.repeatDays || []).length ? ': ' + t.repeatDays.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WDN[d]).join(', ') : '';
  if (n === 1) return ({ day: 'Щодня', week: 'Щотижня', month: 'Щомісяця', year: 'Щороку' }[u]) + days;
  return 'Кожні ' + n + ' ' + plural(n, UNIT[u]) + days;
}
function normalize(t) {
  const n = Object.assign({ title: '', notes: '', due: null, time: null, priority: 3, status: 'todo', project: '', tags: [], subtasks: [], attachments: [], repeat: 'none', remind: 'none', history: [], createdAt: nowIso(), doneAt: null, deletedAt: null }, t);
  n.priority = [1, 2, 3, 4].includes(+n.priority) ? +n.priority : 3;
  if (!STATUS[n.status]) n.status = 'todo';
  n.title = String(n.title || ''); n.notes = String(n.notes || ''); n.project = String(n.project || '');
  if (!isYmd(n.due)) n.due = null;
  if (!isHm(n.time)) n.time = null;
  if (!REPEAT[n.repeat]) n.repeat = 'none';
  if (!REMIND[n.remind]) n.remind = 'none';
  if (!isIso(n.createdAt)) n.createdAt = nowIso();
  if (!isIso(n.doneAt)) n.doneAt = null;
  if (n.deletedAt != null && !isIso(n.deletedAt)) n.deletedAt = nowIso();
  n.history = (Array.isArray(n.history) ? n.history : []).filter((h) => h && typeof h === 'object');
  n.subtasks = (Array.isArray(n.subtasks) ? n.subtasks : []).filter(s => s && typeof s === 'object').map((s) => ({ id: s.id || rid('s'), text: String(s.text || ''), done: !!s.done }));
  n.tags = (Array.isArray(n.tags) ? n.tags : []).filter((g) => typeof g === 'string' && g.trim());
  n.attachments = (Array.isArray(n.attachments) ? n.attachments : []).filter((a) => a && typeof a === 'object');
  return n;
}
function logout(msg) {
  TOKEN = null; try { localStorage.removeItem(TKEY); } catch (e) {}
  S.mode = 'login'; S.loginErr = msg || ''; closeDrawer(); closeModal(); exitSelect(true); renderMain();
}

/* ---------- похідні дані ---------- */
const isDone = (t) => t.status === 'done';
const active = () => live().filter((t) => !isDone(t));
function sortTasks(arr, mode) {
  return arr.slice().sort((a, b) => {
    if (mode === 'prio' && a.priority !== b.priority) return a.priority - b.priority;
    if (mode === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '');
    if (mode === 'updated') return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    if (mode === 'title') return a.title.localeCompare(b.title, 'uk');
    const ad = a.due || '9999', bd = b.due || '9999';
    if (ad !== bd) return ad.localeCompare(bd);
    const at = a.time || '99', bt = b.time || '99';
    if (at !== bt) return at.localeCompare(bt);
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
}
function projects() {
  const m = new Map();
  live().forEach((t) => { if (!t.project) return; const r = m.get(t.project) || { name: t.project, total: 0, done: 0 }; r.total++; if (isDone(t)) r.done++; m.set(t.project, r); });
  return [...m.values()].sort((a, b) => (b.total - b.done) - (a.total - a.done) || a.name.localeCompare(b.name, 'uk'));
}
function dueLabel(t) {
  if (!t.due) return null;
  const d = diffDays(t.due, todayStr());
  let txt, cls = '';
  if (d === 0) { txt = 'Сьогодні'; cls = 'today'; }
  else if (d === 1) txt = 'Завтра';
  else if (d === -1) txt = 'Вчора';
  else if (d > 1 && d < 7) txt = fmt(t.due, { weekday: 'short' }) + ', ' + fmt(t.due, { day: 'numeric', month: 'short' });
  else txt = fmt(t.due, { day: 'numeric', month: 'short', year: t.due.slice(0, 4) === todayStr().slice(0, 4) ? undefined : 'numeric' });
  if (d < 0 && !isDone(t)) { cls = 'over'; txt += ' · прострочено ' + (-d) + ' ' + plural(-d, DAYS); }
  return { txt, cls };
}
function nextDue(s, rep, t) {
  const d = parseYmd(s);
  if (rep === 'custom') {
    t = t || {};
    const n = Math.max(1, +t.repeatEvery || 1), u = t.repeatUnit || 'day';
    const addMonths = (k) => { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + k); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); };
    if (u === 'day') d.setDate(d.getDate() + n);
    else if (u === 'week') {
      const mon = (x) => (x + 6) % 7;
      const sel = (t.repeatDays || []).map(mon).sort((a, b) => a - b);
      if (!sel.length) d.setDate(d.getDate() + 7 * n);
      else { const cur = mon(d.getDay()); const nx = sel.find((x) => x > cur); d.setDate(d.getDate() + (nx != null ? nx - cur : 7 - cur + 7 * (n - 1) + sel[0])); }
    } else if (u === 'month') addMonths(n);
    else addMonths(12 * n);
    return ymd(d);
  }
  if (rep === 'daily') d.setDate(d.getDate() + 1);
  else if (rep === 'weekdays') { do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); }
  else if (rep === 'weekly') d.setDate(d.getDate() + 7);
  else if (rep === 'monthly') { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); }
  else if (rep === 'yearly') { const month = d.getMonth(); d.setFullYear(d.getFullYear() + 1); if (d.getMonth() !== month) d.setDate(0); }
  return ymd(d);
}
function fileKind(name) {
  const e = (String(name).split('.').pop() || '').toLowerCase();
  if (['doc', 'docx', 'odt', 'rtf'].includes(e)) return ['doc', e];
  if (['xls', 'xlsx', 'csv', 'ods'].includes(e)) return ['xls', e];
  if (e === 'pdf') return ['pdf', e];
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'svg'].includes(e)) return ['img', e];
  if (['txt', 'md'].includes(e)) return ['txt', e];
  return ['other', e.slice(0, 4) || 'файл'];
}

/* ---------- рядок задачі ---------- */
function taskRow(t) {
  S.visible.push(t.id);
  const dl = dueLabel(t);
  const subs = t.subtasks || [];
  const sd = subs.filter((x) => x.done).length;
  const meta = [];
  if (t.status === 'doing') meta.push('<span class="status-pill">В роботі</span>');
  if (dl) meta.push('<span class="due ' + dl.cls + '">' + I.cal + esc(dl.txt) + (t.time ? ' · ' + esc(t.time) : '') + '</span>');
  else if (t.time) meta.push('<span>' + I.clock + esc(t.time) + '</span>');
  if (subs.length) meta.push('<span class="sub-prog">' + I.subs + '<span class="num">' + sd + '/' + subs.length + '</span><span class="bar"><i style="width:' + Math.round(sd / subs.length * 100) + '%"></i></span></span>');
  if (t.project) meta.push('<span>' + I.folder + esc(t.project) + '</span>');
  if (t.repeat && t.repeat !== 'none') meta.push('<span>' + I.repeat + esc(repeatLabel(t)) + '</span>');
  if (t.remindAt && !isDone(t) && Date.parse(t.remindAt) > Date.now()) meta.push('<span class="ic-only" title="Нагадування ' + esc(new Date(t.remindAt).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '">' + I.bell + '</span>');
  const pp = postponed(t); if (pp >= 2 && !isDone(t)) meta.push('<span class="postp" title="Термін переносили ' + pp + ' рази">' + I.postpone + 'перенесено ' + pp + '×</span>');
  (t.tags || []).forEach((g) => meta.push('<span>' + I.tag + esc(g) + '</span>'));
  if (t.attachments && t.attachments.length) meta.push('<span class="ic-only" title="Файли">' + I.clip + t.attachments.length + '</span>');
  if (t.notes) meta.push('<span class="ic-only" title="Є нотатки">' + I.note + '</span>');
  const sel = S.sel.has(t.id);
  return '<div class="task p' + t.priority + (isDone(t) ? ' is-done' : '') + (sel ? ' selected' : '') + '" data-id="' + esc(t.id) + '">'
    + (S.selectMode ? '<button class="selbox" data-act="sel-toggle" aria-pressed="' + sel + '" aria-label="Вибрати">' + I.check + '</button>' : '')
    + '<button class="check" data-act="toggle" aria-label="' + (isDone(t) ? 'Повернути в роботу' : 'Позначити виконаною') + '">' + I.check + '</button>'
    + '<div class="t-main" data-act="' + (S.selectMode ? 'sel-toggle' : 'open') + '" role="button" tabindex="0"><div class="t-title">' + esc(t.title || 'Без назви') + '</div>'
    + (meta.length ? '<div class="t-meta">' + meta.join('') + '</div>' : '')
    + '</div><span class="prio-tag">P' + t.priority + '</span></div>';
}
function section(title, list, opts) {
  opts = opts || {};
  if (!list.length && !opts.showEmpty) return '';
  return '<section class="section"><div class="sec-head"><h2' + (opts.alert ? ' class="alert"' : '') + '>' + esc(title) + '</h2><span class="cnt">' + list.length + '</span><span class="spacer"></span>' + (opts.extra || '') + '</div>'
    + '<div class="list">' + (list.length ? list.map(taskRow).join('') : '<div class="empty">' + (opts.empty || 'Порожньо') + '</div>') + '</div></section>';
}
function quickBar(id, placeholder) {
  return '<form class="quick" data-form="quick" data-qid="' + id + '">' + I.plus + '<input id="' + id + '" autocomplete="off" enterkeyhint="done" placeholder="' + esc(placeholder) + '" aria-label="Нова задача"><button class="btn primary" type="submit">Додати</button></form>'
    + '<div class="quick-hint" id="' + id + '-hint">' + hintDefault() + '</div>';
}
const hintDefault = () => 'Підказки: <code>завтра</code> <code>пт</code> <code>15.10</code> <code>14:30</code> <code>!1</code> пріоритет <code>#Робота</code> проєкт';

/* ---------- бічна панель і вкладки ---------- */
const VIEWS = [
  { id: 'today', name: 'Сьогодні', icon: I.today },
  { id: 'list', name: 'Усі задачі', icon: I.list },
  { id: 'calendar', name: 'Календар', icon: I.cal },
  { id: 'board', name: 'Дошка', icon: I.board },
  { id: 'stats', name: 'Огляд', icon: I.stats }
];
function renderRail() {
  const today = todayStr();
  const act = active();
  const over = act.filter((t) => t.due && t.due < today).length;
  const tod = act.filter((t) => t.due === today).length;
  const counts = { today: tod + over, list: act.length };
  const projs = projects();
  document.getElementById('rail').innerHTML =
    '<div class="brand"><div class="brand-mark">' + I.mark + '</div><div class="brand-name">Контроль<small>задачі та терміни</small></div></div>'
    + '<nav class="nav">' + VIEWS.map((v) => '<button class="nav-btn" data-act="view" data-view="' + v.id + '"' + (S.view === v.id ? ' aria-current="page"' : '') + '>' + v.icon + v.name
      + (counts[v.id] ? '<span class="cnt' + (v.id === 'today' && over ? ' alert' : '') + '">' + counts[v.id] + '</span>' : '') + '</button>').join('') + '</nav>'
    + '<nav class="nav"><button class="nav-btn" data-act="import-open">' + I.importI + 'Імпорт із файлу</button><button class="nav-btn" data-act="settings-open">' + I.gear + 'Налаштування</button>'
    + '<button class="nav-btn" data-act="view" data-view="trash"' + (S.view === 'trash' ? ' aria-current="page"' : '') + '>' + I.trash + 'Кошик' + (trashCount() ? '<span class="cnt">' + trashCount() + '</span>' : '') + '</button></nav>'
    + (projs.length ? '<div><h4>Проєкти</h4>' + projs.map((p) => '<button class="proj-btn" data-act="proj" data-proj="' + esc(p.name) + '"><span class="dot" style="background:' + projColor(p.name) + '"></span><span class="nm">' + esc(p.name) + '</span><span class="cnt">' + (p.total - p.done) + '</span></button>').join('') + '</div>' : '')
    + '<div class="rail-foot"><span id="sync">' + syncBadge() + '</span><br><kbd>N</kbd> нова · <kbd>Ctrl</kbd>+<kbd>Z</kbd> скасувати</div>';
  document.getElementById('tabs').innerHTML = VIEWS.map((v) => '<button data-act="view" data-view="' + v.id + '"' + (S.view === v.id ? ' aria-current="page"' : '') + '>' + v.icon + v.name + '</button>').join('');
}
function syncBadge() {
  const n = Object.keys(S.pending || {}).length;
  if (S.sync === 'offline') return '<span class="sync offline"><i></i>Офлайн' + (n ? ' · змін у черзі: ' + n : ' · локальні дані') + '</span>';
  if (S.sync === 'error') return '<span class="sync offline" title="' + esc(S.syncErr || '') + '"><i></i>' + (n ? 'Не синхронізовано (' + n + ')' : 'Не вдалося оновити дані') + '</span>';
  if (n) return '<span class="sync pending"><i></i>Синхронізація… (' + n + ')</span>';
  return '<span class="sync"><i></i>' + (S.lastSync ? 'Синхронізовано о ' + pad(S.lastSync.getHours()) + ':' + pad(S.lastSync.getMinutes()) : 'Очікуємо синхронізації') + '</span>';
}
function renderSync() { const el = document.getElementById('sync'); if (el) el.innerHTML = syncBadge(); document.querySelectorAll('[data-sync-status]').forEach((el) => { el.innerHTML = syncBadge(); }); }

function headHTML(eyebrow, title, opts) {
  opts = opts || {};
  return '<div class="head"><div><div class="eyebrow">' + eyebrow + '</div><h1>' + title + '</h1></div><div class="head-right">' + (opts.right || '')
    + (opts.noSelect ? '' : '<button class="btn' + (S.selectMode ? ' on' : '') + '" data-act="select-mode" title="Вибрати кілька задач">' + I.select + (S.selectMode ? 'Вибір увімкнено' : 'Вибрати') + '</button>')
    + (opts.noNew ? '' : '<button class="btn primary" data-act="new">' + I.plus + '<span class="lbl-long">Нова задача</span></button>') + '</div><button class="mobile-sync" data-act="sync-now" title="Синхронізувати зараз" data-sync-status>' + syncBadge() + '</button></div>';
}
function metric(k, v, cls) { return '<div class="metric ' + cls + '"><div class="k">' + k + '</div><div class="v num">' + v + '</div></div>'; }
function emptyStart() {
  return '<div class="list"><div class="empty"><b>Тут з’являться ваші задачі</b>Впишіть першу задачу в рядок вище або завантажте готовий список із Word, Excel чи тексту.<div style="margin-top:12px"><button class="btn" data-act="import-open">' + I.importI + 'Імпорт із файлу</button></div></div></div>';
}

/* ---------- розділи ---------- */
function viewToday() {
  const today = todayStr();
  const act = active();
  const overdue = sortTasks(act.filter((t) => t.due && t.due < today));
  const tod = sortTasks(act.filter((t) => t.due === today));
  const week = sortTasks(act.filter((t) => t.due && t.due > today && t.due <= addDays(today, 7)));
  const nodate = sortTasks(act.filter((t) => !t.due), 'prio');
  const doneToday = live().filter((t) => isDone(t) && t.doneAt && ymd(new Date(t.doneAt)) === today);
  const planned = tod.length + doneToday.length;
  const pct = planned ? Math.round(doneToday.length / planned * 100) : 0;
  const dateTitle = cap(fmt(today, { weekday: 'long' })) + ', ' + fmt(today, { day: 'numeric', month: 'long' });
  let h = headHTML('Мій день', esc(dateTitle));
  h += '<div class="summary">' + metric('Прострочено', overdue.length, overdue.length ? 'alert' : '') + metric('На сьогодні', tod.length, '')
    + metric('Виконано сьогодні', doneToday.length, 'good') + metric('Прогрес дня', pct + '%', pct >= 100 && planned ? 'good' : '') + '</div>';
  h += quickBar('q-today', 'Що треба зробити? Напр.: Подзвонити в банк завтра 10:00 !2 #Фінанси');
  if (!live().length) return h + emptyStart();
  const moveOver = overdue.length ? '<button class="btn ghost" data-act="overdue-today">Перенести всі на сьогодні</button>' : '';
  h += section('Прострочені', overdue, { alert: true, extra: moveOver });
  h += section('Сьогодні', tod, { showEmpty: true, empty: '<b>На сьогодні нічого не заплановано</b>Додайте задачу вище або перенесіть щось із наступних днів.' });
  h += section('Наступні 7 днів', week);
  h += section('Без терміну', nodate);
  if (doneToday.length) h += section('Виконано сьогодні', doneToday);
  return h;
}
function filteredList() {
  const f = S.f;
  let arr = live().slice();
  if (f.status === 'active') arr = arr.filter((t) => !isDone(t));
  else if (f.status === 'overdue') arr = arr.filter((t) => !isDone(t) && t.due && t.due < todayStr());
  else if (f.status === 'nodate') arr = arr.filter((t) => !isDone(t) && !t.due);
  else if (f.status) arr = arr.filter((t) => t.status === f.status);
  if (f.project) arr = arr.filter((t) => (f.project === '—' ? !t.project : t.project === f.project));
  if (f.prio) arr = arr.filter((t) => String(t.priority) === f.prio);
  if (f.q) {
    const q = f.q.toLowerCase();
    arr = arr.filter((t) => (t.title + ' ' + t.notes + ' ' + t.project + ' ' + (t.tags || []).join(' ') + ' ' + (t.subtasks || []).map((s) => s.text).join(' ') + ' ' + (t.attachments || []).map((a) => a.name).join(' ')).toLowerCase().includes(q));
  }
  return sortTasks(arr, f.sort);
}
function viewList() {
  const f = S.f, projs = projects();
  const arr = filteredList();
  let h = headHTML('Повний список', f.project && f.project !== '—' ? esc(f.project) : 'Усі задачі');
  h += quickBar('q-list', 'Нова задача… (#Проєкт, !1–!4, дата, час)');
  h += '<div class="filters">'
    + '<input class="field search" id="f-q" type="search" placeholder="Пошук у назвах, нотатках, підзадачах, файлах" value="' + esc(f.q) + '">'
    + sel('f-status', f.status, [['active', 'Активні'], ['', 'Усі'], ['overdue', 'Прострочені'], ['nodate', 'Без терміну'], ['todo', 'Заплановано'], ['doing', 'В роботі'], ['done', 'Виконано']])
    + sel('f-project', f.project, [['', 'Усі проєкти'], ['—', 'Без проєкту']].concat(projs.map((p) => [p.name, p.name])))
    + sel('f-prio', f.prio, [['', 'Будь-який пріоритет'], ['1', 'P1 · Критичний'], ['2', 'P2 · Високий'], ['3', 'P3 · Звичайний'], ['4', 'P4 · Низький']])
    + sel('f-sort', f.sort, [['due', 'За терміном'], ['prio', 'За пріоритетом'], ['recent', 'Нещодавно додані'], ['updated', 'Нещодавно змінені'], ['title', 'За назвою']])
    + sel('f-group', f.group || 'none', [['none', 'Без групування'], ['date', 'Групи: за датою'], ['project', 'Групи: за проєктом'], ['priority', 'Групи: за пріоритетом'], ['status', 'Групи: за статусом']])
    + ((f.q || f.project || f.prio || f.status !== 'active') ? '<button class="btn ghost" data-act="f-reset">Скинути</button>' : '')
    + '</div>';
  if (!live().length) return h + emptyStart();
  h += '<div class="sec-head"><span class="cnt">' + arr.length + ' ' + plural(arr.length, TASKS_N) + '</span></div>';
  if (!arr.length) h += '<div class="list"><div class="empty"><b>Нічого не знайдено</b>Змініть фільтри або пошуковий запит.</div></div>';
  else if (f.group && f.group !== 'none') groupTasks(arr, f.group).forEach((g) => { h += section(g[0], g[1], { alert: g[2] }); });
  else h += '<div class="list">' + arr.map(taskRow).join('') + '</div>';
  return h;
}
function groupTasks(arr, by) {
  const today = todayStr(), tom = addDays(today, 1);
  const wEnd = addDays(today, 6 - ((parseYmd(today).getDay() + 6) % 7)), nwEnd = addDays(wEnd, 7);
  const map = new Map();
  const put = (k, label, t, alert) => { if (!map.has(k)) map.set(k, [label, [], alert]); map.get(k)[1].push(t); };
  arr.forEach((t) => {
    if (by === 'date') {
      if (isDone(t)) put('9', 'Виконано', t);
      else if (!t.due) put('8', 'Без терміну', t);
      else if (t.due < today) put('0', 'Прострочені', t, true);
      else if (t.due === today) put('1', 'Сьогодні', t);
      else if (t.due === tom) put('2', 'Завтра', t);
      else if (t.due <= wEnd) put('3', 'Цього тижня', t);
      else if (t.due <= nwEnd) put('4', 'Наступного тижня', t);
      else put('5', 'Пізніше', t);
    } else if (by === 'project') put(t.project ? 'a' + t.project : '~', t.project || 'Без проєкту', t);
    else if (by === 'priority') put(String(t.priority), 'P' + t.priority + ' · ' + PRIO[t.priority], t);
    else put({ doing: '0', todo: '1', done: '2' }[t.status], STATUS[t.status], t);
  });
  return [...map.entries()].sort((a, b) => (by === 'project' ? a[0].localeCompare(b[0], 'uk') : a[0].localeCompare(b[0]))).map((e) => e[1]);
}
const trashCount = () => S.tasks.filter((t) => t.deletedAt).length;
function viewTrash() {
  const list = S.tasks.filter((t) => t.deletedAt).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  let h = headHTML('Видалене', 'Кошик', { noSelect: true, noNew: true, right: list.length ? '<button class="btn danger" data-act="trash-empty">' + I.trash + 'Очистити кошик</button>' : '' });
  h += '<div class="help" style="margin-bottom:14px">Видалені задачі зберігаються тут ' + TRASH_DAYS + ' днів разом із підзадачами, файлами й історією, потім зникають назавжди.</div>';
  if (!list.length) return h + '<div class="list"><div class="empty"><b>Кошик порожній</b>Видалені задачі з’являться тут.</div></div>';
  h += '<div class="list">' + list.map((t) => {
    const left = Math.max(0, TRASH_DAYS - Math.floor((Date.now() - Date.parse(t.deletedAt)) / 86400000));
    return '<div class="task p' + t.priority + ' trash-row" data-id="' + esc(t.id) + '"><div class="t-main"><div class="t-title">' + esc(t.title || 'Без назви') + '</div><div class="t-meta"><span>' + I.trash + 'видалено ' + esc(fmtDT(t.deletedAt)) + '</span><span>ще ' + left + ' ' + plural(left, DAYS) + '</span>' + (t.project ? '<span>' + I.folder + esc(t.project) + '</span>' : '') + '</div></div>'
      + '<div class="trash-acts"><button class="btn" data-act="trash-restore">' + I.restore + 'Відновити</button><button class="icon-btn" data-act="trash-purge" title="Видалити назавжди" aria-label="Видалити назавжди">' + I.close + '</button></div></div>';
  }).join('') + '</div>';
  return h;
}
function purgeTasks(ids, label) {
  const atts = ids.flatMap((id) => ((getTask(id) || {}).attachments || []));
  apply([], ids, label);
  atts.forEach(scheduleBlobCleanup);
}
function purgeOldTrash() {
  const ids = S.tasks.filter((t) => t.deletedAt && Date.now() - Date.parse(t.deletedAt) > TRASH_DAYS * 86400000).map((t) => t.id);
  if (ids.length) apply([], ids);
}
function sel(id, val, opts, cls) { return '<select class="field ' + (cls || '') + '" id="' + id + '">' + opts.map((o) => '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>'; }

function viewCalendar() {
  const [y, m] = S.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const last = new Date(y, m, 0);
  const end = new Date(last); end.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7)));
  const today = todayStr();
  const byDay = {};
  live().forEach((t) => { if (t.due) (byDay[t.due] = byDay[t.due] || []).push(t); });
  const monthName = cap(new Intl.DateTimeFormat('uk-UA', { month: 'long' }).format(first)) + ' ' + y;
  let cells = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((d, i) => '<div class="cal-dow' + (i > 4 ? ' we' : '') + '">' + d + '</div>').join('');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const s = ymd(d);
    const list = sortTasks(byDay[s] || [], 'due');
    const hasOver = s < today && list.some((t) => !isDone(t));
    const cls = ['day']; if (d.getMonth() !== m - 1) cls.push('out'); if (s === today) cls.push('today'); if (s === S.selDay) cls.push('sel');
    cells += '<div class="' + cls.join(' ') + '" data-act="pickday" data-date="' + s + '" role="button" tabindex="0" aria-label="' + esc(fmt(s, { day: 'numeric', month: 'long' })) + ', задач: ' + list.length + '">'
      + '<span class="dn"><b>' + d.getDate() + '</b>' + (hasOver ? '<i class="od" title="Є прострочені"></i>' : '') + '</span>'
      + list.slice(0, 3).map((t) => '<span class="chip p' + t.priority + (isDone(t) ? ' done' : '') + '" draggable="true" data-act="open" data-id="' + esc(t.id) + '" title="' + esc(t.title) + '">' + (t.time ? esc(t.time) + ' ' : '') + esc(t.title) + '</span>').join('')
      + (list.length > 3 ? '<span class="more">ще ' + (list.length - 3) + '</span>' : '')
      + '</div>';
  }
  const dayTasks = sortTasks(byDay[S.selDay] || [], 'due');
  const dAct = dayTasks.filter((t) => !isDone(t)).length;
  let h = headHTML('Планування', 'Календар');
  h += '<div class="cal-wrap"><div class="cal"><div class="cal-top"><span class="m">' + esc(monthName) + '</span>'
    + '<button class="btn ghost" data-act="cal-today">Сьогодні</button>'
    + '<button class="icon-btn" data-act="cal-prev" aria-label="Попередній місяць">' + I.left + '</button>'
    + '<button class="icon-btn" data-act="cal-next" aria-label="Наступний місяць">' + I.right + '</button></div>'
    + '<div class="cal-grid">' + cells + '</div></div>'
    + '<aside class="day-panel"><h3>' + esc(cap(fmt(S.selDay, { weekday: 'long' })) + ', ' + fmt(S.selDay, { day: 'numeric', month: 'long' })) + '</h3>'
    + '<div class="sub">' + (dayTasks.length ? dAct + ' активних із ' + dayTasks.length + ' · перетягуйте задачі між днями' : 'Задач на цей день немає') + '</div>'
    + quickBar('q-day', 'Задача на цей день…')
    + (dayTasks.length ? '<div class="list">' + dayTasks.map(taskRow).join('') + '</div>' : '')
    + '</aside></div>';
  return h;
}
function viewBoard() {
  const cols = [['todo', 'Заплановано', 'var(--p4)'], ['doing', 'В роботі', 'var(--p3)'], ['done', 'Виконано', 'var(--ok)']];
  const since = Date.now() - 14 * 86400000;
  const fp = S.f.project;
  const filterBtn = fp ? '<button class="btn" data-act="board-all" title="Показати задачі всіх проєктів">' + I.folder + esc(fp === '—' ? 'Без проєкту' : fp) + I.close + '</button>' : '';
  let h = headHTML('Статуси', 'Дошка', { noSelect: true, right: filterBtn });
  h += '<div class="board">' + cols.map((c) => {
    let list = live().filter((t) => t.status === c[0]);
    if (S.f.project) list = list.filter((t) => (S.f.project === '—' ? !t.project : t.project === S.f.project));
    if (c[0] === 'done') list = list.filter((t) => !t.doneAt || new Date(t.doneAt).getTime() > since).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
    else list = sortTasks(list);
    return '<div class="col" data-col="' + c[0] + '"><div class="col-head"><span class="sw" style="background:' + c[2] + '"></span><h3>' + c[1] + '</h3><span class="cnt">' + list.length + '</span></div><div class="cards">'
      + (list.length ? list.map((t) => card(t, c[0])).join('') : '<div class="empty" style="padding:16px 6px">' + (c[0] === 'done' ? 'Виконане за 14 днів з’явиться тут' : 'Перетягніть сюди картку') + '</div>')
      + '</div></div>';
  }).join('') + '</div>';
  return h;
}
function card(t, st) {
  const dl = dueLabel(t); const subs = t.subtasks || []; const sd = subs.filter((x) => x.done).length;
  const nextMap = { todo: ['doing', 'В роботу →'], doing: ['done', 'Виконано ✓'], done: ['todo', '↺ Повернути'] };
  return '<div class="card p' + t.priority + '" draggable="true" data-id="' + esc(t.id) + '"><div class="t-main" data-act="open"><div class="t-title">' + esc(t.title || 'Без назви') + '</div><div class="t-meta">'
    + (dl ? '<span class="due ' + dl.cls + '">' + I.cal + esc(dl.txt) + '</span>' : '')
    + (subs.length ? '<span class="sub-prog">' + I.subs + '<span class="num">' + sd + '/' + subs.length + '</span></span>' : '')
    + (t.project ? '<span>' + I.folder + esc(t.project) + '</span>' : '')
    + (t.attachments && t.attachments.length ? '<span class="ic-only">' + I.clip + t.attachments.length + '</span>' : '')
    + '</div></div><div class="card-foot"><span class="prio-tag" style="color:var(--pc)">P' + t.priority + '</span><span class="spacer"></span><button class="move" data-act="move" data-to="' + nextMap[st][0] + '">' + nextMap[st][1] + '</button></div></div>';
}
function viewStats() {
  const today = todayStr();
  const all = live(), act = active();
  const done = all.filter(isDone);
  const over = act.filter((t) => t.due && t.due < today);
  const done7 = done.filter((t) => t.doneAt && diffDays(today, ymd(new Date(t.doneAt))) < 7);
  const weekEnd = addDays(today, 6 - ((new Date().getDay() + 6) % 7));
  const thisWeek = act.filter((t) => t.due && t.due >= today && t.due <= weekEnd);
  const rate = all.length ? Math.round(done.length / all.length * 100) : 0;
  let h = headHTML('Контроль', 'Огляд');
  h += '<div class="summary">' + metric('Активних задач', act.length, '') + metric('Прострочено', over.length, over.length ? 'alert' : '') + metric('Виконано за 7 днів', done7.length, 'good') + metric('Загалом виконано', rate + '%', '') + '</div>';
  const days = []; for (let i = 13; i >= 0; i--) { const d = addDays(today, -i); days.push({ d, n: done.filter((t) => t.doneAt && ymd(new Date(t.doneAt)) === d).length }); }
  const max = Math.max(4, ...days.map((x) => x.n));
  const W = 560, H = 170, L = 26, B = 24, T = 10, bw = (W - L - 6) / 14;
  let g = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Виконані задачі за 14 днів">';
  [0, Math.round(max / 2), max].forEach((v) => { const yy = H - B - (v / max) * (H - B - T); g += '<line x1="' + L + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--line-2)"/><text x="' + (L - 6) + '" y="' + (yy + 3) + '" text-anchor="end">' + v + '</text>'; });
  days.forEach((x, i) => {
    const bh = (x.n / max) * (H - B - T); const xx = L + i * bw + 4; const isT = x.d === today;
    g += '<rect x="' + xx + '" y="' + (H - B - bh) + '" width="' + (bw - 8) + '" height="' + Math.max(bh, x.n ? 2 : 0) + '" rx="3" fill="' + (isT ? 'var(--accent)' : 'var(--p3)') + '" opacity="' + (isT ? 1 : 0.55) + '"><title>' + esc(fmt(x.d, { day: 'numeric', month: 'long' })) + ': ' + x.n + '</title></rect>';
    if (i % 2 === 1 || isT) g += '<text x="' + (xx + (bw - 8) / 2) + '" y="' + (H - 8) + '" text-anchor="middle"' + (isT ? ' style="fill:var(--accent);font-weight:600"' : '') + '>' + parseYmd(x.d).getDate() + '</text>';
  });
  g += '</svg>';
  h += '<div class="stats-grid"><div class="panel wide"><h3>Виконано по днях · 14 днів</h3><div class="chart">' + g + '</div></div>';
  const pc = [1, 2, 3, 4].map((p) => ({ p, n: act.filter((t) => t.priority === p).length }));
  const pmax = Math.max(1, ...pc.map((x) => x.n));
  h += '<div class="panel"><h3>Активні за пріоритетом</h3>' + pc.map((x) => '<div class="hrow"><span class="nm">P' + x.p + ' · ' + PRIO[x.p] + '</span><span class="hbar"><i style="width:' + (x.n / pmax * 100) + '%;background:var(--p' + x.p + ')"></i></span><span class="v">' + x.n + '</span></div>').join('') + '</div>';
  const projs = projects();
  h += '<div class="panel"><h3>Прогрес проєктів</h3>' + (projs.length ? projs.map((p) => '<div class="hrow"><span class="nm">' + esc(p.name) + '</span><span class="hbar"><i style="width:' + (p.done / p.total * 100) + '%;background:' + projColor(p.name) + '"></i></span><span class="v">' + p.done + '/' + p.total + '</span></div>').join('') : '<div class="empty" style="padding:10px 0">Додайте проєкт до задачі через #Назву</div>') + '</div>';
  const pp = active().map((t) => [t, postponed(t)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  h += '<div class="panel wide"><h3>Найчастіше відкладаються</h3>' + (pp.length ? pp.map(([t, n]) => '<div class="hrow pp-row" data-id="' + esc(t.id) + '" data-act="open" role="button" tabindex="0"><span class="nm">' + esc(t.title) + '</span><span class="hbar"><i style="width:' + (n / pp[0][1] * 100) + '%;background:var(--p2)"></i></span><span class="v">' + n + '×</span></div>').join('') : '<div class="empty" style="padding:10px 0">Активні задачі ще не переносили на пізніше.</div>') + '</div>';
  h += '</div><div style="height:22px"></div>';
  h += section('Прострочені', sortTasks(over), { alert: true });
  h += section('Решта цього тижня', sortTasks(thisWeek));
  return h;
}
function viewLogin() {
  return '<form class="login" data-form="login"><div class="brand"><div class="brand-mark">' + I.mark + '</div><div class="brand-name">Контроль<small>задачі та терміни</small></div></div>'
    + '<p>Введіть пароль застосунку. Він задається у змінній APP_PASSWORD на Vercel.</p>'
    + '<input class="field" id="login-pass" type="password" autocomplete="current-password" placeholder="Пароль" required>'
    + '<button class="btn primary" type="submit">Увійти</button><div class="err" id="login-err">' + esc(S.loginErr || '') + '</div></form>';
}

function renderMain() {
  const main = document.getElementById('main');
  if (S.mode === 'loading') { main.innerHTML = '<div class="loading">Завантажую ваші задачі…</div>'; return; }
  const isLogin = S.mode === 'login';
  document.getElementById('rail').hidden = isLogin; document.getElementById('tabs').hidden = isLogin;
  document.querySelector('.app').style.gridTemplateColumns = isLogin ? '1fr' : '';
  if (isLogin) { main.innerHTML = viewLogin(); setTimeout(() => { const p = document.getElementById('login-pass'); if (p) p.focus(); }, 30); return; }
  renderRail();
  const ae = document.activeElement; const focusId = ae && ae.id && main.contains(ae) ? ae.id : null;
  const selStart = focusId && ae.selectionStart != null ? ae.selectionStart : null;
  const keepVal = focusId && ae.tagName === 'INPUT' ? ae.value : null;
  const fn = { today: viewToday, list: viewList, calendar: viewCalendar, board: viewBoard, stats: viewStats, trash: viewTrash }[S.view] || viewToday;
  S.visible = [];
  main.innerHTML = fn();
  main.classList.toggle('select-mode', S.selectMode);
  main.classList.toggle('has-bulk', S.selectMode);
  document.body.classList.toggle('bulk-on', S.selectMode);
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) { if (keepVal != null && el.tagName === 'INPUT') el.value = keepVal; el.focus(); if (selStart != null) try { el.setSelectionRange(selStart, selStart); } catch (e) {} if (el.closest('[data-form="quick"]')) updateHint(el); }
  }
  renderBulk();
}

/* ---------- вибір кількох задач і групові дії ---------- */
function exitSelect(silent) { document.body.classList.remove('bulk-on'); S.selectMode = false; S.sel.clear(); S.bulkNewProj = false; S.bulkPickDate = false; if (!silent) renderMain(); else renderBulk(); }
function renderBulk() {
  const root = document.getElementById('bulk-root');
  if (!S.selectMode || S.mode !== 'app') { root.innerHTML = ''; return; }
  const n = S.sel.size, dis = n ? '' : ' disabled';
  const projs = projects();
  const allVisibleSelected = S.visible.length && S.visible.every((id) => S.sel.has(id));
  root.innerHTML = '<div class="bulk" role="toolbar" aria-label="Дії з вибраними задачами"><div class="bulk-in">'
    + '<span class="count">' + n + '</span><span style="color:var(--muted);font-size:13px">' + plural(n, ['вибрана', 'вибрані', 'вибрано']) + '</span>'
    + '<button class="btn ghost" data-act="sel-all">' + (allVisibleSelected ? 'Зняти всі' : 'Вибрати всі (' + S.visible.length + ')') + '</button><span class="sep"></span>'
    + '<button class="btn" data-act="bulk-done"' + dis + '>' + I.check.replace('stroke-width="3.5"', 'stroke-width="3"') + 'Виконано</button>'
    + (S.bulkPickDate ? '<input class="field" type="date" id="bulk-date" aria-label="Нова дата"><button class="btn primary" data-act="bulk-date-ok">OK</button>'
      : sel('bulk-due', '', [['', 'Термін…'], ['today', 'Сьогодні'], ['tomorrow', 'Завтра'], ['nextmon', 'Наступний понеділок'], ['plus1', '+1 день до терміну'], ['plus7', '+1 тиждень до терміну'], ['pick', 'Обрати дату…'], ['none', 'Прибрати термін']]))
    + sel('bulk-prio', '', [['', 'Пріоритет…'], ['1', 'P1 · Критичний'], ['2', 'P2 · Високий'], ['3', 'P3 · Звичайний'], ['4', 'P4 · Низький']])
    + sel('bulk-status', '', [['', 'Статус…'], ['todo', 'Заплановано'], ['doing', 'В роботі'], ['done', 'Виконано']])
    + (S.bulkNewProj ? '<input class="field" id="bulk-newproj" placeholder="Назва проєкту" autocomplete="off"><button class="btn primary" data-act="bulk-proj-ok">OK</button>'
      : sel('bulk-proj', '', [['', 'Проєкт…']].concat(projs.map((p) => [p.name, p.name])).concat([['__none', 'Без проєкту'], ['__new', 'Новий проєкт…']])))
    + '<button class="btn" data-act="bulk-dup"' + dis + '>' + I.copy + 'Дублювати</button>'
    + '<button class="btn danger" data-act="bulk-del"' + dis + '>' + I.trash + 'Видалити</button>'
    + '<span class="sep"></span><button class="btn ghost" data-act="sel-exit">Готово</button>'
    + '</div></div>';
  if (S.bulkNewProj) setTimeout(() => { const i = document.getElementById('bulk-newproj'); if (i) i.focus(); }, 20);
  if (S.bulkPickDate) setTimeout(() => { const i = document.getElementById('bulk-date'); if (i) { i.focus(); try { i.showPicker(); } catch (e) {} } }, 20);
}
function selectedTasks() { return [...S.sel].map(getTask).filter((t) => t && !t.deletedAt); }
function bulkPatch(fn, label) {
  const list = selectedTasks(); if (!list.length) { toast('Спершу виберіть задачі'); return; }
  const puts = list.map((t) => { const nt = clone(t); fn(nt); return nt; });
  apply(puts, [], label + ': ' + list.length + ' ' + plural(list.length, TASKS_N));
}
function bulkDue(v) {
  const today = todayStr();
  if (v === 'pick') { S.bulkPickDate = true; renderBulk(); return; }
  const f = {
    today: (t) => { t.due = today; }, tomorrow: (t) => { t.due = addDays(today, 1); }, nextmon: (t) => { t.due = nextMonday(today); },
    plus1: (t) => { t.due = addDays(t.due || today, 1); }, plus7: (t) => { t.due = addDays(t.due || today, 7); }, none: (t) => { t.due = null; t.time = null; }
  }[v];
  if (f) bulkPatch(f, 'Змінено термін');
}
function markDone(t) {
  const nt = clone(t); const extra = [];
  nt.status = 'done'; nt.doneAt = nowIso();
  if (nt.repeat && nt.repeat !== 'none' && nt.due) {
    const nx = clone(t); nx.id = rid(); nx.status = 'todo'; nx.doneAt = null; nx.createdAt = nowIso();
    nx.due = nextDue(t.due, t.repeat, t); nx.subtasks = (t.subtasks || []).map((s) => Object.assign({}, s, { id: rid('s'), done: false })); nx.history = []; nx.deletedAt = null; if (nx.remind === 'custom') nx.remind = 'none';
    nt.repeat = 'none'; extra.push(nx);
  }
  return [nt].concat(extra);
}

/* ---------- картка задачі (бічна панель) ---------- */
function drawerTask() { return S.draft || (S.openId ? getTask(S.openId) : null); }
function openTask(id) { if (S.selectMode) return; flushDebounced(); S.draft = null; S.openId = id; renderDrawer(); }
function newTask(defaults) { flushDebounced(); S.openId = null; S.draft = normalize(Object.assign({ id: rid() }, defaults || {})); renderDrawer(true); }
function closeDrawer() {
  flushDebounced();
  const t = S.openId && getTask(S.openId);
  if (t && t.subtasks.some((s) => !s.text.trim())) { const nt = clone(t); nt.subtasks = nt.subtasks.filter((s) => s.text.trim()); apply([nt]); }
  S.openId = null; S.draft = null; document.getElementById('drawer-root').innerHTML = '';
}
function quickDates(t) {
  const today = todayStr();
  const opts = [['Сьогодні', today], ['Завтра', addDays(today, 1)], ['Пн', nextMonday(today)], ['+1 тиждень', addDays(t.due || today, 7)]];
  return '<div class="qd">' + opts.map((o) => '<button data-act="dr-due" data-v="' + o[1] + '"' + (t.due === o[1] && o[0] !== '+1 тиждень' ? ' class="on"' : '') + '>' + o[0] + '</button>').join('')
    + (t.due ? '<button data-act="dr-due" data-v="">Без терміну</button>' : '') + '</div>';
}
function renderDrawer(focusTitle, focusSub) {
  flushDebounced();
  const t = drawerTask(); const root = document.getElementById('drawer-root');
  if (!t) { root.innerHTML = ''; return; }
  const body = root.querySelector('.dr-body'); const scroll = body ? body.scrollTop : 0;
  const subs = t.subtasks || []; const sd = subs.filter((s) => s.done).length;
  const projList = projects().map((p) => '<option value="' + esc(p.name) + '">').join('');
  const files = t.attachments || [];
  const ups = Object.values(S.uploads).filter((u) => u.taskId === t.id);
  root.innerHTML = '<div class="scrim" data-act="close"></div><div class="drawer" role="dialog" aria-modal="true" aria-label="Редагування задачі">'
    + '<div class="dr-head"><span class="eyebrow">' + (S.draft ? 'Нова задача' : 'Задача') + '</span>'
    + '<button class="icon-btn" data-act="close" aria-label="Закрити">' + I.close + '</button></div>'
    + '<div class="dr-body">'
    + '<textarea class="dr-title" id="f-title" rows="1" placeholder="Назва задачі">' + esc(t.title) + '</textarea>'
    + '<div><div class="row2"><div><label class="lbl" for="f-due">Термін</label><input class="field" type="date" id="f-due" value="' + esc(t.due || '') + '"></div>'
    + '<div><label class="lbl" for="f-time">Час</label><input class="field" type="time" id="f-time" value="' + esc(t.time || '') + '"></div></div>' + quickDates(t) + '</div>'
    + remindHTML(t)
    + '<div><span class="lbl">Пріоритет</span><div class="seg" role="group">' + [1, 2, 3, 4].map((p) => '<button class="s' + p + '" data-act="set-prio" data-v="' + p + '" aria-pressed="' + (t.priority === p) + '">P' + p + ' ' + PRIO[p] + '</button>').join('') + '</div></div>'
    + '<div><span class="lbl">Статус</span><div class="seg" role="group">' + Object.keys(STATUS).map((s) => '<button data-act="set-status" data-v="' + s + '" aria-pressed="' + (t.status === s) + '">' + STATUS[s] + '</button>').join('') + '</div></div>'
    + '<div><span class="lbl">Підзадачі</span>'
    + (subs.length ? '<div class="prog-line"><span class="num">' + sd + ' з ' + subs.length + '</span><span class="hbar"><i style="width:' + Math.round(sd / subs.length * 100) + '%;background:var(--accent)"></i></span><span class="num">' + Math.round(sd / subs.length * 100) + '%</span></div>' : '')
    + '<div class="subs">' + subs.map((s) => '<div class="sub' + (s.done ? ' done' : '') + '" data-sid="' + esc(s.id) + '" draggable="false">'
      + '<span class="grip" data-grip="1" title="Перетягніть, щоб змінити порядок">' + I.grip + '</span>'
      + '<button class="check" data-act="sub-toggle" aria-label="Позначити підзадачу">' + I.check + '</button>'
      + '<input id="sub-' + esc(s.id) + '" class="sub-text" value="' + esc(s.text) + '" aria-label="Текст підзадачі" enterkeyhint="next">'
      + '<button class="icon-btn" data-act="sub-promote" title="Зробити окремою задачею" aria-label="Зробити окремою задачею">' + I.promote + '</button>'
      + '<button class="icon-btn" data-act="sub-del" title="Видалити" aria-label="Видалити підзадачу">' + I.close + '</button></div>').join('')
    + '<form class="sub-add" data-form="sub">' + I.plus + '<input id="f-sub-new" placeholder="Додати підзадачу…" title="Enter — додати. Можна вставити цілий список" autocomplete="off" enterkeyhint="enter"></form></div></div>'
    + '<div><span class="lbl">Файли</span><div class="files" id="dr-files">'
    + files.map((a) => { const k = fileKind(a.name); return '<div class="file" data-fid="' + esc(a.id) + '"><span class="fext ' + k[0] + '">' + esc(k[1]) + '</span>'
        + '<button class="fname" data-act="file-open" title="Відкрити"><b>' + esc(a.name) + '</b><small>' + fsize(a.size || 0) + ' · ' + esc(fmtDT(a.uploadedAt)) + '</small></button>'
        + (['doc', 'xls', 'txt'].includes(k[0]) && k[1] !== 'doc' ? '<button class="icon-btn" data-act="file-import" title="Створити задачі з цього файлу" aria-label="Створити задачі з файлу">' + I.toTasks + '</button>' : '')
        + '<button class="icon-btn" data-act="file-dl" title="Завантажити" aria-label="Завантажити">' + I.download + '</button>'
        + '<button class="icon-btn" data-act="file-del" title="Відкріпити" aria-label="Відкріпити файл">' + I.close + '</button></div>'; }).join('')
    + ups.map((u) => { const k = fileKind(u.name); return '<div class="file uploading"><span class="fext ' + k[0] + '">' + esc(k[1]) + '</span><span class="fname"><b>' + esc(u.name) + '</b><small>Завантаження…</small></span></div>'; }).join('')
    + '<label class="file-add">' + I.upload + '<span>Прикріпити файли (до 4 МБ кожен) або перетягніть сюди</span><input type="file" id="f-files" multiple hidden></label></div></div>'
    + '<div class="row2"><div><label class="lbl" for="dr-project">Проєкт</label><input class="field" id="dr-project" list="proj-list" value="' + esc(t.project) + '" placeholder="Напр. Робота" autocomplete="off"><datalist id="proj-list">' + projList + '</datalist></div>'
    + '<div><label class="lbl" for="f-repeat">Повторення</label>' + sel('f-repeat', t.repeat || 'none', Object.keys(REPEAT).map((k) => [k, REPEAT[k]])) + '</div></div>'
    + repeatCustomHTML(t)
    + '<div><label class="lbl" for="f-tags">Мітки</label><input class="field" id="f-tags" value="' + esc((t.tags || []).join(', ')) + '" placeholder="через кому: дзвінок, документи" autocomplete="off"></div>'
    + '<div><label class="lbl" for="f-notes">Нотатки</label><textarea class="field" id="f-notes" rows="5" maxlength="100000" placeholder="Деталі, посилання, контакти…">' + esc(t.notes) + '</textarea></div>'
    + (S.draft ? '' : historyHTML(t))
    + '<div class="meta-note">' + (S.draft ? 'Задача збережеться, щойно ви впишете назву.' : 'Створено ' + esc(fmtDT(t.createdAt)) + (t.updatedAt ? ' · змінено ' + esc(fmtDT(t.updatedAt)) : '') + (t.doneAt ? ' · виконано ' + esc(fmtDT(t.doneAt)) : '')) + '</div>'
    + '</div><div class="dr-foot">'
    + (!S.draft ? '<button class="btn danger" data-act="dr-delete">' + I.trash + 'Видалити</button><button class="btn" data-act="dr-dup">' + I.copy + 'Дублювати</button>' : '')
    + '<span class="spacer"></span><button class="btn" data-act="close">Готово</button></div></div>';
  const nb = root.querySelector('.dr-body'); if (nb) nb.scrollTop = scroll;
  autosize(document.getElementById('f-title'));
  if (focusTitle) setTimeout(() => { const el = document.getElementById('f-title'); if (el) el.focus(); }, 30);
  if (focusSub) { const el = document.getElementById(focusSub === 'new' ? 'f-sub-new' : 'sub-' + focusSub); if (el) { el.focus(); const l = el.value.length; try { el.setSelectionRange(l, l); } catch (e) {} } }
}
function remindHTML(t) {
  const k = t.remind || 'none';
  let info = '';
  const at = computeRemindAt(t);
  if (k !== 'none') {
    if (!at) info = esc(k === 'custom' ? 'Оберіть дату й час нагадування.' : 'Додайте термін, щоб нагадування спрацювало.');
    else info = 'Нагадаю ' + esc(new Date(at).toLocaleString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + (Date.parse(at) < Date.now() ? ' (цей час уже минув)' : '');
    if (pushState() !== 'on') info += ' · <button class="link-btn" data-act="settings-open">увімкнути сповіщення на цьому пристрої</button>';
  }
  return '<div><label class="lbl" for="f-remind">Нагадування</label><div class="row2">' + sel('f-remind', k, Object.keys(REMIND).map((x) => [x, REMIND[x]]))
    + (k === 'custom' ? '<input class="field" type="datetime-local" id="f-remind-custom" value="' + esc(t.remindCustom || '') + '">' : '<span></span>') + '</div>'
    + (info ? '<div class="meta-note" style="margin-top:6px">' + info + '</div>' : '') + '</div>';
}
function repeatCustomHTML(t) {
  const r = t.repeat || 'none';
  if (r === 'none') return '';
  if (r !== 'custom') return t.due ? '<div class="meta-note">Після виконання створиться наступна: ' + esc(fmt(nextDue(t.due, r, t), { weekday: 'short', day: 'numeric', month: 'long' })) + '</div>' : '<div class="meta-note">Повторення рахується від терміну: вкажіть дату.</div>';
  const u = t.repeatUnit || 'day', n = Math.max(1, +t.repeatEvery || 1);
  return '<div class="rep-box"><div class="rep-row"><span>' + (n === 1 ? 'Кожен' : 'Кожні') + '</span><input class="field" type="number" min="1" max="365" inputmode="numeric" id="f-rep-n" value="' + n + '">'
    + sel('f-rep-unit', u, [['day', plural(n, UNIT.day)], ['week', plural(n, UNIT.week)], ['month', plural(n, UNIT.month)], ['year', plural(n, UNIT.year)]]) + '</div>'
    + (u === 'week' ? '<div class="qd">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<button data-act="rep-day" data-v="' + d + '"' + ((t.repeatDays || []).includes(d) ? ' class="on"' : '') + '>' + WDN[d] + '</button>').join('') + '</div>' : '')
    + '<div class="meta-note">' + esc(repeatLabel(t)) + (t.due ? ' · наступна: ' + esc(fmt(nextDue(t.due, 'custom', t), { weekday: 'short', day: 'numeric', month: 'long' })) : ' · вкажіть термін') + '</div></div>';
}
function histVal(f, v) {
  if (v == null || v === '') return { due: 'без терміну', project: 'без проєкту', time: 'без часу' }[f] || '—';
  if (f === 'due') return fmt(v, { day: 'numeric', month: 'short' });
  if (f === 'priority') return 'P' + v;
  if (f === 'status') return STATUS[v] || v;
  return v;
}
function historyHTML(t) {
  const h = (t.history || []).slice().reverse(); if (!h.length) return '';
  const pp = postponed(t);
  return '<details class="hist"' + (S.histOpen ? ' open' : '') + '><summary>' + I.history + 'Історія змін (' + h.length + ')' + (pp ? ' · термін переносили ' + pp + ' ' + plural(pp, ['раз', 'рази', 'разів']) : '') + '</summary><ul>'
    + h.map((e) => '<li><time>' + esc(fmtDT(e.at)) + '</time><span>' + esc(HIST[e.f] || e.f) + (['created', 'deleted', 'restored'].includes(e.f) ? '' : ': ' + esc(histVal(e.f, e.from)) + ' → ' + esc(histVal(e.f, e.to))) + '</span></li>').join('') + '</ul></details>';
}
function autosize(el) { if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
/* Зміни з картки: для нової задачі — збереження, щойно є назва. */
function editTask(patch, opts) {
  opts = opts || {};
  const t = drawerTask(); if (!t) return;
  const nt = Object.assign(clone(t), patch);
  if (S.draft) {
    S.draft = nt;
    if (nt.title.trim()) { S.draft = null; S.openId = nt.id; apply([nt]); toast('Задачу додано'); if (!opts.rerender) renderDrawerHeadOnly(); }
  } else apply([nt], [], opts.label);
  if (opts.rerender) renderDrawer(false, opts.focusSub);
}
function renderDrawerHeadOnly() { if (!drawerBusy()) renderDrawer(); else { const e = document.querySelector('.drawer .eyebrow'); if (e) e.textContent = 'Задача'; } }
const debouncers = {};
function debouncedTask(key, patch, ms) {
  const id = drawerTask()?.id;
  if (!id) return;
  debounced(key, () => {
    if (S.draft?.id === id) {
      editTask(typeof patch === 'function' ? patch(S.draft) : patch);
      return;
    }
    const task = getTask(id);
    if (!task || task.deletedAt) return;
    const changes = typeof patch === 'function' ? patch(task) : patch;
    apply([Object.assign(clone(task), changes)]);
  }, ms);
}
function debounced(key, fn, ms) {
  cancelDebounce(key);
  const d = { fn, timer: null };
  d.timer = setTimeout(() => { if (debouncers[key] === d) delete debouncers[key]; fn(); }, ms || 450);
  debouncers[key] = d;
}
function cancelDebounce(key) { const d = debouncers[key]; if (d) { clearTimeout(d.timer); delete debouncers[key]; } }
/* виконати всі відкладені збереження зараз (перед закриттям картки) */
function flushDebounced() { Object.keys(debouncers).forEach((k) => { const d = debouncers[k]; clearTimeout(d.timer); delete debouncers[k]; d.fn(); }); }

/* ---------- файли ---------- */
async function uploadFiles(fileList) {
  const t = drawerTask(); if (!t) return;
  if (S.draft) { toast('Спершу впишіть назву задачі, потім прикріплюйте файли'); return; }
  const taskId = t.id;
  for (const f of [...fileList]) {
    if (f.size > 4.4 * 1024 * 1024) { toast('«' + shortT(f.name) + '» більший за 4 МБ. Стисніть файл або розділіть на частини.'); continue; }
    const uid = rid('u'); S.uploads[uid] = { taskId, name: f.name }; renderDrawer();
    try {
      const r = await api('POST', '/api/files?name=' + encodeURIComponent(f.name) + '&type=' + encodeURIComponent(f.type || 'application/octet-stream'), null, f);
      const j = await r.json();
      const cur = getTask(taskId); if (!cur) continue;
      const nt = clone(cur);
      nt.attachments = (nt.attachments || []).concat([{ id: rid('f'), name: f.name, size: j.size || f.size, type: j.contentType || f.type, url: j.url, pathname: j.pathname, access: j.access, uploadedAt: nowIso() }]);
      apply([nt]);
      toast('Файл прикріплено: ' + shortT(f.name));
    } catch (e) {
      toast(e.code === 'auth' ? 'Сесія завершилась, увійдіть знову' : e.message || 'Не вдалося завантажити файл');
    } finally {
      delete S.uploads[uid];
      if (S.openId === taskId) renderDrawer();
    }
  }
}
async function fetchFile(a) {
  const r = await api('GET', '/api/files?pathname=' + encodeURIComponent(a.pathname) + '&access=' + encodeURIComponent(a.access || 'private') + '&name=' + encodeURIComponent(a.name));
  return r.blob();
}
async function openFile(a, download) {
  if (a.access === 'public' && a.url && !download) { window.open(a.url, '_blank', 'noopener'); return; }
  const win = !download ? window.open('', '_blank') : null;
  try {
    toast('Відкриваю «' + shortT(a.name) + '»…');
    const blob = await fetchFile(a);
    const url = URL.createObjectURL(new Blob([blob], { type: a.type || blob.type || 'application/octet-stream' }));
    const inline = inlineViewable(a.type);
    if (win && inline) win.location.href = url;
    else { if (win) win.close(); saveBlobUrl(url, a.name); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { if (win) win.close(); toast(e.message || 'Не вдалося відкрити файл'); }
}
// Blob-адреса має origin застосунку: HTML чи SVG у ній виконали б скрипти з доступом до пароля.
const inlineViewable = (type) => /^(image\/(png|jpe?g|gif|webp|avif|bmp)|application\/pdf|text\/plain)(;|$)/i.test(String(type || ''));
function saveBlobUrl(url, name) { const el = document.createElement('a'); el.href = url; el.download = name; document.body.appendChild(el); el.click(); el.remove(); }
function saveBlob(blob, name) { const url = URL.createObjectURL(blob); saveBlobUrl(url, name); setTimeout(() => URL.revokeObjectURL(url), 30000); }
function scheduleBlobCleanup(a) {
  // видаляємо зі сховища після вікна «Скасувати», якщо файл більше ніде не прикріплений
  setTimeout(() => {
    const used = S.tasks.some((t) => (t.attachments || []).some((x) => x.pathname === a.pathname));
    if (!used && a.pathname) api('DELETE', '/api/files?pathname=' + encodeURIComponent(a.pathname)).catch(() => {});
  }, 15000);
}

/* ---------- імпорт ---------- */
const LIBS = {
  xlsx: ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'],
  mammoth: ['https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js', 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js']
};
const libCache = {};
function loadLib(name) {
  const g = name === 'xlsx' ? 'XLSX' : 'mammoth';
  if (window[g]) return Promise.resolve(window[g]);
  if (libCache[name]) return libCache[name];
  libCache[name] = (async () => {
    for (const src of LIBS[name]) {
      try {
        await new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        if (window[g]) return window[g];
      } catch (e) { /* наступне джерело */ }
    }
    libCache[name] = null;
    throw new Error('Не вдалося завантажити модуль для читання файлів. Перевірте інтернет.');
  })();
  return libCache[name];
}
function openImport(file) {
  S.imp = { stage: 'source', tab: 'file', text: '', drafts: [], error: '', busy: false, defaults: { project: '', due: '' } };
  S.modal = 'import'; renderModal();
  if (file) readImportFile(file);
}
async function readImportFile(file) {
  const imp = S.imp; imp.busy = true; imp.error = ''; imp.fileName = file.name; renderModal();
  try {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const buf = await file.arrayBuffer();
    if (ext === 'docx') {
      const mammoth = await loadLib('mammoth');
      const styleMap = [2, 3, 4].flatMap((n) => ['Bullet', 'Number'].map((k) => {
        const tag = k === 'Bullet' ? 'ul' : 'ol';
        return "p[style-name='List " + k + ' ' + n + "'] => " + Array(n).fill(tag + ' > li').join(' > ') + ':fresh';
      }));
      const res = await mammoth.convertToHtml({ arrayBuffer: buf }, { styleMap });
      const o = K.htmlToOutline(res.value);
      const big = o.tables.map(K.cleanRows).filter((r) => r.length >= 2).sort((a, b) => b.length - a.length)[0];
      const textDrafts = K.parseText(o.text);
      if (big && (K.detectHeader(big) >= 0 || textDrafts.length < big.length - 1)) setTable([{ name: 'Таблиця з документа', rows: big }], textDrafts.length ? o.text : '');
      else setDrafts(textDrafts, 'list');
    } else if (['xlsx', 'xls', 'ods', 'xlsm'].includes(ext)) {
      const XLSX = await loadLib('xlsx');
      const wb = XLSX.read(buf, { type: 'array' });
      const sheets = wb.SheetNames.map((n) => ({ name: n, rows: K.cleanRows(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' })) })).filter((s) => s.rows.length);
      if (!sheets.length) throw new Error('У файлі немає заповнених рядків.');
      setTable(sheets);
    } else if (ext === 'csv' || ext === 'tsv') {
      const XLSX = await loadLib('xlsx');
      const text = K.decodeText(buf);
      const wb = XLSX.read(text, { type: 'string', raw: true, FS: ext === 'tsv' ? '\t' : undefined });
      const n = wb.SheetNames[0];
      setTable([{ name: file.name, rows: K.cleanRows(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' })) }]);
    } else if (ext === 'json') {
      const j = JSON.parse(K.decodeText(buf));
      const arr = Array.isArray(j) ? j : j.tasks;
      if (!Array.isArray(arr)) throw new Error('Це не резервна копія застосунку.');
      imp.backup = true;
      setDrafts(arr.map((t) => Object.assign({}, t, { subtasks: (t.subtasks || []).map((s) => ({ text: s.text, done: !!s.done, id: s.id })) })), 'backup');
    } else if (ext === 'doc') {
      throw new Error('Старий формат .doc не підтримується. Відкрийте файл у Word і збережіть як .docx («Файл → Зберегти як → Документ Word»).');
    } else {
      imp.text = K.decodeText(buf); setDrafts(K.parseText(imp.text), 'list');
    }
  } catch (e) {
    imp.error = e.message || 'Не вдалося прочитати файл';
  } finally { imp.busy = false; renderModal(); }
}
function setTable(sheets, altText) {
  const imp = S.imp;
  imp.kind = 'table'; imp.sheets = sheets; imp.sheet = 0; imp.altText = altText || '';
  prepareSheet();
}
function prepareSheet() {
  const imp = S.imp; const rows = imp.sheets[imp.sheet].rows;
  imp.header = K.detectHeader(rows);
  imp.map = K.autoMap(rows, imp.header);
  rebuildFromTable();
}
function rebuildFromTable() {
  const imp = S.imp; const rows = imp.sheets[imp.sheet].rows;
  setDrafts(K.rowsToDrafts(rows, imp.header, imp.map), 'table');
}
function setDrafts(drafts, kind) {
  const imp = S.imp;
  imp.kind = kind; imp.stage = 'review';
  imp.drafts = drafts.map((d) => Object.assign({ on: true, priority: 3, status: 'todo', project: '', subtasks: [], notes: '', tags: [], due: null, time: null }, d));
}
function renderModal() {
  const root = document.getElementById('modal-root');
  if (!S.modal) { root.innerHTML = ''; return; }
  const scrollEl = root.querySelector('.m-body'); const scroll = scrollEl ? scrollEl.scrollTop : 0;
  root.innerHTML = '<div class="modal-scrim" data-act="modal-scrim">' + (S.modal === 'import' ? importHTML() : settingsHTML()) + '</div>';
  const nb = root.querySelector('.m-body'); if (nb) nb.scrollTop = scroll;
}
function closeModal() { S.modal = null; S.imp = null; renderModal(); }
function importHTML() {
  const imp = S.imp;
  let body = '', foot = '';
  if (imp.stage === 'source') {
    body += '<div class="tabs-seg"><button data-act="imp-tab" data-v="file" aria-pressed="' + (imp.tab === 'file') + '">Файл</button><button data-act="imp-tab" data-v="text" aria-pressed="' + (imp.tab === 'text') + '">Вставити текст</button></div>';
    if (imp.error) body += '<div class="err-box">' + esc(imp.error) + '</div>';
    if (imp.tab === 'file') {
      body += '<label class="drop" id="imp-drop">' + I.upload + '<b>' + (imp.busy ? 'Читаю «' + esc(imp.fileName) + '»…' : 'Оберіть файл або перетягніть його сюди') + '</b>'
        + '<span class="fmts"><span>.docx</span><span>.xlsx</span><span>.xls</span><span>.csv</span><span>.txt</span><span>.md</span><span>.json</span></span>'
        + '<input type="file" id="imp-file" accept=".docx,.xlsx,.xls,.xlsm,.ods,.csv,.tsv,.txt,.md,.json" hidden></label>';
    } else {
      body += '<textarea class="field imp-text" id="imp-text" placeholder="Вставте список задач. Наприклад:\n\nРобота:\n1. Підготувати звіт до 15.10 !1\n   - зібрати дані\n   - побудувати графіки\n2. Зустріч з клієнтом пт 14:00\n\nДім:\n- Оплатити інтернет завтра\n- Купити продукти">' + esc(imp.text) + '</textarea>';
      foot = '<span class="spacer"></span><button class="btn primary" data-act="imp-parse">Розпізнати задачі</button>';
    }
    body += '<div class="help"><b>Як розпізнаються задачі</b><ul>'
      + '<li><b>Word і текст:</b> кожен рядок або пункт списку стає задачею, вкладені пункти (з відступом) стають підзадачами, а заголовки чи рядки з двокрапкою в кінці («Робота:») — проєктами.</li>'
      + '<li><b>Excel і CSV:</b> кожен рядок стає задачею. Стовпці на кшталт «Назва», «Термін», «Пріоритет», «Статус», «Проєкт», «Підзадачі», «Нотатки» підхоплюються автоматично, а відповідність можна змінити вручну.</li>'
      + '<li>Розпізнаються дати <code>15.10</code>, <code>15.10.2026</code>, <code>завтра</code>, <code>пт</code>, час <code>14:30</code>, пріоритет <code>!1</code>–<code>!4</code> або «високий», проєкт <code>#Назва</code>, виконані пункти <code>[x]</code>.</li>'
      + '<li>Перед збереженням усе можна перевірити й виправити.</li></ul>'
      + '<div style="margin-top:10px"><button class="btn" data-act="imp-template">' + I.download + 'Завантажити шаблон Excel</button></div></div>';
  } else {
    const on = imp.drafts.filter((d) => d.on);
    const subN = on.reduce((a, d) => a + d.subtasks.length, 0);
    body += '<div class="imp-sum">Знайдено <b>' + imp.drafts.length + '</b> ' + plural(imp.drafts.length, TASKS_W) + (subN ? ' і <b>' + subN + '</b> підзадач' : '') + (imp.fileName ? ' у «' + esc(imp.fileName) + '»' : '') + '. Вибрано для імпорту: <b>' + on.length + '</b>.</div>';
    if (imp.error) body += '<div class="err-box">' + esc(imp.error) + '</div>';
    if (imp.kind === 'table') {
      const rows = imp.sheets[imp.sheet].rows;
      const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
      const colName = (ci) => { const h = imp.header >= 0 ? rows[imp.header][ci] : ''; return String.fromCharCode(65 + (ci % 26)) + (h ? ': ' + String(h).slice(0, 24) : ''); };
      const colOpts = [['', '— не імпортувати —']].concat(Array.from({ length: width }, (_, ci) => [String(ci), colName(ci)]));
      body += '<div class="defaults">'
        + (imp.sheets.length > 1 ? '<label>Аркуш' + sel('imp-sheet', String(imp.sheet), imp.sheets.map((s, i) => [String(i), s.name + ' (' + s.rows.length + ')'])) + '</label>' : '')
        + '<label>Рядок заголовків' + sel('imp-header', String(imp.header), [['-1', 'Немає заголовків']].concat(rows.slice(0, 10).map((r, i) => [String(i), (i + 1) + ': ' + r.filter((c) => c !== '').slice(0, 3).join(' · ').slice(0, 40)]))) + '</label>'
        + (imp.altText ? '<button class="btn" data-act="imp-use-text">Взяти списки з тексту документа</button>' : '')
        + '</div>';
      body += '<div><span class="lbl">Відповідність стовпців</span><div class="map-grid">' + K.FIELDS.map((f) => '<label>' + f.label + sel('imp-map-' + f.key, imp.map[f.key] == null ? '' : String(imp.map[f.key]), colOpts) + '</label>').join('') + '</div></div>';
    }
    body += '<div class="defaults"><label>Проєкт для задач без проєкту<input class="field" id="imp-def-proj" list="imp-proj-list" value="' + esc(imp.defaults.project) + '" placeholder="не змінювати"><datalist id="imp-proj-list">' + projects().map((p) => '<option value="' + esc(p.name) + '">').join('') + '</datalist></label>'
      + '<label>Термін для задач без терміну<input class="field" type="date" id="imp-def-due" value="' + esc(imp.defaults.due) + '"></label>'
      + '<button class="btn ghost" data-act="imp-toggle-all">' + (on.length === imp.drafts.length ? 'Зняти всі' : 'Вибрати всі') + '</button></div>';
    if (!imp.drafts.length) body += '<div class="empty"><b>Задач не знайдено</b>' + (imp.kind === 'table' ? 'Вкажіть, у якому стовпці назва задачі.' : 'Перевірте текст: кожна задача з нового рядка.') + '</div>';
    else {
      body += '<div class="tbl-wrap"><table class="imp-tbl"><thead><tr><th></th><th>Назва</th><th>Термін</th><th>Пріоритет</th><th>Статус</th><th>Проєкт</th><th>Підзадачі · нотатки</th></tr></thead><tbody>'
        + imp.drafts.map((d, i) => '<tr class="' + (d.on ? '' : 'off') + '" data-i="' + i + '">'
          + '<td class="c-chk"><input type="checkbox" data-imp="on"' + (d.on ? ' checked' : '') + ' aria-label="Імпортувати"></td>'
          + '<td class="c-title"><input class="field" data-imp="title" value="' + esc(d.title) + '"></td>'
          + '<td><input class="field" type="date" data-imp="due" value="' + esc(d.due || '') + '"></td>'
          + '<td><select class="field" data-imp="priority">' + [1, 2, 3, 4].map((p) => '<option value="' + p + '"' + (d.priority === p ? ' selected' : '') + '>P' + p + ' ' + PRIO[p] + '</option>').join('') + '</select></td>'
          + '<td><select class="field" data-imp="status">' + Object.keys(STATUS).map((s) => '<option value="' + s + '"' + (d.status === s ? ' selected' : '') + '>' + STATUS[s] + '</option>').join('') + '</select></td>'
          + '<td><input class="field" data-imp="project" value="' + esc(d.project) + '" placeholder="' + esc(imp.defaults.project || '') + '"></td>'
          + '<td class="c-sub">' + (d.subtasks.length ? '<ul>' + d.subtasks.slice(0, 6).map((s) => '<li>' + (s.done ? '✓ ' : '') + esc(s.text) + '</li>').join('') + (d.subtasks.length > 6 ? '<li>ще ' + (d.subtasks.length - 6) + '…</li>' : '') + '</ul>' : '') + (d.notes ? '<div title="' + esc(d.notes) + '">' + esc(shortT(d.notes)) + '</div>' : '') + (!d.subtasks.length && !d.notes ? '—' : '') + '</td>'
          + '</tr>').join('')
        + '</tbody></table></div>';
    }
    foot = '<button class="btn" data-act="imp-back">' + I.left + 'Інший файл</button><span class="spacer"></span>'
      + (imp.backup ? '<span class="note">Задачі з тими самими id буде оновлено.</span>' : '')
      + '<button class="btn primary" data-act="imp-go"' + (on.length ? '' : ' disabled') + '>Імпортувати ' + on.length + ' ' + plural(on.length, TASKS_W) + '</button>';
  }
  return '<div class="modal" role="dialog" aria-modal="true" aria-label="Імпорт задач"><div class="m-head"><h2>Імпорт задач</h2><button class="icon-btn" data-act="modal-close" aria-label="Закрити">' + I.close + '</button></div>'
    + '<div class="m-body">' + body + '</div>' + (foot ? '<div class="m-foot">' + foot + '</div>' : '') + '</div>';
}
function doImport() {
  const imp = S.imp; const stamp = nowIso();
  const list = imp.drafts.filter((d) => d.on && String(d.title || '').trim());
  const puts = list.map((d) => {
    // сервер відхиляє весь пакет через один некоректний id, тож такі задачі отримують новий
    const keepId = imp.backup && ID_RE.test(String(d.id || ''));
    const base = keepId && getTask(String(d.id)) ? clone(getTask(String(d.id))) : {};
    const t = normalize(Object.assign(base, {
      id: keepId ? String(d.id) : rid(),
      title: String(d.title).trim(), due: d.due || imp.defaults.due || null, time: d.time || null,
      priority: +d.priority || 3, status: d.status || 'todo', project: (d.project || imp.defaults.project || '').trim(),
      subtasks: (d.subtasks || []).map((s) => ({ id: s.id || rid('s'), text: s.text, done: !!s.done })),
      notes: d.notes || '', tags: d.tags || [], repeat: d.repeat || 'none',
      attachments: imp.backup ? (d.attachments || []) : [],
      createdAt: imp.backup && d.createdAt ? d.createdAt : stamp
    }));
    t.doneAt = t.status === 'done' ? (d.doneAt || stamp) : null;
    if (imp.backup) { ['repeatEvery', 'repeatUnit', 'repeatDays', 'remind', 'remindCustom', 'history', 'updatedAt', 'time'].forEach((k) => { if (d[k] != null) t[k] = d[k]; }); t.deletedAt = null; }
    return normalize(t);
  });
  closeModal();
  apply(puts, [], 'Імпортовано ' + puts.length + ' ' + plural(puts.length, TASKS_W), { flushDelay: 0 });
  if (S.view === 'today' && !puts.some((t) => t.due && t.due <= addDays(todayStr(), 7))) setView('list');
}
async function downloadTemplate() {
  try {
    const XLSX = await loadLib('xlsx');
    const rows = [['Назва', 'Термін', 'Час', 'Пріоритет', 'Статус', 'Проєкт', 'Підзадачі', 'Нотатки', 'Мітки'],
      ['Підготувати звіт для клієнта', addDays(todayStr(), 3).split('-').reverse().join('.'), '10:00', 'Високий', 'В роботі', 'Робота', 'Зібрати дані; Побудувати графіки; [x] Узгодити структуру', 'Приклад: відправити до обіду', 'звіт'],
      ['Оплатити інтернет', addDays(todayStr(), 1).split('-').reverse().join('.'), '', 'Звичайний', 'Заплановано', 'Дім', '', '', 'платежі']];
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 34 }, { wch: 12 }, { wch: 7 }, { wch: 12 }, { wch: 13 }, { wch: 14 }, { wch: 46 }, { wch: 30 }, { wch: 14 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Задачі');
    XLSX.writeFile(wb, 'shablon-zadach.xlsx');
  } catch (e) { toast(e.message); }
}
async function exportExcel(tasks) {
  try {
    const XLSX = await loadLib('xlsx');
    const rows = [['Назва', 'Термін', 'Час', 'Пріоритет', 'Статус', 'Проєкт', 'Підзадачі', 'Нотатки', 'Мітки', 'Повторення', 'Файли', 'Створено', 'Виконано']];
    sortTasks(tasks || live()).forEach((t) => rows.push([
      t.title, t.due ? t.due.split('-').reverse().join('.') : '', t.time || '', 'P' + t.priority + ' ' + PRIO[t.priority], STATUS[t.status], t.project,
      (t.subtasks || []).map((s) => (s.done ? '[x] ' : '') + s.text).join('\n'), t.notes, (t.tags || []).join(', '),
      t.repeat && t.repeat !== 'none' ? repeatLabel(t) : '', (t.attachments || []).map((a) => a.name).join(', '),
      t.createdAt ? new Date(t.createdAt).toLocaleString('uk-UA') : '', t.doneAt ? new Date(t.doneAt).toLocaleString('uk-UA') : ''
    ]));
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 40 }, { wch: 11 }, { wch: 6 }, { wch: 13 }, { wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 18 }];
    ws['!autofilter'] = { ref: 'A1:M' + rows.length };
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Задачі');
    XLSX.writeFile(wb, 'zadachi-' + todayStr() + '.xlsx');
  } catch (e) { toast(e.message); }
}
function exportJSON() { saveBlob(new Blob([JSON.stringify({ exportedAt: nowIso(), tasks: S.tasks }, null, 2)], { type: 'application/json' }), 'kontrol-zadach-' + todayStr() + '.json'); }

/* ---------- налаштування ---------- */
function currentTheme() { try { return localStorage.getItem('kz.theme') || 'auto'; } catch (e) { return 'auto'; } }
function setTheme(v) {
  try { localStorage.setItem('kz.theme', v); } catch (e) {}
  if (v === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', v);
}
function settingsHTML() {
  const th = currentTheme(); const projs = projects();
  const doneN = live().filter(isDone).length;
  return '<div class="modal narrow" role="dialog" aria-modal="true" aria-label="Налаштування"><div class="m-head"><h2>Налаштування</h2><button class="icon-btn" data-act="modal-close" aria-label="Закрити">' + I.close + '</button></div><div class="m-body">'
    + '<div class="set-sec"><h3>Тема</h3><div class="seg" role="group">' + [['auto', 'Як у системі'], ['light', 'Світла'], ['dark', 'Темна']].map((o) => '<button data-act="theme" data-v="' + o[0] + '" aria-pressed="' + (th === o[0]) + '">' + o[1] + '</button>').join('') + '</div></div>'
    + notifHTML()
    + '<div class="set-sec"><h3>Проєкти</h3>' + (projs.length ? projs.map((p) => '<div class="proj-edit" data-proj="' + esc(p.name) + '"><span class="dot" style="background:' + projColor(p.name) + '"></span><input class="field proj-rename" value="' + esc(p.name) + '" aria-label="Назва проєкту"><span class="cnt">' + p.total + ' ' + plural(p.total, TASKS_N) + '</span><button class="icon-btn" data-act="proj-remove" title="Прибрати проєкт із задач (задачі залишаться)">' + I.close + '</button></div>').join('') + '<div class="help">Змініть назву й натисніть Enter, щоб перейменувати проєкт в усіх задачах. Якщо вписати назву іншого проєкту, вони об’єднаються.</div>' : '<div class="help">Проєктів ще немає. Додайте <code>#Назву</code> до задачі.</div>') + '</div>'
    + '<div class="set-sec"><h3>Дані</h3><div class="set-row"><button class="btn" data-act="export-xlsx">' + I.download + 'Експорт в Excel</button><button class="btn" data-act="export-json">' + I.download + 'Резервна копія (JSON)</button><button class="btn" data-act="import-open">' + I.importI + 'Імпорт або відновлення</button><button class="btn" data-act="trash-open">' + I.trash + 'Кошик (' + trashCount() + ')</button></div>'
    + '<div class="set-row"><button class="btn danger" data-act="clear-done"' + (doneN ? '' : ' disabled') + '>' + I.trash + 'Видалити виконані (' + doneN + ')</button></div></div>'
    + backupsHTML()
    + '<div class="set-sec"><h3>Синхронізація</h3><div class="help">' + syncBadge() + '<br>Задач: ' + S.tasks.length + '. Дані зберігаються на сервері й у цьому браузері, тож застосунок працює і без інтернету.</div>'
    + '<div class="set-row"><button class="btn" data-act="sync-now">Синхронізувати зараз</button><button class="btn" data-act="logout" title="Задачі зникнуть із цього пристрою, на сервері вони залишаться">Вийти на цьому пристрої</button></div></div>'
    + '</div></div>';
}

/* ---------- push-сповіщення ---------- */
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function pushSupported() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    return { ok: false, msg: isIOS && !standalone() ? 'На iPhone сповіщення працюють лише у встановленому застосунку: Safari → Поділитися → «На екран Додому», потім відкрийте застосунок з іконки й увімкніть сповіщення тут.' : 'Цей браузер не підтримує сповіщення.' };
  if (Notification.permission === 'denied') return { ok: false, msg: 'Сповіщення заблоковані для цього сайту. Дозвольте їх у налаштуваннях браузера (значок замка біля адреси) і оновіть сторінку.' };
  return { ok: true };
}
function pushState() { try { return localStorage.getItem('kz.push') === '1' && window.Notification && Notification.permission === 'granted' ? 'on' : 'off'; } catch (e) { return 'off'; } }
function b64ToU8(b) { const p = '='.repeat((4 - (b.length % 4)) % 4); const r = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)); }
function deviceName() {
  const u = navigator.userAgent;
  const os = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : 'Пристрій';
  const br = /Edg\//.test(u) ? 'Edge' : /Chrome\//.test(u) ? 'Chrome' : /Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : 'браузер';
  return os + ' · ' + br;
}
async function loadPushInfo() { try { S.pushInfo = await apiJson('GET', '/api/push'); } catch (e) { S.pushInfo = { error: e.message }; } }
async function loadBackups() {
  S.backupError = '';
  try { S.backups = (await apiJson('GET', '/api/backup')).backups; }
  catch (e) { S.backups = null; S.backupError = e.message; }
}
async function pushOn() {
  S.pushBusy = true; renderModal();
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Сповіщення не дозволено. Їх можна дозволити в налаштуваннях браузера.');
    const reg = await navigator.serviceWorker.ready;
    const info = S.pushInfo && S.pushInfo.publicKey ? S.pushInfo : await apiJson('GET', '/api/push');
    const key = b64ToU8(info.publicKey);
    let sub = await reg.pushManager.getSubscription();
    if (sub && sub.options && sub.options.applicationServerKey && new Uint8Array(sub.options.applicationServerKey).toString() !== key.toString()) { await sub.unsubscribe(); sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await apiJson('POST', '/api/push', { action: 'subscribe', subscription: sub.toJSON(), device: deviceName() });
    await apiJson('POST', '/api/push', { action: 'settings', settings: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
    try { localStorage.setItem('kz.push', '1'); } catch (e) {}
    toast('Сповіщення увімкнено на цьому пристрої');
  } catch (e) { toast(e.message || 'Не вдалося увімкнути сповіщення'); }
  finally { S.pushBusy = false; await loadPushInfo(); renderModal(); if (S.openId) renderDrawer(); }
}
async function pushOff(quiet) {
  try {
    const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
    if (sub) { await apiJson('POST', '/api/push', { action: 'unsubscribe', endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
  } catch (e) { /* немає підписки */ }
  try { localStorage.removeItem('kz.push'); } catch (e) {}
  if (quiet) return;
  toast('Сповіщення на цьому пристрої вимкнено'); await loadPushInfo(); renderModal();
}
/* Вихід за кнопкою: на пристрої не лишається ні задач, ні сповіщень із їхніми назвами. */
async function signOut() {
  if (pushState() === 'on') await pushOff(true);
  logout('');
  S.tasks = []; S.pending = {}; S.undo = null;
  [LKEY, PKEY, 'kz.fired'].forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
}
function notifHTML() {
  const info = S.pushInfo; const st = pushState(); const sup = pushSupported();
  let h = '<div class="set-sec"><h3>Сповіщення та нагадування</h3>';
  if (!sup.ok) h += '<div class="help">' + esc(sup.msg) + '</div>';
  else h += '<div class="set-row">' + (st === 'on'
    ? '<span class="sync"><i></i>Увімкнено на цьому пристрої</span><button class="btn" data-act="push-test">Надіслати тестове</button><button class="btn ghost" data-act="push-off">Вимкнути тут</button>'
    : '<button class="btn primary" data-act="push-on"' + (S.pushBusy ? ' disabled' : '') + '>' + I.bell + (S.pushBusy ? 'Вмикаю…' : 'Увімкнути на цьому пристрої') + '</button>') + '</div>';
  if (info && info.settings) {
    const st2 = info.settings;
    h += '<div class="set-row"><label class="toggle"><input type="checkbox" id="push-digest"' + (st2.digest ? ' checked' : '') + '> Ранкове зведення задач о</label>'
      + sel('push-hour', String(st2.digestHour), Array.from({ length: 10 }, (_, i) => [String(i + 5), pad(i + 5) + ':00'])) + '</div>';
    const cronOk = info.lastCronRun && Date.now() - Date.parse(info.lastCronRun) < 30 * 60000;
    h += '<div class="help">Пристроїв зі сповіщеннями: ' + info.devices.length + (info.devices.length ? ' (' + info.devices.map((d) => esc(d.device || 'пристрій')).join(', ') + ')' : '') + '.<br>'
      + (cronOk ? 'Фонові нагадування працюють: сервер перевіряв задачі о ' + esc(new Date(info.lastCronRun).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })) + '.'
        : 'Ранкове зведення приходить раз на день. Щоб нагадування до задач приходили точно в час навіть із закритим застосунком, підключіть безкоштовний таймер (README, розділ «Точні нагадування»). Поки застосунок відкритий, нагадування спрацьовують і без нього.') + '</div>';
  } else if (info && info.error) h += '<div class="help">' + esc(info.error) + '</div>';
  else h += '<div class="help">Завантажую стан…</div>';
  return h + '</div>';
}
function backupsHTML() {
  let h = '<div class="set-sec"><h3>Резервні копії на сервері</h3><div class="help">Сервер щодня зберігає копію всіх задач і тримає її 30 днів. З копії можна відновити все або окремі задачі.</div>';
  if (S.backupError) h += '<div class="help" role="alert">Не вдалося завантажити копії: ' + esc(S.backupError) + '</div><button class="btn" data-act="backup-retry">Спробувати ще раз</button>';
  else if (!S.backups) h += '<div class="help">Завантажую список…</div>';
  else if (!S.backups.length) h += '<div class="help">Копій ще немає. Перша з’явиться протягом доби, або натисніть «Зробити копію зараз».</div>';
  else h += '<div class="bk-list">' + S.backups.slice(0, 10).map((b) => '<div class="bk"><span>' + esc(cap(fmt(b.date, { weekday: 'short', day: 'numeric', month: 'long' }))) + '</span><button class="btn ghost" data-act="backup-restore" data-date="' + b.date + '">Переглянути й відновити</button></div>').join('') + '</div>';
  return h + '<div class="set-row"><button class="btn" data-act="backup-now">Зробити копію зараз</button></div></div>';
}

/* ---------- нагадування, поки застосунок відкритий ---------- */
function checkLocalReminders() {
  if (S.mode !== 'app') return;
  const now = Date.now(); const fired = lsGet('kz.fired', {});
  live().forEach((t) => {
    if (!t.remindAt || isDone(t)) return;
    const at = Date.parse(t.remindAt);
    if (at > now || now - at > 15 * 60000) return;
    const key = t.id + '|' + t.remindAt; if (fired[key]) return;
    fired[key] = now;
    toast('⏰ ' + t.title, { action: { label: 'Відкрити', act: 'open', id: t.id }, long: true });
    if (window.Notification && Notification.permission === 'granted' && navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((reg) => reg.showNotification('⏰ ' + t.title, { body: t.due ? 'Термін: ' + fmt(t.due, { day: 'numeric', month: 'long' }) + (t.time ? ' о ' + t.time : '') : 'Нагадування', tag: 'r-' + t.id, icon: '/icon-192.png', badge: '/icon-192.png', data: { id: t.id } })).catch(() => {});
    }
  });
  Object.keys(fired).forEach((k) => { if (now - fired[k] > 3 * 86400000) delete fired[k]; });
  lsSet('kz.fired', fired);
}
setInterval(checkLocalReminders, 20000);

/* ---------- сповіщення ---------- */
let toastTimer;
function toast(msg, opts) {
  opts = opts || {};
  const r = document.getElementById('toast-root');
  r.innerHTML = '<div class="toast" role="status"><span>' + esc(msg) + '</span>' + (opts.undo ? '<span class="t-acts"><button data-act="undo">Скасувати</button></span>' : '')
    + (opts.action ? '<span class="t-acts"><button data-act="' + esc(opts.action.act) + '" data-id="' + esc(opts.action.id || '') + '">' + esc(opts.action.label) + '</button></span>' : '') + '</div>';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { r.innerHTML = ''; }, opts.long ? 15000 : opts.undo ? 7000 : 3200);
}

/* ---------- дії ---------- */
function setView(v) { S.view = v; try { localStorage.setItem('kz.view', v); } catch (e) {} renderMain(); window.scrollTo(0, 0); }
function toggleDone(t) {
  if (isDone(t)) { const nt = clone(t); nt.status = 'todo'; nt.doneAt = null; apply([nt]); return; }
  const res = markDone(t);
  apply(res, [], res.length > 1 ? 'Виконано, наступне повторення ' + fmt(res[1].due, { day: 'numeric', month: 'long' }) : 'Виконано: ' + shortT(t.title));
}
function subsFromPaste(text) { return text.split(/\r?\n/).map((l) => l.replace(/^\s*([-–•*·]|\d+[.)]|\[( |x|х)\])\s*/i, '').trim()).filter(Boolean); }

const A = {
  view: (el) => { if (S.selectMode) exitSelect(true); setView(el.dataset.view); },
  proj: (el) => { S.f.project = el.dataset.proj; S.f.status = 'active'; setView('list'); },
  new: () => newTask(S.view === 'calendar' ? { due: S.selDay } : (S.view === 'today' ? { due: todayStr() } : (S.f.project && S.view === 'list' && S.f.project !== '—' ? { project: S.f.project } : {}))),
  open: (el, id) => openTask(el.dataset.id || id),
  toggle: (el, id) => { const t = getTask(id); if (t) toggleDone(t); },
  move: (el, id) => { const t = getTask(id); if (!t) return; if (el.dataset.to === 'done') return toggleDone(t); const nt = clone(t); nt.status = el.dataset.to; nt.doneAt = null; apply([nt]); },
  pickday: (el) => { S.selDay = el.dataset.date; if (S.selDay.slice(0, 7) !== S.calMonth) S.calMonth = S.selDay.slice(0, 7); renderMain(); },
  'cal-prev': () => { const [y, m] = S.calMonth.split('-').map(Number); S.calMonth = ymd(new Date(y, m - 2, 1)).slice(0, 7); renderMain(); },
  'cal-next': () => { const [y, m] = S.calMonth.split('-').map(Number); S.calMonth = ymd(new Date(y, m, 1)).slice(0, 7); renderMain(); },
  'cal-today': () => { S.calMonth = todayStr().slice(0, 7); S.selDay = todayStr(); renderMain(); },
  'f-reset': () => { S.f = { q: '', project: '', prio: '', status: 'active', sort: S.f.sort }; renderMain(); },
  'overdue-today': () => { const today = todayStr(); const puts = active().filter((t) => t.due && t.due < today).map((t) => Object.assign(clone(t), { due: today })); apply(puts, [], 'Перенесено на сьогодні: ' + puts.length); },
  close: () => closeDrawer(),
  'set-prio': (el) => editTask({ priority: +el.dataset.v }, { rerender: true }),
  'set-status': (el) => {
    const v = el.dataset.v; const t = drawerTask(); if (!t || t.status === v) return;
    if (v === 'done' && !S.draft) { toggleDone(t); renderDrawer(); return; }
    editTask({ status: v, doneAt: v === 'done' ? nowIso() : null }, { rerender: true });
  },
  'dr-due': (el) => editTask({ due: el.dataset.v || null, time: el.dataset.v ? drawerTask().time : null }, { rerender: true }),
  'dr-delete': () => { const t = drawerTask(); if (!t) return; closeDrawer(); trashTasks([t.id], 'У кошику: ' + shortT(t.title)); },
  'dr-dup': () => {
    flushDebounced();
    const t = drawerTask(); if (!t) return;
    const nt = clone(t); nt.id = rid(); nt.title = t.title + ' (копія)'; nt.createdAt = nowIso(); nt.status = 'todo'; nt.doneAt = null; nt.history = [];
    nt.subtasks = nt.subtasks.map((s) => Object.assign({}, s, { id: rid('s') }));
    apply([nt], [], 'Створено копію'); S.openId = nt.id; renderDrawer(true);
  },
  undo: () => undo(),
  'rep-day': (el) => { const t = drawerTask(); const d = +el.dataset.v; const days = (t.repeatDays || []).slice(); const i = days.indexOf(d); if (i >= 0) days.splice(i, 1); else days.push(d); editTask({ repeatDays: days }, { rerender: true }); },
  'trash-restore': (el, id) => { const t = getTask(id); if (!t) return; apply([Object.assign(clone(t), { deletedAt: null })], [], 'Відновлено: ' + shortT(t.title)); },
  'trash-purge': (el, id) => { const t = getTask(id); if (!t) return; purgeTasks([id], 'Видалено назавжди: ' + shortT(t.title)); },
  'trash-empty': (el) => {
    if (el.dataset.armed !== '1') { el.dataset.armed = '1'; el.classList.add('armed'); el.lastChild.textContent = 'Так, видалити все назавжди'; return; }
    const ids = S.tasks.filter((t) => t.deletedAt).map((t) => t.id); purgeTasks(ids, 'Кошик очищено: ' + ids.length);
  },
  'trash-open': () => { closeModal(); setView('trash'); },
  'push-on': () => pushOn(),
  'push-off': () => pushOff(),
  'push-test': async () => { try { const r = await apiJson('POST', '/api/push', { action: 'test' }); toast(r.sent ? 'Надіслано на ' + r.sent + ' ' + plural(r.sent, ['пристрій', 'пристрої', 'пристроїв']) : 'Немає пристроїв зі сповіщеннями'); } catch (e) { toast(e.message); } },
  'backup-now': async () => { try { const r = await apiJson('POST', '/api/backup'); toast('Копію збережено: ' + r.count + ' ' + plural(r.count, TASKS_N)); await loadBackups(); renderModal(); } catch (e) { toast(e.message); } },
  'backup-retry': async () => { await loadBackups(); if (S.modal === 'settings') renderModal(); },
  'backup-restore': async (el) => {
    try {
      const date = el.dataset.date; const j = await apiJson('GET', '/api/backup?date=' + encodeURIComponent(date));
      openImport(); S.imp.backup = true; S.imp.fileName = 'копія за ' + fmt(date, { day: 'numeric', month: 'long' });
      setDrafts(j.tasks.filter((t) => !t.deletedAt), 'backup'); renderModal();
    } catch (e) { toast(e.message); }
  },
  'sub-toggle': (el) => { const sid = el.closest('[data-sid]').dataset.sid; const t = drawerTask(); editTask({ subtasks: t.subtasks.map((s) => (s.id === sid ? Object.assign({}, s, { done: !s.done }) : s)) }, { rerender: true }); },
  'sub-del': (el) => { const sid = el.closest('[data-sid]').dataset.sid; const t = drawerTask(); editTask({ subtasks: t.subtasks.filter((s) => s.id !== sid) }, { rerender: true }); },
  'sub-promote': (el) => {
    const sid = el.closest('[data-sid]').dataset.sid; const t = drawerTask(); if (S.draft) return;
    const s = t.subtasks.find((x) => x.id === sid); if (!s || !s.text.trim()) return;
    const nt = clone(t); nt.subtasks = nt.subtasks.filter((x) => x.id !== sid);
    const child = normalize({ id: rid(), title: s.text, project: t.project, due: t.due, priority: t.priority, status: s.done ? 'done' : 'todo', doneAt: s.done ? nowIso() : null });
    apply([nt, child], [], 'Підзадачу винесено в окрему задачу'); renderDrawer();
  },
  'file-open': (el) => { const t = drawerTask(); const a = t && t.attachments.find((x) => x.id === el.closest('[data-fid]').dataset.fid); if (a) openFile(a, false); },
  'file-dl': (el) => { const t = drawerTask(); const a = t && t.attachments.find((x) => x.id === el.closest('[data-fid]').dataset.fid); if (a) openFile(a, true); },
  'file-del': (el) => {
    const t = drawerTask(); const fid = el.closest('[data-fid]').dataset.fid; const a = t.attachments.find((x) => x.id === fid); if (!a) return;
    editTask({ attachments: t.attachments.filter((x) => x.id !== fid) }, { rerender: true, label: 'Файл відкріплено' });
    scheduleBlobCleanup(a);
  },
  'file-import': async (el) => {
    const t = drawerTask(); const a = t && t.attachments.find((x) => x.id === el.closest('[data-fid]').dataset.fid); if (!a) return;
    try { toast('Читаю «' + shortT(a.name) + '»…'); const blob = await fetchFile(a); openImport(new File([blob], a.name, { type: a.type })); S.imp.defaults.project = t.project || ''; renderModal(); }
    catch (e) { toast(e.message); }
  },
  /* вибір */
  'select-mode': () => { if (S.selectMode) exitSelect(); else { S.selectMode = true; closeDrawer(); renderMain(); } },
  'sel-toggle': (el, id) => { if (!id) return; if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); renderMain(); },
  'sel-all': () => { const all = S.visible.length && S.visible.every((id) => S.sel.has(id)); if (all) S.visible.forEach((id) => S.sel.delete(id)); else S.visible.forEach((id) => S.sel.add(id)); renderMain(); },
  'sel-exit': () => exitSelect(),
  'bulk-done': () => { const list = selectedTasks(); if (!list.length) return; const puts = []; list.forEach((t) => { if (!isDone(t)) puts.push(...markDone(t)); }); apply(puts, [], 'Виконано: ' + list.length + ' ' + plural(list.length, TASKS_N)); },
  'bulk-dup': () => {
    const list = selectedTasks(); if (!list.length) return;
    const puts = list.map((t) => { const nt = clone(t); nt.id = rid(); nt.createdAt = nowIso(); nt.history = []; nt.subtasks = nt.subtasks.map((s) => Object.assign({}, s, { id: rid('s') })); return nt; });
    S.sel = new Set(puts.map((t) => t.id)); apply(puts, [], 'Створено копії: ' + puts.length);
  },
  'bulk-del': () => { const ids = [...S.sel]; if (!ids.length) return; trashTasks(ids, 'У кошику: ' + ids.length + ' ' + plural(ids.length, TASKS_N)); },
  'bulk-date-ok': () => { const v = document.getElementById('bulk-date').value; S.bulkPickDate = false; if (v) bulkPatch((t) => { t.due = v; }, 'Змінено термін'); else renderBulk(); },
  'bulk-proj-ok': () => { const v = document.getElementById('bulk-newproj').value.trim(); S.bulkNewProj = false; if (v) bulkPatch((t) => { t.project = v; }, 'Змінено проєкт'); else renderBulk(); },
  /* модальні вікна */
  'import-open': () => { closeDrawer(); openImport(); },
  'settings-open': () => { closeDrawer(); S.modal = 'settings'; renderModal(); Promise.all([loadPushInfo(), loadBackups()]).then(() => { if (S.modal === 'settings') renderModal(); }); },
  'modal-close': () => closeModal(),
  'modal-scrim': (el, id, e) => { if (e.target === el && !(S.imp && S.imp.stage === 'review')) closeModal(); },
  'imp-tab': (el) => { S.imp.tab = el.dataset.v; S.imp.error = ''; renderModal(); if (el.dataset.v === 'text') setTimeout(() => { const t = document.getElementById('imp-text'); if (t) t.focus(); }, 20); },
  'imp-parse': () => { const v = document.getElementById('imp-text').value; S.imp.text = v; S.imp.fileName = ''; if (!v.trim()) { S.imp.error = 'Вставте текст зі списком задач.'; renderModal(); return; } setDrafts(K.parseText(v), 'list'); renderModal(); },
  'imp-back': () => { const tab = S.imp.text && !S.imp.fileName ? 'text' : 'file'; const text = S.imp.text; S.imp = { stage: 'source', tab, text, drafts: [], error: '', defaults: S.imp.defaults }; renderModal(); },
  'imp-go': () => doImport(),
  'imp-toggle-all': () => { const all = S.imp.drafts.every((d) => d.on); S.imp.drafts.forEach((d) => { d.on = !all; }); renderModal(); },
  'imp-use-text': () => { const t = S.imp.altText; S.imp.sheets = null; setDrafts(K.parseText(t), 'list'); renderModal(); },
  'imp-template': () => downloadTemplate(),
  theme: (el) => { setTheme(el.dataset.v); renderModal(); },
  'proj-remove': (el) => { const name = el.closest('[data-proj]').dataset.proj; const puts = S.tasks.filter((t) => t.project === name).map((t) => Object.assign(clone(t), { project: '' })); apply(puts, [], 'Проєкт «' + name + '» прибрано'); if (S.f.project === name) S.f.project = ''; renderModal(); },
  'export-xlsx': () => exportExcel(),
  'export-json': () => exportJSON(),
  'clear-done': () => { const ids = live().filter(isDone).map((t) => t.id); trashTasks(ids, 'Виконані переміщено в кошик: ' + ids.length); renderModal(); },
  'sync-now': async () => {
    const saved = await flush();
    const ok = saved && await pull();
    toast(ok && S.sync === 'ok' ? 'Синхронізовано' : (S.syncErr || 'Синхронізація ще не завершена'));
    if (S.modal === 'settings') renderModal();
  },
  logout: (el) => {
    const n = Object.keys(S.pending).length;
    if (n && el.dataset.armed !== '1') { el.dataset.armed = '1'; el.classList.add('danger', 'armed'); el.textContent = 'Не збережено змін: ' + n + '. Однаково вийти?'; return; }
    signOut();
  },
  'board-all': () => { S.f.project = ''; renderMain(); }
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const idEl = el.closest('[data-id]'); const fn = A[el.dataset.act];
  if (fn) { if (el.dataset.act !== 'modal-scrim') e.preventDefault(); fn(el, idEl ? idEl.dataset.id : null, e); }
});
document.addEventListener('keydown', (e) => {
  if (e.isComposing) return;
  if (e.key === 'Tab' && (S.modal || S.openId || S.draft)) {
    const dialog = document.querySelector(S.modal ? '#modal-root [role="dialog"]' : '#drawer-root [role="dialog"]');
    if (dialog) {
      const controls = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter((el) => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (first && (!dialog.contains(document.activeElement) || (e.shiftKey ? document.activeElement === first : document.activeElement === last))) {
        e.preventDefault(); (e.shiftKey ? last : first).focus(); return;
      }
    }
  }
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if (e.key === 'Escape') {
    if (S.modal) { closeModal(); return; }
    if (S.openId || S.draft) { closeDrawer(); return; }
    if (S.selectMode) { exitSelect(); return; }
  }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing && S.undo) { e.preventDefault(); undo(); return; }
  if (!typing && (e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.act) { e.preventDefault(); e.target.click(); return; }
  if (!typing && !S.modal && !e.metaKey && !e.ctrlKey && !e.altKey) {
    if (e.key === 'n' || e.key === 'т') { const q = document.querySelector('#main .quick input'); if (q) { e.preventDefault(); q.focus(); } }
    if (e.key === '/' && S.view === 'list') { const q = document.getElementById('f-q'); if (q) { e.preventDefault(); q.focus(); } }
  }
  if (e.target.id === 'f-title' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  if (e.target.classList && e.target.classList.contains('sub-text')) {
    const sid = e.target.closest('[data-sid]').dataset.sid; const t = drawerTask(); if (!t) return;
    const idx = t.subtasks.findIndex((s) => s.id === sid);
    if (e.key === 'Enter') {
      e.preventDefault();
      const subs = t.subtasks.map((s) => (s.id === sid ? Object.assign({}, s, { text: e.target.value }) : s));
      const ns = { id: rid('s'), text: '', done: false }; subs.splice(idx + 1, 0, ns);
      editTask({ subtasks: subs }, { rerender: true, focusSub: ns.id });
    } else if (e.key === 'Backspace' && !e.target.value) {
      e.preventDefault();
      const prev = t.subtasks[idx - 1];
      editTask({ subtasks: t.subtasks.filter((s) => s.id !== sid) }, { rerender: true, focusSub: prev ? prev.id : 'new' });
    } else if (e.key === 'ArrowUp' && idx > 0) { const el = document.getElementById('sub-' + t.subtasks[idx - 1].id); if (el) { e.preventDefault(); el.focus(); } }
    else if (e.key === 'ArrowDown') { const nx = t.subtasks[idx + 1]; const el = document.getElementById(nx ? 'sub-' + nx.id : 'f-sub-new'); if (el) { e.preventDefault(); el.focus(); } }
  }
  if (e.target.classList && e.target.classList.contains('proj-rename') && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  if (e.target.id === 'bulk-newproj' && e.key === 'Enter') { e.preventDefault(); A['bulk-proj-ok'](); }
  if (e.target.id === 'bulk-date' && e.key === 'Enter') { e.preventDefault(); A['bulk-date-ok'](); }
});
function updateHint(input) {
  const hint = document.getElementById(input.id + '-hint'); if (!hint) return;
  const v = input.value.trim();
  if (!v) { hint.innerHTML = hintDefault(); return; }
  const p = parseQuick(v, quickDefaults(input.id));
  const chips = [];
  if (p.due) chips.push('<span class="pchip">' + esc(fmt(p.due, { weekday: 'short', day: 'numeric', month: 'short' })) + '</span>');
  if (p.time) chips.push('<span class="pchip">' + esc(p.time) + '</span>');
  if (p.priority !== 3) chips.push('<span class="pchip">P' + p.priority + ' ' + PRIO[p.priority] + '</span>');
  if (p.project) chips.push('<span class="pchip">#' + esc(p.project) + '</span>');
  hint.innerHTML = chips.length ? 'Буде створено: ' + chips.join('') : hintDefault();
}
function quickDefaults(id) {
  if (id === 'q-day') return { due: S.selDay };
  if (id === 'q-today') return { due: todayStr() };
  if (id === 'q-list' && S.f.project && S.f.project !== '—') return { project: S.f.project };
  return {};
}
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.closest && t.closest('[data-form="quick"]')) updateHint(t);
  if (t.id === 'f-q') { S.f.q = t.value; debounced('q', renderMain, 160); }
  if (t.id === 'f-title') { autosize(t); const v = t.value; if (!S.draft) debouncedTask('title', { title: v.trim() || 'Без назви' }, 500); }
  if (t.id === 'f-notes') { const v = t.value; if (!S.draft) debouncedTask('notes', { notes: v }, 600); }
  if (t.classList && t.classList.contains('sub-text')) { const sid = t.closest('[data-sid]').dataset.sid; const v = t.value; debouncedTask('sub' + sid, tk => ({ subtasks: tk.subtasks.map(s => s.id === sid ? Object.assign({}, s, { text: v }) : s) }), 500); }
  if (t.dataset && t.dataset.imp && S.imp) { const i = +t.closest('tr').dataset.i; const k = t.dataset.imp; if (k === 'title' || k === 'project') S.imp.drafts[i][k] = t.value; }
  if (t.id === 'imp-text' && S.imp) S.imp.text = t.value;
});
document.addEventListener('change', (e) => {
  const t = e.target, id = t.id;
  if (id === 'f-status') { S.f.status = t.value; renderMain(); }
  else if (id === 'f-project') { S.f.project = t.value; renderMain(); }
  else if (id === 'f-prio') { S.f.prio = t.value; renderMain(); }
  else if (id === 'f-sort') { S.f.sort = t.value; renderMain(); }
  else if (id === 'f-title') { cancelDebounce('title'); const v = t.value.trim(); if (S.draft) editTask({ title: v }, { rerender: !!v }); else editTask({ title: v || 'Без назви' }); }
  else if (id === 'f-notes') { cancelDebounce('notes'); editTask({ notes: t.value }); }
  else if (id === 'f-due') editTask({ due: t.value || null }, { rerender: true });
  else if (id === 'f-time') { const dt = drawerTask(); editTask({ time: t.value || null }, { rerender: !!(dt && dt.remind && dt.remind !== 'none') }); }
  else if (id === 'f-remind') editTask({ remind: t.value }, { rerender: true });
  else if (id === 'f-remind-custom') editTask({ remindCustom: t.value }, { rerender: true });
  else if (id === 'f-rep-n') editTask({ repeatEvery: Math.max(1, Math.min(365, Math.round(+t.value) || 1)) }, { rerender: true });
  else if (id === 'f-rep-unit') editTask({ repeatUnit: t.value }, { rerender: true });
  else if (id === 'f-group') { S.f.group = t.value; try { localStorage.setItem('kz.group', t.value); } catch (x) {} renderMain(); }
  else if (id === 'push-digest') apiJson('POST', '/api/push', { action: 'settings', settings: { digest: t.checked } }).then(() => toast(t.checked ? 'Ранкове зведення увімкнено' : 'Ранкове зведення вимкнено')).catch((x) => toast(x.message));
  else if (id === 'push-hour') apiJson('POST', '/api/push', { action: 'settings', settings: { digestHour: +t.value, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } }).then(() => toast('Зведення приходитиме о ' + pad(+t.value) + ':00')).catch((x) => toast(x.message));
  else if (id === 'dr-project') editTask({ project: t.value.trim() });
  else if (id === 'f-repeat') {
    const dt = drawerTask(); const v = t.value; const patch = { repeat: v };
    if (v === 'custom' && dt && !dt.repeatUnit) Object.assign(patch, { repeatEvery: 1, repeatUnit: 'week', repeatDays: dt.due ? [parseYmd(dt.due).getDay()] : [] });
    editTask(patch, { rerender: true });
  }
  else if (id === 'f-tags') editTask({ tags: t.value.split(',').map((s) => s.trim()).filter(Boolean) });
  else if (id === 'f-files') { uploadFiles(t.files); t.value = ''; }
  else if (id === 'bulk-due') bulkDue(t.value);
  else if (id === 'bulk-prio' && t.value) bulkPatch((x) => { x.priority = +t.value; }, 'Змінено пріоритет');
  else if (id === 'bulk-status' && t.value) {
    const v = t.value; const list = selectedTasks(); if (!list.length) return;
    const puts = []; list.forEach((x) => { if (v === 'done') { if (!isDone(x)) puts.push(...markDone(x)); } else puts.push(Object.assign(clone(x), { status: v, doneAt: null })); });
    apply(puts, [], 'Змінено статус: ' + list.length + ' ' + plural(list.length, TASKS_N));
  }
  else if (id === 'bulk-proj' && t.value) {
    if (t.value === '__new') { S.bulkNewProj = true; renderBulk(); return; }
    const v = t.value === '__none' ? '' : t.value; bulkPatch((x) => { x.project = v; }, 'Змінено проєкт');
  }
  else if (id === 'imp-file' && t.files[0]) readImportFile(t.files[0]);
  else if (id === 'imp-sheet') { S.imp.sheet = +t.value; prepareSheet(); renderModal(); }
  else if (id === 'imp-header') { S.imp.header = +t.value; S.imp.map = K.autoMap(S.imp.sheets[S.imp.sheet].rows, S.imp.header); rebuildFromTable(); renderModal(); }
  else if (id && id.startsWith('imp-map-')) { const k = id.slice(8); if (t.value === '') delete S.imp.map[k]; else S.imp.map[k] = +t.value; rebuildFromTable(); renderModal(); }
  else if (id === 'imp-def-proj') { S.imp.defaults.project = t.value.trim(); renderModal(); }
  else if (id === 'imp-def-due') { S.imp.defaults.due = t.value; }
  else if (t.dataset && t.dataset.imp && S.imp) {
    const i = +t.closest('tr').dataset.i; const k = t.dataset.imp; const d = S.imp.drafts[i];
    if (k === 'on') { d.on = t.checked; renderModal(); }
    else if (k === 'priority') d.priority = +t.value;
    else if (k === 'due') d.due = t.value || null;
    else d[k] = t.value;
  }
  else if (t.classList && t.classList.contains('proj-rename')) {
    const old = t.closest('[data-proj]').dataset.proj; const nv = t.value.trim();
    if (!nv || nv === old) { t.value = old; return; }
    const puts = S.tasks.filter((x) => x.project === old).map((x) => Object.assign(clone(x), { project: nv }));
    apply(puts, [], 'Проєкт перейменовано на «' + nv + '»'); if (S.f.project === old) S.f.project = nv; renderModal();
  }
});
document.addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('hist')) S.histOpen = e.target.open; }, true);

/* ---------- свайпи на телефоні: вправо — виконано, вліво — на завтра ---------- */
let sw = null, suppressClick = false;
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || S.selectMode) return;
  const row = e.target.closest && e.target.closest('#main .task:not(.trash-row)');
  if (!row || e.target.closest('.check')) return;
  sw = { row, id: row.dataset.id, x: e.clientX, y: e.clientY, dx: 0, active: false };
}, { passive: true });
document.addEventListener('pointermove', (e) => {
  if (!sw) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (!sw.active) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
    if (Math.abs(dx) < 14) return;
    sw.active = true; sw.row.classList.add('swiping');
  }
  sw.dx = dx;
  sw.row.style.transform = 'translateX(' + Math.max(-140, Math.min(140, dx)) + 'px)';
  sw.row.classList.toggle('sw-right', dx > 80); sw.row.classList.toggle('sw-left', dx < -80);
}, { passive: true });
function endSwipe(commit) {
  if (!sw) return; const s = sw; sw = null;
  s.row.classList.remove('swiping', 'sw-right', 'sw-left'); s.row.style.transform = '';
  if (!s.active) return;
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 400);
  if (!commit) return;
  const t = getTask(s.id); if (!t) return;
  if (s.dx > 80) toggleDone(t);
  else if (s.dx < -80) { const tom = addDays(todayStr(), 1); if (t.due === tom) return; apply([Object.assign(clone(t), { due: tom })], [], 'Перенесено на завтра: ' + shortT(t.title)); }
}
document.addEventListener('pointerup', () => endSwipe(true));
document.addEventListener('pointercancel', () => endSwipe(false));
document.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } }, true);

document.addEventListener('paste', (e) => {
  if (e.target.id !== 'f-sub-new') return;
  const text = (e.clipboardData || window.clipboardData).getData('text');
  const items = subsFromPaste(text); if (items.length < 2) return;
  e.preventDefault();
  const t = drawerTask();
  editTask({ subtasks: (t.subtasks || []).concat(items.map((x) => ({ id: rid('s'), text: x, done: false }))) }, { rerender: true, focusSub: 'new' });
  toast('Додано підзадач: ' + items.length);
});
document.addEventListener('submit', (e) => {
  const f = e.target; e.preventDefault();
  if (f.dataset.form === 'login') {
    const v = document.getElementById('login-pass').value; if (!v) return;
    const err = document.getElementById('login-err'); err.textContent = 'Перевіряю…';
    TOKEN = v;
    apiJson('GET', '/api/tasks').then((j) => {
      try { localStorage.setItem(TKEY, v); } catch (x) {}
      S.loginErr = ''; S.mode = 'app';
      const map = new Map((j.tasks || []).map(t => [t.id, normalize(t)]));
      for (const [id, op] of Object.entries(S.pending)) {
        if (op.op === 'put') map.set(id, op.task); else map.delete(id);
      }
      S.tasks = [...map.values()]; S.lastSync = new Date(); persistLocal(); renderMain();
      if (Object.keys(S.pending).length) scheduleFlush(0);
    }).catch((x) => { TOKEN = null; err.textContent = x.code === 'auth' ? 'Невірний пароль.' : x.message; });
    return;
  }
  if (f.dataset.form === 'quick') {
    const inp = f.querySelector('input'); const v = inp.value.trim(); if (!v) return;
    const p = parseQuick(v, quickDefaults(inp.id));
    if (!p.title) { toast('Додайте назву задачі'); return; }
    const t = normalize({ id: rid(), title: p.title, due: p.due, time: p.time, priority: p.priority, project: p.project });
    inp.value = ''; apply([t]);
    const h = document.getElementById(inp.id + '-hint'); if (h) h.innerHTML = hintDefault();
    toast('Додано' + (t.due ? ' на ' + fmt(t.due, { day: 'numeric', month: 'long' }) : ''));
    const again = document.getElementById(inp.id); if (again) again.focus();
  } else if (f.dataset.form === 'sub') {
    const inp = f.querySelector('input'); const v = inp.value.trim(); if (!v) return;
    const t = drawerTask(); editTask({ subtasks: (t.subtasks || []).concat([{ id: rid('s'), text: v, done: false }]) }, { rerender: true, focusSub: 'new' });
  }
});

/* ---------- перетягування ---------- */
let dragSub = null;
document.addEventListener('pointerdown', (e) => { const g = e.target.closest && e.target.closest('[data-grip]'); if (g) { const row = g.closest('.sub'); row.setAttribute('draggable', 'true'); } });
document.addEventListener('dragstart', (e) => {
  const sub = e.target.closest && e.target.closest('.sub[draggable="true"]');
  if (sub) { dragSub = sub.dataset.sid; sub.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'sub'); return; }
  const c = e.target.closest && e.target.closest('.card,.chip');
  if (c) { e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; }
});
document.addEventListener('dragend', () => { document.querySelectorAll('.sub[draggable="true"]').forEach((s) => { s.setAttribute('draggable', 'false'); s.classList.remove('dragging'); }); document.querySelectorAll('.drag-over,.drop-target,.col.over').forEach((x) => x.classList.remove('drag-over', 'drop-target', 'over')); dragSub = null; });
function isFileDrag(e) { return e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files'); }
document.addEventListener('dragover', (e) => {
  if (dragSub) { const s = e.target.closest && e.target.closest('.sub'); if (s) { e.preventDefault(); document.querySelectorAll('.sub.drag-over').forEach((x) => x !== s && x.classList.remove('drag-over')); s.classList.add('drag-over'); } return; }
  if (isFileDrag(e)) {
    const z = e.target.closest && (e.target.closest('#dr-files') || e.target.closest('#imp-drop'));
    if (z) { e.preventDefault(); z.classList.add(z.id === 'dr-files' ? 'drag' : 'drag'); }
    else if (e.target.closest && (e.target.closest('.drawer') || e.target.closest('.modal'))) e.preventDefault();
    return;
  }
  const col = e.target.closest && e.target.closest('.col');
  if (col) { e.preventDefault(); document.querySelectorAll('.col.over').forEach((c) => c !== col && c.classList.remove('over')); col.classList.add('over'); return; }
  const day = e.target.closest && e.target.closest('.day');
  if (day) { e.preventDefault(); document.querySelectorAll('.day.drop-target').forEach((d) => d !== day && d.classList.remove('drop-target')); day.classList.add('drop-target'); }
});
document.addEventListener('dragleave', (e) => {
  const z = e.target.closest && (e.target.closest('#dr-files') || e.target.closest('#imp-drop'));
  if (z && !z.contains(e.relatedTarget)) z.classList.remove('drag');
  const col = e.target.closest && e.target.closest('.col'); if (col && !col.contains(e.relatedTarget)) col.classList.remove('over');
});
document.addEventListener('drop', (e) => {
  if (dragSub) {
    const s = e.target.closest && e.target.closest('.sub'); e.preventDefault(); if (!s) return;
    const t = drawerTask(); const from = t.subtasks.findIndex((x) => x.id === dragSub); const to = t.subtasks.findIndex((x) => x.id === s.dataset.sid);
    if (from < 0 || to < 0 || from === to) return;
    const subs = t.subtasks.slice(); const [m] = subs.splice(from, 1); subs.splice(to, 0, m);
    editTask({ subtasks: subs }, { rerender: true }); return;
  }
  if (isFileDrag(e)) {
    const files = e.dataTransfer.files;
    if (e.target.closest && e.target.closest('#imp-drop')) { e.preventDefault(); if (files[0]) readImportFile(files[0]); return; }
    if (e.target.closest && e.target.closest('.drawer')) { e.preventDefault(); uploadFiles(files); return; }
    if (e.target.closest && e.target.closest('.modal')) { e.preventDefault(); return; }
    if (S.mode === 'app' && !S.modal && files[0]) { e.preventDefault(); openImport(files[0]); }
    return;
  }
  const id = e.dataTransfer.getData('text/plain'); const t = getTask(id);
  const col = e.target.closest && e.target.closest('.col');
  if (col) {
    e.preventDefault(); col.classList.remove('over'); const to = col.dataset.col; if (!t || t.status === to) return;
    if (to === 'done') return toggleDone(t);
    apply([Object.assign(clone(t), { status: to, doneAt: null })]); return;
  }
  const day = e.target.closest && e.target.closest('.day');
  if (day && t) {
    e.preventDefault(); day.classList.remove('drop-target'); const d = day.dataset.date; if (t.due === d) return;
    apply([Object.assign(clone(t), { due: d })], [], 'Перенесено на ' + fmt(d, { day: 'numeric', month: 'long' }));
  }
});
// файли, кинуті повз зони, не повинні відкриватися в браузері
window.addEventListener('dragover', (e) => { if (isFileDrag(e)) e.preventDefault(); });

/* ---------- запуск ---------- */
function openFromHash() {
  const m = location.hash.match(/^#task-([A-Za-z0-9_-]+)$/);
  if (!m) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  const t = getTask(m[1]); if (t && !t.deletedAt) openTask(m[1]);
}
function boot() {
  loadLocal();
  if (!TOKEN) { S.mode = 'login'; renderMain(); return; }
  S.mode = 'app'; S.sync = Object.keys(S.pending).length ? 'pending' : 'ok';
  renderMain(); if (S.tasks.length) openFromHash();
  pull().then(() => { openFromHash(); purgeOldTrash(); checkLocalReminders(); });
  if (matchMedia('(pointer:coarse)').matches && !lsGet('kz.tip.swipe', false)) {
    lsSet('kz.tip.swipe', true);
    setTimeout(() => toast('Порада: проведіть по задачі вправо, щоб виконати, або вліво, щоб перенести на завтра', { long: true }), 1500);
  }
}
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'open' && e.data.id && S.mode === 'app') openTask(e.data.id); });
window.addEventListener('hashchange', openFromHash);
setInterval(() => { if (TOKEN && document.visibilityState === 'visible' && !flushing) pull(); }, 20000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') flushDebounced(); if (TOKEN && document.visibilityState === 'visible') pull(); else if (TOKEN) flush(); });
window.addEventListener('online', () => { if (TOKEN) { flush(); pull(); } });
window.addEventListener('offline', () => { S.sync = 'offline'; renderSync(); });
window.addEventListener('beforeunload', () => { flushDebounced(); persistLocal(); });
let lastDay = todayStr();
setInterval(() => { const d = todayStr(); if (d !== lastDay) { lastDay = d; renderMain(); } }, 60000);
boot();
})();
