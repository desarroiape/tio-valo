/* Sube UNA imagen al bucket (una por petición, para no exceder límites). Requiere sesión. */
import { isAuthed } from '../../lib/auth.mjs';
import { uploadImagen } from '../../lib/supabase.mjs';

export default async function handler(req, res) {
  if (!isAuthed(req.headers)) return res.status(401).json({ ok: false, error: 'No autorizado' });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
  try {
    const body = await readJson(req);
    const url = await uploadImagen(body?.dataUrl);
    return res.status(200).json({ ok: true, url });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

async function readJson(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
