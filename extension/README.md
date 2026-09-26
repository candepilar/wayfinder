# Wayfinder para el navegador · 0.1.0

Extensión Manifest V3 para Chrome, Brave y Edge. Solo requiere activeTab.
Al abrirla muestra la dirección de la pestaña, sin query ni fragmento; permite
editarla y abre Wayfinder con el campo del sitio preparado. No inicia recorridos
ni gastos de Bob automáticamente, no lee DOM, cookies, formularios o historial.
Revisá la dirección antes de enviarla: un path también puede tener datos privados.

## Instalación de prueba

1. Descomprimí el ZIP en una carpeta que vayas a conservar.
2. Abrí chrome://extensions (Brave: brave://extensions; Edge: edge://extensions).
3. Activá Modo desarrollador y elegí Cargar descomprimida.
4. Seleccioná la carpeta que contiene manifest.json.
5. Fijá Wayfinder desde el menú de extensiones. Abrí un sitio y presioná su icono.

Todavía no está publicada en Chrome Web Store. La descarga no instala la
extensión automáticamente. La publicación requiere la cuenta del titular,
materiales y revisión de la tienda.

Pruebas de lógica: node --test extension/test.mjs desde la raíz del repo.
