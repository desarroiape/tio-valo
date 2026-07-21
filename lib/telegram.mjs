/* =====================================================================
   Lógica compartida para registrar las cuentas que llegan del formulario
   de venta. La usan tanto la función serverless de Vercel (api/vender.js)
   como el servidor local de desarrollo (serve.mjs).

   Destinos (ambos opcionales, pero configura al menos uno):
     • Google Sheets  -> SHEETS_WEBHOOK_URL  (ver lib/sheets.mjs)
     • Telegram       -> TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
   ===================================================================== */

import { appendToSheet } from './sheets.mjs';

const api = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

// Escapa los caracteres reservados de HTML (parse_mode: HTML)
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildLead(fields, folio) {
  const ft = fields.juego === 'fortnite';
  const L = [`🆕 <b>Nueva cuenta para vender</b> · <code>#${esc(folio)}</code>`, ''];
  const row = (emoji, label, val) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      L.push(`${emoji} <b>${label}:</b> ${esc(val)}`);
    }
  };
  L.push(`🕹️ <b>Juego:</b> ${ft ? 'Fortnite' : 'Valorant'}`);
  row('👤', 'Vendedor', fields.nombre);
  row('📞', 'WhatsApp', fields.contacto);
  row('📸', 'Instagram', fields.instagram);
  row('🧬', 'Origen', fields.origen);
  if (fields.inversion && String(fields.inversion).trim() !== '') {
    L.push(`💸 <b>Invertido:</b> $${esc(fields.inversion)} USD`);
  }
  row('🔗', 'Explorant', fields.explorant);
  if (ft) {
    row('🖥️', 'Plataforma', fields.plataforma);
    row('📈', 'Nivel', fields.nivel);
    row('💰', 'Pavos', fields.pavos);
    if (fields.og && fields.og !== 'No') L.push('👑 <b>Cuenta OG:</b> Sí');
  } else {
    row('🌎', 'Región', fields.region);
    row('📍', 'País', fields.pais);
    row('🏆', 'Rango actual', fields.rango);
    row('🥇', 'Rango máximo', fields.rango_maximo);
    row('🎭', 'Agentes', fields.agentes);
  }
  row('📧', 'Correo', fields.correo);
  row(ft ? '🎨' : '🔫', 'Cantidad de skins', fields.skins);
  row('⭐', 'Destacadas', fields.skins_destacadas);
  row('🧾', 'Recibos de compra', fields.recibos);
  row('🔐', 'Preguntas de recuperación', fields.preguntas_recuperacion);
  row('💳', 'Acepta cuotas', fields.cuotas);
  if (fields.precio && String(fields.precio).trim() !== '') {
    L.push(`💵 <b>Precio pedido:</b> $${esc(fields.precio)} USD`);
  }
  row('📝', 'Notas', fields.notas);
  return L.join('\n');
}

/* Envía el mensaje con los datos de la cuenta a Telegram. */
export async function sendLead({ env, fields = {}, folio }) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  const res = await fetch(api(token, 'sendMessage'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildLead(fields, folio),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error('Telegram sendMessage: ' + (json.description || 'error'));
  return json;
}

/* =====================================================================
   Anuncio de una cuenta PUBLICADA en Telegram (con sus fotos).
   Espejo del anuncio de Discord, con formato amigable para Telegram.
   Usa TELEGRAM_BOT_TOKEN + (TELEGRAM_ANUNCIOS_CHAT_ID || TELEGRAM_CHAT_ID).
   ===================================================================== */
function tienePrecio(p) { return p != null && Number(p) > 0; }

function buildAnuncioCaption(cuenta, siteUrl) {
  const ft = cuenta.juego === 'fortnite';
  const juegoLabel = ft ? '🎮 Fortnite' : '🎯 Valorant';
  const codigo = (cuenta.codigo && String(cuenta.codigo).trim())
    ? String(cuenta.codigo).trim()
    : ((ft ? 'FN-' : 'VAL-') + String(cuenta.id).padStart(3, '0'));
  const link = `${siteUrl}/${ft ? 'fortnite' : 'valorant'}?cuenta=${cuenta.id}`;

  const L = [];
  L.push(`${juegoLabel}  ·  <b>${esc(codigo)}</b>`);
  L.push(`<b>${esc(cuenta.titulo || 'Cuenta')}</b>`);
  L.push('');
  L.push(`💵 <b>Precio:</b> ${tienePrecio(cuenta.precio) ? '$' + esc(cuenta.precio) + ' USD' : 'Consultar precio'}`);

  const row = (emoji, label, val) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      L.push(`${emoji} <b>${label}:</b> ${esc(val)}`);
    }
  };
  if (ft) {
    row('🎨', 'Skins', cuenta.skins);
    row('💰', 'Pavos', cuenta.pavos);
    row('📈', 'Nivel', cuenta.nivel);
    row('🖥️', 'Plataforma', cuenta.plataforma);
    if (cuenta.og) L.push('👑 <b>Cuenta OG:</b> Sí');
  } else {
    row('🏆', 'Rango', cuenta.rango);
    row('📊', 'Rango máx.', cuenta.rango_maximo);
    row('🌎', 'Región', cuenta.region);
    row('📍', 'País', cuenta.pais);
    row('🔫', 'Skins', cuenta.skins);
    row('🎭', 'Agentes', cuenta.agentes);
  }
  if (cuenta.correo) row('📧', 'Correo', cuenta.correo);
  const extras = [];
  if (cuenta.recibos) extras.push('🧾 Recibos incluidos');
  if (cuenta.recuperacion) extras.push('🔐 Preguntas de recuperación');
  if (extras.length) L.push(extras.join('  ·  '));
  if (cuenta.destacadas) row('⭐', 'Destacadas', cuenta.destacadas);

  if (cuenta.descripcion) { L.push(''); L.push(esc(String(cuenta.descripcion).slice(0, 350))); }

  L.push('');
  L.push(`🔗 <a href="${link}">Ver esta cuenta en la web</a>`);
  L.push('👉 Escríbenos para comprarla.');

  // Telegram limita el caption a 1024 caracteres.
  return L.join('\n').slice(0, 1024);
}

export async function anunciarCuentaTelegram(cuenta, env = process.env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_ANUNCIOS_CHAT_ID || env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // sin credenciales, no hace nada

  const siteUrl = (env.SITE_URL || 'https://tio-valo.vercel.app').replace(/\/$/, '');
  const caption = buildAnuncioCaption(cuenta, siteUrl);
  const imgs = (Array.isArray(cuenta.imagenes) ? cuenta.imagenes : []).filter(Boolean).slice(0, 10);

  // Con fotos: álbum (sendMediaGroup), el pie va en la primera imagen.
  if (imgs.length > 0) {
    const media = imgs.map((url, i) => (
      i === 0
        ? { type: 'photo', media: url, caption, parse_mode: 'HTML' }
        : { type: 'photo', media: url }
    ));
    const res = await fetch(api(token, 'sendMediaGroup'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, media }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error('Telegram sendMediaGroup: ' + (json.description || 'error'));
    return json;
  }

  // Sin fotos: manda el logo con el pie de foto.
  const res = await fetch(api(token, 'sendPhoto'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: `${siteUrl}/logotrustifymarket.jpeg`,
      caption,
      parse_mode: 'HTML',
    }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error('Telegram sendPhoto: ' + (json.description || 'error'));
  return json;
}

/* Registra una cuenta: la guarda en Google Sheets y/o la avisa por Telegram.
   Con que uno de los dos destinos funcione, se considera registrada. */
export async function handleVender(body, env) {
  if (!body || typeof body !== 'object') throw new Error('Cuerpo inválido');
  if (body.kind !== 'lead') throw new Error('kind desconocido (usa "lead")');

  const fields = body.fields || {};
  const folio = body.folio;
  const errors = [];

  // 1) Google Sheets (si SHEETS_WEBHOOK_URL está configurado).
  let sheetOk = false;
  try {
    const r = await appendToSheet({ env, fields, folio });
    sheetOk = !r.skipped;
  } catch (err) {
    errors.push('Sheets: ' + (err?.message || err));
  }

  // 2) Telegram (si hay credenciales).
  let telegramOk = false;
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    try {
      await sendLead({ env, fields, folio });
      telegramOk = true;
    } catch (err) {
      errors.push('Telegram: ' + (err?.message || err));
    }
  }

  if (!sheetOk && !telegramOk) {
    throw new Error(
      errors.join(' | ') ||
        'Sin destino configurado: define SHEETS_WEBHOOK_URL y/o TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID',
    );
  }
  return { folio, sheet: sheetOk, telegram: telegramOk };
}
