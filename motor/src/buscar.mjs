// Búsqueda por raíz de palabra sin palabras vacías. Misma regla que
// extension/guia.mjs (el motor se publica solo, sin la carpeta extension/).
const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const VACIAS = new Set('a al algo alguna alguno como con cual cuando de del donde el en es esa ese esta este hacer hago la las le lo los me mi mis necesito o para por puedo que quiero se si sin su sus te tengo tu un una uno y ya yo quisiera'.split(' '));
export function raices(texto) {
  return [...new Set(normalizar(texto).split(/[^a-z0-9ñ]+/).filter(p => p.length > 2 && !VACIAS.has(p)).map(p => p.slice(0, 5)))];
}
