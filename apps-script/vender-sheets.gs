/* =====================================================================
   Google Apps Script — recibe el formulario de venta y lo agrega
   como una fila a tu Google Sheet.

   ─────────────────────────────────────────────────────────────────────
   CÓMO CONECTARLO (una sola vez):
   1. Abre tu hoja:
      https://docs.google.com/spreadsheets/d/1-9ExRXiy7nL9Ccyz0jAjGcZjWuX2Smkbx0yGBhBiZmw/edit
   2. Menú  Extensiones → Apps Script.
   3. Borra lo que haya y pega TODO este archivo.
   4. Cambia SECRET por un texto secreto tuyo (el mismo que pondrás en
      la variable de entorno SHEETS_SECRET del sitio).
   5. Implementar → Nueva implementación → tipo "Aplicación web":
        - Ejecutar como:  Yo
        - Quién tiene acceso:  Cualquier usuario
      Copia la URL que termina en /exec.
   6. En el sitio (Vercel → Settings → Environment Variables, y en tu
      .env.local para local) define:
        SHEETS_WEBHOOK_URL = la URL /exec que copiaste
        SHEETS_SECRET      = el mismo texto secreto de abajo
   ─────────────────────────────────────────────────────────────────────
   ===================================================================== */

var SECRET = 'CAMBIA_ESTE_SECRETO';         // debe coincidir con SHEETS_SECRET
var SHEET_NAME = 'Cuentas en venta';         // pestaña donde se escriben las filas

// Encabezados legibles para la primera fila (mismo orden que `columns`).
var HEADERS = {
  fecha: 'Fecha',
  folio: 'Folio',
  juego: 'Juego',
  nombre: 'Nombre / usuario',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  region: 'Región',
  pais: 'País',
  rango_actual: 'Rango actual',
  rango_maximo: 'Rango máximo',
  agentes: 'Agentes',
  plataforma: 'Plataforma',
  nivel: 'Nivel',
  pavos: 'Pavos',
  og: 'OG',
  correo: 'Correo',
  skins: 'Skins',
  precio: 'Precio (USD)',
  skins_destacadas: 'Skins destacadas',
  recibos: 'Recibos de compra',
  preguntas_recuperacion: 'Preguntas de recuperación',
  notas: 'Notas',
};

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (SECRET && body.secret !== SECRET) {
      return json({ ok: false, error: 'Secreto inválido' });
    }

    var columns = body.columns || Object.keys(body.row || {});
    var row = body.row || {};

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Crea la fila de encabezados si la hoja está vacía.
    if (sheet.getLastRow() === 0) {
      var headerRow = columns.map(function (c) { return HEADERS[c] || c; });
      sheet.appendRow(headerRow);
      sheet.getRange(1, 1, 1, headerRow.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var values = columns.map(function (c) { return row[c] != null ? row[c] : ''; });
    sheet.appendRow(values);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, msg: 'Webhook de venta activo' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
