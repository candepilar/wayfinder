import {publicPage,destination} from './url.mjs';
const input=document.getElementById('url'),button=document.getElementById('open'),status=document.getElementById('status');
function validate(){try{destination(input.value);button.disabled=false;status.textContent='';}catch(e){button.disabled=true;status.textContent=e.message;}}
try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});input.value=publicPage(tab?.url||'');validate();}catch{status.textContent='Abrí una página pública o escribí su dirección.';}
input.addEventListener('input',validate);
button.addEventListener('click',async()=>{button.disabled=true;try{await chrome.tabs.create({url:destination(input.value)});window.close();}catch{status.textContent='No se pudo abrir Wayfinder. Revisá la dirección.';validate();}});
