/* Login del panel /admin: valida la contraseña y entrega la cookie de sesión. */
import { checkPassword, setCookieHeader } from '../../lib/auth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }
  try {
    const body = await readJson(req);
    if (!checkPassword(body?.password)) {
      await new Promise(r => setTimeout(r, 400)); // frena intentos por fuerza bruta
      return res.status(401).json({ ok: false, error: 'Contraseña incorrecta' });
    }
    res.setHeader('Set-Cookie', setCookieHeader(!!process.env.VERCEL));
    return res.status(200).json({ ok: true });
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
