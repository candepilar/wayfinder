import test from 'node:test';import assert from 'node:assert/strict';
import {publicPage,destination} from './url.mjs';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('only public web URLs; strips query and fragment',()=>{
 assert.equal(publicPage('https://example.com/path?token=private#secret'),'https://example.com/path');
 for(const u of ['chrome://extensions','file:///secret','https://u:p@example.com','http://127.0.0.1/','http://localhost/','http://a.local/','http://[::1]/'])assert.throws(()=>publicPage(u));
});
test('popup reads active tab and opens reviewed URL only on click',async()=>{
 const elements=Object.fromEntries(['url','open','status'].map(id=>[id,{value:'',disabled:true,textContent:'',addEventListener(type,fn){this[type]=fn;}}]));
 const opened=[];let closed=false;
 const code=(await readFile(new URL('./popup.mjs',import.meta.url),'utf8')).replace("import {publicPage,destination} from './url.mjs';",'');
 const context=vm.createContext({publicPage,destination,document:{getElementById:id=>elements[id]},chrome:{tabs:{query:async()=>[{url:'https://example.com/article?token=hidden'}],create:async value=>opened.push(value)}},window:{close(){closed=true;}}});
 await vm.runInContext(`(async()=>{${code}})()`,context);
 assert.equal(elements.url.value,'https://example.com/article');assert.equal(opened.length,0);assert.equal(elements.open.disabled,false);
 await elements.open.click();assert.equal(new URL(opened[0].url).searchParams.get('sitio'),'https://example.com/article');assert.equal(closed,true);
});
test('handoff goes only to Wayfinder and does not start a job',()=>{
 const u=new URL(destination('https://example.com/a?x=y'));assert.equal(u.origin,'https://andromedaweb.store');assert.equal(u.pathname,'/wayfinder/');assert.equal(u.searchParams.get('sitio'),'https://example.com/a');assert.deepEqual([...u.searchParams.keys()],['sitio']);
});
