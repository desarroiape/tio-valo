/* =====================================================================
   Acceso a Supabase (base de datos + almacenamiento de imágenes).
   Usa la clave SECRETA -> solo se ejecuta en el servidor.
   ===================================================================== */

function cfg() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL / SUPABASE_SECRET_KEY');
  return { url, key };
}

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

const BUCKET = 'cuentas';

/* Lista cuentas. Por defecto solo las disponibles (catálogo público).
   Opcional: filtra por juego ('valorant' | 'fortnite'). */
export async function listCuentas({ soloDisponibles = true, juego } = {}) {
  const { url, key } = cfg();
  let q = `${url}/rest/v1/cuentas?select=*&order=creado_en.desc`;
  if (soloDisponibles) q += '&estado=eq.disponible';
  if (juego) q += `&juego=eq.${encodeURIComponent(juego)}`;
  const res = await fetch(q, { headers: headers(key) });
  if (!res.ok) throw new Error('Supabase list: ' + res.status);
  return res.json();
}

export async function createCuenta(data) {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/cuentas`, {
    method: 'POST',
    headers: headers(key, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Supabase create: ' + res.status + ' ' + (await res.text()));
  return (await res.json())[0];
}

export async function updateCuenta(id, patch) {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/cuentas?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(key, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Supabase update: ' + res.status);
  return (await res.json())[0];
}

export async function deleteCuenta(id) {
  const { url, key } = cfg();
  // Recupera las imágenes para limpiarlas del storage.
  const rows = await fetch(
    `${url}/rest/v1/cuentas?id=eq.${encodeURIComponent(id)}&select=imagenes`,
    { headers: headers(key) }
  ).then(r => r.json()).catch(() => []);

  const res = await fetch(`${url}/rest/v1/cuentas?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: headers(key),
  });
  if (!res.ok) throw new Error('Supabase delete: ' + res.status);

  const paths = (rows[0]?.imagenes || [])
    .map(u => u.split(`/${BUCKET}/`)[1])
    .filter(Boolean);
  if (paths.length) {
    await fetch(`${url}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers: headers(key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes: paths }),
    }).catch(() => {});
  }
  return true;
}

/* Sube una imagen (data URL base64) al bucket y devuelve su URL pública. */
export async function uploadImagen(dataUrl) {
  const { url, key } = cfg();
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || '');
  if (!m) throw new Error('Imagen inválida (se esperaba data URL)');
  const type = m[1];
  const buffer = Buffer.from(m[2], 'base64');
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: headers(key, { 'Content-Type': type, 'x-upsert': 'true' }),
    body: buffer,
  });
  if (!res.ok) throw new Error('Storage upload: ' + res.status + ' ' + (await res.text()));
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}
