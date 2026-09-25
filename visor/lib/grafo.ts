/**
 * Calculo del acomodo del mapa. Acá no se dibuja nada: esto devuelve
 * coordenadas, y `components/Mapa.tsx` las pinta.
 *
 * Estan separados a proposito. El acomodo es la parte que se puede razonar y
 * cambiar (¿de arriba a abajo? ¿radial? ¿cuanto separo los niveles?) sin tocar
 * una linea de SVG, y el dibujo es la parte que se puede rediseñar sin volver
 * a pensar la geometria.
 */

import { hierarchy, tree } from "d3-hierarchy";

import { Nodo, Pagina } from "./tipos";

/** Medidas del acomodo. Se tocan acá y todo el mapa se reacomoda. */
export const CAJA = { ancho: 148, alto: 34 };
const SEPARACION_HERMANOS = 14;
const SEPARACION_NIVELES = 82;
const MARGEN = 40;

export type NodoUbicado = {
  nodo: Nodo;
  x: number;
  y: number;
  profundidad: number;
};

export type Vinculo = {
  clave: string;
  desde: { x: number; y: number };
  hasta: { x: number; y: number };
};

export type Mapa = {
  nodos: NodoUbicado[];
  /** Padre → hijo. Es la estructura del sitio. */
  jerarquia: Vinculo[];
  /**
   * Pagina → pagina que menciona, cuando NO son padre e hijo.
   * Esto es lo que un arbol no puede mostrar, y la razon de ser del grafo.
   */
  cruces: Vinculo[];
  ancho: number;
  alto: number;
};

/** Nodo interno del arbol que le damos a d3: una raiz sola y sus descendientes. */
type Crudo = { nodo: Nodo | null; hijos: Crudo[] };

export function calcularMapa(
  raices: Nodo[],
  home: Pagina | null,
  paginas: Pagina[]
): Mapa {
  // d3 necesita UNA raiz. Si el sitio tiene home, esa es; si no, una raiz
  // invisible que solo existe para sostener el dibujo.
  const raizNodo: Nodo | null = home
    ? { clave: "", segmento: "", pagina: home, hijos: raices }
    : null;

  const crudo: Crudo = raizNodo
    ? aCrudo(raizNodo)
    : { nodo: null, hijos: raices.map(aCrudo) };

  const acomodo = tree<Crudo>()
    .nodeSize([CAJA.ancho + SEPARACION_HERMANOS, SEPARACION_NIVELES])
    // Mas aire entre ramas distintas que entre hermanos: asi se ve donde
    // termina una seccion y empieza otra.
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.35));

  const arbol = acomodo(hierarchy(crudo, (d) => d.hijos));

  // d3 centra la raiz en x=0 y usa negativos hacia la izquierda. Corremos todo
  // para que arranque en 0 y el viewBox del SVG sea simple.
  const xs = arbol.descendants().map((d) => d.x);
  const ys = arbol.descendants().map((d) => d.y);
  const corrimientoX = MARGEN + CAJA.ancho / 2 - Math.min(...xs);
  const corrimientoY = MARGEN + CAJA.alto / 2 - Math.min(...ys);

  const ubicados: NodoUbicado[] = [];
  const porClave = new Map<string, NodoUbicado>();

  for (const d of arbol.descendants()) {
    if (!d.data.nodo) continue; // la raiz invisible no se dibuja
    const ubicado: NodoUbicado = {
      nodo: d.data.nodo,
      x: d.x + corrimientoX,
      y: d.y + corrimientoY,
      profundidad: d.depth,
    };
    ubicados.push(ubicado);
    porClave.set(d.data.nodo.clave, ubicado);
  }

  const jerarquia: Vinculo[] = [];
  for (const d of arbol.descendants()) {
    for (const hijo of d.children ?? []) {
      if (!d.data.nodo || !hijo.data.nodo) continue;
      jerarquia.push({
        clave: `${d.data.nodo.clave}→${hijo.data.nodo.clave}`,
        desde: { x: d.x + corrimientoX, y: d.y + corrimientoY + CAJA.alto / 2 },
        hasta: { x: hijo.x + corrimientoX, y: hijo.y + corrimientoY - CAJA.alto / 2 },
      });
    }
  }

  return {
    nodos: ubicados,
    jerarquia,
    cruces: calcularCruces(paginas, porClave),
    ancho: Math.max(...xs) + corrimientoX + CAJA.ancho / 2 + MARGEN,
    alto: Math.max(...ys) + corrimientoY + CAJA.alto / 2 + MARGEN,
  };
}

function aCrudo(nodo: Nodo): Crudo {
  return { nodo, hijos: nodo.hijos.map(aCrudo) };
}

/**
 * Los enlaces que NO son jerarquia.
 *
 * Se descartan los que ya dibuja el arbol (padre e hijo) porque en un sitio
 * real toda pagina enlaza a su seccion y al inicio: dibujarlos otra vez es
 * ruido que tapa lo unico interesante, que son los saltos entre ramas.
 */
function calcularCruces(
  paginas: Pagina[],
  porClave: Map<string, NodoUbicado>
): Vinculo[] {
  const claveDePagina = new Map<string, string>();
  for (const [clave, ubicado] of porClave) {
    if (ubicado.nodo.pagina) claveDePagina.set(ubicado.nodo.pagina.id, clave);
  }

  const cruces: Vinculo[] = [];
  const vistos = new Set<string>();

  for (const pagina of paginas) {
    const claveOrigen = claveDePagina.get(pagina.id);
    if (claveOrigen === undefined) continue;

    for (const idDestino of pagina.enlaces ?? []) {
      const claveDestino = claveDePagina.get(idDestino);
      if (claveDestino === undefined || claveDestino === claveOrigen) continue;

      if (esPadreOHijo(claveOrigen, claveDestino)) continue;

      // Un par A→B y B→A se dibuja una sola vez.
      const par = [claveOrigen, claveDestino].sort().join("↔");
      if (vistos.has(par)) continue;
      vistos.add(par);

      const a = porClave.get(claveOrigen)!;
      const b = porClave.get(claveDestino)!;
      cruces.push({
        clave: par,
        desde: { x: a.x, y: a.y },
        hasta: { x: b.x, y: b.y },
      });
    }
  }

  return cruces;
}

function esPadreOHijo(a: string, b: string): boolean {
  const padreDe = (c: string) => c.split("/").slice(0, -1).join("/");
  return padreDe(a) === b || padreDe(b) === a;
}
