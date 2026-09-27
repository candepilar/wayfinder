#!/usr/bin/env node
// Conector MCP de Wayfinder (stdio, JSON-RPC 2.0 una línea por mensaje).
// Le da a IBM Bob —o a cualquier agente MCP— los catálogos de trámites como
// herramientas: listar sitios, buscar una gestión con palabras cotidianas, ver
// una ficha con sus fuentes y auditar un catálogo. Solo lectura: no inicia
// recorridos ni llama a Bob.
//
// Origen de los datos:
//   WAYFINDER_API=https://andromedaweb.store/wayfinder/api/motor  → el motor publicado
//   sin WAYFINDER_API → los mapas locales de motor/data/mapas (o WAYFINDER_DATA_DIR)
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { Store } from './store.mjs';
import { raices } from '../../extension/guia.mjs';
import { auditar } from '../../.bob/skills/auditar-catalogo/auditar.mjs';

const VERSION = '2024-11-05';

export function crearServidor({ api = process.env.WAYFINDER_API, dataDir = process.env.WAYFINDER_DATA_DIR || fileURLToPath(new URL('../data/', import.meta.url)), fetcher = fetch } = {}) {
  const store = new Store(path.join(dataDir, 'mapas'));
  async function sitios() {
    const mapas = api ? await (await fetcher(`${api.replace(/\/$/, '')}/mapas`, { signal: AbortSignal.timeout(20000) })).json() : await store.list();
    return mapas.filter(x => x?.mapa?.catalogo).map(x => ({ id: x.id, url: x.mapa.sitio.url, titulo: x.mapa.sitio.titulo || x.mapa.sitio.url, catalogo: x.mapa.catalogo }));
  }
  async function sitio(consulta) {
    const todos = await sitios();
    const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return String(u).replace(/^www\./, ''); } };
    const s = todos.find(x => x.id === consulta) || todos.find(x => host(x.url) === host(consulta));
    if (!s) throw new Error(`No hay catálogo de «${consulta}». Usá listar_sitios.`);
    return s;
  }
  const resumenFicha = f => ({ id: f.id, nombre: f.nombre, fuente: f.fuente, clics_desde_portada: f.clics_desde_portada ?? null,
    accesos: (f.destinos || []).map(d => ({ texto: d.texto, url: d.url })), faltantes: f.faltantes || [] });

  const herramientas = {
    listar_sitios: {
      description: 'Lista los sitios que ya tienen catálogo de gestiones en Wayfinder, con cantidad de fichas y estado de Bob.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => (await sitios()).map(s => ({ sitio: s.id, url: s.url, titulo: s.titulo, fichas: s.catalogo.fichas.length, bob: s.catalogo.bob?.estado ?? null, leido: s.catalogo.sitio?.crawleado_en ?? null })),
    },
    buscar_gestion: {
      description: 'Busca gestiones en el catálogo de un sitio con las palabras de un vecino («encontré un perro abandonado»). Compara por raíz de palabra, usando el nombre, las consultas cotidianas que anotó Bob y los requisitos. Devuelve hasta 5 fichas con su fuente y accesos.',
      inputSchema: { type: 'object', properties: { sitio: { type: 'string', description: 'id del sitio (de listar_sitios) o su dominio' }, consulta: { type: 'string' } }, required: ['sitio', 'consulta'], additionalProperties: false },
      run: async ({ sitio: id, consulta }) => {
        const s = await sitio(id), palabras = raices(consulta || '');
        const puntaje = texto => { const r = new Set(raices(texto)); return palabras.filter(p => r.has(p)).length; };
        return s.catalogo.fichas.map((f, i) => ({ f, i, puntos: 3 * puntaje(f.nombre) + 2 * puntaje((f.consultas || []).join(' ')) + puntaje([...(f.requisitos || []), ...(f.pasos || [])].map(b => b.texto).join(' ')) }))
          .filter(x => x.puntos > 0).sort((a, b) => b.puntos - a.puntos || a.i - b.i).slice(0, 5).map(x => resumenFicha(x.f));
      },
    },
    ver_ficha: {
      description: 'Devuelve una ficha completa: requisitos, pasos, costo, dónde se hace y accesos, con el texto literal del sitio y su fuente.',
      inputSchema: { type: 'object', properties: { sitio: { type: 'string' }, ficha_id: { type: 'string' } }, required: ['sitio', 'ficha_id'], additionalProperties: false },
      run: async ({ sitio: id, ficha_id }) => {
        const f = (await sitio(id)).catalogo.fichas.find(x => x.id === ficha_id);
        if (!f) throw new Error('Ficha no encontrada en ese catálogo. Usá buscar_gestion.');
        const textos = v => (v || []).map(b => b.texto);
        return { ...resumenFicha(f), requisitos: textos(f.requisitos), pasos: textos(f.pasos), costo: textos(f.costo), donde_se_hace: textos(f.donde_se_hace), fecha_lectura: f.fecha, origen: f.origen };
      },
    },
    auditar_catalogo: {
      description: 'Audita el catálogo de un sitio: fichas, accesos directos, consultas cotidianas, descartes, tareas de Bob en paralelo, tiempo, costo, clics desde la portada y alertas bloqueantes.',
      inputSchema: { type: 'object', properties: { sitio: { type: 'string' } }, required: ['sitio'], additionalProperties: false },
      run: async ({ sitio: id }) => auditar((await sitio(id)).catalogo),
    },
  };

  return async function manejar(mensaje) {
    const { id, method, params } = mensaje || {};
    const ok = result => ({ jsonrpc: '2.0', id, result });
    const fallo = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
    if (id === undefined) return null; // notificaciones (notifications/initialized, etc.)
    if (method === 'initialize') return ok({ protocolVersion: params?.protocolVersion || VERSION, capabilities: { tools: {} }, serverInfo: { name: 'wayfinder', version: '0.1.0' } });
    if (method === 'ping') return ok({});
    if (method === 'tools/list') return ok({ tools: Object.entries(herramientas).map(([name, h]) => ({ name, description: h.description, inputSchema: h.inputSchema })) });
    if (method === 'tools/call') {
      const h = herramientas[params?.name];
      if (!h) return fallo(-32602, `Herramienta desconocida: ${params?.name}`);
      try { return ok({ content: [{ type: 'text', text: JSON.stringify(await h.run(params.arguments || {}), null, 2) }] }); }
      catch (error) { return ok({ content: [{ type: 'text', text: error.message }], isError: true }); }
    }
    return fallo(-32601, `Método no soportado: ${method}`);
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const manejar = crearServidor();
  const rl = createInterface({ input: process.stdin });
  rl.on('line', async linea => {
    if (!linea.trim()) return;
    let mensaje;
    try { mensaje = JSON.parse(linea); } catch { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }) + '\n'); return; }
    const respuesta = await manejar(mensaje);
    if (respuesta) process.stdout.write(JSON.stringify(respuesta) + '\n');
  });
}
