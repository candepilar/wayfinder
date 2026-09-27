import { WebMap } from './tipos';

/**
 * Cliente de la API del motor. Tal cual lo escribio Franco en
 * `motor/integracion/visor.patch`, para que las dos mitades hablen igual.
 *
 * La direccion es relativa a proposito: en desarrollo la redirige Next y
 * publicado la redirige Nginx. Ver `next.config.mjs`.
 */
export const API_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/motor`;

export type MapaReal = WebMap & {
  ejecucion: {
    estado: string; limite: number; intentadas: number; pendientes: number; omitidas: number;
    errores: { url: string; error: string }[]; advertencias: string[]; duracion_ms: number; alcance: string;
    bob?: { estado: string; paginas_analizadas?: number; error?: string };
  };
};

export type Guardado = { id: string; mapa: MapaReal };
export type Evento = { secuencia: number; type: string; url?: string; titulo?: string; leidas?: number; mensaje?: string; mapaId?: string; lote?: number; lotes?: number; paralelo?: number; paginas?: number };
export type Respuesta = { respuesta: string; fuentes: { id: string; titulo: string; url: string; extracto: string }[] };

export async function api<T>(route: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(
    `${API_BASE}${route}`,
    body === undefined
      ? { cache: 'no-store', signal }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }
  );
  let data;
  try { data = await response.json(); } catch { throw new Error('El motor no está disponible. Inicialo desde la carpeta motor.'); }
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}
