/* Cierra la sesión del panel /admin. */
import { clearCookieHeader } from '../../lib/auth.mjs';

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', clearCookieHeader(!!process.env.VERCEL));
  return res.status(200).json({ ok: true });
}
