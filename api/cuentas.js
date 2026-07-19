/* Público: devuelve las cuentas disponibles para el catálogo. */
import { listCuentas } from '../lib/supabase.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }
  try {
    const juego = new URL(req.url, 'http://x').searchParams.get('juego') || undefined;
    const cuentas = await listCuentas({ soloDisponibles: true, juego });
    // Sin caché: una cuenta recién publicada (y su enlace de Discord) funciona al instante.
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, cuentas });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
