// Corre dentro de las páginas del municipio. Solo marca el enlace que el panel
// indica como próximo paso: no lee formularios ni datos de la persona.
(() => {
  const CLASE = 'wayfinder-objetivo';
  const estilo = document.createElement('style');
  estilo.textContent = `
    .${CLASE} { outline: 3px solid #185fa5 !important; outline-offset: 4px !important; border-radius: 6px !important;
      box-shadow: 0 0 0 8px rgba(24, 95, 165, 0.18) !important; animation: wayfinder-pulso 1.6s ease-in-out 3; }
    .${CLASE}-etiqueta { display: inline-block; margin: 0 6px; vertical-align: middle; background: #185fa5; color: #fff;
      font: 600 11px/1.2 system-ui, sans-serif; padding: 3px 7px; border-radius: 999px; pointer-events: none; white-space: nowrap; }
    @keyframes wayfinder-pulso { 50% { box-shadow: 0 0 0 14px rgba(24, 95, 165, 0.08) !important; } }
    @media (prefers-reduced-motion: reduce) { .${CLASE} { animation: none; } }`;
  document.documentElement.append(estilo);

  const sinQuery = u => { try { const x = new URL(u, location.href); return x.origin + x.pathname; } catch { return ''; } };

  function limpiar() {
    document.querySelectorAll(`.${CLASE}`).forEach(n => n.classList.remove(CLASE));
    document.querySelectorAll(`.${CLASE}-etiqueta`).forEach(n => n.remove());
  }

  // Los sitios esconden enlaces en desplegables: <details> o acordeones cuyo
  // botón dice qué abre (aria-controls, como GOV.UK). Se abren para que se vea.
  function abrirContenedores(enlace) {
    for (let n = enlace.parentElement; n && n !== document.body; n = n.parentElement) {
      if (n.tagName === 'DETAILS') n.open = true;
      if (!n.id || !n.parentElement) continue;
      const boton = n.parentElement.querySelector(`[aria-controls="${CSS.escape(n.id)}"]`);
      if (boton?.getAttribute('aria-expanded') === 'false') boton.click();
    }
  }

  async function resaltar(objetivos) {
    limpiar();
    let primero = null;
    const enlaces = (objetivos || []).map(o => [...document.querySelectorAll('a[href]')].find(a => a.href === o.url)
      || [...document.querySelectorAll('a[href]')].find(a => sinQuery(a.href) === sinQuery(o.url) && a.textContent.trim() === o.texto)).filter(Boolean);
    enlaces.forEach(abrirContenedores);
    await new Promise(r => setTimeout(r, 250)); // que termine de abrir antes de medir
    enlaces.forEach((enlace, i) => {
      enlace.classList.add(CLASE);
      // Marca en línea, pegada al enlace: no tapa texto aunque la página se reacomode.
      const etiqueta = document.createElement('span');
      etiqueta.className = `${CLASE}-etiqueta`;
      etiqueta.textContent = enlaces.length > 1 ? `Wayfinder · opción ${i + 1}` : 'Wayfinder · tocá acá';
      enlace.after(etiqueta);
      primero ||= enlace;
    });
    primero?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  chrome.runtime.onMessage.addListener(m => { if (m?.tipo === 'wayfinder-resaltar') resaltar(m.objetivos); });
})();
