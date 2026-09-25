/**
 * Armado del arbol a partir de las paginas planas del Web Map.
 *
 * Por que el arbol NO sale de los enlaces: en un sitio real toda pagina enlaza
 * al home, el menu esta en todas y el pie enlaza a todo. Si se dibujara el
 * grafo de enlaces crudo saldria una madeja inutil. El path de la URL, en
 * cambio, ya trae la jerarquia servida y sin ambiguedad.
 *
 * (Esto es la propuesta 2.3 del buzon. Si se decide otra cosa, se cambia SOLO
 * este archivo: el visor no sabe de donde vino la jerarquia.)
 */

import { Nodo, Pagina } from "./tipos";

/**
 * Los segmentos de una pagina: el `camino` que mando el crawler, o lo que se
 * deduce de la URL si no vino.
 */
export function segmentosDe(pagina: Pagina): string[] {
  if (pagina.camino && pagina.camino.length > 0) return pagina.camino;

  try {
    const { pathname } = new URL(pagina.url);
    return pathname.split("/").filter(Boolean);
  } catch {
    // URL invalida: no la perdemos, la colgamos de la raiz.
    return [];
  }
}

export function armarArbol(paginas: Pagina[]): Nodo[] {
  const raiz: Nodo = { clave: "", segmento: "", pagina: null, hijos: [] };
  // Indice por clave para no recorrer el arbol en cada insercion.
  const porClave = new Map<string, Nodo>([["", raiz]]);

  // Ordenar por profundidad hace que los padres existan antes que los hijos,
  // asi los nodos intermedios se crean una sola vez.
  const ordenadas = [...paginas].sort(
    (a, b) => segmentosDe(a).length - segmentosDe(b).length
  );

  for (const pagina of ordenadas) {
    const segmentos = segmentosDe(pagina);

    // La home (sin segmentos) es la raiz misma, no un hijo.
    if (segmentos.length === 0) {
      raiz.pagina = pagina;
      continue;
    }

    let actual = raiz;
    let clave = "";

    for (const segmento of segmentos) {
      clave = clave ? `${clave}/${segmento}` : segmento;

      let nodo = porClave.get(clave);
      if (!nodo) {
        // Nodo intermedio: existe el camino pero no hay pagina propia.
        nodo = { clave, segmento, pagina: null, hijos: [] };
        porClave.set(clave, nodo);
        actual.hijos.push(nodo);
      }
      actual = nodo;
    }

    // El ultimo nodo del camino es el que representa a esta pagina.
    actual.pagina = pagina;
  }

  ordenarRecursivo(raiz);
  // Devolvemos los hijos de la raiz: la home se muestra aparte, arriba.
  return raiz.hijos;
}

/** Carpetas primero y despues alfabetico: se lee mas facil. */
function ordenarRecursivo(nodo: Nodo) {
  nodo.hijos.sort((a, b) => {
    const aTieneHijos = a.hijos.length > 0;
    const bTieneHijos = b.hijos.length > 0;
    if (aTieneHijos !== bTieneHijos) return aTieneHijos ? -1 : 1;
    return etiqueta(a).localeCompare(etiqueta(b), "es");
  });
  nodo.hijos.forEach(ordenarRecursivo);
}

/** Lo que se muestra: el titulo real si Bob ya lo leyo, o el segmento crudo. */
export function etiqueta(nodo: Nodo): string {
  return nodo.pagina?.titulo || nodo.segmento;
}

/** Cuantas paginas hay colgando de este nodo, contandose a si mismo. */
export function contarPaginas(nodo: Nodo): number {
  const propia = nodo.pagina ? 1 : 0;
  return propia + nodo.hijos.reduce((suma, h) => suma + contarPaginas(h), 0);
}

/**
 * Busqueda simple sobre el texto que tengamos.
 *
 * A proposito NO es semantica: esto es para inspeccionar el crawl mientras
 * desarrollamos. La busqueda hibrida vive en el backend, no aca.
 */
export function buscar(paginas: Pagina[], consulta: string): Pagina[] {
  const q = consulta.trim().toLowerCase();
  if (!q) return [];

  return paginas.filter((p) =>
    [p.titulo, p.url, p.resumen, p.texto, ...(p.entidades || [])]
      .filter(Boolean)
      .some((campo) => campo!.toLowerCase().includes(q))
  );
}

/** Las claves de todos los ancestros de un nodo, para poder abrir el arbol. */
export function ancestrosDe(clave: string): string[] {
  const partes = clave.split("/");
  return partes.map((_, i) => partes.slice(0, i + 1).join("/"));
}
