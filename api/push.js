// /api/push — сповіщення на пристрої.
//   GET                                   → { publicKey, settings, devices, lastCronRun }
//   POST { action:'subscribe', subscription, device }
//   POST { action:'unsubscribe', endpoint }
//   POST { action:'settings', settings:{ digest, digestHour, tz } }
//   POST { action:'test' }                → тестове повідомлення на всі пристрої
import { guard, readJson, redis } from './_lib.js';
import { getVapid, saveSub, removeSub, getSettings, saveSettings, sendAll, listSubs } from './_push.js';

export default async function handler(req, res) {
  if (!(await guard(req, res))) return;
  try {
    if (req.method === 'GET') {
      const [keys, settings, subs, state] = await Promise.all([getVapid(), getSettings(), listSubs(), redis(['GET', 'kz:cron'])]);
      let st = {};
      try { st = state ? JSON.parse(state) : {}; } catch { st = {}; }
      return res.status(200).json({
        publicKey: keys.publicKey, settings,
        devices: subs.map((s) => ({ id: s.id, device: s.device, createdAt: s.createdAt })),
        lastCronRun: st.lastRun || null, lastDigest: st.lastDigest || null, lastBackup: st.lastBackup || null,
      });
    }
    if (req.method === 'POST') {
      const body = await readJson(req);
      if (body.action === 'subscribe') { const id = await saveSub(body.subscription, body.device); return res.status(200).json({ ok: true, id }); }
      if (body.action === 'unsubscribe') { await removeSub(body.endpoint); return res.status(200).json({ ok: true }); }
      if (body.action === 'settings') { const s = await saveSettings(body.settings || {}); return res.status(200).json({ ok: true, settings: s }); }
      if (body.action === 'test') {
        const r = await sendAll({ title: 'Контроль задач', body: 'Сповіщення працюють. Так виглядатимуть нагадування.', tag: 'test' });
        return res.status(200).json({ ok: true, ...r });
      }
      return res.status(400).json({ error: 'bad_action', message: 'Невідома дія' });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method', message: 'Метод не підтримується' });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: 'bad_request', message: e.message });
    return res.status(502).json({ error: 'push', message: 'Помилка сповіщень: ' + e.message });
  }
}
