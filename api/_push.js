// Спільне для сповіщень: ключі VAPID (створюються автоматично і зберігаються в Redis), підписки, розсилка.
import crypto from 'node:crypto';
import webpush from 'web-push';
import { redis } from './_lib.js';

const SUBS = 'kz:subs';
const SETTINGS = 'kz:settings';
export const DEFAULT_SETTINGS = { digest: true, digestHour: 8, tz: 'Europe/Kyiv' };

let vapidReady = null;
export async function getVapid() {
  if (vapidReady) return vapidReady;
  vapidReady = (async () => {
    let keys = null;
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    } else {
      const raw = await redis(['GET', 'kz:vapid']);
      if (raw) keys = JSON.parse(raw);
      else {
        keys = webpush.generateVAPIDKeys();
        // NX: якщо два запити створили ключі одночасно, лишається перший
        await redis(['SET', 'kz:vapid', JSON.stringify(keys), 'NX']);
        keys = JSON.parse(await redis(['GET', 'kz:vapid']));
      }
    }
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    const subject = process.env.VAPID_SUBJECT || (host ? `https://${host}` : 'mailto:kontrol@example.com');
    webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
    return keys;
  })().catch((e) => { vapidReady = null; throw e; });
  return vapidReady;
}

export const subId = (endpoint) => crypto.createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 32);

export async function listSubs() {
  const flat = (await redis(['HGETALL', SUBS])) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) { try { out.push({ id: flat[i], ...JSON.parse(flat[i + 1]) }); } catch { /* пропускаємо */ } }
  return out;
}
export async function saveSub(sub, device) {
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) throw Object.assign(new Error('Некоректна підписка'), { status: 400 });
  const id = subId(sub.endpoint);
  await redis(['HSET', SUBS, id, JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys, device: String(device || '').slice(0, 80), createdAt: new Date().toISOString() })]);
  return id;
}
export async function removeSub(endpoint) { await redis(['HDEL', SUBS, subId(endpoint)]); }

export async function getSettings() {
  const raw = await redis(['GET', SETTINGS]);
  let s = {};
  try { s = raw ? JSON.parse(raw) : {}; } catch { s = {}; }
  return { ...DEFAULT_SETTINGS, ...s };
}
export async function saveSettings(patch) {
  const cur = await getSettings();
  const next = { ...cur };
  if (typeof patch.digest === 'boolean') next.digest = patch.digest;
  if (Number.isInteger(patch.digestHour) && patch.digestHour >= 0 && patch.digestHour <= 23) next.digestHour = patch.digestHour;
  if (typeof patch.tz === 'string' && patch.tz.length < 64) { try { new Intl.DateTimeFormat('uk-UA', { timeZone: patch.tz }); next.tz = patch.tz; } catch { /* лишаємо як було */ } }
  await redis(['SET', SETTINGS, JSON.stringify(next)]);
  return next;
}

// Надсилає повідомлення на всі пристрої. Неактуальні підписки видаляє.
export async function sendAll(payload) {
  await getVapid();
  const subs = await listSubs();
  let sent = 0, removed = 0, failed = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'high' });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { await redis(['HDEL', SUBS, s.id]); removed++; }
      else failed++;
    }
  }));
  return { sent, removed, failed, devices: subs.length };
}

// Дата і година в часовому поясі користувача
export function localParts(tz, date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour };
}
