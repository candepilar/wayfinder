/**
 * Los mapas que tenemos a mano.
 *
 * Hoy son archivos JSON commiteados en `datos/`. Cuando exista la API esto pasa
 * a ser un fetch al backend y no hay que tocar ninguna pantalla: lo unico que
 * importa afuera es `listarMapas()` y `buscarMapaPorUrl()`.
 */

import { WebMap } from "./tipos";

import ejemplo from "@/datos/ejemplo.webmap.json";

const MAPAS: WebMap[] = [ejemplo as WebMap];

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
