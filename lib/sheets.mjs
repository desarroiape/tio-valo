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

// Orden de columnas de la hoja. Debe coincidir con el del Apps Script.
export const COLUMNS = [
  'fecha', 'folio', 'juego', 'nombre', 'whatsapp', 'instagram',
  'region', 'pais', 'rango_actual', 'rango_maximo', 'agentes',
  'plataforma', 'nivel', 'pavos', 'og',
  'correo', 'skins', 'precio', 'skins_destacadas',
  'recibos', 'preguntas_recuperacion', 'notas',
];

function buildRow(fields, folio) {
  const ft = fields.juego === 'fortnite';
  return {
    fecha: new Date().toISOString(),
    folio: folio || '',
    juego: ft ? 'Fortnite' : 'Valorant',
    nombre: fields.nombre || '',
    whatsapp: fields.contacto || '',
    instagram: fields.instagram || '',
    region: ft ? '' : (fields.region || ''),
    pais: ft ? '' : (fields.pais || ''),
    rango_actual: ft ? '' : (fields.rango || ''),
    rango_maximo: ft ? '' : (fields.rango_maximo || ''),
    agentes: ft ? '' : (fields.agentes || ''),
    plataforma: ft ? (fields.plataforma || '') : '',
    nivel: ft ? (fields.nivel || '') : '',
    pavos: ft ? (fields.pavos || '') : '',
    og: ft ? (fields.og || '') : '',
    correo: fields.correo || '',
    skins: fields.skins || '',
    precio: fields.precio || '',
    skins_destacadas: fields.skins_destacadas || '',
    recibos: fields.recibos || '',
    preguntas_recuperacion: fields.preguntas_recuperacion || '',
    notas: fields.notas || '',
  };
}

/* Añade una fila a la hoja. Devuelve { skipped: true } si no hay URL
   configurada; lanza error si la URL está configurada pero falla. */
export async function appendToSheet({ env, fields = {}, folio }) {
  const url = env.SHEETS_WEBHOOK_URL;
  if (!url) return { skipped: true };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret: env.SHEETS_SECRET || '',
      columns: COLUMNS,
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
