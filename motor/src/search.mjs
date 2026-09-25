const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const stop = new Set('a al algo como con cual cuales cuando de del donde el ella en es esta este hay la las lo los me mi necesito para por que quiero se sin su tengo un una y yo'.split(' '));
const tokens = text => (normalize(text).match(/[a-z0-9]{2,}/g) || []).filter(t => !stop.has(t)).map(t => t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t);

// Ranked text retrieval. The response is a literal source excerpt, never an invented answer.
export function queryMap(map, question, limit = 5) {
  const terms = [...new Set(tokens(question))];
  if (!terms.length) return { tipo: 'extractiva', respuesta: 'Escribí qué información querés encontrar.', fuentes: [] };
  const docs = map.paginas.map(p => ({ page:p, title:new Set(tokens(p.titulo)), headings:new Set(tokens((p.headings || []).join(' '))), url:new Set(tokens(p.url)), body:new Set(tokens(`${p.resumen || ''} ${p.descripcion || ''} ${p.texto || ''} ${(p.entidades || []).join(' ')}`)) }));
  const idf = new Map(terms.map(t => [t, Math.log(1 + docs.length / (1 + docs.filter(d => d.title.has(t) || d.body.has(t)).length))]));
  const ranked = docs.map(d => {
    let matches = 0;
    let score = 0;
    for (const term of terms) {
      const title = d.title.has(term);
      const body = d.body.has(term);
      const headings = d.headings.has(term);
      const url = d.url.has(term);
      if (title || body || headings || url) matches++;
      score += ((title ? 8 : 0) + (headings ? 3 : 0) + (url ? 2 : 0) + (body ? 1 : 0)) * idf.get(term);
    }
    return { ...d, matches, score: score * (matches / terms.length) };
  }).filter(d => d.score > 0).sort((a,b) => b.score - a.score).slice(0, limit);
  const sources = ranked.map(({page, score}) => {
    const text = page.texto || page.resumen || page.descripcion || page.titulo;
    const normalized = normalize(text);
    let bestIndex = 0;
    let bestCount = -1;
    for (const term of terms) {
      const index = normalized.indexOf(term);
      if (index < 0) continue;
      const start = Math.max(0, index - 90);
      const window = normalized.slice(start, start + 500);
      const count = terms.filter(t => window.includes(t)).length;
      if (count > bestCount) { bestCount = count; bestIndex = start; }
    }
    return { id: page.id, titulo: page.titulo, url: page.url, extracto: `${bestIndex ? '…' : ''}${text.slice(bestIndex, bestIndex + 500)}${text.length > bestIndex + 500 ? '…' : ''}`, puntaje: Math.round(score * 100) / 100 };
  });
  return { tipo: 'extractiva', respuesta: sources[0]?.extracto || 'No encontré esa información en las páginas recorridas. Probá con otras palabras o ampliá el recorrido.', fuentes: sources };
}
