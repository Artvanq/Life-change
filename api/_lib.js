// Спільні функції для серверних маршрутів. Файли з «_» у папці api не стають окремими адресами.
import crypto from 'node:crypto';

export const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
export const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const PASSWORD = process.env.APP_PASSWORD;

export async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  let j = {};
  try { j = await r.json(); } catch { /* порожня відповідь */ }
  if (!r.ok || j.error) throw new Error(j.error || `Redis HTTP ${r.status}`);
  return j.result;
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Повертає true, якщо запит можна обслуговувати; інакше вже відправив відповідь.
export async function guard(req, res, { needRedis = true } = {}) {
  res.setHeader('Cache-Control', 'no-store');
  if (!PASSWORD || (needRedis && (!REDIS_URL || !REDIS_TOKEN))) {
    res.status(500).json({
      error: 'not_configured',
      message: 'Сервер не налаштований: додайте Upstash Redis і змінну APP_PASSWORD у Vercel, потім зробіть Redeploy.',
    });
    return false;
  }
  const auth = req.headers.authorization || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!given || !safeEqual(given, PASSWORD)) {
    await new Promise((r) => setTimeout(r, 400)); // уповільнює підбір пароля
    res.status(401).json({ error: 'auth', message: 'Невірний пароль' });
    return false;
  }
  return true;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
