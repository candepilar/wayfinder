#!/usr/bin/env node
// Uso: node .bob/skills/auditar-catalogo/auditar.mjs catalogo.json [despues.json] [--json]
// La lógica vive en motor/src/auditar.mjs (el motor se publica solo).
import { readFile } from 'node:fs/promises';
import { auditar, comparar, informe } from '../../../motor/src/auditar.mjs';
export { auditar, comparar, informe };
const tabla = (cab, filas) => [`| ${cab.join(' | ')} |`, `| ${cab.map(() => '---').join(' | ')} |`, ...filas.map(r => `| ${r.join(' | ')} |`)].join('\n');

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('auditar.mjs')) {
  const args = process.argv.slice(2), json = args.includes('--json'), archivos = args.filter(a => a !== '--json');
  if (!archivos.length || archivos.length > 2) { console.error('Uso: node auditar.mjs catalogo.json [despues.json] [--json]'); process.exit(2); }
  let a, b;
  try { [a, b] = await Promise.all(archivos.map(async p => auditar(JSON.parse(await readFile(p, 'utf8'))))); }
  catch (error) { console.error(`No pude auditar: ${error.message}`); process.exit(1); }
  if (!b) console.log(json ? JSON.stringify(a, null, 2) : informe(a));
  else {
    const filas = comparar(a, b);
    console.log(json ? JSON.stringify({ antes: a, despues: b, comparacion: filas }, null, 2)
      : `## Antes / después · ${b.sitio}\n\n${tabla(['Medida', 'Antes', 'Después'], filas.map(f => [f.medida, f.antes, f.despues]))}`);
  }
}
