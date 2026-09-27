import test from 'node:test';import assert from 'node:assert/strict';
import {publicPage,destination,enteredPage,tabMessage} from './url.mjs';
import {buscar,buscarEnlaces,coincide,objetivoEn,pasoActual,raices,sitioDe,tramiteDe} from './guia.mjs';
import {readFile} from 'node:fs/promises';
import {guiaDeCatalogo} from './catalogo.mjs';

test('dynamic catalog retains whole conditions, only sourced URLs and honest missing destinations',()=>{
 const c={sitio:{url:'https://library.example.org/',crawleado_en:'2026-09-27'},fichas:[{id:'join',nombre:'Membership',fuente:'https://library.example.org/join',requisitos:[{texto:'For residents only: bring a current identity document.'}],pasos:[],costo:[],destinos:[{texto:'Apply',url:'https://library.example.org/apply'},{texto:'Bad',url:'javascript:alert(1)'}]}]};
 const s=guiaDeCatalogo(c,'abc');
 assert.equal(s.tramites[0].antes[0],c.fichas[0].requisitos[0].texto);
 assert.equal(s.tramites[0].pasos[1].opciones.length,1);
 assert.equal(sitioDe({sitios:[s]},'https://library.example.org/help'),s);
 assert.equal(pasoActual(s.tramites[0],'https://library.example.org/apply'),2);
 c.fichas[0].destinos=[];
 const t=guiaDeCatalogo(c,'abc').tramites[0];
 assert.equal(t.pasos.length,2); assert.match(t.pasos[1].detalle,/no encontró/);
 assert.throws(()=>guiaDeCatalogo({sitio:{url:'file:///private'}},'abc'));
 c.fichas[0].destinos=[{url:'https://library.example.org/auth?token=secret'},{url:'http://127.0.0.1/private'},{url:'https://library.example.org/help?topic=join',texto:'Help'}];
 assert.deepEqual(guiaDeCatalogo(c,'abc').tramites[0].pasos[1].opciones.map(o=>o.url),['https://library.example.org/help?topic=join']);
});
test('only public web URLs; strips query and fragment',()=>{
 assert.equal(publicPage('https://example.com/path?token=private#secret'),'https://example.com/path');
 for(const u of ['chrome://extensions','file:///secret','https://u:p@example.com','http://127.0.0.1/','http://localhost/','http://a.local/','http://[::1]/'])assert.throws(()=>publicPage(u));
});

test('typed URL accepts a bare domain and never forwards private query or unsafe schemes',()=>{
 assert.equal(enteredPage(' novogar.com.ar '),'https://novogar.com.ar/');
 assert.equal(enteredPage('https://www.gov.uk/renew-driving-licence?token=secret#private'),'https://www.gov.uk/renew-driving-licence');
 for(const u of ['', 'a b.com','chrome://extensions','file:///secret','javascript:alert(1)','data:text/html,x','http://localhost/','http://127.0.0.1/','http://a.local/','https://u:p@example.org','http://0x7f000001/'])assert.throws(()=>enteredPage(u),u);
});
test('unknown tab permissions are distinct from known internal pages',()=>{
 assert.match(tabMessage(''),/no tengo permiso/);assert.ok(!tabMessage('').includes('interna'));
 assert.match(tabMessage('brave://extensions'),/interna/);assert.equal(tabMessage('https://novogar.com.ar/'),null);
});
test('handoff goes only to Wayfinder and does not start a job',()=>{
 const u=new URL(destination('https://example.com/a?x=y'));assert.equal(u.origin,'https://andromedaweb.store');assert.equal(u.pathname,'/wayfinder/');assert.equal(u.searchParams.get('sitio'),'https://example.com/a');assert.deepEqual([...u.searchParams.keys()],['sitio']);
});

// La guía, sobre las hojas de ruta reales generadas desde el catálogo del motor.
const rutas=JSON.parse(await readFile(new URL('./rutas.json',import.meta.url),'utf8'));
const FICHA='https://www.rosario.gob.ar/inicio/pagar-tgi';
const SIAT='https://siat.rosario.gob.ar/siat/seg/Login.do?id=14&method=anonimo&url=%2Fgde%2FAdministrarLiqDeuda.do%3Fmethod%3DinicializarContr';
const tgi=()=>tramiteDe(rutas,FICHA).tramite;

test('same page ignores query, trailing slash and www',()=>{
 assert.equal(coincide('https://www.rosario.gob.ar/inicio/pagar-tgi','https://rosario.gob.ar/inicio/pagar-tgi/?utm=x'),true);
 assert.equal(coincide('https://www.rosario.gob.ar/inicio/pagar-tgi','https://www.rosario.gob.ar/inicio/pagar-drei'),false);
 assert.equal(coincide('no es una url',FICHA),false);
});
test('knows the site and the trámite from the open tab',()=>{
 assert.equal(sitioDe(rutas,'https://www.rosario.gob.ar/inicio/cualquier-cosa').nombre,'Rosario');
 assert.equal(sitioDe(rutas,'https://example.com/'),null);
 assert.equal(tgi().nombre,'Pagar TGI');
 assert.equal(tramiteDe(rutas,SIAT+'&otra=cosa').tramite.nombre,'Pagar TGI');
});
test('step follows the page: outside, on the ficha, on the destination',()=>{
 assert.equal(pasoActual(tgi(),'https://www.rosario.gob.ar/inicio/'),0);
 assert.equal(pasoActual(tgi(),FICHA),1);
 assert.equal(pasoActual(tgi(),SIAT),2);
});
test('highlights on the ficha exactly the official links of the next step',()=>{
 const objetivos=objetivoEn(tgi(),FICHA);
 assert.deepEqual(objetivos.map(o=>o.texto),['con Código de gestión','desde ARCA - Trámites tributarios']);
 assert.deepEqual(objetivoEn(tgi(),'https://www.rosario.gob.ar/inicio/'),[]);
});
test('search finds trámites by everyday words, accents optional',()=>{
 const rosario=sitioDe(rutas,FICHA);
 assert.equal(buscar(rosario,'pagar la tgi')[0].nombre,'Pagar TGI');
 assert.ok(buscar(rosario,'boleto estudiantil').some(t=>/medio boleto/i.test(t.nombre)));
 assert.deepEqual(buscar(rosario,'a'),[]);
});
test('every step of every trámite has a destination or an explanation',()=>{
 for(const s of rutas.sitios)for(const t of s.tramites){
  assert.ok(t.ficha.startsWith('https://'),t.nombre);
  for(const p of t.pasos)assert.ok(p.url||p.opciones?.length||p.detalle,`${t.nombre}: ${p.titulo}`);
 }
});
test('tocar el ícono abre el panel y avisa, también con el panel ya abierto',async()=>{
 const llamadas=[];let alTocar;
 const chrome={sidePanel:{setPanelBehavior:async b=>llamadas.push(['behavior',b.openPanelOnActionClick]),open:async o=>llamadas.push(['open',o.windowId])},
  action:{onClicked:{addListener:fn=>{alTocar=fn;}}},runtime:{sendMessage:async m=>llamadas.push(['msg',m.tipo])}};
 new Function('chrome',await readFile(new URL('./fondo.js',import.meta.url),'utf8'))(chrome);
 // Con openPanelOnActionClick en true Chrome nunca dispara onClicked.
 assert.deepEqual(llamadas,[['behavior',false]]);
 alTocar({id:7,windowId:3});
 assert.deepEqual(llamadas.slice(1),[['open',3],['msg','wayfinder-activado']]);
});
test('la búsqueda entiende cómo lo pide un vecino gracias a las consultas de Bob',()=>{
 const c={sitio:{url:'https://muni.example.org/',crawleado_en:'2026-09-27'},fichas:[
  {id:'a',nombre:'Sanidad Animal',fuente:'https://muni.example.org/sanidad',requisitos:[],pasos:[],costo:[],destinos:[],consultas:['encontré un perro abandonado','vacunar a mi gato']},
  {id:'b',nombre:'Pagar TGI',fuente:'https://muni.example.org/tgi',requisitos:[],pasos:[],costo:[],destinos:[],consultas:['pagar la tasa de mi casa']}]};
 const s=guiaDeCatalogo(c,'m');
 assert.deepEqual(buscar(s,'perro abandonado').map(t=>t.nombre),['Sanidad Animal']);
 assert.deepEqual(buscar(s,'tasa de mi casa').map(t=>t.nombre),['Pagar TGI']);
 // Sin consultas (catálogos viejos) la búsqueda sigue funcionando como antes.
 delete c.fichas[0].consultas;
 assert.deepEqual(buscar(guiaDeCatalogo(c,'m'),'perro abandonado'),[]);
});
test('buscar enlaces con palabras cotidianas, por raíz y sin palabras vacías',()=>{
 const e=[{texto:'Inicio'},{texto:'Devoluciones y cambios'},{texto:'Envío a domicilio'},{texto:'Sucursales'},{texto:'Preguntas frecuentes'}];
 const t=q=>buscarEnlaces(e,q).map(x=>x.texto);
 assert.deepEqual(t('quiero devolver un producto'),['Devoluciones y cambios']);
 assert.deepEqual(t('¿cuánto tarda el envío?'),['Envío a domicilio']);
 assert.deepEqual(t('dónde hay una sucursal'),['Sucursales']);
 assert.deepEqual(t('quiero'),e.slice(0,8).map(x=>x.texto)); // solo palabras vacías: lista priorizada
 assert.deepEqual(t('pasaporte'),[]);
 assert.deepEqual(raices('Quiero DEVOLVER'),['devol']);
});
