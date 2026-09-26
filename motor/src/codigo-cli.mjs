import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { auditCode, allowedFile, prepareFiles, LIMITS } from './codigo.mjs';

const repo = path.resolve(process.argv[2] || '..');
const output = path.resolve(process.argv[3] || 'data/revision-wayfinder.json');
const names = execFileSync('git', ['-C', repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding:'utf8' }).split('\0').filter(Boolean);
const files = [], excluded = []; let bytes = 0;
for (const ruta of [...new Set(names)].sort()) {
  if (!allowedFile(ruta) || !/^(motor\/src\/|visor\/)/.test(ruta) || ruta.includes('/datos/')) { excluded.push({ ruta, motivo:'Fuera de la selección de código de la aplicación' }); continue; }
  const contenido = await readFile(path.join(repo, ruta), 'utf8');
  try { prepareFiles([{ ruta, contenido }]); }
  catch(error) { excluded.push({ ruta, motivo:error.message }); continue; }
  if (bytes + Buffer.byteLength(contenido) > LIMITS.bytes || files.length >= LIMITS.archivos) { excluded.push({ ruta, motivo:'Límite del análisis' }); continue; }
  files.push({ ruta, contenido }); bytes += Buffer.byteLength(contenido);
}
const workspace = await mkdtemp(path.join(os.tmpdir(), 'wayfinder-code-'));
try {
  console.log(`Revisando ${files.length} archivos, ${bytes} bytes; ${excluded.length} excluidos.`);
  const report = await auditCode(files, { workspace });
  report.excluidos = excluded;
  report.revision = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
  report.cambios_locales = Boolean(execFileSync('git', ['-C', repo, 'status', '--porcelain'], {encoding:'utf8'}).trim());
  await mkdir(path.dirname(output), { recursive:true });
  await writeFile(output, JSON.stringify(report,null,2));
  const md = ['# Revisión de código de Wayfinder', '', report.fecha, '', report.alcance, '', `Archivos revisados: ${files.length}. Excluidos: ${excluded.length}. Hallazgos con cita comprobada: ${report.hallazgos.length}. Descartados: ${report.descartados.length}.`, '', ...report.hallazgos.flatMap(h => [`## ${h.severidad.toUpperCase()} · ${h.titulo}`, '', `${h.archivo}:${h.linea}-${h.fin} · ${h.categoria}`, '', h.riesgo, '', '```', h.evidencia, '```', '']), '## Cobertura', '', ...report.archivos.map(f => `- ${f.ruta} (${f.lineas} líneas)`), '', '## Excluidos', '', ...excluded.map(f => `- ${f.ruta}: ${f.motivo}`)].join('\n');
  await writeFile(output.replace(/\.json$/, '') + '.md', md);
  console.log(JSON.stringify({ archivo:output, hallazgos:report.hallazgos.length, descartados:report.descartados.length, bob:report.bob }));
} finally { await rm(workspace, {recursive:true,force:true}); }
