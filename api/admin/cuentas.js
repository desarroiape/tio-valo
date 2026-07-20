/* CRUD de cuentas para el panel /admin. Todo requiere sesión válida. */
import { isAuthed } from '../../lib/auth.mjs';
import { listCuentas, createCuenta, updateCuenta, deleteCuenta } from '../../lib/supabase.mjs';
import { anunciarCuenta } from '../../lib/discord.mjs';

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
      if (!b.titulo || !String(b.titulo).trim()) throw new Error('El título es obligatorio');
      const juego = b.juego === 'fortnite' ? 'fortnite' : 'valorant';
      const cuenta = await createCuenta({
        juego,
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
      // Anuncio en Discord (no bloquea la publicación si falla).
      try { await anunciarCuenta(cuenta); }
      catch (e) { console.error('Anuncio Discord:', e.message); }
      return res.status(200).json({ ok: true, cuenta });
    }

    if (req.method === 'PATCH') {
      const b = await readJson(req);
      if (!b.id) throw new Error('Falta id');
      const cuenta = await updateCuenta(b.id, b.patch || {});
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
