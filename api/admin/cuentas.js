/* CRUD de cuentas para el panel /admin. Todo requiere sesión válida. */
import { isAuthed } from '../../lib/auth.mjs';
import { listCuentas, createCuenta, updateCuenta, deleteCuenta } from '../../lib/supabase.mjs';
import { anunciarCuenta } from '../../lib/discord.mjs';
import { anunciarCuentaTelegram } from '../../lib/telegram.mjs';

// Más margen: publicar descarga las fotos y las sube a Discord.
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (!isAuthed(req.headers)) return res.status(401).json({ ok: false, error: 'No autorizado' });
  try {
    if (req.method === 'GET') {
      const cuentas = await listCuentas({ soloDisponibles: false });
      return res.status(200).json({ ok: true, cuentas });
    }

    if (req.method === 'POST') {
      const b = await readJson(req);

      // Modo "solo anunciar": reenvía una cuenta ya existente a Discord + Telegram
      // (para publicar cuentas que se subieron antes de tener los anuncios).
      if (b.accion === 'anunciar') {
        if (!b.id) throw new Error('Falta id');
        const cuentas = await listCuentas({ soloDisponibles: false });
        const cuenta = cuentas.find(c => String(c.id) === String(b.id));
        if (!cuenta) throw new Error('Cuenta no encontrada');
        const out = { discord: false, telegram: false, errores: [] };
        try { await anunciarCuenta(cuenta); out.discord = true; }
        catch (e) { out.errores.push('Discord: ' + e.message); }
        try { await anunciarCuentaTelegram(cuenta); out.telegram = true; }
        catch (e) { out.errores.push('Telegram: ' + e.message); }
        return res.status(200).json({ ok: true, ...out });
      }

      if (!b.titulo || !String(b.titulo).trim()) throw new Error('El título es obligatorio');
      if (!b.codigo || !String(b.codigo).trim()) throw new Error('El ID es obligatorio');
      const juego = b.juego === 'fortnite' ? 'fortnite' : 'valorant';
      const cuenta = await createCuenta({
        juego,
        codigo: String(b.codigo).trim(),
        titulo: String(b.titulo).trim(),
        descripcion: b.descripcion || null,
        precio: numOrNull(b.precio),
        skins: numOrNull(b.skins),
        destacadas: b.destacadas || null,
        correo: b.correo || null,
        // Valorant
        rango: juego === 'valorant' ? (b.rango || null) : null,
        region: juego === 'valorant' ? (b.region || null) : null,
        pais: juego === 'valorant' ? (b.pais || null) : null,
        rango_maximo: juego === 'valorant' ? (b.rango_maximo || null) : null,
        agentes: juego === 'valorant' ? (b.agentes || null) : null,
        // Fortnite
        pavos: juego === 'fortnite' ? numOrNull(b.pavos) : null,
        nivel: juego === 'fortnite' ? numOrNull(b.nivel) : null,
        plataforma: juego === 'fortnite' ? (b.plataforma || null) : null,
        og: juego === 'fortnite' ? !!b.og : false,
        // Compartidos
        recibos: !!b.recibos,
        recuperacion: !!b.recuperacion,
        link: b.link ? String(b.link).trim() : null,
        imagenes: Array.isArray(b.imagenes) ? b.imagenes : [],
        estado: 'disponible',
      });
      // Anuncios (no bloquean la publicación si fallan).
      try { await anunciarCuenta(cuenta); }
      catch (e) { console.error('Anuncio Discord:', e.message); }
      try { await anunciarCuentaTelegram(cuenta); }
      catch (e) { console.error('Anuncio Telegram:', e.message); }
      return res.status(200).json({ ok: true, cuenta });
    }

    if (req.method === 'PATCH') {
      const b = await readJson(req);
      if (!b.id) throw new Error('Falta id');
      const patch = { ...(b.patch || {}) };
      // Al marcar vendida se guarda la fecha (se muestra 7 días más y luego se oculta sola).
      if (patch.estado === 'vendida') patch.vendida_en = new Date().toISOString();
      else if (patch.estado === 'disponible') patch.vendida_en = null;
      const cuenta = await updateCuenta(b.id, patch);
      return res.status(200).json({ ok: true, cuenta });
    }

    if (req.method === 'DELETE') {
      const id = new URL(req.url, 'http://x').searchParams.get('id');
      if (!id) throw new Error('Falta id');
      await deleteCuenta(id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

function numOrNull(v) {
  return v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
}

async function readJson(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
