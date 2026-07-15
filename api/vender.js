/* =====================================================================
   Función serverless de Vercel: recibe el formulario de venta (JSON)
   y lo reenvía a Telegram. Sustituye por completo al webhook de n8n.

   Configura en Vercel (Project Settings → Environment Variables):
     TELEGRAM_BOT_TOKEN
     TELEGRAM_CHAT_ID
   ===================================================================== */
import { handleVender } from '../lib/telegram.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const body = await readJson(req);
    const out = await handleVender(body, process.env);
    return res.status(200).json({ ok: true, ...out });
  } catch (err) {
    console.error('Error /api/vender:', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

// Lee el cuerpo como JSON, ya venga parseado por Vercel o como stream crudo.
async function readJson(req) {
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
