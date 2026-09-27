import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../src/store.mjs';

const ficha = { id: 'p1', nombre: 'Sanidad animal', fuente: 'https://muni.example.org/sanidad', fecha: '2026-09-27', origen: 'html+bob', consultas: ['encontré un perro abandonado'],
  requisitos: [{ texto: 'Libreta sanitaria.' }], pasos: [], costo: [], donde_se_hace: [], destinos: [{ texto: 'Pedir turno', url: 'https://muni.example.org/turno' }], faltantes: ['costo'], clics_desde_portada: 3 };
const catalogo = { sitio: { url: 'https://muni.example.org/', crawleado_en: '2026-09-27' }, estado: 'con_fichas', fichas: [ficha, { ...ficha, id: 'p2', nombre: 'Pagar la tasa de inmuebles', consultas: [], fuente: 'https://muni.example.org/tasa' }],
  bob: { estado: 'completado', tareas: [{ task_id: 't1' }], tareas_paralelas: 2 }, calidad: { descartadas: [] } };

test('Bob can use Wayfinder as an MCP server: list, search in everyday words, read a fiche, audit', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mcp-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await new Store(path.join(dir, 'mapas')).save('0123456789abcdef0123', { sitio: catalogo.sitio, paginas: [], catalogo });
  const child = spawn(process.execPath, [fileURLToPath(new URL('../src/mcp.mjs', import.meta.url))], { env: { ...process.env, WAYFINDER_DATA_DIR: dir, WAYFINDER_API: '' }, stdio: ['pipe', 'pipe', 'inherit'] });
  t.after(() => child.kill());
  const pending = new Map(); let buffer = '';
  child.stdout.on('data', d => { buffer += d; const lines = buffer.split('\n'); buffer = lines.pop(); for (const l of lines) { const m = JSON.parse(l); pending.get(m.id)?.(m); } });
  let n = 0;
  const call = (method, params) => new Promise(resolve => { const id = ++n; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  const tool = async (name, args) => { const r = await call('tools/call', { name, arguments: args }); return { error: r.result.isError, data: r.result.isError ? r.result.content[0].text : JSON.parse(r.result.content[0].text) }; };

  const init = await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.result.serverInfo.name, 'wayfinder');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  assert.deepEqual((await call('tools/list')).result.tools.map(x => x.name), ['listar_sitios', 'buscar_gestion', 'ver_ficha', 'ver_cambios', 'auditar_catalogo']);
  const sitios = (await tool('listar_sitios', {})).data;
  assert.deepEqual([sitios[0].sitio, sitios[0].fichas, sitios[0].bob], ['0123456789abcdef0123', 2, 'completado']);
  const encontradas = (await tool('buscar_gestion', { sitio: 'muni.example.org', consulta: 'se me escapó un perro abandonado' })).data;
  assert.deepEqual(encontradas.map(f => f.nombre), ['Sanidad animal']);
  assert.equal(encontradas[0].clics_desde_portada, 3);
  const completa = (await tool('ver_ficha', { sitio: 'muni.example.org', ficha_id: 'p1' })).data;
  assert.deepEqual(completa.requisitos, ['Libreta sanitaria.']); assert.equal(completa.accesos[0].url, 'https://muni.example.org/turno');
  assert.equal((await tool('auditar_catalogo', { sitio: 'muni.example.org' })).data.fichas.total, 2);
  assert.match((await tool('ver_cambios', { sitio: 'muni.example.org' })).data.aviso, /volvé a recorrer/);
  assert.match((await tool('ver_ficha', { sitio: 'otro.example.org', ficha_id: 'x' })).data, /No hay catálogo/);
  assert.equal((await call('tools/call', { name: 'borrar_todo', arguments: {} })).error.code, -32602);
});
