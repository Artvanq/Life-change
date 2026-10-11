// /api/files — вкладення до задач (Vercel Blob).
//   POST ?name=…&type=…  тіло = файл      → { url, pathname, access, size, contentType }
//   GET  ?pathname=…&access=…&name=…      → вміст файлу (лише з паролем)
//   DELETE ?pathname=…                    → видалити файл
// Файли зберігаються як приватні, якщо сховище це підтримує; інакше як публічні з випадковою адресою.
import { put, get, del } from '@vercel/blob';
import { guard } from './_lib.js';

const MAX = 4.4 * 1024 * 1024; // ліміт тіла запиту функцій Vercel ≈ 4.5 МБ

function blobConfigured(res) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  res.status(500).json({
    error: 'blob_not_configured',
    message: 'Файли ще не підключені: у Vercel відкрийте Storage → Create → Blob, підключіть до проєкту і зробіть Redeploy.',
  });
  return false;
}

async function readRaw(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  let total = 0;
  for await (const c of req) {
    total += c.length;
    if (total > MAX) throw Object.assign(new Error('too_large'), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

const safeName = (n) => String(n || 'file').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').slice(0, 150) || 'file';

export default async function handler(req, res) {
  if (!(await guard(req, res, { needRedis: false }))) return;
  if (!blobConfigured(res)) return;

  try {
    if (req.method === 'POST') {
      const name = safeName(req.query.name);
      const contentType = String(req.query.type || 'application/octet-stream').slice(0, 120);
      const body = await readRaw(req);
      if (!body.length) return res.status(400).json({ error: 'empty', message: 'Порожній файл' });
      if (body.length > MAX) return res.status(413).json({ error: 'too_large', message: 'Файл більший за 4 МБ' });
      const pathname = `attachments/${new Date().toISOString().slice(0, 7)}/${name}`;
      let result, access = 'private';
      try {
        result = await put(pathname, body, { access: 'private', addRandomSuffix: true, contentType });
      } catch (e) {
        // сховище створене як публічне — зберігаємо з випадковою (невгадуваною) адресою
        access = 'public';
        result = await put(pathname, body, { access: 'public', addRandomSuffix: true, contentType });
      }
      return res.status(200).json({ url: result.url, pathname: result.pathname, access, size: body.length, contentType });
    }

    if (req.method === 'GET') {
      const pathname = String(req.query.pathname || '');
      const access = req.query.access === 'public' ? 'public' : 'private';
      if (!pathname.startsWith('attachments/')) return res.status(400).json({ error: 'bad_path', message: 'Некоректний шлях' });
      const r = await get(pathname, { access });
      if (!r || r.statusCode !== 200) return res.status(404).json({ error: 'not_found', message: 'Файл не знайдено' });
      const name = safeName(req.query.name || pathname.split('/').pop());
      res.setHeader('Content-Type', r.blob.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(name)}`);
      res.setHeader('Cache-Control', 'private, max-age=300');
      const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
      return res.status(200).send(buf);
    }

    if (req.method === 'DELETE') {
      const pathname = String(req.query.pathname || '');
      if (!pathname.startsWith('attachments/')) return res.status(400).json({ error: 'bad_path', message: 'Некоректний шлях' });
      await del(pathname);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'method', message: 'Метод не підтримується' });
  } catch (e) {
    if (e.status === 413) return res.status(413).json({ error: 'too_large', message: 'Файл більший за 4 МБ' });
    return res.status(502).json({ error: 'blob', message: 'Помилка файлового сховища: ' + e.message });
  }
}
