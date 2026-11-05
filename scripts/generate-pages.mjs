import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const page = (await readFile(resolve(root, 'index.html'), 'utf8'))
  .replace('href="/styles.css"', 'href="./styles.css"')
  .replace('src="/app.js"', 'src="./app.js"')
  .replace('src="/img/dashboard-hero.jpg"', 'src="./img/dashboard-hero.jpg"')
  .replace('<script src="./app.js" defer></script>', '<script>window.RSVP_DATA_URL = "./data.csv";</script>\n  <script src="./app.js" defer></script>');
await Promise.all([
  writeFile(resolve(root, 'docs/index.html'), page),
  copyFile(resolve(root, 'styles.css'), resolve(root, 'docs/styles.css')),
  copyFile(resolve(root, 'app.js'), resolve(root, 'docs/app.js'))
]);
console.log('Updated GitHub Pages files in docs/');
