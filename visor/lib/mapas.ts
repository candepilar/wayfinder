/**
 * Los mapas que tenemos a mano.
 *
 * Primero se le piden al motor, que es donde estan los escaneos de verdad y el
 * unico que puede hacer uno nuevo. Si el motor no contesta queda el escaneo REAL
 * commiteado en `demo/rosario/`: 20 paginas de rosario.gob.ar con su revision de
 * seguridad. Nada inventado, ni aca ni alla.
 *
 * Ese respaldo existe para que la demo no dependa de que el motor este levantado.
 * Es el mismo criterio de antes, con una diferencia importante: ahora cuando el
 * motor SI esta, se ve lo que el motor tiene.
 *
 * Afuera se siguen viendo solo `listarMapas()` y `buscarMapaPorUrl()`.
 */

import { Guardado, api } from "./motor";
import { WebMap } from "./tipos";

import rosario from "../../demo/rosario/mapa-rosario.json";

const COMMITEADO: WebMap[] = [rosario as unknown as WebMap];

export async function listarMapas(): Promise<WebMap[]> {
  try {
    const guardados = await api<Guardado[]>("/mapas");
    if (guardados.length) return guardados.map((g) => g.mapa);
  } catch {
    // El motor no esta levantado. No es un error para mostrar: hay con que seguir.
  }
  return COMMITEADO;
}

/**
 * Compara por dominio y no por URL exacta: nadie escribe a mano
 * "https://sitio.com/" con la barra final, y pedirlo seria una trampa tonta.
 */
export async function buscarMapaPorUrl(entrada: string): Promise<WebMap | null> {
  const dominio = dominioDe(entrada);
  if (!dominio) return null;

  const mapas = await listarMapas();
  return mapas.find((m) => dominioDe(m.sitio.url) === dominio) ?? null;
}

function dominioDe(entrada: string): string | null {
  const texto = entrada.trim();
  if (!texto) return null;

  // Si no escribio el esquema, se lo agregamos: "sitio.com" tiene que andar.
  const conEsquema = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;

  try {
    return new URL(conEsquema).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
