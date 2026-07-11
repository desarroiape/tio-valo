import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3008;
const uploadsDir = path.join(__dirname, 'uploads');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

/* ---------------------------------------------------------------------
   Parser de multipart/form-data (sin dependencias).
   Devuelve [{ name, filename, contentType, data(Buffer) }]
   --------------------------------------------------------------------- */
function parseMultipart(buffer, boundary) {
  const parts = [];
  const delim = Buffer.from('--' + boundary);
  const positions = [];
  let idx = buffer.indexOf(delim, 0);
  while (idx !== -1) {
    positions.push(idx);
    idx = buffer.indexOf(delim, idx + delim.length);
  }
  for (let i = 0; i < positions.length - 1; i++) {
    let start = positions[i] + delim.length;
    const end = positions[i + 1];
    if (buffer[start] === 0x2d && buffer[start + 1] === 0x2d) continue; // marca de cierre '--'
    if (buffer[start] === 0x0d && buffer[start + 1] === 0x0a) start += 2; // salta \r\n
    const seg = buffer.slice(start, end - 2); // quita el \r\n final antes del boundary
    const headerEnd = seg.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) continue;
    const headerStr = seg.slice(0, headerEnd).toString('utf8');
    const data = seg.slice(headerEnd + 4);
    const name = /name="([^"]*)"/.exec(headerStr)?.[1] || '';
    const filename = /filename="([^"]*)"/.exec(headerStr)?.[1] ?? null;
    const contentType = /Content-Type:\s*([^\r\n]+)/i.exec(headerStr)?.[1]?.trim() || null;
    parts.push({ name, filename, contentType, data });
  }
  return parts;
}

/* ---------------------------------------------------------------------
   Webhook MOCK: recibe la cuenta + imágenes y las guarda en /uploads.
   Reemplaza este endpoint por tu webhook real (n8n, Make, Zapier...).
   --------------------------------------------------------------------- */
function handleWebhook(req, res) {
  const ct = req.headers['content-type'] || '';
  const m = /boundary=(.+)$/.exec(ct);
  if (!m) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Falta boundary multipart' }));
    return;
  }
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);
      const parts = parseMultipart(body, m[1].trim());
      const id = Date.now().toString(36);
      const subDir = path.join(uploadsDir, id);
      fs.mkdirSync(subDir, { recursive: true });

      const fields = {};
      const files = [];
      for (const p of parts) {
        if (p.filename) {
          const safe = p.filename.replace(/[^\w.\-]/g, '_') || 'imagen';
          fs.writeFileSync(path.join(subDir, safe), p.data);
          files.push({ campo: p.name, archivo: safe, bytes: p.data.length, tipo: p.contentType });
        } else {
          fields[p.name] = p.data.toString('utf8');
        }
      }
      fs.writeFileSync(
        path.join(subDir, 'datos.json'),
        JSON.stringify({ id, fecha: new Date().toISOString(), fields, files }, null, 2)
      );

      console.log(`\n📥 [WEBHOOK venta] folio ${id} — ${files.length} imagen(es) guardadas en uploads/${id}/`);
      console.log('   Datos:', fields);

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: true, id, recibidas: files.length }));
    } catch (err) {
      console.error('Error webhook:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Error procesando la solicitud' }));
    }
  });
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && urlPath === '/webhook/venta') {
    handleWebhook(req, res);
    return;
  }

  // Servir archivos estáticos — con rutas limpias sin extensión
  // (p. ej. /comprar -> comprar.html, /vender -> vender.html)
  let file = urlPath === '/' ? '/index.html' : urlPath;
  let filePath = path.join(__dirname, file);
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) filePath += '.html';
    else if (fs.existsSync(path.join(filePath, 'index.html'))) filePath = path.join(filePath, 'index.html');
    else filePath += '.html';
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    // Sin caché: en desarrollo el navegador siempre recibe la versión más reciente
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Webhook mock (venta): POST http://localhost:${PORT}/webhook/venta`);
});
