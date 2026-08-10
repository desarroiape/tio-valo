/* =====================================================================
   Registro del formulario de venta en Google Sheets.

   No usa una cuenta de servicio: envía los datos a un Web App de
   Google Apps Script que hace el appendRow en tu hoja. Así funciona
   igual en Vercel y en localhost sin credenciales de Google.

   Configura dos variables de entorno:
     SHEETS_WEBHOOK_URL  -> URL del Web App de Apps Script (.../exec)
     SHEETS_SECRET       -> texto secreto que también pones en el script
                            (opcional, pero recomendado)

   El código del Apps Script está en apps-script/vender-sheets.gs.
   ===================================================================== */

// Cada juego se escribe en su propia pestaña con solo sus columnas. El Apps
// Script las busca sin distinguir mayúsculas ni tildes (una pestaña llamada
// "fortnite" vale), las crea si no existen y ubica cada dato bajo su
// encabezado, así que cambiar preguntas ya no obliga a estrenar pestaña.
export const SHEET_VALORANT = 'Valorant form';
export const SHEET_FORTNITE = 'Fortnite';

// Columnas comunes a ambos juegos (van al inicio y al final de la fila).
const COMMON_HEAD = ['fecha', 'folio', 'nombre', 'whatsapp', 'instagram', 'origen', 'inversion'];
const COMMON_TAIL = ['skins', 'precio', 'skins_destacadas', 'cuotas', 'notas'];

// Orden de columnas por juego. Debe coincidir con los HEADERS del Apps Script.
export const COLUMNS_VALORANT = [
  ...COMMON_HEAD,
  'explorant',
  'region', 'pais', 'rango_actual', 'rango_maximo', 'agentes',
  'correo', 'preguntas_recuperacion',
  // Los recibos de compra solo se preguntan en Valorant.
  'skins', 'precio', 'skins_destacadas', 'recibos', 'cuotas', 'notas',
];
export const COLUMNS_FORTNITE = [
  ...COMMON_HEAD,
  'nivel', 'pavos',
  // Preguntas de acceso y estado propias de Fortnite.
  'correo_completo', 'cambio_correo_ugi', 'cambio_nombre', 'historial_recuperacion',
  'plataformas_vinculadas', 'puede_desvincular', 'acceso_respuestas', 'bloqueos',
  ...COMMON_TAIL,
];

/* Sheets interpreta como fórmula cualquier celda que empiece por = + - @,
   así que un teléfono "+51925593376" entraba como #ERROR!. El apóstrofo
   inicial es la marca de "esto es texto": no se ve en la celda. */
function textoPlano(v) {
  const s = String(v ?? '').trim();
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

// Construye la fila completa; el Apps Script toma solo las columnas enviadas.
function buildRow(fields, folio) {
  return {
    fecha: new Date().toISOString(),
    folio: folio || '',
    nombre: fields.nombre || '',
    whatsapp: textoPlano(fields.contacto),
    instagram: fields.instagram || '',
    origen: fields.origen || '',
    inversion: fields.inversion || '',
    explorant: fields.explorant || '',
    region: fields.region || '',
    pais: fields.pais || '',
    rango_actual: fields.rango || '',
    rango_maximo: fields.rango_maximo || '',
    agentes: fields.agentes || '',
    nivel: fields.nivel || '',
    pavos: fields.pavos || '',
    correo_completo: fields.correo_completo || '',
    cambio_correo_ugi: fields.cambio_correo_ugi || '',
    cambio_nombre: fields.cambio_nombre || '',
    historial_recuperacion: fields.historial_recuperacion || '',
    plataformas_vinculadas: fields.plataformas_vinculadas || '',
    puede_desvincular: fields.puede_desvincular || '',
    acceso_respuestas: fields.acceso_respuestas || '',
    bloqueos: fields.bloqueos || '',
    correo: fields.correo || '',
    skins: fields.skins || '',
    precio: fields.precio || '',
    skins_destacadas: fields.skins_destacadas || '',
    recibos: fields.recibos || '',
    preguntas_recuperacion: fields.preguntas_recuperacion || '',
    cuotas: fields.cuotas || '',
    notas: fields.notas || '',
  };
}

/* Añade una fila a la pestaña del juego correspondiente. Devuelve
   { skipped: true } si no hay URL configurada; lanza error si la URL
   está configurada pero falla. */
export async function appendToSheet({ env, fields = {}, folio }) {
  const url = env.SHEETS_WEBHOOK_URL;
  if (!url) return { skipped: true };

  const ft = fields.juego === 'fortnite';
  const sheet = ft ? SHEET_FORTNITE : SHEET_VALORANT;
  const columns = ft ? COLUMNS_FORTNITE : COLUMNS_VALORANT;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret: env.SHEETS_SECRET || '',
      sheet,
      columns,
      row: buildRow(fields, folio),
    }),
  });

  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { /* respuesta no-JSON */ }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}: ${text.slice(0, 120)}`);
  }
  return { skipped: false, ok: true };
}
