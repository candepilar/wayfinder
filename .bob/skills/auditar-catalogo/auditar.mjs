#!/usr/bin/env node
// Audita un catálogo de Wayfinder y devuelve números verificables.
// Uso:
//   node .bob/skills/auditar-catalogo/auditar.mjs catalogo.json            → informe
//   node .bob/skills/auditar-catalogo/auditar.mjs antes.json despues.json  → comparación
//   --json para salida en JSON.
// Acepta el catálogo descargado (/api/mapas/:id/catalogo?descargar=1) o el mapa
// guardado en motor/data/mapas/<id>.json (usa su campo "catalogo").
import { readFile } from 'node:fs/promises';

export function auditar(entrada) {
  const c = entrada?.catalogo ?? entrada;
  if (!c || !Array.isArray(c.fichas)) throw new Error('El archivo no tiene un catálogo de Wayfinder (falta "fichas").');
  const f = c.fichas, q = c.calidad || {}, bob = c.bob || {};
  const con = campo => f.filter(x => Array.isArray(x[campo]) && x[campo].length).length;
  const faltantes = {};
  for (const x of f) for (const k of x.faltantes || []) faltantes[k] = (faltantes[k] || 0) + 1;
  const alertas = [];
  for (const x of f) {
    if (!/^https?:\/\//.test(x.fuente || '')) alertas.push(`«${x.nombre}» no tiene fuente válida.`);
    for (const d of x.destinos || []) if (!/^https:\/\//.test(d.url || '')) alertas.push(`«${x.nombre}» tiene un destino que no es https: ${d.url}`);
    for (const k of x.consultas || []) if (/https?:|www\.|@/.test(k)) alertas.push(`«${x.nombre}» tiene una consulta con enlace o correo: ${k}`);
  }
  const tareas = Array.isArray(bob.tareas) ? bob.tareas : [];
  return {
    sitio: c.sitio?.url ?? null, leido: c.sitio?.crawleado_en ?? null, estado: c.estado ?? null,
    paginas: { leidas: q.paginas_revisadas_html ?? null, enviadas_bob: q.paginas_enviadas_bob ?? null, omitidas_bob: q.paginas_omitidas_bob ?? null },
    fichas: {
      total: f.length,
      por_origen: f.reduce((a, x) => (a[x.origen || 'desconocido'] = (a[x.origen || 'desconocido'] || 0) + 1, a), {}),
      con_acceso_directo: f.filter(x => (x.destinos || []).length).length,
      con_requisitos: con('requisitos'), con_pasos: con('pasos'), con_costo: con('costo'),
      con_consultas: con('consultas'), consultas_total: f.reduce((n, x) => n + (x.consultas || []).length, 0),
      faltantes,
    },
    descartadas_por_validacion: (q.descartadas || []).length,
    bob: { estado: bob.estado ?? null, tareas: tareas.length || (bob.task_id ? 1 : 0), paralelas: bob.tareas_paralelas ?? (bob.task_id ? 1 : null),
      tareas_fallidas: tareas.filter(t => t.estado === 'error').length, duracion_s: bob.duracion_ms != null ? Math.round(bob.duracion_ms / 100) / 10 : null,
      coste: bob.coste ?? null, task_ids: tareas.length ? tareas.map(t => t.task_id).filter(Boolean) : [bob.task_id].filter(Boolean) },
    alertas,
  };
}

export function comparar(a, b) {
  const filas = [
    ['Páginas enviadas a Bob', a.paginas.enviadas_bob, b.paginas.enviadas_bob],
    ['Páginas omitidas por presupuesto', a.paginas.omitidas_bob, b.paginas.omitidas_bob],
    ['Tareas de Bob (a la vez)', `${a.bob.tareas} (${a.bob.paralelas ?? '?'})`, `${b.bob.tareas} (${b.bob.paralelas ?? '?'})`],
    ['Tiempo de Bob (s)', a.bob.duracion_s, b.bob.duracion_s],
    ['Fichas', a.fichas.total, b.fichas.total],
    ['Fichas con acceso directo', a.fichas.con_acceso_directo, b.fichas.con_acceso_directo],
    ['Fichas con consultas cotidianas', a.fichas.con_consultas, b.fichas.con_consultas],
    ['Descartadas por validación', a.descartadas_por_validacion, b.descartadas_por_validacion],
    ['Costo reportado', a.bob.coste, b.bob.coste],
  ];
  return filas.map(([k, x, y]) => ({ medida: k, antes: x ?? '—', despues: y ?? '—' }));
}

const tabla = (cab, filas) => [`| ${cab.join(' | ')} |`, `| ${cab.map(() => '---').join(' | ')} |`, ...filas.map(r => `| ${r.join(' | ')} |`)].join('\n');
export function informe(r) {
  const x = r.fichas;
  return [`## Auditoría de catálogo · ${r.sitio}`, `Leído: ${r.leido} · estado: ${r.estado}`, '',
    tabla(['Medida', 'Valor'], [
      ['Páginas leídas / enviadas a Bob / omitidas', `${r.paginas.leidas ?? '—'} / ${r.paginas.enviadas_bob ?? '—'} / ${r.paginas.omitidas_bob ?? '—'}`],
      ['Fichas (por origen)', `${x.total} (${Object.entries(x.por_origen).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'})`],
      ['Con acceso directo / requisitos / pasos / costo', `${x.con_acceso_directo} / ${x.con_requisitos} / ${x.con_pasos} / ${x.con_costo}`],
      ['Con consultas cotidianas (total frases)', `${x.con_consultas} (${x.consultas_total})`],
      ['Descartadas por validación', r.descartadas_por_validacion],
      ['Bob: estado · tareas (a la vez) · fallidas', `${r.bob.estado ?? '—'} · ${r.bob.tareas} (${r.bob.paralelas ?? '—'}) · ${r.bob.tareas_fallidas}`],
      ['Bob: tiempo (s) · costo', `${r.bob.duracion_s ?? '—'} · ${r.bob.coste ?? '—'}`],
      ['Task IDs', r.bob.task_ids.join(', ') || '—'],
    ]), '',
    `Faltantes más comunes: ${Object.entries(x.faltantes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(', ') || 'ninguno'}`,
    r.alertas.length ? `\n**Alertas (${r.alertas.length}):**\n${r.alertas.map(a => `- ${a}`).join('\n')}` : '\nSin alertas de fuente, destinos ni consultas.',
  ].join('\n');
}

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
