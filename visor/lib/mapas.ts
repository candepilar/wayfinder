/**
 * Los mapas que tenemos a mano.
 *
 * Hoy es un escaneo REAL commiteado en `demo/rosario/`, hecho por el motor:
 * 20 paginas de rosario.gob.ar con su revision de seguridad. Nada inventado.
 *
 * Se importa en vez de pedirlo por red a proposito: que la demo no dependa de
 * que el motor este levantado ni de crawlear en vivo delante de nadie. Cuando
 * el visor hable con la API, esto se cambia por un fetch y no hay que tocar
 * ninguna pantalla: afuera solo se ven `listarMapas()` y `buscarMapaPorUrl()`.
 */

import { WebMap } from "./tipos";

import rosario from "../../demo/rosario/mapa-rosario.json";

const MAPAS: WebMap[] = [rosario as unknown as WebMap];

export function listarMapas(): WebMap[] {
  return MAPAS;
}

/**
 * Compara por dominio y no por URL exacta: nadie escribe a mano
 * "https://sitio.com/" con la barra final, y pedirlo seria una trampa tonta.
 */
export function buscarMapaPorUrl(entrada: string): WebMap | null {
  const dominio = dominioDe(entrada);
  if (!dominio) return null;

  return MAPAS.find((m) => dominioDe(m.sitio.url) === dominio) ?? null;
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
