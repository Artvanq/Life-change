import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from '../api/_lib.js';
import { unreferencedAttachments } from '../api/_attachments.js';
import vm from 'node:vm';
import fs from 'node:fs';

test('malformed JSON is a client error', async () => {
  await assert.rejects(readJson({ body: '{bad' }), { status: 400 });
});
test('streamed JSON has a size limit', async () => {
  const req = { async *[Symbol.asyncIterator]() { yield Buffer.alloc(1_500_001); } };
  await assert.rejects(readJson(req), { status: 413 });
});
test('JSON stream parses UTF-8', async () => {
  const req = { async *[Symbol.asyncIterator]() { yield Buffer.from('{"title":"Задача"}'); } };
  assert.deepEqual(await readJson(req), { title: 'Задача' });
});
function appContext(values = {}) {
  const elements = new Map();
  const el = () => ({ innerHTML: '', textContent: '', style: {}, focus(){}, classList: { add(){}, remove(){}, toggle(){} }, setAttribute(){}, querySelector(){ return null; }, querySelectorAll(){ return []; } });
  const document = { querySelector(){ return el(); }, getElementById(id){ if (!elements.has(id)) elements.set(id, el()); return elements.get(id); }, querySelectorAll(){ return []; }, addEventListener(){}, documentElement: { setAttribute(){}, removeAttribute(){} }, body: el() };
  const context = vm.createContext({ document, localStorage:{ getItem:k=>values[k] ?? null, setItem(){}, removeItem(){} }, navigator:{ onLine:true }, console, Intl, Date, URL, setInterval(){}, setTimeout(){}, clearTimeout(){}, matchMedia:()=>({matches:false}), location:{hash:'',pathname:'/'}, history:{replaceState(){}}, fetch:async()=>{throw Error('offline');} });
  context.window = context;
  context.addEventListener = () => {};
  vm.runInContext(fs.readFileSync(new URL('../public/importer.js', import.meta.url),'utf8'),context);
  const source = fs.readFileSync(new URL('../public/app.js', import.meta.url),'utf8');
  vm.runInContext(source.replace('boot();\n})();', 'boot();\nwindow.testApp = { S, apply, syncBadge, renderMain, doImport, inlineViewable, pull, flush, normalize, debouncedTask, flushDebounced, nextDue, renderDrawer, setToken(v) { TOKEN = v; } };\n})();'),context);
  elements.context = context;
  return elements;
}
test('login renders with an empty cache', () => {
  assert.match(appContext().get('main').innerHTML, /login-pass/);
});
test('a corrupt cache cannot prevent startup', () => {
  assert.match(appContext({'kz.tasks.v2':'{}','kz.pending.v2':'[]'}).get('main').innerHTML, /login-pass/);
});
test('malformed task collections cannot prevent startup', () => {
  assert.match(appContext({'kz.tasks.v2':JSON.stringify([null,{id:'a',title:42,subtasks:{},history:null}])}).get('main').innerHTML, /login-pass/);
});
test('a failed save is reported and keeps pending edits', async () => {
  const { context } = appContext();
  const app = context.testApp;
  app.setToken('test');
  app.S.pending.a = { op:'del' };
  assert.equal(await app.flush(), false);
  assert.equal(app.S.sync, 'error');
  assert.ok(app.S.pending.a);
});
test('a stale read preserves an edit acknowledged during the request', async () => {
  const { context } = appContext();
  const app = context.testApp;
  app.setToken('test');
  app.S.pending.a = { op:'del' };
  let resolve;
  context.fetch = () => new Promise(r => { resolve = r; });
  const reading = app.pull();
  delete app.S.pending.a;
  resolve({ ok:true, status:200, json:async()=>({ tasks:[{id:'a',title:'Deleted task'}] }) });
  assert.equal(await reading, true);
  assert.equal(app.S.tasks.length, 0);
});
test('delayed edits belong to the original task after switching', () => {
  const { context } = appContext();
  const app = context.testApp;
  app.S.tasks = [app.normalize({id:'a',title:'First'}), app.normalize({id:'b',title:'Second'})];
  app.S.openId = 'a';
  app.debouncedTask('title', {title:'Edited first'}, 500);
  app.S.openId = 'b';
  app.flushDebounced();
  assert.equal(app.S.tasks[0].title, 'Edited first');
  assert.equal(app.S.tasks[1].title, 'Second');
});
test('pending text cannot resurrect a deleted task', () => {
  const { context } = appContext();
  const app = context.testApp;
  app.S.tasks = [app.normalize({id:'a',title:'First'})];
  app.S.openId = 'a';
  app.debouncedTask('notes', {notes:'Edited'}, 500);
  app.S.tasks = [];
  app.flushDebounced();
  assert.equal(app.S.tasks.length, 0);
});
test('cleanup keeps attachments referenced by another task', () => {
  const removed = [{attachments:[{pathname:'attachments/shared'}, {pathname:'attachments/unused'}, {pathname:'attachments/unused'}]}];
  assert.deepEqual(unreferencedAttachments(removed, [{attachments:[{pathname:'attachments/shared'}]}]), ['attachments/unused']);
});
test('cleanup tolerates malformed attachment collections', () => {
  assert.deepEqual(unreferencedAttachments([{attachments:{}}, {attachments:[null,{pathname:'other/file'}]}], []), []);
});
test('monthly recurrence clamps to the last day of February', () => {
  const { context } = appContext();
  assert.equal(context.testApp.nextDue('2026-01-31','monthly'), '2026-02-28');
});
test('annual recurrence keeps leap-day tasks in February', () => {
  const { context } = appContext();
  assert.equal(context.testApp.nextDue('2024-02-29','yearly'), '2025-02-28');
  assert.equal(context.testApp.nextDue('2024-02-29','custom', {repeatUnit:'year',repeatEvery:1}), '2025-02-28');
});
test('delayed subtask edits are kept in untitled drafts', () => {
  const { context } = appContext();
  const app = context.testApp;
  app.S.draft = app.normalize({id:'draft',subtasks:[{id:'s',text:''}]});
  app.debouncedTask('subs', {subtasks:[{id:'s',text:'Step',done:false}]}, 500);
  app.flushDebounced();
  assert.equal(app.S.draft.subtasks[0].text, 'Step');
});

test('a stale read preserves a new edit saved entirely during the request', async () => {
  const { context } = appContext();
  const app = context.testApp;
  app.setToken('test');
  app.S.tasks = [app.normalize({id:'a',title:'Old'})];
  let finishRead;
  context.fetch = (path, opts) => opts.method === 'GET'
    ? new Promise(resolve => { finishRead = resolve; })
    : Promise.resolve({ok:true,status:200,json:async()=>({ok:true})});
  const reading = app.pull();
  app.apply([app.normalize({id:'a',title:'New'})]);
  assert.equal(await app.flush(), true);
  assert.equal(Object.keys(app.S.pending).length, 0);
  finishRead({ok:true,status:200,json:async()=>({tasks:[{id:'a',title:'Old'}]})});
  assert.equal(await reading, true);
  assert.equal(app.S.tasks[0].title, 'New');
});

test('a stale read cannot resurrect a deletion saved during the request', async () => {
  const { context } = appContext();
  const app = context.testApp;
  app.setToken('test');
  app.S.tasks = [app.normalize({id:'a',title:'Old'})];
  let finishRead;
  context.fetch = (path, opts) => opts.method === 'GET'
    ? new Promise(resolve => { finishRead = resolve; })
    : Promise.resolve({ok:true,status:200,json:async()=>({ok:true})});
  const reading = app.pull();
  app.apply([], ['a']);
  await app.flush();
  finishRead({ok:true,status:200,json:async()=>({tasks:[{id:'a',title:'Old'}]})});
  assert.equal(await reading, true);
  assert.equal(app.S.tasks.length, 0);
});

test('sync status does not claim success before a read or after a failed read', () => {
  const app = appContext().context.testApp;
  assert.doesNotMatch(app.syncBadge(), /Синхронізовано/);
  app.S.sync = 'error';
  assert.match(app.syncBadge(), /Не вдалося оновити дані/);
  app.S.sync = 'offline';
  assert.match(app.syncBadge(), /локальні дані/);
});

test('invalid dates and times from stored data are dropped', () => {
  const { context } = appContext();
  const t = context.testApp.normalize({ id:'a', due:'2026-02-30', time:'25:00', tags:['ok', 3, ''], createdAt:'never', repeat:'sometimes', remind:'soon' });
  assert.equal(t.due, null);
  assert.equal(t.time, null);
  assert.deepEqual([...t.tags], ['ok']);
  assert.ok(!Number.isNaN(Date.parse(t.createdAt)));
  assert.equal(t.repeat, 'none');
  assert.equal(t.remind, 'none');
  assert.equal(context.testApp.normalize({ id:'b', due:'2026-10-27', time:'09:05' }).due, '2026-10-27');
});
test('a task with broken timestamps still opens', () => {
  const { context } = appContext();
  const app = context.testApp;
  app.S.mode = 'app';
  app.S.tasks = [app.normalize({ id:'a', title:'T', history:[{ at:'bad', f:'due', from:'x', to:'y' }], attachments:[{ id:'f', name:'a.pdf', uploadedAt:'bad' }] })];
  app.S.openId = 'a';
  assert.doesNotThrow(() => app.renderDrawer());
});
test('undo is dropped once the same task is edited again', () => {
  const { context } = appContext();
  const app = context.testApp;
  app.S.mode = 'app';
  app.S.tasks = [app.normalize({ id:'a', title:'First' }), app.normalize({ id:'b', title:'Other' })];
  app.apply([Object.assign(app.normalize(app.S.tasks[0]), { priority:1 })], [], 'Changed');
  app.apply([Object.assign(app.normalize(app.S.tasks[1]), { notes:'x' })]);
  assert.ok(app.S.undo, 'an unrelated edit keeps undo');
  app.apply([Object.assign(app.normalize(app.S.tasks[0]), { title:'Later' })]);
  assert.equal(app.S.undo, null);
});
test('restored tasks with unsupported ids get new ones', () => {
  const { context } = appContext();
  const app = context.testApp;
  app.S.mode = 'app';
  app.S.view = 'list';
  app.S.imp = { backup:true, drafts:[{ on:true, id:'bad id!', title:'A', subtasks:[] }, { on:true, id:'good_1', title:'B', subtasks:[] }], defaults:{ project:'', due:'' } };
  app.doImport();
  const ids = app.S.tasks.map(t => t.id);
  assert.ok(ids.every(id => /^[A-Za-z0-9_-]{1,64}$/.test(id)));
  assert.ok(ids.includes('good_1'));
});
test('the board shows its project filter so it can be cleared', () => {
  const elements = appContext();
  const app = elements.context.testApp;
  app.S.mode = 'app'; app.S.view = 'board'; app.S.f.project = 'Дім';
  app.renderMain();
  assert.match(elements.get('main').innerHTML, /data-act="board-all"/);
});
test('only passive file types open inside the app', () => {
  const { inlineViewable } = appContext().context.testApp;
  assert.ok(inlineViewable('application/pdf'));
  assert.ok(inlineViewable('image/png'));
  assert.ok(!inlineViewable('text/html'));
  assert.ok(!inlineViewable('image/svg+xml'));
  assert.ok(!inlineViewable(''));
});
