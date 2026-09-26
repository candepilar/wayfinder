// npm install --no-save playwright, or set PLAYWRIGHT_MODULE to its installed path.
// Uses intercepted API responses: no real scans or cancellations are submitted.
// Run: node test/inicio-browser.cjs https://andromedaweb.store/wayfinder/
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://127.0.0.1:3001/';
const map = {
  sitio: {url: 'https://qa.example.org/', titulo: 'Sitio de prueba'},
  paginas: [{id: 'home', url: 'https://qa.example.org/', titulo: 'Inicio', texto: 'Contenido de prueba', enlaces: [], formularios: []}],
  ejecucion: {estado: 'parcial', pendientes: 3, errores: [], alcance: 'HTML público.'},
};
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {})});
  try {
    for (const scenario of ['saved', 'new', 'resume', 'busy', 'cancel', 'failed', 'invalid']) {
      const page = await browser.newPage({viewport: {width: 390, height: 844}});
      let starts = 0, polls = 0, cancels = 0;
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.route('**/api/motor/**', async route => {
        const req = route.request(), pathname = new URL(req.url()).pathname;
        const reply = (json, status = 200) => route.fulfill({status, contentType: 'application/json', body: JSON.stringify(json)});
        if (pathname.endsWith('/mapas')) return reply(scenario === 'saved' ? [{id: 'saved', mapa: map}] : []);
        if (pathname.endsWith('/recorridos') && req.method() === 'POST') {
          starts++;
          assert.equal(req.postDataJSON().url, 'https://qa.example.org/');
          assert.ok(req.postDataJSON().maxPaginas <= 40);
          if (scenario === 'busy') return reply({error: 'Ya hay un recorrido en curso.'}, 409);
          return reply({id: 'scan-test', estado: 'en_curso'}, 202);
        }
        if (pathname.endsWith('/cancelar')) { cancels++; return reply({estado: 'cancelando'}); }
        if (pathname.endsWith('/recorridos/scan-test')) {
          polls++;
          if (scenario === 'resume' && polls === 1) return route.abort('failed');
          if (scenario === 'failed') return reply({estado: 'error', error: 'El sitio no permite recorrer esta dirección según robots.txt.', eventos: []});
          const done = scenario !== 'cancel' && polls > 1;
          return reply({estado: done ? 'completado' : 'en_curso', mapaId: done ? 'result' : null, eventos: [{secuencia: 1, type: 'pagina', leidas: 1, titulo: 'Inicio'}]});
        }
        if (pathname.endsWith('/mapas/result')) return reply(map);
        return reply({error: 'Unexpected test request'}, 500);
      });
      await page.goto(base);
      await page.getByLabel('Dirección del sitio').fill(scenario === 'invalid' ? 'javascript:alert(1)' : 'qa.example.org');
      await page.getByRole('button', {name: 'Abrir', exact: true}).click();
      if (scenario === 'resume') {
        await page.locator('p[role=alert]').waitFor();
        await page.getByRole('button', {name: 'Reintentar seguimiento', exact: true}).click();
      }
      if (['saved', 'new', 'resume'].includes(scenario)) {
        await page.getByRole('heading', {name: 'Sitio de prueba', exact: true}).waitFor();
        assert.equal(starts, scenario === 'saved' ? 0 : 1);
        await page.getByText(/Recorrido parcial/).waitFor();
      } else if (scenario === 'cancel') {
        await page.getByRole('button', {name: 'Cancelar', exact: true}).click();
        await page.getByText('Recorrido cancelado.', {exact: true}).waitFor();
        assert.equal(cancels, 1);
        assert.equal(await page.getByLabel('Dirección del sitio').isEnabled(), true);
      } else {
        await page.locator('p[role=alert]').waitFor();
        const alert = await page.locator('p[role=alert]').innerText();
        assert.match(alert, scenario === 'busy' ? /Ya hay un recorrido/ : scenario === 'failed' ? /robots.txt/ : /dirección válida/);
        assert.equal(starts, scenario === 'invalid' ? 0 : 1);
        assert.equal(await page.getByRole('button', {name: 'Abrir', exact: true}).isEnabled(), true);
      }
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(JSON.stringify({scenario, starts, polls, cancels, passed: true}));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exitCode = 1;});
