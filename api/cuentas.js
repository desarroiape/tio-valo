/* Público: devuelve las cuentas disponibles para el catálogo. */
import { listCuentas } from '../lib/supabase.mjs';

/* Lista blanca de lo que puede salir de aquí. La tabla guarda además datos
   internos del trato (origen, inversion, cambio_correo_ugi,
   historial_recuperacion, bloqueos) que solo se ven en /admin: si se
   devolviera la fila entera, cualquiera podría leerlos desde el navegador.
   Un campo nuevo no se publica hasta que se agregue a esta lista. */
const CAMPOS_PUBLICOS = [
  'id', 'juego', 'codigo', 'titulo', 'descripcion', 'precio', 'skins',
  'destacadas', 'correo', 'rango', 'region', 'pais', 'rango_maximo', 'agentes',
  'plataforma', 'nivel', 'pavos', 'og', 'cambio_nombre',
  'plataformas_vinculadas', 'puede_desvincular',
  'recibos', 'recuperacion', 'link', 'imagenes', 'estado',
];

const soloPublicos = (c) => Object.fromEntries(
  CAMPOS_PUBLICOS.filter(k => k in c).map(k => [k, c[k]])
);

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
    return res.status(200).json({ ok: true, cuentas: cuentas.map(soloPublicos) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
