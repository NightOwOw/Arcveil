// gen-icon.mjs — generate assets/icons/app_logomark.ico from app_logomark.png
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(DIR, 'assets/icons/app_logomark_256.png');
const dst = path.join(DIR, 'assets/icons/app_logomark.ico');

const { default: pngToIco } = await import('png-to-ico');
const buf = await pngToIco([src]);
writeFileSync(dst, buf);
console.log('Created:', dst, '(' + buf.length + ' bytes)');
