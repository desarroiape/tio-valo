/* =====================================================================
   Autenticación del panel /admin.
   Contraseña en variable de entorno, sesión con cookie httpOnly firmada.
   ===================================================================== */
import crypto from 'crypto';

const COOKIE = 'tm_admin';
const MAX_AGE = 60 * 60 * 8; // 8 horas

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('Falta SESSION_SECRET');
  return s;
}

/* Compara la contraseña en tiempo constante. */
export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real || input == null) return false;
  const a = Buffer.from(String(input));
  const b = Buffer.from(real);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

function makeToken() {
  const payload = `admin.${Date.now() + MAX_AGE * 1000}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload);
  if (parts[2].length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) return false;
  return Number(parts[1]) > Date.now();
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

/* ¿La petición trae una sesión válida? */
export function isAuthed(reqHeaders = {}) {
  const raw = reqHeaders.cookie || reqHeaders.Cookie || '';
  return verifyToken(parseCookies(raw)[COOKIE]);
}

export function setCookieHeader(secure) {
  const flags = `HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}` + (secure ? '; Secure' : '');
  return `${COOKIE}=${makeToken()}; ${flags}`;
}

export function clearCookieHeader(secure) {
  const flags = `HttpOnly; SameSite=Strict; Path=/; Max-Age=0` + (secure ? '; Secure' : '');
  return `${COOKIE}=; ${flags}`;
}
