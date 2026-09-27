import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

// El servidor recibe solo motor/src y motor/test (ver .github/workflows/publicar.yml):
// nada del motor puede importar archivos de extension/, visor/ o .bob/.
test('the motor is self-contained: no import reaches outside motor/', async () => {
  const fuera = [];
  for (const dir of ['src', 'test']) {
    for (const f of (await readdir(new URL(`../${dir}/`, import.meta.url))).filter(f => f.endsWith('.mjs'))) {
      const code = await readFile(new URL(`../${dir}/${f}`, import.meta.url), 'utf8');
      for (const [, ruta] of code.matchAll(/(?:from|import\()\s*['"](\.\.\/\.\.\/[^'"]+)['"]/g)) fuera.push(`${dir}/${f} → ${ruta}`);
    }
  }
  assert.deepEqual(fuera, []);
});
