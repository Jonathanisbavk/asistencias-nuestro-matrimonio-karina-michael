import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRuynNpJ2AdxCKV8Jt-bHB4IGs1S4XvrUCdPe0Uv9k1QF2ySjEKb5clloFWeO48tg1XG1ddej9l6FRd/pub?output=csv';
const port = Number(process.env.PORT || 4173);
const files = new Map([['/', ['index.html','text/html; charset=utf-8']], ['/styles.css', ['styles.css','text/css; charset=utf-8']], ['/app.js', ['app.js','text/javascript; charset=utf-8']], ['/img/dashboard-hero.jpg', ['img/dashboard-hero.jpg','image/jpeg']]]);

function parseCsv(input) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && input[i + 1] === '\n') i++; row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  return rows;
}

createServer(async (request, response) => {
  const path = new URL(request.url, `http://localhost:${port}`).pathname;
  if (path === '/api/respuestas') {
    try {
      const upstream = await fetch(csvUrl, {headers:{accept:'text/csv,text/plain;q=0.9,*/*;q=0.8'}});
      if (!upstream.ok) throw new Error(`La hoja respondió ${upstream.status}`);
      const rows = parseCsv(await upstream.text());
      if (!rows[0]?.some(value => value.includes('Marca temporal'))) throw new Error('La hoja no devolvió respuestas CSV');
      response.writeHead(200, {'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
      response.end(JSON.stringify({rows}));
    } catch (error) { response.writeHead(502, {'content-type':'application/json; charset=utf-8'}); response.end(JSON.stringify({error:error.message})); }
    return;
  }
  const file = files.get(path);
  if (!file) { response.writeHead(404); response.end('No encontrado'); return; }
  try { const content = await readFile(resolve(root, file[0])); response.writeHead(200, {'content-type':file[1]}); response.end(content); }
  catch { response.writeHead(500); response.end('No se pudo leer el archivo'); }
}).listen(port, '127.0.0.1', () => console.log(`Vista local: http://127.0.0.1:${port}`));
