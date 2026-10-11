// /api/backup — щоденні резервні копії на сервері (зберігаються 30 днів).
//   GET            → { backups: [{ date, count }] }
//   GET ?date=…    → { date, tasks }
//   POST           → зробити копію зараз
import { guard, redis } from './_lib.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  if (!(await guard(req, res))) return;
  try {
    if (req.method === 'GET' && req.query.date) {
      const date = String(req.query.date);
      if (!DATE_RE.test(date)) return res.status(400).json({ error: 'bad_date', message: 'Некоректна дата' });
      const raw = await redis(['GET', 'kz:backup:' + date]);
      if (!raw) return res.status(404).json({ error: 'not_found', message: 'Копію не знайдено' });
      return res.status(200).json({ date, tasks: JSON.parse(raw) });
    }
    if (req.method === 'GET') {
      const keys = (await redis(['KEYS', 'kz:backup:*'])) || [];
      const dates = keys.map((k) => k.slice(10)).filter((d) => DATE_RE.test(d)).sort().reverse();
      const backups = [];
      for (const date of dates) {
        const len = await redis(['STRLEN', 'kz:backup:' + date]);
        backups.push({ date, size: len });
      }
      return res.status(200).json({ backups });
    }
    if (req.method === 'POST') {
      const flat = (await redis(['HGETALL', 'kz:tasks'])) || [];
      const tasks = [];
      for (let i = 0; i < flat.length; i += 2) { try { tasks.push({ ...JSON.parse(flat[i + 1]), id: flat[i] }); } catch { /* пропуск */ } }
      const date = new Date().toISOString().slice(0, 10);
      await redis(['SET', 'kz:backup:' + date, JSON.stringify(tasks), 'EX', String(30 * 86400)]);
      return res.status(200).json({ ok: true, date, count: tasks.length });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method', message: 'Метод не підтримується' });
  } catch (e) {
    return res.status(502).json({ error: 'storage', message: 'Помилка сховища: ' + e.message });
  }
}
