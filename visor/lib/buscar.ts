// Búsqueda en lenguaje natural, sin modelo (misma regla que extension/guia.mjs):
// se quitan palabras vacías y se compara por raíz (primeras 5 letras), así
// «quiero devolver un producto» encuentra «Devoluciones».
import { Ficha } from './catalogo';

const VACIAS = new Set('a al algo alguna alguno como con cual cuando de del donde el en es esa ese esta este hacer hago la las le lo los me mi mis necesito o para por puedo que quiero se si sin su sus te tengo tu un una uno y ya yo quisiera'.split(' '));
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const raices = (texto: string) => [...new Set(normalizar(texto).split(/[^a-z0-9ñ]+/).filter(p => p.length > 2 && !VACIAS.has(p)).map(p => p.slice(0, 5)))];
const puntaje = (consulta: string[], texto: string) => { const r = new Set(raices(texto)); return consulta.filter(p => r.has(p)).length; };

// Nombre pesa más; las consultas cotidianas que anota Bob, después; el resto del texto, menos.
export function buscarFichas(fichas: Ficha[], consulta: string, limite = fichas.length): Ficha[] {
  const palabras = raices(consulta);
  if (!palabras.length) return consulta.trim() ? [] : fichas.slice(0, limite);
  return fichas.map((f, i) => ({ f, i, puntos: 3 * puntaje(palabras, f.nombre) + 2 * puntaje(palabras, (f.consultas || []).join(' '))
      + puntaje(palabras, [...f.requisitos, ...f.pasos].map(b => b.texto).join(' ')) }))
    .filter(x => x.puntos > 0).sort((a, b) => b.puntos - a.puntos || a.i - b.i).slice(0, limite).map(x => x.f);
}
