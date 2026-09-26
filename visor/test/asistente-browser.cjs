// Intercepted API: checks interaction, context, failures and accessibility without spending model credits.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const response={estado:'orientacion',mensaje:'Encontré la ficha para afiliarte a la biblioteca.',fichas:[{id:'f1',nombre:'Afiliación',fuente:'https://library.example/join',fecha:'2026-09-26',destinos:[{texto:'Solicitar afiliación',url:'https://library.example/apply'}]}],evidencia:[{texto:'Documento vigente y comprobante de domicilio.',fuente:'https://library.example/join',campo:'requisitos'}],sugerencias:['¿Tiene costo?'],bob:{task_id:'fixture-only'},alcance:{lectura:'2026-09-26',bloques_omitidos:0,fichas_omitidas:0}};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}), errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  let mode='success';
  await page.route('**/api/motor/**',async r=>{
   const req=r.request(),url=req.url();
   const reply=(data,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(url.endsWith('/asistente/sitios'))return reply({disponible:true,sitios:[{id:'sitio:https://library.example/',nombre:'Biblioteca',url:'https://library.example/'},{id:'municipio:rosario',nombre:'Rosario',url:'https://rosario.gob.ar/'}]});
   if(url.endsWith('/mapas'))return reply([]);
   if(url.endsWith('/asistente')){
    requests.push(req.postDataJSON());
    if(mode==='error')return reply({error:'Bob está atendiendo otra tarea. Probá en un momento.'},409);
    if(mode==='slow'){await new Promise(resolve=>setTimeout(resolve,2000));return reply(response).catch(()=>{});}
    return reply(response);
   }
   return reply({error:'Unexpected fixture request'},500);
  });
  await page.goto(process.argv[2]||'http://127.0.0.1:3001/');
  const assistant=page.getByRole('region',{name:'Asistente Bob'});
  await assistant.getByRole('combobox').selectOption('sitio:https://library.example/');
  await assistant.getByLabel('Tu mensaje para Bob').fill('Quiero afiliarme');
  await assistant.getByLabel('Tu mensaje para Bob').press('Enter');
  await assistant.getByText(response.mensaje,{exact:true}).waitFor();
  assert.equal(requests.length,1);assert.equal(requests[0].contexto,'sitio:https://library.example/');assert.deepEqual(requests[0].historial,[]);
  const link=assistant.getByRole('link',{name:'Solicitar afiliación ↗'});
  assert.equal(await link.getAttribute('href'),'https://library.example/apply');assert.equal(await link.getAttribute('target'),'_blank');
  await assistant.getByText('De dónde sale esta respuesta',{exact:true}).click();
  await assistant.getByText(response.evidencia[0].texto,{exact:true}).waitFor();
  await assistant.getByRole('button',{name:'¿Tiene costo? →',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('[aria-label="Conversación con Bob"] blockquote').length===2);
  assert.equal(requests[1].historial.length,2);assert.equal(requests[1].historial[0].texto,'Quiero afiliarme');
  await assistant.getByRole('combobox').selectOption('municipio:rosario');
  assert.equal(await assistant.getByText(response.mensaje,{exact:true}).count(),0);
  mode='error';await assistant.getByLabel('Tu mensaje para Bob').fill('Necesito pagar TGI');await assistant.getByRole('button',{name:'Consultar a Bob →'}).click();
  await assistant.getByRole('alert').waitFor();assert.equal(await assistant.getByLabel('Tu mensaje para Bob').inputValue(),'Necesito pagar TGI');assert.deepEqual(requests[2].historial,[]);
  mode='slow';await assistant.getByRole('button',{name:'Consultar a Bob →'}).click();await assistant.getByRole('button',{name:'Cancelar consulta'}).click();
  await assistant.getByText('La consulta se interrumpió. Podés volver a enviarla.',{exact:true}).waitFor({timeout:5000}).catch(async e=>{console.log('Cancel debug',await assistant.innerText(),requests);throw e;});
  await page.waitForTimeout(2200);assert.equal(await assistant.getByText(response.mensaje,{exact:true}).count(),0);
  mode='success';await assistant.getByRole('button',{name:'Consultar a Bob →'}).click();await assistant.getByText(response.mensaje,{exact:true}).waitFor();
  await assistant.getByRole('button',{name:'Empezar de nuevo'}).click();assert.equal(await assistant.getByText(response.mensaje,{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({success:true,followup:true,sourceLinks:true,siteReset:true,errorRetry:true,cancel:true,keyboard:true,mobileOverflow:false,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
