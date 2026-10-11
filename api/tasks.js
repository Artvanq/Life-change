// /api/tasks — читання і збереження задач (Upstash Redis, один хеш kz:tasks).
//   GET                      → { tasks: [...] }
//   POST { put:[...], del:[...] } → пакетне збереження (так працює застосунок)
//   PUT ?id=… / DELETE ?id=… → одна задача (для сумісності)
import { redis, guard, readJson } from './_lib.js';

const KEY = 'kz:tasks';
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_TASK = 200_000;

function prepare(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) throw Object.assign(new Error('Очікується об’єкт задачі'), { status: 400 });
  const id = String(task.id || '');
  if (!ID_RE.test(id)) throw Object.assign(new Error('Некоректний id задачі'), { status: 400 });
  const json = JSON.stringify({ ...task, id });
  if (json.length > MAX_TASK) throw Object.assign(new Error('Задача завелика'), { status: 413 });
  return [id, json];
}

export default async function handler(req, res) {
  if (!(await guard(req, res))) return;
  try {
    if (req.method === 'GET') {
      const flat = (await redis(['HGETALL', KEY])) || [];
      const tasks = [];
      for (let i = 0; i < flat.length; i += 2) {
        try { tasks.push({ ...JSON.parse(flat[i + 1]), id: flat[i] }); } catch { /* пропускаємо пошкоджений запис */ }
      }
      return res.status(200).json({ tasks });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const puts = Array.isArray(body.put) ? body.put.map(prepare) : [];
      const dels = Array.isArray(body.del) ? body.del.map(String).filter((id) => ID_RE.test(id)) : [];
      // частинами, щоб не впертися в ліміт розміру запиту Redis
      let batch = [], size = 0;
      const send = async () => { if (batch.length) await redis(['HSET', KEY, ...batch]); batch = []; size = 0; };
      for (const [id, json] of puts) {
        if (size + json.length > 600_000) await send();
        batch.push(id, json); size += json.length;
      }
      await send();
      for (let i = 0; i < dels.length; i += 200) await redis(['HDEL', KEY, ...dels.slice(i, i + 200)]);
      return res.status(200).json({ ok: true, saved: puts.length, deleted: dels.length });
    }

    const id = String(req.query.id || '');
    if (!ID_RE.test(id)) return res.status(400).json({ error: 'bad_id', message: 'Некоректний id задачі' });
    if (req.method === 'PUT') {
      const body = await readJson(req);
      const [, json] = prepare({ ...body, id });
      await redis(['HSET', KEY, id, json]);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      await redis(['HDEL', KEY, id]);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'method', message: 'Метод не підтримується' });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: 'bad_request', message: e.message });
    return res.status(502).json({ error: 'storage', message: 'Помилка сховища: ' + e.message });
  }
}
