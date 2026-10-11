// /api/cron — фонова робота за розкладом:
//   • нагадування до задач (час нагадування настав);
//   • ранкове зведення на день;
//   • щоденна резервна копія (зберігається 30 днів);
//   • остаточне видалення задач, що пролежали в кошику понад 30 днів.
// Vercel Cron викликає її раз на день (vercel.json). Для точних нагадувань протягом дня
// її можна викликати частіше зовнішнім таймером: /api/cron?secret=<CRON_SECRET> (див. README).
import { redis, REDIS_URL, REDIS_TOKEN } from './_lib.js';
import { getSettings, sendAll, localParts } from './_push.js';

const TASKS = 'kz:tasks';
const DAY = 86400000;
const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return f[2]; if (b > 1 && b < 5) return f[1]; if (b === 1) return f[0]; return f[2]; };

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  const ua = String(req.headers['user-agent'] || '');
  if (secret) return req.headers.authorization === `Bearer ${secret}` || req.query.secret === secret;
  return ua.startsWith('vercel-cron');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(500).json({ error: 'not_configured' });
  if (!authorized(req)) return res.status(401).json({ error: 'auth' });
  const isDaily = String(req.headers['user-agent'] || '').startsWith('vercel-cron');
  const now = Date.now();
  const report = { reminders: 0, digest: false, backup: false, purged: 0 };

  let state = {};
  try { state = JSON.parse((await redis(['GET', 'kz:cron'])) || '{}'); } catch { state = {}; }
  const settings = await getSettings();
  const local = localParts(settings.tz);

  const flat = (await redis(['HGETALL', TASKS])) || [];
  const tasks = [];
  for (let i = 0; i < flat.length; i += 2) { try { tasks.push({ ...JSON.parse(flat[i + 1]), id: flat[i] }); } catch { /* пропуск */ } }
  const live = tasks.filter((t) => !t.deletedAt);
  const canPush = !!(await redis(['HLEN', 'kz:subs']));

  // 1. Нагадування
  if (canPush) {
    const reminded = {};
    const rf = (await redis(['HGETALL', 'kz:reminded'])) || [];
    for (let i = 0; i < rf.length; i += 2) reminded[rf[i]] = rf[i + 1];
    const due = live.filter((t) => t.remindAt && t.status !== 'done' && reminded[t.id] !== t.remindAt
      && Date.parse(t.remindAt) <= now + 60000 && now - Date.parse(t.remindAt) < 12 * 3600000);
    for (const t of due) {
      const when = [t.due ? t.due.split('-').reverse().join('.') : '', t.time || ''].filter(Boolean).join(' о ');
      await sendAll({ title: '⏰ ' + t.title, body: [when ? 'Термін: ' + when : '', t.project ? '#' + t.project : ''].filter(Boolean).join(' · ') || 'Нагадування', tag: 'r-' + t.id, id: t.id });
      await redis(['HSET', 'kz:reminded', t.id, t.remindAt]);
      report.reminders++;
    }
  }

  // 2. Ранкове зведення
  if (canPush && settings.digest && state.lastDigest !== local.date && (local.hour >= settings.digestHour || isDaily)) {
    const today = local.date;
    const open = live.filter((t) => t.status !== 'done');
    const overdue = open.filter((t) => t.due && t.due < today);
    const todays = open.filter((t) => t.due === today).sort((a, b) => (a.time || '99').localeCompare(b.time || '99') || a.priority - b.priority);
    if (overdue.length || todays.length) {
      const title = todays.length ? `Сьогодні ${todays.length} ${plural(todays.length, ['задача', 'задачі', 'задач'])}` : 'Є прострочені задачі';
      const parts = [];
      if (overdue.length) parts.push(`прострочено: ${overdue.length}`);
      const names = todays.slice(0, 4).map((t) => (t.time ? t.time + ' ' : '') + t.title);
      if (names.length) parts.push(names.join(', ') + (todays.length > 4 ? '…' : ''));
      await sendAll({ title: '☀️ ' + title, body: parts.join(' · '), tag: 'digest-' + today });
    }
    state.lastDigest = local.date;
    report.digest = true;
  }

  // 3. Щоденна резервна копія
  if (state.lastBackup !== local.date) {
    try {
      await redis(['SET', 'kz:backup:' + local.date, JSON.stringify(tasks), 'EX', String(30 * 86400)]);
      state.lastBackup = local.date;
      report.backup = true;
    } catch (e) { report.backupError = e.message; }
  }

  // 4. Кошик: остаточно видаляємо записи старші за 30 днів
  const old = tasks.filter((t) => t.deletedAt && now - Date.parse(t.deletedAt) > 30 * DAY);
  if (old.length) {
    for (let i = 0; i < old.length; i += 200) await redis(['HDEL', TASKS, ...old.slice(i, i + 200).map((t) => t.id)]);
    report.purged = old.length;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const paths = old.flatMap((t) => (t.attachments || []).map((a) => a.pathname)).filter(Boolean);
      if (paths.length) { try { const { del } = await import('@vercel/blob'); await del(paths); } catch { /* не критично */ } }
    }
  }

  state.lastRun = new Date(now).toISOString();
  await redis(['SET', 'kz:cron', JSON.stringify(state)]);
  return res.status(200).json({ ok: true, ...report });
}
