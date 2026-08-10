/* =====================================================================
   Google Apps Script — recibe el formulario de venta y lo agrega
   como una fila a tu Google Sheet.

   Escribe SIEMPRE en el archivo indicado en SPREADSHEET_ID (más abajo),
   sin importar desde qué hoja se abrió el editor. Cada juego va a su
   propia pestaña ("Valorant" / "Fortnite"); se crean solas si no existen
   y el nombre se busca sin distinguir mayúsculas ni tildes, así que una
   pestaña llamada "fortnite" se reutiliza tal cual.

   Las columnas se ubican por el TEXTO del encabezado, no por posición:
   si la pestaña ya tiene encabezados, cada dato cae bajo el suyo, y los
   que falten se añaden al final. Por eso ya no hace falta estrenar
   pestaña cada vez que cambia una pregunta del formulario.

   IMPORTANTE: si ya tenías este script implementado, después de pegar
   esta versión debes RE-IMPLEMENTAR para que los cambios surtan efecto:
   Implementar → Gestionar implementaciones → (editar la actual) →
   Versión: "Nueva versión" → Implementar. La URL /exec no cambia.
   Al usar SPREADSHEET_ID, Google pedirá autorizar de nuevo el permiso
   de hojas de cálculo la primera vez: acepta.
   ─────────────────────────────────────────────────────────────────────
   CÓMO CONECTARLO (una sola vez):
   1. Abre el editor: Extensiones → Apps Script (desde cualquier hoja),
      o script.google.com.
   2. Borra lo que haya y pega TODO este archivo.
   3. Pon en SPREADSHEET_ID el ID de la hoja donde quieres los datos, y
      en SECRET el mismo texto de la variable de entorno SHEETS_SECRET.
   4. Implementar → Nueva implementación → tipo "Aplicación web":
        - Ejecutar como:  Yo
        - Quién tiene acceso:  Cualquier usuario
      Copia la URL que termina en /exec.
   5. En el sitio (Vercel → Settings → Environment Variables, y en tu
      .env.local para local) define:
        SHEETS_WEBHOOK_URL = la URL /exec que copiaste
        SHEETS_SECRET      = el mismo texto secreto de abajo
   ─────────────────────────────────────────────────────────────────────
   ===================================================================== */

// ID de la hoja de cálculo destino: es el trozo de la URL entre /d/ y /edit
//   https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
var SPREADSHEET_ID = '1Odr9_5CFQkU5cqbkTM6iV1u5t5yU5J6VcNqI07vDUsI';

var SECRET = 'CAMBIA_ESTE_SECRETO';         // debe coincidir con SHEETS_SECRET
var SHEET_NAME = 'Cuentas en venta';         // pestaña por defecto (si no llega body.sheet)

// Encabezados legibles para la primera fila.
var HEADERS = {
  fecha: 'Fecha',
  folio: 'Folio',
  juego: 'Juego',
  nombre: 'Nombre / usuario',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  origen: 'Origen de la cuenta',
  inversion: 'Invertido (USD)',
  explorant: 'Enlace Explorant',
  region: 'Región',
  pais: 'País',
  rango_actual: 'Rango actual',
  rango_maximo: 'Rango máximo',
  agentes: 'Agentes',
  nivel: 'Nivel',
  pavos: 'Pavos',
  correo_completo: '¿Correo completo (email + contraseña)?',
  cambio_correo_ugi: '¿Cambio de correo (UGI)?',
  cambio_nombre: '¿Se puede cambiar el nombre?',
  historial_recuperacion: '¿Historial de recuperación / revert?',
  plataformas_vinculadas: 'Plataformas vinculadas',
  puede_desvincular: '¿Puede desvincular?',
  acceso_respuestas: '¿Acceso a respuestas de recuperación?',
  bloqueos: '¿Bloqueos o restricciones?',
  correo: 'Correo',
  skins: 'Skins',
  precio: 'Precio (USD)',
  skins_destacadas: 'Skins destacadas',
  recibos: 'Recibos de compra',
  preguntas_recuperacion: 'Preguntas de recuperación',
  cuotas: 'Acepta cuotas',
  notas: 'Notas',
};

/* Orden de columnas por juego: espejo de lib/sheets.mjs del sitio. Solo se
   usa para la función de reparación de abajo; los envíos normales traen su
   propia lista de columnas. */
var COLUMNS = {
  valorant: [
    'fecha', 'folio', 'nombre', 'whatsapp', 'instagram', 'origen', 'inversion',
    'explorant', 'region', 'pais', 'rango_actual', 'rango_maximo', 'agentes',
    'correo', 'preguntas_recuperacion',
    'skins', 'precio', 'skins_destacadas', 'recibos', 'cuotas', 'notas',
  ],
  fortnite: [
    'fecha', 'folio', 'nombre', 'whatsapp', 'instagram', 'origen', 'inversion',
    'nivel', 'pavos',
    'correo_completo', 'cambio_correo_ugi', 'cambio_nombre', 'historial_recuperacion',
    'plataformas_vinculadas', 'puede_desvincular', 'acceso_respuestas', 'bloqueos',
    'skins', 'precio', 'skins_destacadas', 'cuotas', 'notas',
  ],
};

/* ---------------------------------------------------------------------
   EJECUTAR UNA SOLA VEZ para dejar la pestaña de Fortnite con los
   encabezados correctos. Selecciónala arriba en el editor y pulsa
   "Ejecutar". No toca la pestaña de Valorant.

   Si la pestaña solo tiene la fila de encabezados, la reescribe ahí
   mismo. Si ya tiene filas de datos, NO borra nada: renombra esa pestaña
   como archivo y crea una nueva y limpia. El resultado sale en el
   registro de ejecución.
   --------------------------------------------------------------------- */
function arreglarEncabezadosFortnite() {
  return arreglarEncabezados('Fortnite', COLUMNS.fortnite);
}

function arreglarEncabezados(nombre, columnas) {
  var ss = abrirHoja();
  var sheet = buscarPestana(ss, nombre);
  var encabezados = columnas.map(function (c) { return HEADERS[c] || c; });
  var filasConDatos = Math.max(sheet.getLastRow() - 1, 0);

  if (filasConDatos > 0) {
    var sello = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    sheet.setName(sheet.getName() + ' (antiguo ' + sello + ')');
    sheet = ss.insertSheet(nombre);
  } else {
    sheet.clear();
  }

  sheet.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  var msg = filasConDatos > 0
    ? 'La pestaña anterior tenía ' + filasConDatos + ' fila(s): se archivó con otro nombre y se creó "' + nombre + '" limpia.'
    : 'Encabezados de "' + nombre + '" reescritos (no había datos).';
  Logger.log(msg);
  return msg;
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (SECRET && body.secret !== SECRET) {
      return json({ ok: false, error: 'Secreto inválido' });
    }

    var columns = body.columns || Object.keys(body.row || {});
    var row = body.row || {};

    var ss = abrirHoja();
    var sheet = buscarPestana(ss, body.sheet || SHEET_NAME);
    agregarFila(sheet, columns, row);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, msg: 'Webhook de venta activo' });
}

/* Abre la hoja de SPREADSHEET_ID; si está vacío, la que contiene al script. */
function abrirHoja() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.indexOf('PON_AQUI') === -1) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/* Compara nombres ignorando mayúsculas, tildes y espacios sobrantes. */
function normalizar(s) {
  return String(s == null ? '' : s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/* Busca la pestaña por nombre (sin distinguir mayúsculas/tildes) o la crea. */
function buscarPestana(ss, nombre) {
  var hojas = ss.getSheets();
  var objetivo = normalizar(nombre);
  for (var i = 0; i < hojas.length; i++) {
    if (normalizar(hojas[i].getName()) === objetivo) return hojas[i];
  }
  return ss.insertSheet(nombre);
}

/* Escribe la fila ubicando cada dato bajo su encabezado. Los encabezados
   que no existan todavía se añaden al final de la primera fila. */
function agregarFila(sheet, columns, row) {
  var headers = [];
  if (sheet.getLastRow() > 0 && sheet.getLastColumn() > 0) {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  // Posición de cada encabezado ya existente (se ignoran las celdas vacías).
  var posicion = {};
  for (var i = 0; i < headers.length; i++) {
    var clave = normalizar(headers[i]);
    if (clave !== '' && posicion[clave] === undefined) posicion[clave] = i;
  }

  // Encabezados que faltan para las columnas de este envío.
  var nuevos = [];
  for (var j = 0; j < columns.length; j++) {
    var etiqueta = HEADERS[columns[j]] || columns[j];
    var k = normalizar(etiqueta);
    if (posicion[k] === undefined) {
      posicion[k] = headers.length + nuevos.length;
      nuevos.push(etiqueta);
    }
  }
  if (nuevos.length > 0) {
    sheet.getRange(1, headers.length + 1, 1, nuevos.length)
      .setValues([nuevos])
      .setFontWeight('bold');
    headers = headers.concat(nuevos);
    sheet.setFrozenRows(1);
  }

  var fila = [];
  for (var n = 0; n < headers.length; n++) fila.push('');
  for (var m = 0; m < columns.length; m++) {
    var et = HEADERS[columns[m]] || columns[m];
    var valor = row[columns[m]];
    fila[posicion[normalizar(et)]] = (valor == null ? '' : valor);
  }
  sheet.appendRow(fila);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
