/* =====================================================================
   Lógica compartida para reenviar las cuentas a Telegram.
   La usan tanto la función serverless de Vercel (api/vender.js)
   como el servidor local de desarrollo (serve.mjs).

   Requiere dos variables de entorno:
     TELEGRAM_BOT_TOKEN  -> token del bot (de @BotFather)
     TELEGRAM_CHAT_ID    -> chat/grupo destino donde llegan las cuentas
   ===================================================================== */

const api = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

function creds(env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('Faltan las variables TELEGRAM_BOT_TOKEN y/o TELEGRAM_CHAT_ID');
  }
  return { token, chatId };
}

// Escapa los caracteres reservados de HTML (parse_mode: HTML)
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildLead(fields, total, folio) {
  const L = [`🆕 <b>Nueva cuenta para vender</b> · <code>#${esc(folio)}</code>`, ''];
  const row = (emoji, label, val) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      L.push(`${emoji} <b>${label}:</b> ${esc(val)}`);
    }
  };
  row('👤', 'Vendedor', fields.nombre);
  row('📞', 'Contacto', fields.contacto);
  row('🌎', 'Región', fields.region);
  row('🏆', 'Rango', fields.rango);
  row('📧', 'Correo', fields.correo);
  row('🔫', 'Cantidad de skins', fields.skins);
  row('⭐', 'Destacadas', fields.skins_destacadas);
  if (fields.precio && String(fields.precio).trim() !== '') {
    L.push(`💵 <b>Precio pedido:</b> $${esc(fields.precio)} USD`);
  }
  row('📝', 'Notas', fields.notas);
  L.push(`🖼 <b>Fotos:</b> ${total}`);
  return L.join('\n');
}

// data:image/jpeg;base64,XXXX -> { type, buffer }
function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || '');
  if (!m) throw new Error('Imagen inválida (dataUrl esperado)');
  return { type: m[1], buffer: Buffer.from(m[2], 'base64') };
}

/* Envía el mensaje con los datos de la cuenta. */
export async function sendLead({ env, fields = {}, total = 0, folio }) {
  const { token, chatId } = creds(env);
  const res = await fetch(api(token, 'sendMessage'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildLead(fields, total, folio),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error('Telegram sendMessage: ' + (json.description || 'error'));
  return json;
}

/* Envía una foto (recibida como data URL base64). */
export async function sendPhotoDataUrl({ env, folio, index, total, filename, dataUrl }) {
  const { token, chatId } = creds(env);
  const { type, buffer } = decodeDataUrl(dataUrl);
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  fd.append('caption', `#${folio} · foto ${index}/${total}`);
  fd.append('photo', new Blob([buffer], { type }), filename || `foto-${index}.jpg`);
  const res = await fetch(api(token, 'sendPhoto'), { method: 'POST', body: fd });
  const json = await res.json();
  if (!json.ok) throw new Error('Telegram sendPhoto: ' + (json.description || 'error'));
  return json;
}

/* Enruta una petición según su `kind`. Devuelve el objeto de respuesta. */
export async function handleVender(body, env) {
  if (!body || typeof body !== 'object') throw new Error('Cuerpo inválido');
  if (body.kind === 'lead') {
    await sendLead({ env, fields: body.fields || {}, total: body.total || 0, folio: body.folio });
    return { folio: body.folio };
  }
  if (body.kind === 'photo') {
    await sendPhotoDataUrl({
      env,
      folio: body.folio,
      index: body.index,
      total: body.total,
      filename: body.filename,
      dataUrl: body.dataUrl,
    });
    return { index: body.index };
  }
  throw new Error('kind desconocido (usa "lead" o "photo")');
}
