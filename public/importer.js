/* Контроль задач — розбір дат і імпорт задач із тексту, Word і таблиць.
   Чисті функції без DOM (крім htmlToOutline), щоб їх можна було перевіряти окремо. */
(function (root) {
  'use strict';

  /* ---------- дати ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseYmd = (s) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const todayStr = () => ymd(new Date());
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const diffDays = (a, b) => Math.round((parseYmd(a) - parseYmd(b)) / 86400000);
  const validYmd = (y, m, d) => { if (m < 1 || m > 12 || d < 1 || d > 31) return null; const dt = new Date(y, m - 1, d); return dt.getMonth() === m - 1 ? ymd(dt) : null; };
  const WD = { 'пн': 1, 'вт': 2, 'ср': 3, 'чт': 4, 'пт': 5, 'сб': 6, 'нд': 0,
    'понеділок': 1, 'понеділка': 1, 'вівторок': 2, 'вівторка': 2, 'середа': 3, 'середу': 3, 'середи': 3, 'четвер': 4, 'четверга': 4,
    'пʼятниця': 5, 'пʼятницю': 5, 'пʼятниці': 5, 'субота': 6, 'суботу': 6, 'суботи': 6, 'неділя': 0, 'неділю': 0, 'неділі': 0 };
  const WD_RE = Object.keys(WD).sort((a, b) => b.length - a.length).map((k) => k.replace('ʼ', "['’ʼ`]")).join('|');
  function nextWeekday(tgt, from) { const cur = parseYmd(from).getDay(); let k = (tgt - cur + 7) % 7; if (k === 0) k = 7; return addDays(from, k); }
  function yearFor(mm, dd, today) {
    const yy = +today.slice(0, 4);
    const cand = validYmd(yy, mm, dd);
    if (cand && diffDays(today, cand) > 60) return validYmd(yy + 1, mm, dd);
    return cand;
  }

  /* Швидке додавання: «Подзвонити в банк завтра 10:00 !2 #Фінанси» */
  function parseQuick(text, defaults) {
    let s = ' ' + String(text || '') + ' ';
    const out = Object.assign({ priority: 3, due: null, time: null, project: '' }, defaults || {});
    const today = todayStr();
    const B = '(?=[\\s,.;:!?)]|$)';
    s = s.replace(/\s!([1-4])(?=\s)/, (m, p) => { out.priority = +p; return ' '; });
    s = s.replace(/\s\(?(терміново|негайно|urgent|asap)\)?!*(?=[\s,.;]|$)/i, () => { out.priority = Math.min(out.priority, 1); return ' '; });
    s = s.replace(/\s#([^\s#!,;]+)/, (m, p) => { out.project = p.replace(/_/g, ' '); return ' '; });
    s = s.replace(new RegExp('\\s(?:до\\s+|на\\s+)?(сьогодні)' + B, 'i'), () => { out.due = today; return ' '; });
    s = s.replace(new RegExp('\\s(?:до\\s+|на\\s+)?(післязавтра)' + B, 'i'), () => { out.due = addDays(today, 2); return ' '; });
    s = s.replace(new RegExp('\\s(?:до\\s+|на\\s+)?(завтра)' + B, 'i'), () => { out.due = addDays(today, 1); return ' '; });
    s = s.replace(new RegExp('\\s(?:до\\s+|у\\s+|в\\s+|на\\s+)?(' + WD_RE + ')' + B, 'i'),
      (m, w) => { const t = WD[w.toLowerCase().replace(/['’`]/g, 'ʼ')]; if (t == null) return m; out.due = nextWeekday(t, today); return ' '; });
    s = s.replace(/\s(?:до\s+|на\s+)?(\d{4})-(\d{1,2})-(\d{1,2})(?=[\s,.;)]|$)/, (m, y, mo, d) => { const v = validYmd(+y, +mo, +d); if (!v) return m; out.due = v; return ' '; });
    s = s.replace(/\s(?:до\s+|на\s+)?(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=[\s,;)]|\.(?:\s|$)|$)/, (m, d, mo, y) => {
      let v;
      if (y) { const yy = +y < 100 ? 2000 + +y : +y; v = validYmd(yy, +mo, +d); } else v = yearFor(+mo, +d, today);
      if (!v) return m; out.due = v; return ' ';
    });
    s = s.replace(/\s(?:о\s+|об\s+|в\s+|на\s+)?(\d{1,2}):(\d{2})(?=[\s,.;)]|$)/, (m, h, mi) => { if (+h > 23 || +mi > 59) return m; out.time = pad(+h) + ':' + mi; return ' '; });
    let title = s.replace(/\s+/g, ' ').trim();
    title = title.replace(/\s*[-–—:,]\s*$/, '').replace(/\s+(до|на|о|об|в|у|з|—|-)$/i, '').trim();
    out.title = title;
    return out;
  }

  /* ---------- значення клітинок ---------- */
  function excelSerialToDate(n) {
    const ms = Math.round((n - 25569) * 86400000);
    const d = new Date(ms);
    const due = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    const secs = Math.round((n % 1) * 86400);
    const time = secs > 0 ? pad(Math.floor(secs / 3600) % 24) + ':' + pad(Math.floor(secs / 60) % 60) : null;
    return { due, time };
  }
  function parseDateValue(v) {
    if (v == null || v === '') return { due: null, time: null };
    if (v instanceof Date && !isNaN(v)) return { due: ymd(v), time: (v.getHours() || v.getMinutes()) ? pad(v.getHours()) + ':' + pad(v.getMinutes()) : null };
    if (typeof v === 'number') {
      if (v > 20000 && v < 80000) return excelSerialToDate(v);
      return { due: null, time: null };
    }
    const s = String(v).trim();
    if (!s) return { due: null, time: null };
    const today = todayStr();
    let due = null, time = null, m;
    const tm = s.match(/(\d{1,2}):(\d{2})/);
    if (tm && +tm[1] < 24 && +tm[2] < 60) time = pad(+tm[1]) + ':' + tm[2];
    if ((m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) due = validYmd(+m[1], +m[2], +m[3]);
    else if ((m = s.match(/(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})/))) due = validYmd(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
    else if ((m = s.match(/^(\d{1,2})[./](\d{1,2})\b/))) due = yearFor(+m[2], +m[1], today);
    else if (/^сьогодні/i.test(s)) due = today;
    else if (/^післязавтра/i.test(s)) due = addDays(today, 2);
    else if (/^завтра/i.test(s)) due = addDays(today, 1);
    else if (/^\d{5}(\.\d+)?$/.test(s)) return parseDateValue(+s);
    return { due, time };
  }
  function parseTimeValue(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number' && v >= 0 && v < 1) { const secs = Math.round(v * 86400); return pad(Math.floor(secs / 3600) % 24) + ':' + pad(Math.floor(secs / 60) % 60); }
    if (v instanceof Date) return pad(v.getHours()) + ':' + pad(v.getMinutes());
    const m = String(v).match(/(\d{1,2})[:.](\d{2})/);
    return m && +m[1] < 24 && +m[2] < 60 ? pad(+m[1]) + ':' + m[2] : null;
  }
  function parsePriority(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v >= 1 && v <= 4 ? Math.round(v) : (v > 4 ? 4 : null);
    const s = String(v).trim().toLowerCase();
    let m = s.match(/^p?\s*([1-4])\b/); if (m) return +m[1];
    if (/критич|термін|негайн|urgent|critical|highest|найвищ|!!!/.test(s)) return 1;
    if (/висок|важлив|high|!!/.test(s)) return 2;
    if (/низьк|low|можна пізніше|не терм/.test(s)) return 4;
    if (/середн|звичайн|normal|medium|норм/.test(s)) return 3;
    return null;
  }
  function parseStatus(v) {
    if (v === true) return 'done';
    if (v == null || v === '' || v === false) return null;
    const s = String(v).trim().toLowerCase();
    if (/^(так|yes|y|x|х|\+|1|true|✓|✔|✅|☑)$/.test(s) || /викон|зробл|готов|заверш|done|complete|closed|закрит/.test(s)) {
      if (/не\s*(викон|зробл|готов)/.test(s)) return 'todo';
      return 'done';
    }
    if (/в роботі|у роботі|в процесі|процес|триває|in progress|doing|розпоч|почат|working/.test(s)) return 'doing';
    return 'todo';
  }
  function splitList(v, re) {
    if (v == null || v === '') return [];
    return String(v).split(re || /\r?\n|;|•/).map((x) => x.replace(/^\s*[-–•*·]\s*/, '').trim()).filter(Boolean);
  }
  function parseSubtasks(v) {
    return splitList(v).map((t) => {
      let done = false;
      const m = t.match(/^\[(\s|x|х|✓|✔)\]\s*(.*)$/i);
      if (m) { done = m[1].trim() !== ''; t = m[2]; }
      if (/^[☑✅✔✓]\s*/.test(t)) { done = true; t = t.replace(/^[☑✅✔✓]\s*/, ''); }
      t = t.replace(/^☐\s*/, '');
      return { text: t, done };
    }).filter((s) => s.text);
  }

  /* ---------- таблиці ---------- */
  const FIELDS = [
    { key: 'title', label: 'Назва', syn: ['назва', 'задача', 'задачі', 'завдання', 'task', 'title', 'name', 'що зробити', 'справа', 'справи', 'пункт', 'назва задачі', 'дія', 'захід', 'заходи', 'todo', 'to do'] },
    { key: 'due', label: 'Термін', syn: ['термін', 'дата', 'дедлайн', 'deadline', 'due', 'date', 'строк', 'крайній термін', 'due date', 'термін виконання', 'дата виконання', 'виконати до', 'до'] },
    { key: 'time', label: 'Час', syn: ['час', 'time', 'година'] },
    { key: 'priority', label: 'Пріоритет', syn: ['пріоритет', 'priority', 'важливість', 'терміновість', 'prio', 'рівень'] },
    { key: 'status', label: 'Статус', syn: ['статус', 'status', 'стан', 'виконано', 'готово', 'done', 'зроблено', 'state'] },
    { key: 'project', label: 'Проєкт', syn: ['проєкт', 'проект', 'project', 'категорія', 'category', 'розділ', 'напрям', 'напрямок', 'група', 'сфера', 'список', 'область', 'тема'] },
    { key: 'subtasks', label: 'Підзадачі', syn: ['підзадачі', 'підзадача', 'subtasks', 'subtask', 'кроки', 'етапи', 'чекліст', 'checklist', 'пункти'] },
    { key: 'notes', label: 'Нотатки', syn: ['нотатки', 'нотатка', 'примітки', 'примітка', 'опис', 'коментар', 'коментарі', 'notes', 'note', 'description', 'comment', 'comments', 'деталі', 'details'] },
    { key: 'tags', label: 'Мітки', syn: ['мітки', 'мітка', 'теги', 'тег', 'tags', 'tag', 'labels', 'label'] }
  ];
  const normH = (s) => String(s == null ? '' : s).toLowerCase().replace(/[«»"'`*_:.()\[\]]/g, '').replace(/\s+/g, ' ').trim();
  function matchField(h) {
    const n = normH(h); if (!n) return null;
    for (const f of FIELDS) if (f.syn.includes(n)) return f.key;
    for (const f of FIELDS) if (f.syn.some((s) => s.length > 3 && (n.startsWith(s) || n.endsWith(s)))) return f.key;
    return null;
  }
  const cellEmpty = (c) => c == null || String(c).trim() === '';
  function cleanRows(rows) {
    rows = (rows || []).map((r) => (r || []).map((c) => (typeof c === 'string' ? c.trim() : c)));
    rows = rows.filter((r) => r.some((c) => !cellEmpty(c)));
    const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
    return rows.map((r) => { const a = r.slice(); while (a.length < width) a.push(''); return a; });
  }
  function detectHeader(rows) {
    let best = -1, bestScore = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const score = rows[i].filter((c) => typeof c === 'string' && matchField(c)).length;
      if (score > bestScore) { best = i; bestScore = score; }
    }
    return best;
  }
  function autoMap(rows, headerIdx) {
    const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
    const map = {};
    const used = new Set();
    if (headerIdx >= 0) {
      rows[headerIdx].forEach((h, ci) => { const k = matchField(h); if (k && map[k] == null) { map[k] = ci; used.add(ci); } });
    }
    const body = rows.slice(headerIdx + 1);
    const colStats = [];
    for (let ci = 0; ci < width; ci++) {
      const vals = body.map((r) => r[ci]).filter((v) => !cellEmpty(v));
      const dates = vals.filter((v) => parseDateValue(v).due).length;
      const textLen = vals.reduce((a, v) => a + (typeof v === 'string' ? v.length : 0), 0) / Math.max(1, vals.length);
      colStats.push({ ci, n: vals.length, dateRatio: vals.length ? dates / vals.length : 0, textLen });
    }
    if (map.title == null) {
      const cand = colStats.filter((c) => !used.has(c.ci) && c.n && c.dateRatio < 0.5).sort((a, b) => b.textLen - a.textLen)[0];
      if (cand) { map.title = cand.ci; used.add(cand.ci); }
      else if (map.notes != null) { map.title = map.notes; delete map.notes; }
    }
    if (map.due == null) {
      const cand = colStats.filter((c) => !used.has(c.ci) && c.dateRatio >= 0.6).sort((a, b) => b.dateRatio - a.dateRatio)[0];
      if (cand) { map.due = cand.ci; used.add(cand.ci); }
    }
    return map;
  }
  function rowsToDrafts(rows, headerIdx, map) {
    const out = [];
    rows.slice(headerIdx + 1).forEach((r) => {
      const get = (k) => (map[k] == null ? '' : r[map[k]]);
      const rawTitle = get('title');
      if (cellEmpty(rawTitle)) return;
      const q = parseQuick(String(rawTitle));
      const d = map.due != null ? parseDateValue(get('due')) : { due: null, time: null };
      const pr = parsePriority(get('priority'));
      const st = parseStatus(get('status'));
      const notes = get('notes');
      out.push({
        title: q.title || String(rawTitle).trim(),
        due: d.due || q.due || null,
        time: parseTimeValue(get('time')) || d.time || q.time || null,
        priority: pr || q.priority || 3,
        status: st || 'todo',
        project: String(get('project') || q.project || '').trim(),
        subtasks: parseSubtasks(get('subtasks')),
        notes: notes == null ? '' : String(notes).trim(),
        tags: splitList(get('tags'), /[,;]/)
      });
    });
    return out;
  }

  /* ---------- текст і списки ---------- */
  const BULLET = /^([-–—•*·▪◦●○■□►▸➤→]|\d{1,3}[.)]|\d{1,3}\.\d{1,3}[.)]?|[a-zа-яіїєґ][)])\s+(.*)$/i;
  function parseText(text, opts) {
    opts = opts || {};
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const drafts = [];
    let project = opts.project || '', cur = null, curIndent = -1, lastWasHeading = false;
    for (const raw of lines) {
      if (!raw.trim()) continue;
      const expanded = raw.replace(/\t/g, '    ').replace(/ /g, ' ');
      const indent = expanded.match(/^ */)[0].length;
      let s = expanded.trim(), m, bullet = false, done = false;
      if ((m = s.match(/^#{1,6}\s+(.+)$/))) { project = m[1].replace(/[:：]\s*$/, '').trim(); cur = null; lastWasHeading = true; continue; }
      if ((m = s.match(BULLET))) { bullet = true; s = m[2].trim(); }
      if ((m = s.match(/^\[(\s?|x|х|✓|✔)\]\s*(.*)$/i))) { done = m[1].trim() !== ''; s = m[2].trim(); bullet = true; }
      if (/^[☐☑✅✔✓]\s*/.test(s)) { done = !s.startsWith('☐'); s = s.replace(/^[☐☑✅✔✓]\s*/, ''); bullet = true; }
      if (/^~~.*~~$/.test(s)) { done = true; s = s.slice(2, -2); }
      if (!s) continue;
      if (cur && (m = s.match(/^(примітка|нотатка|коментар|опис|notes?)\s*[:：-]\s*(.*)$/i))) { cur.notes = (cur.notes ? cur.notes + '\n' : '') + m[2]; continue; }
      if (cur && /^>\s?/.test(s)) { cur.notes = (cur.notes ? cur.notes + '\n' : '') + s.replace(/^>\s?/, ''); continue; }
      if (!bullet && indent === 0 && /[:：]$/.test(s) && s.length <= 80) { project = s.replace(/[:：]$/, '').trim(); cur = null; lastWasHeading = true; continue; }
      if (cur && indent > curIndent) { cur.subtasks.push({ text: s, done }); continue; }
      const q = parseQuick(s, { project: '' });
      cur = { title: q.title || s, due: q.due, time: q.time, priority: q.priority, status: done ? 'done' : 'todo', project: q.project || project, subtasks: [], notes: '', tags: [] };
      curIndent = indent;
      drafts.push(cur);
      lastWasHeading = false;
    }
    return drafts;
  }

  /* Word (HTML від mammoth) → текстовий план із відступами + таблиці */
  function htmlToOutline(html) {
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    const rootEl = doc.body.firstChild;
    const lines = [], tables = [];
    const txt = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
    const isStruck = (el) => { const t = txt(el); if (!t) return false; const s = [...el.querySelectorAll('s,del,strike')].map(txt).join(' ').trim(); return s.length >= t.length * 0.9; };
    function walkList(list, depth) {
      for (const li of list.children) {
        if (li.tagName !== 'LI') continue;
        const clone = li.cloneNode(true);
        clone.querySelectorAll('ul,ol').forEach((x) => x.remove());
        const t = txt(clone);
        if (t) lines.push(' '.repeat(depth * 4) + '- ' + (isStruck(clone) ? '[x] ' : '') + t);
        li.querySelectorAll(':scope > ul, :scope > ol').forEach((sub) => walkList(sub, depth + 1));
      }
    }
    for (const el of rootEl.children) {
      const tag = el.tagName;
      if (/^H[1-6]$/.test(tag)) { const t = txt(el); if (t) lines.push('# ' + t); }
      else if (tag === 'UL' || tag === 'OL') walkList(el, 0);
      else if (tag === 'TABLE') {
        const rows = [...el.querySelectorAll('tr')].map((tr) => [...tr.children].map((td) => {
          const items = [...td.querySelectorAll('p,li')].map(txt).filter(Boolean);
          return items.length > 1 ? items.join('\n') : txt(td);
        }));
        if (rows.length) tables.push(rows);
      } else {
        const t = txt(el);
        if (!t) continue;
        const strongOnly = el.querySelector('strong') && txt(el.querySelector('strong')) === t;
        if (strongOnly && t.length <= 60 && !/[.!?]$/.test(t) && !BULLET.test(t)) lines.push('# ' + t.replace(/[:：]$/, ''));
        else lines.push((isStruck(el) ? '[x] ' : '') + t);
      }
    }
    return { text: lines.join('\n'), tables };
  }

  /* Розшифровка тексту: UTF-8, якщо не вийшло — Windows-1251 (старі CSV з Excel) */
  function decodeText(buf) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''); }
    catch (e) { try { return new TextDecoder('windows-1251').decode(buf); } catch (e2) { return new TextDecoder().decode(buf); } }
  }

  const api = { pad, ymd, parseYmd, todayStr, addDays, diffDays, parseQuick, parseDateValue, parseTimeValue, parsePriority, parseStatus,
    parseSubtasks, splitList, FIELDS, matchField, cleanRows, detectHeader, autoMap, rowsToDrafts, parseText, htmlToOutline, decodeText };
  root.KZImport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
