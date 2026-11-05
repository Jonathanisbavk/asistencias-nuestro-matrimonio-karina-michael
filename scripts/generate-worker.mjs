import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFile(resolve(root, path), 'utf8');
const [source, style, script, image, worker] = await Promise.all([
  read('index.html'), read('styles.css'), read('app.js'), readFile(resolve(root, 'img/dashboard-hero.jpg')), read('worker/index.js')
]);
const html = source
  .replace('<link rel="stylesheet" href="/styles.css">', `<style>${style}</style>`)
  .replace('  <script src="/app.js" defer></script>\n', '')
  .replace('src="/img/dashboard-hero.jpg"', `src="data:image/jpeg;base64,${image.toString('base64')}"`)
  .replace('</body>', `<script>${script}</script></body>`);
const pageStart = worker.includes('const photo =') ? worker.indexOf('const photo =') : worker.indexOf('const page =');
const header = worker.slice(0, pageStart);
const backend = worker.slice(worker.indexOf('function parseCsv(input)'));
if (!header.includes('const csvUrl =') || !backend.includes('export default')) throw new Error('No se encontró el backend existente');
await writeFile(resolve(root, 'worker/index.js'), `${header}const page = ${JSON.stringify(html)};\n${backend}`);
await writeFile(resolve(root, 'preview.html'), html);
console.log('Updated worker and preview.html from the new design');
