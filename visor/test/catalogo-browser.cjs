const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const ficha={id:'f1',nombre:'Afiliación a la biblioteca',tipo:'servicio',fuente:'https://library.example.org/join',fecha:'2026-09-26T12:00:00Z',origen:'bob',requisitos:[{texto:'Documento vigente y comprobante de domicilio.',fuente:'https://library.example.org/join',tipo:'item'}],pasos:[{texto:'Completá la solicitud de afiliación.',fuente:'https://library.example.org/join'}],costo:[],donde_se_hace:[],destinos:[{texto:'Solicitar afiliación',url:'https://library.example.org/application',fuente:'https://library.example.org/join',estado:'enlazado_no_verificado'}],formulario:'https://library.example.org/application',consultas:['sacar el carnet de socio'],faltantes:['costo','donde_se_hace'],validacion_humana:false};
const catalog={version:1,estado:'con_fichas',sitio:{url:'https://library.example.org/',titulo:'Biblioteca',crawleado_en:'2026-09-26T12:00:00Z'},fichas:[ficha],bob:{estado:'completado',fichas_aceptadas:1},calidad:{descartadas:[],advertencias:[]}};
const map={sitio:catalog.sitio,paginas:[{id:'f1',url:ficha.fuente,titulo:ficha.nombre,texto:'Biblioteca',enlaces:[]}],catalogo:catalog,ejecucion:{estado:'parcial',pendientes:3,errores:[],alcance:'HTML'}};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let releaseBob;
  await page.route('**/api/motor/**',async r=>{
   if(r.request().url().endsWith('/asistente')){await new Promise(ok=>releaseBob=ok);return r.fulfill({contentType:'application/json',body:JSON.stringify({estado:'orientacion',mensaje:'Te llevo a la afiliación.',fichas:[],evidencia:[],sugerencias:[],bob:{},alcance:{lectura:'2026-09-26T12:00:00Z',bloques_omitidos:0,fichas_omitidas:0}})});}
   return r.fulfill({contentType:'application/json',body:JSON.stringify(r.request().url().endsWith('/asistente/sitios')?{disponible:true,sitios:[]}:[{id:'catalog-test',mapa:map}])});
  });
  await page.goto(process.argv[2]||'http://127.0.0.1:3001/');
  await page.getByLabel('Dirección del sitio').fill('library.example.org');await page.getByRole('button',{name:'Abrir',exact:true}).click();
  await page.getByRole('heading',{name:'Biblioteca',exact:true}).waitFor();
  await page.getByText('Para el equipo del sitio: qué cambió y qué falta').click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar catálogo JSON'}).click();
  const download=await downloadPromise;assert.deepEqual(JSON.parse(await fs.readFile(await download.path(),'utf8')),catalog);
  await page.getByLabel('¿Qué necesitás hacer?').fill('afiliacion');
  await page.getByRole('button',{name:/Afiliación a la biblioteca/}).click();
  assert.equal(await page.getByRole('checkbox').count(),1);
  await page.getByRole('checkbox').check();assert.equal(await page.getByRole('checkbox').isChecked(),true);
  assert.equal(await page.getByRole('link',{name:'Solicitar afiliación ↗'}).getAttribute('href'),ficha.formulario);
  assert.equal(await page.getByRole('link',{name:'Solicitar afiliación ↗'}).getAttribute('target'),'_blank');
  assert.equal(await page.getByText('No identificado en la información leída: costo, dónde se hace. Consultá la página oficial.',{exact:true}).count(),1);
  await page.getByRole('button',{name:'← Volver a las gestiones'}).click();
  await page.getByLabel('¿Qué necesitás hacer?').fill('inexistente');
  await page.getByText('No encontramos coincidencias en este catálogo',{exact:true}).waitFor();
  // Lenguaje natural sin modelo: frase completa y consultas cotidianas de Bob.
  await page.getByLabel('¿Qué necesitás hacer?').fill('quiero afiliarme a la biblioteca');
  await page.getByRole('button',{name:/Afiliación a la biblioteca/}).waitFor();
  await page.getByLabel('¿Qué necesitás hacer?').fill('carnet de socio');
  await page.getByRole('button',{name:/Afiliación a la biblioteca/}).waitFor();
  await page.getByLabel('¿Qué necesitás hacer?').fill('');
  // Mientras Bob piensa, ya se ven las fichas que coinciden.
  await page.getByLabel('Tu mensaje para Bob').fill('me quiero afiliar');
  await page.getByRole('button',{name:'Consultar a Bob →'}).click();
  await page.getByText('Mientras Bob responde, esto coincide con lo que escribiste:').waitFor();
  releaseBob();await page.getByText('Te llevo a la afiliación.',{exact:true}).waitFor();
  assert.equal(await page.getByText('Mientras Bob responde, esto coincide con lo que escribiste:').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({sourceFields:true,download:true,accentsSearch:true,naturalLanguageSearch:true,instantMatchesWhileBobThinks:true,emptyState:true,mobileOverflow:false,errors}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
