// Browser integration with a controlled Chrome API bridge, not an installed-
// extension certification. LIVE=1 additionally reads anonymous public Coto.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {readFile,writeFile}=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
 const {accesosVisibles}=await import(pathToFileURL(path.join(__dirname,'pagina.mjs')));
 const server=http.createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'panel.html';
  if(!/^[a-z0-9.-]+$/.test(name)){res.writeHead(404);return res.end();}
  try{const b=await readFile(path.join(__dirname,name));res.setHeader('Content-Type',name.endsWith('.mjs')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html');res.end(b);}catch{res.writeHead(404);res.end();}
 }).listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 const report=[];
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const active=await ctx.newPage();
  await active.route('https://qa.example.org/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<h1>Biblioteca</h1><a href="/join">Asociarme</a><a href="/help">Ayuda y envíos</a><a hidden href="/hidden">Oculto</a><form><a href="/private">Dato privado</a></form><a href="/auth?token=secret">Sesión</a><script>setTimeout(()=>{let a=document.createElement("a");a.href="/returns";a.textContent="Devoluciones";document.body.append(a)},50)</script>'}));
  await active.goto('https://qa.example.org/');await active.waitForTimeout(100);
  await active.evaluate(()=>{window.chrome={runtime:{onMessage:{addListener:fn=>window.highlightListener=fn}}};});
  const panel=await ctx.newPage(), errors=[];panel.on('pageerror',e=>errors.push(e.message));
  let deny=false,starts=0,polls=0,jobPolls=0,scenario='normal',cancelled=false,tabUrlOverride,scanUrl='https://qa.example.org/';
  const sentUrls=[],tabQueries=[];
  await panel.exposeFunction('activeTab',q=>{tabQueries.push(q);return {id:1,url:tabUrlOverride??active.url()};});
  await panel.exposeFunction('inject',async kind=>{
   if(deny)throw Error('Cannot access contents of the page.');
   if(kind==='scan')return [{result:await active.evaluate(accesosVisibles)}];
   await active.addScriptTag({content:await readFile(path.join(__dirname,'resaltar.js'),'utf8')});return [];
  });
  await panel.exposeFunction('message',m=>active.evaluate(m=>new Promise(resolve=>window.highlightListener(m,{},resolve)),m));
  await panel.exposeFunction('navigate',url=>active.goto(url));
  await panel.addInitScript(()=>{
   window.tabActivated=[];window.runtimeMessages=[];
   const noop={addListener:()=>{}};
   window.chrome={windows:{getCurrent:async()=>({id:2})},tabs:{query:async q=>[await window.activeTab(q)],update:async(_,o)=>window.navigate(o.url),sendMessage:(_,m)=>window.message(m),onActivated:{addListener:fn=>window.tabActivated.push(fn)},onUpdated:noop},
    runtime:{onMessage:{addListener:fn=>window.runtimeMessages.push(fn)}},scripting:{executeScript:o=>window.inject(o.func?'scan':'inject')},
    storage:{local:{get:async k=>({[k]:JSON.parse(localStorage.getItem(k))}),set:async o=>{for(const [k,v] of Object.entries(o))localStorage.setItem(k,JSON.stringify(v));}}}};
  });
  const catalogo={sitio:{url:'https://qa.example.org/',crawleado_en:'2026-09-27'},cobertura:{estado:'parcial'},bob:{estado:'completado'},fichas:[{id:'join',nombre:'Asociarme a la biblioteca',fuente:'https://qa.example.org/join',requisitos:[{texto:'Solo residentes: DNI vigente.'}],costo:[],pasos:[],destinos:[{texto:'Solicitar turno',url:'https://qa.example.org/apply'}]}]};
  await panel.route('**/wayfinder/api/motor/**',r=>{
   const p=new URL(r.request().url()).pathname;
   const reply=d=>r.fulfill({contentType:'application/json',body:JSON.stringify(d)});
   if(p.endsWith('/extension/catalogo'))return reply({mapaId:null});
   if(p.endsWith('/cancelar')){cancelled=true;return reply({estado:'cancelando'});}
   if(p.endsWith('/recorridos')){starts++;jobPolls=0;scanUrl=r.request().postDataJSON().url;sentUrls.push(scanUrl);assert.equal(r.request().postDataJSON().catalogo,true);if(scenario==='busy')return r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'Ya hay un recorrido en curso.'})});return reply({id:'scan-test'});}
   if(p.endsWith('/recorridos/scan-test')){polls++;jobPolls++;return reply(cancelled?{estado:'cancelado'}:scenario==='cancel'||jobPolls===1?{estado:'en_curso',eventos:[{leidas:2}]}:{estado:'completado',mapaId:'a'.repeat(20)});}
   if(p.endsWith('/catalogo'))return reply(scenario==='manual'?{...catalogo,sitio:{...catalogo.sitio,url:scanUrl},fichas:[{...catalogo.fichas[0],nombre:'Ayuda del sitio ingresado',fuente:new URL('/ayuda',scanUrl).href}]}:catalogo);
   throw Error('Unexpected '+p);
  });
  await panel.goto(`http://127.0.0.1:${server.address().port}/panel.html`);
  // Con permiso sobre la pestaña, los accesos se leen solos: no hay que tocar nada.
  await panel.getByRole('searchbox',{name:'Qué necesitás hacer en esta página'}).waitFor();
  assert.match(await panel.locator('body').innerText(),/3 accesos visibles/);
  assert.ok(!(await panel.locator('body').innerText()).includes('Dato privado'));
  // Lenguaje natural sin modelo: por raíz de palabra y sin palabras vacías.
  await panel.getByRole('searchbox',{name:'Qué necesitás hacer en esta página'}).fill('quiero devolver un producto');
  await panel.getByRole('button',{name:/^Devoluciones/}).waitFor();
  assert.equal(await panel.getByRole('button',{name:/Ayuda y envíos/}).count(),0);
  await panel.getByRole('searchbox',{name:'Qué necesitás hacer en esta página'}).fill('dónde veo el envío');
  assert.equal(await panel.getByRole('button',{name:/Ayuda y envíos/}).count(),1);
  await panel.getByRole('button',{name:'Mostrar dónde está',exact:true}).click();
  await panel.getByRole('button',{name:'Marcado ✓',exact:true}).waitFor();
  assert.equal(await active.locator('.wayfinder-objetivo').count(),1);
  await panel.getByRole('button',{name:'Pedirle a Bob que organice el sitio'}).click();
  await panel.getByRole('button',{name:'Asociarme a la biblioteca',exact:true}).waitFor();
  assert.equal(starts,1);assert.ok(polls>=2);
  await panel.reload();await panel.getByRole('button',{name:'Asociarme a la biblioteca',exact:true}).waitFor();
  deny=true;await panel.getByRole('button',{name:'Volver a leer la página'}).click();
  await panel.getByText(/Cannot access contents/).waitFor();
  assert.equal(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  scenario='cancel';await panel.evaluate(()=>localStorage.clear());await panel.reload();
  await panel.getByRole('button',{name:'Pedirle a Bob que organice el sitio'}).click();
  await panel.getByRole('button',{name:'Cancelar recorrido'}).click();
  await panel.getByText('Recorrido cancelado.',{exact:true}).waitFor();assert.equal(cancelled,true);
  scenario='busy';await panel.getByRole('button',{name:'Pedirle a Bob que organice el sitio'}).click();
  await panel.getByText('Ya hay un recorrido en curso.',{exact:true}).waitFor();
  assert.equal(await panel.getByRole('button',{name:'Pedirle a Bob que organice el sitio'}).isEnabled(),true);
  report.push({case:'controlled browser',passed:['JS links','auto read with permission','natural-language search by word roots','accent search','actual highlight receipt','scan/progress/catalog','cache reload','permission denied','cancel','busy/retry','mobile no overflow'],starts,polls});
  scenario='manual';cancelled=false;deny=false;tabUrlOverride='';
  await panel.evaluate(()=>window.tabActivated.forEach(fn=>fn({tabId:1,windowId:2})));
  await panel.getByText(/Todavía no tengo permiso/).waitFor();
  assert.ok(!(await panel.locator('body').innerText()).includes('página interna'));
  assert.ok(tabQueries.some(q=>q.windowId===2));
  const beforeStarts=starts,stillOpen=active.url();
  await panel.getByLabel('Dirección del sitio',{exact:true}).fill('javascript:alert(1)');
  await panel.getByRole('button',{name:'Analizar URL',exact:true}).click();
  await panel.getByRole('alert').filter({hasText:/Usá una dirección pública/}).waitFor();
  assert.equal(starts,beforeStarts);
  for(const typed of ['novogar.com.ar/?token=private#secret','https://www.gov.uk/renew-driving-licence']){
   const before=starts;
   await panel.getByLabel('Dirección del sitio',{exact:true}).fill(typed);
   assert.equal(starts,before);assert.equal(active.url(),stillOpen);
   await panel.getByRole('button',{name:'Analizar URL',exact:true}).click();
   await panel.getByRole('button',{name:'Cancelar recorrido',exact:true}).waitFor();
   if(typed.startsWith('novogar'))await panel.reload();
   await panel.getByRole('button',{name:'Ayuda del sitio ingresado',exact:true}).waitFor();
   assert.equal(starts,before+1);assert.equal(active.url(),stillOpen);
   assert.equal(await panel.getByRole('button',{name:'Buscar accesos de esta página',exact:true}).count(),0);
  }
  assert.deepEqual(sentUrls.slice(-2),['https://novogar.com.ar/','https://www.gov.uk/renew-driving-licence']);
  tabUrlOverride='https://novogar.com.ar/';
  await panel.evaluate(()=>window.runtimeMessages.forEach(fn=>fn({tipo:'wayfinder-activado'})));
  // Con catálogo hay un solo buscador: arriba filtra gestiones y enlaces de la página.
  await panel.getByText('También en esta página',{exact:true}).waitFor();
  await panel.getByText(/3 accesos visibles/).waitFor();
  assert.equal(await panel.getByRole('searchbox').count(),1);
  await panel.getByRole('searchbox',{name:'Qué gestión necesitás hacer'}).fill('quiero devolver algo');
  await panel.getByRole('button',{name:/^Devoluciones/}).waitFor();
  assert.equal(await panel.getByRole('button',{name:/^Asociarme/}).count(),0);
  await panel.getByRole('searchbox',{name:'Qué gestión necesitás hacer'}).fill('');
  assert.equal(await panel.locator('#sitio').innerText(),'novogar.com.ar');
  assert.equal(await panel.getByLabel('Dirección del sitio',{exact:true}).inputValue(),'https://novogar.com.ar/');
  assert.ok(!(await panel.locator('body').innerText()).includes('Consultando la dirección ingresada'));
  if(process.env.MANUAL_SCREENSHOT)await panel.screenshot({path:process.env.MANUAL_SCREENSHOT,fullPage:true});
  assert.equal(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  report.push({case:'manual URLs / tab switch',passed:['URL always visible','permission not internal','own window query','unsafe URL rejected','no typing network or navigation','Novogar and GOV.UK pasted','progress/resume without duplicate','results without tab permission','activation clears manual context','single search box for catalog and page links','mobile no overflow'],sentUrls:sentUrls.slice(-2)});
  if(process.env.LIVE==='1'){
   deny=false;tabUrlOverride=undefined;
   await active.goto('https://www.coto.com.ar/',{waitUntil:'domcontentloaded',timeout:45000});
   await active.waitForTimeout(5000);
   await active.evaluate(()=>{window.chrome={runtime:{onMessage:{addListener:fn=>window.highlightListener=fn}}};});
   const links=await active.evaluate(accesosVisibles);
   assert.ok(links.enlaces.length>0);
   await panel.reload();
   await panel.getByRole('searchbox',{name:'Qué necesitás hacer en esta página'}).fill('dónde hay una sucursal');
   await panel.getByRole('button',{name:'Mostrar dónde está',exact:true}).first().click();
   await panel.getByRole('button',{name:'Marcado ✓',exact:true}).waitFor();
   assert.equal(await active.locator('.wayfinder-objetivo').count(),1);
   if(process.env.SCREENSHOT)await panel.screenshot({path:process.env.SCREENSHOT,fullPage:true});
   await panel.getByRole('button',{name:/^Sucursales/}).click();
   await active.waitForURL(/^https:\/\/www\.coto\.com\.ar\/sucursales\/?$/,{waitUntil:'domcontentloaded'});
   report.push({case:'anonymous public Coto with real DOM and controlled Chrome API bridge',url:'https://www.coto.com.ar/',accesses:links.enlaces.length,highlighted:1,destination:active.url(),examples:links.enlaces.filter(e=>/ayuda|contact|entrega|devolu|sucursal|env[ií]o/i.test(e.texto)).slice(0,10)});
  }
  if(process.env.REPORT)await writeFile(process.env.REPORT,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
