import test from 'node:test';
import assert from 'node:assert/strict';
import { auditar, comparar, informe } from '../src/auditar.mjs';

const ficha = (nombre, extra = {}) => ({ nombre, fuente: 'https://sitio.example.org/' + nombre, origen: 'bob', requisitos: [{ texto: 'DNI.' }], pasos: [], costo: [], destinos: [{ url: 'https://sitio.example.org/iniciar' }], consultas: ['quiero hacerlo'], faltantes: ['pasos', 'costo'], ...extra });
const catalogo = (fichas, bob) => ({ sitio: { url: 'https://sitio.example.org/', crawleado_en: '2026-09-27' }, estado: 'con_fichas', fichas, calidad: { paginas_revisadas_html: 40, paginas_enviadas_bob: 40, paginas_omitidas_bob: 0, descartadas: [{}] }, bob });

test('la skill auditar-catalogo cuenta fichas, tareas de Bob y alertas bloqueantes', () => {
  const r = auditar({ catalogo: catalogo([ficha('a'), ficha('b', { destinos: [{ url: 'http://x.org' }], consultas: ['ver www.x.org'] })],
    { estado: 'completado', tareas_paralelas: 5, duracion_ms: 12345, coste: 0.4, tareas: [{ task_id: 't1', estado: 'completado' }, { task_id: 't2', estado: 'error' }] }) });
  assert.equal(r.fichas.total, 2); assert.equal(r.fichas.con_consultas, 2); assert.equal(r.descartadas_por_validacion, 1);
  assert.deepEqual([r.bob.tareas, r.bob.paralelas, r.bob.tareas_fallidas, r.bob.duracion_s], [2, 5, 1, 12.3]);
  assert.equal(r.alertas.length, 2);
  assert.match(informe(r), /Alertas \(2\)/);
  assert.throws(() => auditar({}), /falta "fichas"/);
});

test('la comparación antes/después usa los números registrados y marca los ausentes', () => {
  const antes = auditar(catalogo([ficha('a')], { estado: 'parcial', task_id: 'uno' }));
  const despues = auditar(catalogo([ficha('a'), ficha('b')], { estado: 'completado', tareas_paralelas: 5, duracion_ms: 30000, tareas: [{ task_id: 'x' }] }));
  const filas = Object.fromEntries(comparar(antes, despues).map(f => [f.medida, [f.antes, f.despues]]));
  assert.deepEqual(filas['Fichas'], [1, 2]);
  assert.deepEqual(filas['Tiempo de Bob (s)'], ['—', 30]);
  assert.deepEqual(filas['Tareas de Bob (a la vez)'], ['1 (1)', '1 (5)']);
});
