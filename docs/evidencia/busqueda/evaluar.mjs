// Uso: unzip entrenamiento/paquete-entrenamiento.zip 'datos/paquete/*' -d /tmp/p && node docs/evidencia/busqueda/evaluar.mjs /tmp/p/datos/paquete
// Solo la partición de validación, consultas y documentos en español (el examen «test» queda reservado).
import { readFileSync } from 'node:fs';
import { raices } from '../../../extension/guia.mjs';
const leer = f => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const corpus = leer(process.argv[2] + '/corpus.jsonl'), val = leer(process.argv[2] + '/validation.jsonl').filter(q => q.language === 'es' && q.document_language === 'es');
// Misma regla que buscar() de la extensión: nombre x3, resto x1; mismo filtro de jurisdicción que BM25.
const docs = corpus.filter(d => d.language === 'es').map(d => ({ id: d.id, jur: d.jurisdiction, t: new Set(raices(d.title)), r: new Set(raices((d.description || '') + ' ' + d.text.slice(0, 3000))) }));
let top1 = 0, top3 = 0;
for (const q of val) {
  const p = raices(q.query);
  const rank = docs.filter(d => d.jur === q.jurisdiction).map(d => ({ id: d.id, s: 3 * p.filter(x => d.t.has(x)).length + p.filter(x => d.r.has(x)).length })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.id);
  if (rank[0] === q.document_id) top1++; if (rank.includes(q.document_id)) top3++;
}
console.log({ n: val.length, top1: +(top1 / val.length).toFixed(3), top3: +(top3 / val.length).toFixed(3), docs_es: docs.length });
